"""Government scorecard + citizen brief, filled only from artifacts."""
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


def government_scorecard() -> str:
    attr = loader.load("attribution") or {}
    plan = loader.load("plan") or {}
    back = loader.load("backtest") or {}
    t = plan.get("totals") or {}
    levers = attr.get("government_levers") or []
    rows = "\n".join(
        f"- **{x.get('lever')}** — {x.get('risk_share_pct')}% of modeled EAL, "
        f"fix ${ _n(x.get('fix_cost_usd')) }, people-risk {_n(x.get('people_protected'), '.2f')} "
        f"({x.get('source', '')})"
        for x in levers
    ) or "- No government lever in the selected set; flood/GLOF share is still assigned below."
    csi = back.get("critical_success_index")
    region = (loader.load("signal") or {}).get("region") or "watershed"
    return f"""# Government scorecard — {region} screening

**Status:** {(attr.get('provenance') or {}).get('data_status', 'model output')}

## Responsibility share
Government **{attr.get('government_pct')}%** of avoidable modeled EAL (flood + GLOF drivers).
Community {attr.get('community_pct')}% · household {attr.get('household_pct')}%.
This is a screening split from hazard + selected spend, not a legal assignment of blame.

## Levers
{rows}

## What the $2M plan does (not unique lives)
Spend ${_n(t.get('cost_usd'))} · annual expected people-risk avoided {_n(t.get('people_protected'), '.1f')} ·
{_n(t.get('co2_t_10yr'))} tCO₂ / 10 yr.

## Proof
CSI {csi if csi is not None else "null — not invented"} ({(back.get("provenance") or {}).get("data_status", "")}). Counterfactual
{back.get('counterfactual')}.
"""


def citizen_brief() -> str:
    attr = loader.load("attribution") or {}
    plan = loader.load("plan") or {}
    signal = loader.load("signal") or {}
    t = plan.get("totals") or {}
    h = signal.get("headline") or {}
    hh = attr.get("household_levers") or []
    com = attr.get("community_levers") or []
    def bullets(items):
        return "\n".join(
            f"- {x.get('lever')}: ${ _n(x.get('fix_cost_usd')) } in the current plan"
            for x in items
        ) or "- None in the current selected set."
    return f"""# Citizen brief — what this plan means on the ground

The 1-in-100-year daily rain of the earlier record now has a fitted recurrence of
**{h.get('new_return_period_yrs')} years** in the late sample. That is a GEV fit, not a forecast.

## What households can grow
{bullets(hh)}

Vetiver and bamboo are livelihood crops in this plan: the optimizer counts **${_n(t.get('income_usd_yr'))}/yr**
and **{_n(t.get('households_benefiting'))} households** as co-benefits, not as a wage guarantee.

## What communities hold
{bullets(com)}

## What is not on you
Government share is **{attr.get('government_pct')}%** (drainage, floodplain, GLOF outlet class of risk).
The model does not dump systemic flood risk on households.

`people_protected` is annual expected people-risk avoided, not a count of unique lives.
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
