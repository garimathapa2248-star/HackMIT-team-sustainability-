"""Dependency-free checks for NOAA AA1–AA4 cleaning.

Run with ``python -m signals.selftest``.
"""
from __future__ import annotations

import csv
import tempfile
from pathlib import Path

from .ingest import load_noaa_global_hourly, parse_aa


def main() -> None:
    assert parse_aa("01,0100,1,1") == (1, 10.0)
    assert parse_aa("01,9999,1,1") is None
    assert parse_aa("01,0100,1,3") is None

    with tempfile.TemporaryDirectory() as tmp:
        source = Path(tmp) / "station.csv"
        with source.open("w", newline="") as handle:
            writer = csv.DictWriter(
                handle, fieldnames=["STATION", "DATE", "AA1", "AA2", "AA3", "AA4"]
            )
            writer.writeheader()
            writer.writerow({
                "STATION": "TEST",
                "DATE": "2024-09-27T01:00:00Z",
                "AA1": "01,0100,1,1",
                "AA2": "06,0200,1,1",
                "AA3": "01,0100,1,1",
                "AA4": "01,9999,1,1",
            })
            writer.writerow({
                "STATION": "TEST",
                "DATE": "2024-09-27T02:00:00Z",
                "AA1": "01,0050,1,1",
                "AA2": "",
                "AA3": "",
                "AA4": "",
            })

        rows = load_noaa_global_hourly(source)
        assert rows == [{"station_id": "TEST", "date": "2024-09-27", "precip_mm": 15.0}]

    print("ALL SIGNAL CLEANING CHECKS PASSED")


if __name__ == "__main__":
    main()
