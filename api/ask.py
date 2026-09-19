"""Grounded Q&A: only numbers that already exist on disk."""
from __future__ import annotations

import re

from . import loader


def _fmt(n) -> str:
    if n is None:
        return "not available"
    if isinstance(n, float):
        if abs(n) >= 100:
            return f"{n:,.0f}"
        return f"{n:g}"
    if isinstance(n, int):
        return f"{n:,}"
    return str(n)


def answer(question: str) -> dict:
    q = (question or "").strip()
    low = q.lower()
    signal = loader.load("signal") or {}
    plan = loader.load("plan") or {}
    backtest = loader.load("backtest") or {}
    attribution = loader.load("attribution") or {}
    candidates = loader.load("candidates") or []
    used = []

    def have(*keys):
        used.extend(keys)

    if any(w in low for w in ("100-year", "100 year", "return period", "evt", "gev", "rainfall", "storm", "signal", "tail")):
        have("signal.json")
        h = signal.get("headline") or {}
        t = signal.get("trend") or {}
        ls = signal.get("landslide_trigger") or {}
        text = (
            f"{h.get('statement')} "
            f"That is from {signal.get('stations_processed')} stations / "
            f"{signal.get('station_years')} station-years. "
            f"Annual-max trend is {_fmt(t.get('slope_mm_per_decade'))} mm/decade "
            f"(p={t.get('p_value')}). "
            f"Landslide is a rainfall classifier, not a Caine threshold: "
            f"AUC {_fmt(ls.get('auc'))} out-of-sample on {ls.get('n_events')} events."
        )
        return {"answer": text.strip(), "sources": used, "invented": False}

    if "landslide" in low or "auc" in low or "caine" in low:
        have("signal.json")
        ls = signal.get("landslide_trigger") or {}
        text = (
            f"{ls.get('presentation') or 'rainfall classifier'}. "
            f"n_events={ls.get('n_events')}, AUC={ls.get('auc')}, "
            f"train={ls.get('train_period')}, test={ls.get('test_period')}. "
            f"{ls.get('note') or ''}"
        )
        return {"answer": text.strip(), "sources": used, "invented": False}

    if "lake" in low or "imja" in low or "rolpa" in low or "thulagi" in low:
        have("signal.json")
        bits = []
        for lake in signal.get("lake_growth") or []:
            bits.append(
                f"{lake.get('name')}: {lake.get('area_km2_first')} → {lake.get('area_km2_last')} km² "
                f"({lake.get('first_year')}–{lake.get('last_year')}), {lake.get('pct_growth')}% growth"
            )
        return {"answer": "; ".join(bits) or "No lake_growth on the signal artifact.", "sources": used, "invented": False}

    m = re.search(r"p[_-]?(\d{4,})", low)
    if m or "parcel" in low or "why plant" in low or "why this" in low:
        have("plan.json", "candidates.json")
        pid = f"p_{m.group(1)}" if m else None
        selected = {s["parcel_id"]: s for s in plan.get("selected") or []}
        cand = {c["parcel_id"]: c for c in candidates} if isinstance(candidates, list) else {}
        if pid and pid in selected:
            s, c = selected[pid], cand.get(pid) or {}
            text = (
                f"{pid} is in the selected plan because it clears the triple-return/$ greedy with "
                f"no double-counted cell EAL. type={c.get('type', 'unknown')}, "
                f"cost=${_fmt(s.get('cost_usd'))}, avoided people-risk={_fmt(s.get('avoided_eal_people'))}/yr, "
                f"CO₂={_fmt(s.get('co2_t_10yr'))} t / 10yr, income=${_fmt(s.get('income_usd_yr'))}/yr. "
                f"Cells: {c.get('cell_ids')}."
            )
            return {"answer": text, "sources": used, "invented": False}
        if pid:
            return {
                "answer": f"{pid} is not in the current selected set. I will not invent a reason.",
                "sources": used,
                "invented": False,
            }
        top = (plan.get("selected") or [])[:3]
        if not top:
            return {"answer": "The current plan has no selected parcels.", "sources": used, "invented": False}
        lines = [f"{s['parcel_id']}: ${s['cost_usd']:,.0f}, people-risk {s['avoided_eal_people']}" for s in top]
        return {"answer": "Top selected parcels: " + "; ".join(lines), "sources": used, "invented": False}

    if any(w in low for w in ("csi", "backtest", "sentinel", "sar", "2024")):
        have("backtest.json")
        csi = backtest.get("critical_success_index")
        if csi is None:
            text = (
                "Backtest CSI is not available. The artifact says "
                f"{(backtest.get('provenance') or {}).get('data_status', 'unvalidated')}. "
                "I will not invent a score."
            )
        else:
            text = (
                f"Event {backtest.get('event_date')}: CSI={csi}, POD={backtest.get('hit_rate_pod')}, "
                f"FAR={backtest.get('false_alarm_ratio')}."
            )
        return {"answer": text, "sources": used, "invented": False}

    if any(w in low for w in ("budget", "plan", "people", "carbon", "income", "protect", "2m", "$2")):
        have("plan.json")
        t = plan.get("totals") or {}
        text = (
            f"Budget ${ _fmt(plan.get('budget_usd')) } ({plan.get('mode')} mode): "
            f"{len(plan.get('selected') or [])} parcels, spend ${_fmt(t.get('cost_usd'))}, "
            f"annual expected people-risk avoided {_fmt(t.get('people_protected'))}, "
            f"{_fmt(t.get('co2_t_10yr'))} tCO₂ / 10yr, ${_fmt(t.get('income_usd_yr'))}/yr income, "
            f"{_fmt(t.get('households_benefiting'))} households. "
            "people_protected is expected people-risk avoided, not unique lives."
        )
        note = (plan.get("provenance") or {}).get("candidates_note")
        if note:
            text += " " + note
        return {"answer": text, "sources": used, "invented": False}

    if "responsible" in low or "government" in low or "attribution" in low:
        have("attribution.json")
        text = (
            f"Responsibility split: government {attribution.get('government_pct')}%, "
            f"community {attribution.get('community_pct')}%, household {attribution.get('household_pct')}%. "
            f"{(attribution.get('provenance') or {}).get('data_status', '')}"
        )
        return {"answer": text, "sources": used, "invented": False}

    have("signal.json", "plan.json")
    h = (signal.get("headline") or {}).get("new_return_period_yrs")
    t = (plan.get("totals") or {})
    text = (
        f"I only state numbers from artifacts. Headline recurrence is {h} years; "
        f"current plan spends ${_fmt(t.get('cost_usd'))} of ${_fmt(plan.get('budget_usd'))}. "
        "Ask about the signal, a parcel id (p_0007), the plan, landslides, lakes, or the backtest."
    )
    return {"answer": text, "sources": used, "invented": False}
