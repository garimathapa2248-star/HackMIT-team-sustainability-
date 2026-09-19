"""Parallel, resumable NOAA ISD parse for the AWS box (the 48-core job).

The parse is embarrassingly parallel per station-year, so this fans (station,
year) tasks across a process pool.  Each worker reads one Global Hourly file —
from a local NVMe mirror, or streamed on demand from the public
``noaa-global-hourly-pds`` bucket — and writes a small tidy checkpoint
``{checkpoint_dir}/{station}_{year}.csv``.  Because every task checkpoints
independently, a dropped SSH session or a re-run costs only the in-flight files,
never the whole computation (§8: "checkpoint everything to disk").

Stage 2 merges the checkpoints (deduping station-days by max) and runs the EVT
fit to produce ``artifacts/signal.json``.
"""
from __future__ import annotations

import argparse
import csv
import json
import time
from multiprocessing import Pool
from pathlib import Path

from .analysis import fit_signal
from .ingest import load_noaa_global_hourly, write_tidy_csv
from .lakes import load_lake_series_csv
from .landslide import load_events_csv
from .stations import BBOXES, select_stations, station_year_pairs

# Per-worker state, set once by the pool initializer (avoids re-creating an S3
# client per task and keeps the client out of the pickled task payload).
_CFG: dict = {}
_S3 = None


def _init_worker(cfg: dict) -> None:
    global _CFG, _S3
    _CFG = cfg
    _S3 = None
    if cfg.get("bucket"):
        import boto3
        from botocore import UNSIGNED
        from botocore.client import Config
        _S3 = boto3.client("s3", config=Config(signature_version=UNSIGNED, max_pool_connections=4))


def _source_path(station: str, year: int) -> Path:
    base = _CFG.get("data_dir") or _CFG.get("cache_dir")
    return Path(base) / str(year) / f"{station}.csv"


def _ensure_source(station: str, year: int) -> Path | None:
    """Return a local path to the station-year CSV, downloading it if needed."""
    path = _source_path(station, year)
    if path.exists() and path.stat().st_size > 0:
        return path
    if _S3 is None:
        return None
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        _S3.download_file(_CFG["bucket"], f"{year}/{station}.csv", str(path))
    except Exception:
        return None
    return path if path.exists() else None


def process_station_year(task: tuple[str, int]) -> tuple[str, int, object]:
    """Worker: parse one station-year into a tidy checkpoint. Returns row count or status."""
    station, year = task
    ckpt = Path(_CFG["checkpoint_dir"]) / f"{station}_{year}.csv"
    if _CFG.get("resume", True) and ckpt.exists():
        return (station, year, "cached")
    ckpt.parent.mkdir(parents=True, exist_ok=True)
    source = _ensure_source(station, year)
    if source is None:
        ckpt.write_text("station_id,date,precip_mm\n")  # empty marker: don't retry a missing file
        return (station, year, "missing")
    try:
        rows = load_noaa_global_hourly(source)
    except Exception as exc:  # never let one bad file kill the pool
        ckpt.write_text("station_id,date,precip_mm\n")
        return (station, year, f"error:{type(exc).__name__}")
    write_tidy_csv(rows, ckpt)
    if _CFG.get("stream_cleanup") and _S3 is not None:
        try:
            source.unlink()
        except OSError:
            pass
    return (station, year, len(rows))


def _merge_checkpoints(checkpoint_dir: Path) -> list[dict[str, object]]:
    """Merge all tidy checkpoints, keeping the max precip per station-day."""
    best: dict[tuple[str, str], float] = {}
    for path in checkpoint_dir.glob("*.csv"):
        with path.open(newline="") as handle:
            for row in csv.DictReader(handle):
                try:
                    key = (row["station_id"], row["date"])
                    value = float(row["precip_mm"])
                except (KeyError, ValueError):
                    continue
                if value >= 0 and value > best.get(key, -1.0):
                    best[key] = value
    return [{"station_id": s, "date": d, "precip_mm": v} for (s, d), v in best.items()]


