"""Evidence-labeled delivery briefs filled only from artifacts."""
from __future__ import annotations

import json
from pathlib import Path

from api import loader


def _n(v, spec=","):
    if v is None:
        return "not available"
    try:
        if spec == ",":
            return f"{float(v):,.0f}"
        return format(float(v), spec)
    except (TypeError, ValueError):
        return str(v)


def _all_levers(attr: dict) -> list[dict]:
    rows = []
    for key in ("government_levers", "community_levers", "household_levers"):
        rows.extend(row for row in (attr.get(key) or []) if isinstance(row, dict))
    return rows


def government_scorecard() -> str:
    attr = loader.load("attribution") or {}
    plan = loader.load("plan") or {}
    back = loader.load("backtest") or {}
    t = plan.get("totals") or {}
    levers = attr.get("government_levers") or []
    rows = "\n".join(
        f"- **{x.get('lever')}** — modeled portfolio spend ${_n(x.get('plan_spend_usd', x.get('fix_cost_usd')))}, "
        f"annual expected people-risk avoided {_n(x.get('annual_expected_people_risk_avoided', x.get('people_protected')), '.2f')}. "
        f"Evidence: {x.get('source', 'not available')}"
        for x in levers
    ) or "- No public-sector delivery lever is available in the current artifact."
    csi = back.get("critical_success_index")
    region = (loader.load("signal") or {}).get("region") or "watershed"
    hazard_method = (back.get("provenance") or {}).get("method") or (
        "Copernicus GLO-30 local-min HAND proxy; stage calibrated on this event"
    )
    return f"""# Preventive Measures Delivery Scorecard — {region}

**Portfolio status:** {(plan.get('provenance') or {}).get('data_status', 'model output')}
**Evidence labels:** observed data · model output · literature assumption · counterfactual simulation

## Governance boundary

No causal responsibility percentages are reported. The implementation-lead mapping is a planning assumption,
not an empirical attribution, legal assignment, or allocation of blame.

## Public-sector delivery levers
{rows}

## Modeled portfolio output

Spend ${_n(t.get('cost_usd'))} · annual expected people-risk avoided
{_n(t.get('people_protected'), '.1f')} (not unique people or observed lives saved) ·
{_n(t.get('co2_t_10yr'))} tCO₂ / 10 yr from literature factors.

## Hazard evidence

Observed UNOSAT Sentinel-1 extent is compared with a **local-min HAND proxy calibrated on this event**:
{hazard_method}. Calibration-event CSI {csi if csi is not None else "unavailable"}; this is not independent validation.

Counterfactual exposure is a simulation, not an observed outcome: {back.get('counterfactual')}.
"""


def citizen_brief() -> str:
    attr = loader.load("attribution") or {}
    plan = loader.load("plan") or {}
    signal = loader.load("signal") or {}
    t = plan.get("totals") or {}
    h = signal.get("headline") or {}
    levers = _all_levers(attr)

    def bullets(items):
        return "\n".join(
            f"- **{x.get('lever')}** — provisional implementation lead: "
            f"{x.get('implementation_lead', x.get('owner', 'to be agreed'))}; "
            f"modeled spend ${_n(x.get('plan_spend_usd', x.get('fix_cost_usd')))}. "
            f"Evidence: {x.get('source', 'not available')}"
            for x in items
        ) or "- None in the current selected set."
    return f"""# Local Delivery Brief — preventive measures

The 1-in-100-year daily rain of the earlier record now has a fitted recurrence of
**{h.get('new_return_period_yrs')} years** in the late Nepal-adjacent sample.
That is **model output from observed NOAA data**, not a forecast; the HMA-pooled fit did not show the same shift.

## Proposed measures

{bullets(levers)}

Implementation leads are governance assumptions that require consultation. This brief does not assign causal
responsibility percentages to government, communities, or households.

## What the model estimates

- Annual expected people-risk avoided: **{_n(t.get('people_protected'), '.1f')}** — model output, not unique people or observed lives saved.
- Ten-year carbon: **{_n(t.get('co2_t_10yr'))} tCO₂** — model output from literature factors.
- Annual livelihood-income potential: **${_n(t.get('income_usd_yr'))}** — model output from per-hectare assumptions, not measured income, wages, jobs, beneficiaries, or households reached.

Before implementation, verify parcel boundaries, land tenure, measure suitability, delivery roles, safeguards,
costs, and participant consent on the ground.
"""


def write(root: Path | str = ".") -> dict:
    root = Path(root)
    art = root / "artifacts"
    art.mkdir(exist_ok=True)
    g = government_scorecard()
    c = citizen_brief()
    (art / "government_scorecard.md").write_text(g)
    (art / "citizen_brief.md").write_text(c)
    return {"government_scorecard": str(art / "government_scorecard.md"), "citizen_brief": str(art / "citizen_brief.md")}
