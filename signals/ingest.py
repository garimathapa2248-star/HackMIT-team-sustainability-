"""Convert NOAA Global Hourly precipitation observations into daily station data.

The NOAA Global Hourly CSV exposes AA1--AA4 as comma-delimited period/depth/
condition/quality fields.  This module evaluates all four AA fields, then uses
the shortest non-overlapping windows so alternate accumulations do not
double-count the same rain.  It also supports an already-tidy input
(`station_id,date,precip_mm`) for test and cloud workflows.  It never silently
turns NOAA's 9999 sentinel into rainfall.
"""
from __future__ import annotations

import csv
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path
from typing import Iterable

VALID_PERIOD_HOURS = {1, 3, 6, 12, 24}
INVALID_QUALITY_CODES = {"2", "3", "6", "7", "8", "9"}


def _parse_timestamp(value: str) -> datetime | None:
    value = value.strip().replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return None


def parse_aa(value: str) -> tuple[int, float] | None:
    """Return `(accumulation_hours, mm)` from a valid NOAA AA precipitation field."""
    if not value:
        return None
    parts = value.split(",")
    if len(parts) < 2:
        return None
    try:
        period, depth = int(parts[0]), int(parts[1])
    except ValueError:
        return None
    quality = parts[3].strip() if len(parts) > 3 else ""
    if period not in VALID_PERIOD_HOURS or depth == 9999 or quality in INVALID_QUALITY_CODES:
        return None
    return period, depth / 10.0  # ISD AA depth is tenths of a millimetre.


def _daily_from_accumulations(observations: list[tuple[datetime, int, float]]) -> dict[str, float]:
    """Create daily totals without double-counting overlapping AA windows.

    For each observation end-time the shortest available accumulation is used;
    observations are then accepted only if their intervals do not overlap an
    already accepted interval.  This is conservative and auditable.  Records
    crossing midnight are apportioned by hours to their UTC dates.
    """
    accepted: list[tuple[datetime, datetime, float]] = []
    for end, period, depth in sorted(observations, key=lambda x: (x[0], x[1])):
        start = end - timedelta(hours=period)
        if any(start < other_end and end > other_start for other_start, other_end, _ in accepted):
            continue
        accepted.append((start, end, depth))
    totals: dict[str, float] = defaultdict(float)
    for start, end, depth in accepted:
        cursor = start
        hours = (end - start).total_seconds() / 3600
        while cursor < end:
            boundary = min(end, datetime.combine(cursor.date() + timedelta(days=1), datetime.min.time(), tzinfo=cursor.tzinfo))
            part_hours = (boundary - cursor).total_seconds() / 3600
            totals[cursor.date().isoformat()] += depth * part_hours / hours
            cursor = boundary
    return dict(totals)


def load_noaa_global_hourly(path: str | Path) -> list[dict[str, object]]:
    """Read one or more Global Hourly CSV files into tidy daily observations.

    Returns rows with `station_id`, `date`, and `precip_mm`.  A station-day is
    emitted only when a valid non-overlapping precipitation accumulation exists.
    """
    observations: dict[str, list[tuple[datetime, int, float]]] = defaultdict(list)
    paths = sorted(Path(path).glob("*.csv")) if Path(path).is_dir() else [Path(path)]
    for csv_path in paths:
        with csv_path.open(newline="", encoding="utf-8-sig") as handle:
            for row in csv.DictReader(handle):
                station = (row.get("STATION") or row.get("station_id") or "").strip()
                timestamp = _parse_timestamp(row.get("DATE", ""))
                if not station or timestamp is None:
                    continue
                # AA1–AA4 can contain alternate accumulation windows. Collect
                # every valid field; _daily_from_accumulations keeps the
                # shortest windows first and rejects overlaps.
                seen_at_timestamp: set[tuple[int, float]] = set()
                for field in ("AA1", "AA2", "AA3", "AA4"):
                    parsed = parse_aa(row.get(field, ""))
                    if parsed and parsed not in seen_at_timestamp:
                        observations[station].append((timestamp, *parsed))
                        seen_at_timestamp.add(parsed)
    output: list[dict[str, object]] = []
    for station, values in observations.items():
        for date, precip_mm in _daily_from_accumulations(values).items():
            output.append({"station_id": station, "date": date, "precip_mm": round(precip_mm, 3)})
    return sorted(output, key=lambda row: (str(row["station_id"]), str(row["date"])))


def write_tidy_csv(rows: Iterable[dict[str, object]], destination: str | Path) -> None:
    with Path(destination).open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=["station_id", "date", "precip_mm"])
        writer.writeheader()
        writer.writerows(rows)
