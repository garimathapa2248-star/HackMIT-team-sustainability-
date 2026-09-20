"""Rainfall intensity-duration landslide trigger from labeled events + station rain.

Joins each NASA COOLR/GLC landslide event to antecedent rainfall at the nearest
NOAA station, then fits a power-law ``I = a * D^b`` (I in mm/h, D in hours) in
log space.  A held-out *temporal* split gives the AUC.  Present the result as a
rainfall classifier (out-of-sample AUC), not as a Caine-style threshold: the
fitted exponent is often the inverse of classic Caine.

Fails closed: fewer than ``min_events`` usable events (or too few on either
side of the temporal split) returns the contract's null payload, never a fit.
"""
from __future__ import annotations

import csv
from datetime import date, timedelta
from math import asin, cos, radians, sin, sqrt
from pathlib import Path

# Event duration proxy: the consecutive wet-day spell ending on the event date
# (days with >= WET_DAY_MM rain, looking back up to MAX_SPELL_DAYS).  Isolated
# cloudbursts give D = 1 day; week-long monsoon spells give D up to 7 days, so
# real events spread across durations instead of collapsing onto one window.
WET_DAY_MM = 1.0
MAX_SPELL_DAYS = 7
MAX_STATION_KM = 50.0
MIN_EVENTS = 10

