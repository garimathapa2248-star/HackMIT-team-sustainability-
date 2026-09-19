"""Daily rainfall from Open-Meteo archive (ERA5-Land). No API key."""
from __future__ import annotations

import json
import urllib.parse
import urllib.request


def daily_precip(lat: float, lon: float, start="1980-01-01", end="2024-12-31") -> list[dict]:
    chunks = [("1980-01-01", "2001-12-31"), ("2002-01-01", "2024-12-31")]
    rows: list[dict] = []
    for a, b in chunks:
        q = urllib.parse.urlencode({
            "latitude": f"{lat:.4f}",
            "longitude": f"{lon:.4f}",
            "start_date": a,
            "end_date": b,
            "daily": "precipitation_sum",
            "timezone": "UTC",
        })
        url = "https://archive-api.open-meteo.com/v1/archive?" + q
        req = urllib.request.Request(url, headers={"User-Agent": "RootLedger/0.1"})
        with urllib.request.urlopen(req, timeout=90) as resp:
            data = json.loads(resp.read().decode())
        dates = data.get("daily", {}).get("time") or []
        vals = data.get("daily", {}).get("precipitation_sum") or []
        for d, v in zip(dates, vals):
            if v is None:
                continue
            rows.append({"station_id": "openmeteo_era5land", "date": d, "precip_mm": float(v)})
    return rows
