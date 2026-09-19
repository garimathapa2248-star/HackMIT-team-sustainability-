"""Select NOAA ISD stations for a region from ``isd-history.csv``.

NOAA's Global Hourly files are named by the 11-digit station id (6-digit USAF +
5-digit WBAN) and live at ``{year}/{station}.csv``.  ``isd-history.csv`` carries
each station's coordinates and its period of record, so filtering it to a
bounding box and a minimum start year gives exactly the station-years to parse.
This is the step that turns "600 GB of global data" into "the HMA subset we
actually need".
"""
from __future__ import annotations

import csv
from pathlib import Path
from typing import Iterable

# Bounding boxes as (lon_min, lat_min, lon_max, lat_max), EPSG:4326.
BBOXES: dict[str, tuple[float, float, float, float]] = {
    # Nepal + immediately adjacent India/China so the case-study basin is dense.
    "nepal_adjacent": (79.0, 25.0, 89.5, 31.5),
    # High Mountain Asia arc — the big "N station-years" scale story.
    "hma": (66.0, 24.0, 105.0, 41.0),
    # Koshi basin focus for the Tsho Rolpa case study.
    "koshi": (85.0, 26.0, 89.0, 29.0),
}


def station_id(usaf: str, wban: str) -> str:
    """Compose the 11-digit Global Hourly station id from USAF + WBAN."""
    return f"{usaf.strip():0>6}{wban.strip():0>5}"


def _year(value: str) -> int | None:
    value = value.strip()
    if len(value) >= 4 and value[:4].isdigit():
        return int(value[:4])
    return None


def select_stations(isd_history_csv: str | Path,
                    bbox: tuple[float, float, float, float] | str = "nepal_adjacent",
                    min_start_year: int = 1985,
                    min_years_record: int = 20) -> list[dict[str, object]]:
    """Return stations inside ``bbox`` with a long-enough record.

    ``bbox`` may be a preset name from ``BBOXES`` or an explicit
    ``(lon_min, lat_min, lon_max, lat_max)`` tuple.  ``min_years_record`` guards
    against gauges too short to fit a GEV.
    """
    if isinstance(bbox, str):
        bbox = BBOXES[bbox]
    lon_min, lat_min, lon_max, lat_max = bbox
    out: list[dict[str, object]] = []
    with Path(isd_history_csv).open(newline="", encoding="utf-8-sig") as handle:
        for row in csv.DictReader(handle):
            try:
                lat = float(row["LAT"])
                lon = float(row["LON"])
            except (KeyError, TypeError, ValueError):
                continue
            if not (lon_min <= lon <= lon_max and lat_min <= lat <= lat_max):
                continue
            begin, end = _year(row.get("BEGIN", "")), _year(row.get("END", ""))
            if begin is None or end is None or end - begin < min_years_record:
                continue
            out.append({
                "station": station_id(row.get("USAF", ""), row.get("WBAN", "")),
                "name": (row.get("STATION NAME") or row.get("STATION_NAME") or "").strip(),
                "lat": lat, "lon": lon, "elev_m": row.get("ELEV(M)", "").strip(),
                "begin": begin, "end": end,
            })
    out.sort(key=lambda s: s["station"])
    return out


def station_year_pairs(stations: Iterable[dict[str, object]],
                       first_year: int, last_year: int) -> list[tuple[str, int]]:
    """Expand stations into (station, year) tasks bounded by their record."""
    pairs: list[tuple[str, int]] = []
    for s in stations:
        lo = max(first_year, int(s["begin"]))
        hi = min(last_year, int(s["end"]))
        pairs.extend((str(s["station"]), y) for y in range(lo, hi + 1))
    return pairs


def _cli() -> None:
    import argparse
    import json
    parser = argparse.ArgumentParser(description="Select ISD stations for a region.")
    parser.add_argument("--isd-history", required=True, help="Path to isd-history.csv")
    parser.add_argument("--bbox", default="nepal_adjacent",
                        help="Preset name (nepal_adjacent|hma|koshi) or 'lonmin,latmin,lonmax,latmax'")
    parser.add_argument("--min-start-year", type=int, default=1985)
    parser.add_argument("--min-years-record", type=int, default=20)
    parser.add_argument("--first-year", type=int, default=1980)
    parser.add_argument("--last-year", type=int, default=2024)
    parser.add_argument("--output", help="Optional JSON station list output")
    args = parser.parse_args()
    bbox: tuple[float, float, float, float] | str = args.bbox
    if "," in args.bbox:
        parts = tuple(float(x) for x in args.bbox.split(","))
        bbox = parts  # type: ignore[assignment]
    stations = select_stations(args.isd_history, bbox, args.min_start_year, args.min_years_record)
    pairs = station_year_pairs(stations, args.first_year, args.last_year)
    print(f"{len(stations)} stations, {len(pairs)} station-years in {args.bbox}")
    if args.output:
        Path(args.output).write_text(json.dumps(stations, indent=2))
        print(f"wrote {args.output}")


if __name__ == "__main__":
    _cli()