# Honesty labels: the fitted power law often has *positive* b, which is the
# inverse of the classic Caine I–D threshold (b < 0).  The defensible claim is
# the held-out rainfall classifier AUC, not a physical threshold curve.
_HONESTY = {
    "kind": "rainfall_classifier",
    "presentation": "rainfall classifier, AUC out-of-sample — not a Caine-style I–D threshold",
    "note": (
        "Fitted exponent b can be positive (inverse of classic Caine I = a·D^b with b<0). "
        "Do not present the power law as a physical intensity–duration threshold; "
        "the claim that survives scrutiny is the held-out rainfall-classifier AUC."
    ),
}


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in kilometres."""
    r = 6371.0
    dlat, dlon = radians(lat2 - lat1), radians(lon2 - lon1)
    h = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return 2 * r * asin(sqrt(h))


def _pick(row: dict, *names: str) -> str:
    lowered = {k.strip().lower(): v for k, v in row.items() if k}
    for name in names:
        if name in lowered and str(lowered[name]).strip():
            return str(lowered[name]).strip()
    return ""


def load_events_csv(path: str | Path) -> list[dict[str, object]]:
    """Read landslide events into ``{lat, lon, date}`` rows (tolerant headers)."""
    events = []
    with Path(path).open(newline="", encoding="utf-8-sig") as handle:
        for row in csv.DictReader(handle):
            try:
                lat = float(_pick(row, "lat", "latitude"))
                lon = float(_pick(row, "lon", "long", "longitude", "lng"))
            except ValueError:
                continue
            day = _pick(row, "date", "event_date", "eventdate")[:10]
            try:
                date.fromisoformat(day)
            except ValueError:
                continue
            events.append({"lat": lat, "lon": lon, "date": day})
    return events


def _daily_index(rows: list[dict[str, object]]) -> dict[str, dict[str, float]]:
    """Index tidy station rows as ``{station_id: {date: max precip_mm}}``."""
    index: dict[str, dict[str, float]] = {}
    for row in rows:
        try:
            station, day, value = str(row["station_id"]), str(row["date"])[:10], float(row["precip_mm"])
        except (KeyError, TypeError, ValueError):
            continue
        if value < 0:
            continue
        per_day = index.setdefault(station, {})
        per_day[day] = max(per_day.get(day, value), value)
    return index


def _antecedent(per_day: dict[str, float], day: str, window: int) -> float:
    end = date.fromisoformat(day)
    return sum(per_day.get((end - timedelta(days=k)).isoformat(), 0.0) for k in range(window))


def _nearest_station(lat: float, lon: float, coords: dict[str, tuple[float, float]]) -> tuple[str, float] | None:
    best: tuple[str, float] | None = None
    for station, (slat, slon) in coords.items():
        dist = haversine_km(lat, lon, slat, slon)
        if best is None or dist < best[1]:
            best = (station, dist)
    return best


def _auc_mann_whitney(pos: list[float], neg: list[float]) -> float:
    """P(score_pos > score_neg), ties at 0.5 — no sklearn needed."""
    import numpy as np

    p = np.asarray(pos, dtype=float)[:2000]
    n = np.asarray(neg, dtype=float)[:2000]
    wins = (p[:, None] > n[None, :]).sum() + 0.5 * (p[:, None] == n[None, :]).sum()
    return round(float(wins / (p.size * n.size)), 3)


def fit_trigger(events: list[dict[str, object]],
                tidy_rows: list[dict[str, object]],
                station_coords: dict[str, tuple[float, float]],
                max_km: float = MAX_STATION_KM,
                min_events: int = MIN_EVENTS) -> dict[str, object]:
    """Fit ``I = a * D^b`` and report held-out AUC in the contract shape."""
    null = {"form": "I = a * D^b", "a": None, "b": None, "n_events": 0, "auc": None, **_HONESTY}
    daily = _daily_index(tidy_rows)
    usable = [s for s in station_coords if s in daily]
    if not usable or not events:
        return null
    coords = {s: station_coords[s] for s in usable}

    points: list[tuple[str, float, float, str]] = []  # (date, D_h, I_mmh, station)
    skipped_far = skipped_gap = 0
    for event in events:
        nearest = _nearest_station(float(event["lat"]), float(event["lon"]), coords)
        if nearest is None or nearest[1] > max_km:
            skipped_far += 1
            continue
        station = nearest[0]
        per_day = daily[station]
        day = date.fromisoformat(str(event["date"]))
        spell, total = 0, 0.0
        for back in range(MAX_SPELL_DAYS):
            value = per_day.get((day - timedelta(days=back)).isoformat())
            if value is None:
                break  # data gap ends the spell
            if value < WET_DAY_MM and back > 0:
                break  # dry day ends the spell (the event day itself always counts)
            spell, total = spell + 1, total + value
        if spell == 0:
            skipped_gap += 1
            continue
        points.append((day.isoformat(), spell * 24.0, total / (spell * 24.0), station))
    if len(points) < min_events:
        return {**null, "n_events": len(points),
                "note": f"only {len(points)} usable events (< {min_events}); no fit emitted"}

    import numpy as np

    points.sort(key=lambda p: p[0])
    years = [int(p[0][:4]) for p in points]
    cutoff = sorted(years)[len(years) // 2]
    train = [p for p in points if int(p[0][:4]) < cutoff]
    test = [p for p in points if int(p[0][:4]) >= cutoff]
    if len(train) < 5 or len(test) < 5:
        # Too thin for a temporal split: fit on all, no AUC claim.
        train, test = points, []
    d = np.log10(np.array([p[1] for p in train]))
    i = np.log10(np.maximum(np.array([p[2] for p in train]), 1e-6))
    if float(d.std()) < 1e-6:
        return {**null, "n_events": len(points),
                "note": "trigger durations lack spread (all events in one window); no fit emitted"}
    slope, intercept = (float(v) for v in np.polyfit(d, i, 1))
    # ``a`` can be very small (steep power law), so keep 4 significant figures
    # instead of 3 decimals — otherwise it rounds to 0.0 and the printed law
    # ``I = a * D^b`` reads as broken.
    a, b = float(f"{10 ** intercept:.4g}"), round(slope, 3)

    auc = None
    if test:
        late_days = {p[0] for p in test}
        test_pos = [_antecedent(daily[p[3]], p[0], 3) for p in test]
        # Negatives: late-period station-days far in time from any late event.
        neg, rng_days = [], set()
        for p in test:
            base = date.fromisoformat(p[0])
            rng_days.update((base + timedelta(days=k)).isoformat() for k in range(-30, 31))
        for station in sorted({p[3] for p in test}):
            for day, value in daily[station].items():
                if day[:4] >= str(cutoff) and day not in rng_days and day not in late_days:
                    neg.append(value)
                    if len(neg) >= 10 * len(test_pos):
                        break
            if len(neg) >= 10 * len(test_pos):
                break
        if len(test_pos) >= 5 and len(neg) >= 10:
            auc = _auc_mann_whitney(test_pos, neg)

    return {
        "form": "I = a * D^b",
        "a": a,
        "b": b,
        "n_events": len(points),
        "auc": auc,
        "train_period": [min(int(p[0][:4]) for p in train), max(int(p[0][:4]) for p in train)],
        "test_period": [min(int(p[0][:4]) for p in test), max(int(p[0][:4]) for p in test)] if test else None,
        "skipped_far_from_station": skipped_far,
        "skipped_data_gap": skipped_gap,
        "max_station_km": max_km,
        **_HONESTY,
    }