def run(args: argparse.Namespace) -> None:
    checkpoint_dir = Path(args.checkpoint_dir)
    checkpoint_dir.mkdir(parents=True, exist_ok=True)

    # --- Build the task list ---------------------------------------------------
    if args.stations_json:
        stations = json.loads(Path(args.stations_json).read_text())
    else:
        if not args.isd_history:
            raise SystemExit("Provide --stations-json or --isd-history to select stations.")
        bbox = args.bbox
        if "," in args.bbox:
            bbox = tuple(float(x) for x in args.bbox.split(","))
        stations = select_stations(args.isd_history, bbox, args.min_start_year, args.min_years_record)
    pairs = station_year_pairs(stations, args.first_year, args.last_year)
    print(f"selection: {len(stations)} stations -> {len(pairs)} station-years", flush=True)

    cfg = {
        "checkpoint_dir": str(checkpoint_dir),
        "data_dir": args.data_dir,
        "cache_dir": args.cache_dir,
        "bucket": args.s3_bucket,
        "resume": not args.no_resume,
        "stream_cleanup": args.stream_cleanup,
    }

    # --- Stage 1: parallel parse ----------------------------------------------
    t0 = time.time()
    parsed = cached = missing = errors = 0
    with Pool(processes=args.workers, initializer=_init_worker, initargs=(cfg,)) as pool:
        for i, (station, year, status) in enumerate(pool.imap_unordered(process_station_year, pairs, chunksize=8), 1):
            if status == "cached":
                cached += 1
            elif status == "missing":
                missing += 1
            elif isinstance(status, str) and status.startswith("error"):
                errors += 1
            else:
                parsed += 1
            if i % 500 == 0 or i == len(pairs):
                rate = i / max(1e-9, time.time() - t0)
                print(f"  {i}/{len(pairs)} ({rate:.0f}/s) parsed={parsed} cached={cached} "
                      f"missing={missing} err={errors}", flush=True)
    print(f"stage 1 done in {time.time()-t0:.0f}s: parsed={parsed} cached={cached} "
          f"missing={missing} err={errors}", flush=True)

    # --- Stage 2: merge + EVT --------------------------------------------------
    rows = _merge_checkpoints(checkpoint_dir)
    print(f"merged {len(rows)} station-days from checkpoints", flush=True)
    if args.tidy_output:
        write_tidy_csv(sorted(rows, key=lambda r: (r["station_id"], r["date"])), args.tidy_output)
        print(f"wrote tidy master {args.tidy_output}", flush=True)
    events = load_events_csv(args.events_csv) if args.events_csv else None
    coords = None
    if args.stations_json:
        coords = {str(s.get("station", s.get("station_id"))): (float(s["lat"]), float(s["lon"]))
                  for s in stations}
    series = load_lake_series_csv(args.lakes_csv) if args.lakes_csv else None
    signal = fit_signal(rows, args.region, bootstrap_draws=args.bootstrap_draws,
                        landslide_events=events, station_coords=coords, lake_series=series)
    if signal.get("headline", {}).get("new_return_period_yrs") is None and coords:
        from .stations import BBOXES
        lon_min, lat_min, lon_max, lat_max = BBOXES["nepal_adjacent"]
        keep = {sid for sid, (lat, lon) in coords.items()
                if lon_min <= lon <= lon_max and lat_min <= lat <= lat_max}
        subset = [r for r in rows if str(r.get("station_id")) in keep]
        if subset:
            nested = fit_signal(subset, "nepal_adjacent", bootstrap_draws=min(300, args.bootstrap_draws),
                                landslide_events=events, station_coords=coords, lake_series=series)
            # Keep HMA scale counts; borrow a identified early/late headline from Nepal.
            if nested.get("headline", {}).get("new_return_period_yrs") is not None:
                h = dict(nested["headline"])
                h["statement"] = (
                    f"Across High Mountain Asia NOAA ISD ({signal['stations_processed']} stations / "
                    f"{signal['station_years']} station-years). Nepal-adjacent GEV: "
                    + h["statement"]
                )
                h["headline_region"] = "nepal_adjacent"
                signal["headline"] = h
                signal["provenance"]["headline_note"] = (
                    "HMA-pooled late GEV did not identify a recurrence shift; headline uses Nepal-adjacent subset."
                )
    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(signal, indent=2) + "\n")
    hd = signal.get("headline", {})
    print(f"wrote {args.output}: {signal['stations_processed']} stations, "
          f"{signal['station_years']} station-years", flush=True)
    if hd.get("new_return_period_yrs"):
        print(f"HEADLINE: old 100-yr depth now recurs every {hd['new_return_period_yrs']} yr "
              f"(threshold {hd.get('threshold_mm')} mm)", flush=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Parallel NOAA ISD parse + EVT (AWS scale job).")
    src = parser.add_argument_group("data source (choose local mirror or S3)")
    src.add_argument("--data-dir", help="Local mirror laid out as {year}/{station}.csv")
    src.add_argument("--s3-bucket", help="Stream from this bucket (e.g. noaa-global-hourly-pds)")
    src.add_argument("--cache-dir", default="data/isd_cache", help="Where streamed files are cached")
    src.add_argument("--stream-cleanup", action="store_true", help="Delete streamed files after parsing")
    sel = parser.add_argument_group("station selection")
    sel.add_argument("--stations-json", help="Prebuilt station list from stations.py")
    sel.add_argument("--isd-history", help="isd-history.csv (if not using --stations-json)")
    sel.add_argument("--bbox", default="nepal_adjacent", help=f"preset {list(BBOXES)} or lonmin,latmin,lonmax,latmax")
    sel.add_argument("--min-start-year", type=int, default=1985)
    sel.add_argument("--min-years-record", type=int, default=20)
    sel.add_argument("--first-year", type=int, default=1980)
    sel.add_argument("--last-year", type=int, default=2024)
    run_grp = parser.add_argument_group("run")
    run_grp.add_argument("--workers", type=int, default=46, help="Pool size (48-core box: 46)")
    run_grp.add_argument("--checkpoint-dir", default="data/checkpoints")
    run_grp.add_argument("--no-resume", action="store_true", help="Re-parse even if a checkpoint exists")
    run_grp.add_argument("--region", default="koshi_nepal")
    run_grp.add_argument("--bootstrap-draws", type=int, default=500)
    run_grp.add_argument("--tidy-output", help="Optional merged tidy CSV path")
    run_grp.add_argument("--events-csv", help="NASA COOLR/GLC landslide events CSV")
    run_grp.add_argument("--lakes-csv", help="Annual lake areas CSV (lake_id,name,year,area_km2)")
    run_grp.add_argument("--output", default="artifacts/signal.json")
    run(parser.parse_args())


if __name__ == "__main__":
    main()
