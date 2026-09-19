"""Command-line entry point for the signal artifact."""
from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path

from .analysis import fit_signal
from .ingest import load_noaa_global_hourly, write_tidy_csv


def _load_tidy(path: Path) -> list[dict[str, object]]:
    with path.open(newline="") as handle:
        return [{"station_id": r["station_id"], "date": r["date"], "precip_mm": float(r["precip_mm"])} for r in csv.DictReader(handle)]


def main() -> None:
    parser = argparse.ArgumentParser(description="Build RootLedger's EVT signal artifact.")
    parser.add_argument("--input", required=True, help="NOAA Global Hourly CSV/file directory or tidy CSV")
    parser.add_argument("--input-format", choices=("noaa", "tidy"), default="noaa")
    parser.add_argument("--region", default="koshi_nepal")
    parser.add_argument("--output", default="artifacts/signal.json")
    parser.add_argument("--tidy-output", help="Optional cleaned station-day CSV output")
    parser.add_argument("--bootstrap-draws", type=int, default=500)
    args = parser.parse_args()
    source = Path(args.input)
    rows = load_noaa_global_hourly(source) if args.input_format == "noaa" else _load_tidy(source)
    if args.tidy_output:
        write_tidy_csv(rows, args.tidy_output)
    result = fit_signal(rows, args.region, bootstrap_draws=args.bootstrap_draws)
    destination = Path(args.output)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(result, indent=2) + "\n")


if __name__ == "__main__":
    main()
