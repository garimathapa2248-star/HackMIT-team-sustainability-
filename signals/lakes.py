"""Glacial-lake growth summaries from annual water-area series.

The area time-series itself comes from a GEE export (Landsat/Sentinel-2 NDWI
water mask per ICIMOD dangerous lake per year); this module turns it into the
contract's per-lake first/last/growth summary.  Pure function, no credentials.
"""
from __future__ import annotations

import csv
from pathlib import Path


def _pick(row: dict, *names: str) -> str:
    lowered = {k.strip().lower(): v for k, v in row.items() if k}
    for name in names:
        if name in lowered and str(lowered[name]).strip():
            return str(lowered[name]).strip()
    return ""


def load_lake_series_csv(path: str | Path) -> list[dict[str, object]]:
    """Read annual lake areas into ``{lake_id, name, year, area_km2}`` rows."""
    series = []
    with Path(path).open(newline="", encoding="utf-8-sig") as handle:
        for row in csv.DictReader(handle):
            lake_id = _pick(row, "lake_id", "lakeid", "id") or _pick(row, "name", "lake_name")
            try:
                year = int(float(_pick(row, "year")))
                area = float(_pick(row, "area_km2", "area", "area_km"))
            except ValueError:
                continue
            if not lake_id or area <= 0:
                continue
            series.append({"lake_id": lake_id,
                           "name": _pick(row, "name", "lake_name") or lake_id,
                           "year": year, "area_km2": area})
    return series


def summarize_lake_growth(series: list[dict[str, object]]) -> list[dict[str, object]]:
    """Summarize each lake's first-to-last area change, steepest growth first."""
    by_lake: dict[str, list[dict[str, object]]] = {}
    for row in series:
        by_lake.setdefault(str(row["lake_id"]), []).append(row)
    out = []
    for lake_id, rows in by_lake.items():
        rows.sort(key=lambda r: int(r["year"]))
        first, last = rows[0], rows[-1]
        if int(last["year"]) == int(first["year"]) or float(first["area_km2"]) <= 0:
            continue
        growth = 100 * (float(last["area_km2"]) - float(first["area_km2"])) / float(first["area_km2"])
        out.append({
            "lake_id": lake_id,
            "name": str(first.get("name") or lake_id),
            "area_km2_first": round(float(first["area_km2"]), 3),
            "area_km2_last": round(float(last["area_km2"]), 3),
            "first_year": int(first["year"]),
            "last_year": int(last["year"]),
            "pct_growth": round(growth, 1),
        })
    out.sort(key=lambda r: float(r["pct_growth"]), reverse=True)
    return out
