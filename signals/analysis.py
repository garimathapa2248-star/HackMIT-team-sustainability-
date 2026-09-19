"""Statistical signal extraction with an explicit, reproducible EVT workflow."""
from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone
from math import log
from typing import Iterable


def annual_maxima(rows: Iterable[dict[str, object]]) -> dict[int, float]:
    """Pool station-day rainfall by year using each station's annual maximum.

    Pooling station maxima avoids treating many stations from the same storm as
    independent daily samples.  For a watershed-wide analysis, aggregate the
    returned maxima by year (median by default in `fit_signal`).
    """
    by_station_year: dict[tuple[str, int], float] = {}
    for row in rows:
        try:
            station = str(row["station_id"])
            year = int(str(row["date"])[:4])
            value = float(row["precip_mm"])
        except (KeyError, TypeError, ValueError):
            continue
        if value < 0:
            continue
        key = (station, year)
        by_station_year[key] = max(by_station_year.get(key, value), value)
    per_year: dict[int, list[float]] = defaultdict(list)
    for (_, year), value in by_station_year.items():
        per_year[year].append(value)
    # A median annual station maximum is robust to one poorly sited gauge.
    return {year: _median(values) for year, values in per_year.items()}


def _median(values: list[float]) -> float:
    values = sorted(values)
    n = len(values)
    return values[n // 2] if n % 2 else (values[n // 2 - 1] + values[n // 2]) / 2


def _scipy():
    try:
        import numpy as np
        from scipy.stats import genextreme, linregress
        return np, genextreme, linregress
    except ImportError as exc:  # pragma: no cover - environment-dependent
        raise RuntimeError("Install signals/requirements.txt to run EVT analysis.") from exc


def _gev_return_level(parameters: tuple[float, float, float], period: int) -> float:
    _, genextreme, _ = _scipy()
    shape, loc, scale = parameters
    return float(genextreme.ppf(1 - 1 / period, shape, loc=loc, scale=scale))


def fit_gev(values: list[float], periods: tuple[int, ...] = (2, 5, 10, 25, 50, 100)) -> tuple[tuple[float, float, float], dict[str, float]]:
    _, genextreme, _ = _scipy()
    if len(values) < 10:
        raise ValueError("GEV requires at least 10 annual maxima; 20+ is preferred.")
    parameters = tuple(float(v) for v in genextreme.fit(values))
    if parameters[2] <= 0:
        raise ValueError("GEV fit returned a non-positive scale.")
    return parameters, {str(p): round(_gev_return_level(parameters, p), 3) for p in periods}


def bootstrap_return_levels(values: list[float], periods: tuple[int, ...], draws: int = 500, seed: int = 20260919) -> dict[str, list[float]]:
    np, genextreme, _ = _scipy()
    if draws < 100:
        raise ValueError("Use at least 100 bootstrap draws for a display interval.")
    rng = np.random.default_rng(seed)
    samples: dict[int, list[float]] = {p: [] for p in periods}
    array = np.asarray(values, dtype=float)
    for _ in range(draws):
        sample = rng.choice(array, size=len(array), replace=True)
        try:
            shape, loc, scale = genextreme.fit(sample)
            if scale <= 0:
                continue
            for period in periods:
                result = float(genextreme.ppf(1 - 1 / period, shape, loc=loc, scale=scale))
                if result > 0 and result < 10_000:
                    samples[period].append(result)
        except Exception:
            continue
    if min(map(len, samples.values())) < draws * 0.8:
        raise RuntimeError("Too many invalid bootstrap GEV fits; inspect annual maxima.")
    return {str(p): [round(float(np.quantile(samples[p], 0.025)), 3), round(float(np.quantile(samples[p], 0.975)), 3)] for p in periods}


def recurrence_in_late_climate(old_threshold_mm: float, late_parameters: tuple[float, float, float]) -> float:
    """Return recurrence interval (years) of an old-era event under late climate."""
    _, genextreme, _ = _scipy()
    shape, loc, scale = late_parameters
    exceedance = float(genextreme.sf(old_threshold_mm, shape, loc=loc, scale=scale))
    if not 0 < exceedance <= 1:
        raise ValueError("Old threshold lies outside the fitted late-period support.")
    return round(1 / exceedance, 2)


def trend(annual_by_year: dict[int, float]) -> dict[str, float]:
    _, _, linregress = _scipy()
    years = sorted(annual_by_year)
    if len(years) < 3:
        return {"metric": "annual_max_1day_precip_mm", "slope_mm_per_decade": None, "p_value": None}
    result = linregress(years, [annual_by_year[y] for y in years])
    return {"metric": "annual_max_1day_precip_mm", "slope_mm_per_decade": round(float(result.slope) * 10, 3), "p_value": round(float(result.pvalue), 5)}


def fit_signal(rows: list[dict[str, object]], region: str, early_end: int = 1999, late_start: int = 2000, bootstrap_draws: int = 500,
               landslide_events: list[dict[str, object]] | None = None,
               station_coords: dict[str, tuple[float, float]] | None = None,
               lake_series: list[dict[str, object]] | None = None) -> dict[str, object]:
    """Fit stationary GEVs by era and produce the integration-contract payload.

    This reports a change in fitted recurrence, not a causal attribution.  It
    fails closed when there is insufficient coverage to support the headline.
    Pass ``landslide_events`` + ``station_coords`` to fill the trigger fit, and
    ``lake_series`` to fill lake growth; all three default to the null payload.
    """
    from . import lakes, landslide
    annual = annual_maxima(rows)
    years = sorted(annual)
    early = [annual[y] for y in years if y <= early_end]
    late = [annual[y] for y in years if y >= late_start]
    all_values = [annual[y] for y in years]
    periods = (2, 5, 10, 25, 50, 100)
    _, levels = fit_gev(all_values, periods)
    headline: dict[str, object]
    if len(early) >= 10 and len(late) >= 10:
        old_parameters, old_levels = fit_gev(early, periods)
        late_parameters, _ = fit_gev(late, periods)
        old_threshold = old_levels["100"]
        new_period = recurrence_in_late_climate(old_threshold, late_parameters)
        headline = {
            "statement": f"The early-period 1-in-100-year daily rainfall depth now has a fitted recurrence of {new_period:g} years in the late-period sample.",
            "old_return_period_yrs": 100,
            "new_return_period_yrs": new_period,
            "threshold_mm": old_threshold,
            "early_period": [min(y for y in years if y <= early_end), early_end],
            "late_period": [late_start, max(y for y in years if y >= late_start)]
        }
    else:
        headline = {"statement": "Insufficient annual-maxima coverage for an early-versus-late recurrence comparison.", "old_return_period_yrs": 100, "new_return_period_yrs": None, "threshold_mm": levels["100"]}
    station_years = len({(str(r.get("station_id")), str(r.get("date"))[:4]) for r in rows if r.get("station_id") and r.get("date")})
    stations = len({str(r.get("station_id")) for r in rows if r.get("station_id")})
    if landslide_events and station_coords:
        trigger = landslide.fit_trigger(landslide_events, rows, station_coords)
    else:
        trigger = {"form": "I = a * D^b", "a": None, "b": None, "n_events": 0, "auc": None}
    growth = lakes.summarize_lake_growth(lake_series) if lake_series else []
    return {
        "region": region,
        "stations_processed": stations,
        "station_years": station_years,
        "return_levels_mm": levels,
        "return_levels_ci95": bootstrap_return_levels(all_values, periods, draws=bootstrap_draws),
        "headline": headline,
        "trend": trend(annual),
        "landslide_trigger": trigger,
        "lake_growth": growth,
        "provenance": {"datasets": ["NOAA Integrated Surface Database / Global Hourly"], "generated_utc": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"), "data_status": "model output — GEV fit to cleaned station observations", "method": "annual station maxima pooled by year using median; stationary GEV by era; non-parametric bootstrap"}
    }
