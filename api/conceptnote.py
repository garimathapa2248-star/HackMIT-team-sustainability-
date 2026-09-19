"""GCF-shaped concept note filled only from artifacts."""
from __future__ import annotations

from . import loader


def _n(v, spec=","):
    if v is None:
        return "not available"
    try:
        if spec == ",":
            return f"{float(v):,.0f}"
        return format(float(v), spec)
    except (TypeError, ValueError):
        return str(v)


def render() -> str:
    signal = loader.load("signal") or {}
    plan = loader.load("plan") or {}
    backtest = loader.load("backtest") or {}
    h = signal.get("headline") or {}
    t = plan.get("totals") or {}
    ls = signal.get("landslide_trigger") or {}
    lakes = signal.get("lake_growth") or []
    lake_line = ", ".join(
        f"{x.get('name')} +{x.get('pct_growth')}%" for x in lakes
    ) or "not available"
    csi = backtest.get("critical_success_index")
    csi_line = (
        f"CSI {csi} (event {backtest.get('event_date')})"
        if csi is not None
        else "SAR backtest not yet validated — critical_success_index is null; this note does not invent a score."
    )
    haz_note = "Hazard/candidates are screening-grade until the DEM/HAND twin replaces artifacts/hazard.geojson."
    return f"""# Concept note — nature-based defense, Koshi (Nepal)

**Instrument:** Green Climate Fund / Adaptation Fund screening note (auto-filled)
**Status:** {(plan.get('provenance') or {}).get('data_status', 'model output')}

## 1. Problem

Monsoon floods, rainfall-triggered landslides, and glacial-lake outburst risk concentrate below Tsho Rolpa in the Dudh Koshi. NOAA ISD annual maxima (GEV) show the early-period 1-in-100-year daily rainfall depth now has a fitted recurrence of **{h.get('new_return_period_yrs')} years** in the late-period sample ({h.get('early_period')} vs {h.get('late_period')}). Trend in annual maxima: **{_n((signal.get('trend') or {}).get('slope_mm_per_decade'), '.3f')} mm/decade**.

Observed lake-area change 1990–2024: {lake_line}.

## 2. Evidence

- **Stations:** {signal.get('stations_processed')} / **station-years:** {signal.get('station_years')} (NOAA ISD).
- **Return levels (mm):** {signal.get('return_levels_mm')} with bootstrapped 95% CIs.
- **Landslide:** {(ls.get('presentation') or 'rainfall classifier')}; AUC {ls.get('auc')} on {ls.get('n_events')} events, test {ls.get('test_period')}.
- **Backtest:** {csi_line}
- **Hazard layer:** {haz_note}

## 3. Intervention

Portfolio of nature-based parcels (vetiver, bamboo, afforestation, floodplain/wetland restore, riverbank bioengineering) selected by marginal greedy triple-return per dollar with per-cell EAL capping and Monte-Carlo climate noise from the GEV 100-year CI.

## 4. Budget and expected impact

| Item | Value |
|---|---|
| Budget (USD) | {_n(plan.get('budget_usd'))} |
| Mode | {plan.get('mode')} |
| Parcels selected | {len(plan.get('selected') or [])} |
| Spend (USD) | {_n(t.get('cost_usd'))} |
| Annual expected people-risk avoided | {_n(t.get('people_protected'), '.1f')} |
| CO₂ sequestered, 10 yr (t) | {_n(t.get('co2_t_10yr'))} |
| Household income (USD/yr) | {_n(t.get('income_usd_yr'))} |
| Households benefiting | {_n(t.get('households_benefiting'))} |

`people_protected` is **annual expected people-risk avoided**, not a count of unique lives.

## 5. M&E

Satellite MRV: annual NDWI lake area, Sentinel-1 flood extent after events, parcel presence via high-res optical. Re-run EVT as NOAA ISD updates.

## 6. Citations (screening-grade factors)

See `plan.provenance.factors` for per-type cost, efficacy, carbon, and income sources.
"""
