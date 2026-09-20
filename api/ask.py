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


def _first_field(row: dict, *names: str):
    for name in names:
        value = row.get(name)
        if value not in (None, "", [], {}):
            if isinstance(value, list):
                shown = ", ".join(str(item) for item in value[:3])
                return shown + (f" (+{len(value) - 3} more)" if len(value) > 3 else "")
            if isinstance(value, dict):
                items = list(value.items())
                shown = "; ".join(f"{key}: {val}" for key, val in items[:5])
                return shown + (f"; +{len(items) - 5} more fields" if len(items) > 5 else "")
            return value
    return None


def _parcel_ids(question: str) -> list[str]:
    ids = []
    for match in re.finditer(r"\b(?:blr_p|p)_[a-z0-9_-]+\b", question, re.IGNORECASE):
        pid = match.group(0).lower()
        if pid not in ids:
            ids.append(pid)
    for match in re.finditer(r"\b(?:(blr)_)?p[_-]?(\d+)\b", question, re.IGNORECASE):
        prefix, digits = match.groups()
        pid = f"blr_p_{int(digits):04d}" if prefix else f"p_{int(digits):04d}"
        if pid not in ids:
            ids.append(pid)
    for match in re.finditer(r"\bparcel\s+(?:p[_-]?)?(\d+)\b", question, re.IGNORECASE):
        pid = f"p_{int(match.group(1)):04d}"
        if pid not in ids:
            ids.append(pid)
    return ids


def _parcel_evidence(parcel: dict, selected: dict | None = None) -> str:
    selected = selected or {}
    suitability_score = _first_field(
        parcel,
        "suitability_score",
    ) or _first_field(selected, "suitability_score")
    suitability_basis = _first_field(
        parcel,
        "suitability",
        "suitability_evidence",
        "suitability_reason",
        "suitability_reasons",
        "selection_reason",
        "rationale",
        "why_suitable",
    ) or _first_field(
        selected,
        "suitability",
        "suitability_evidence",
        "suitability_reason",
        "selection_reason",
        "rationale",
    )
    if suitability_basis is None:
        suitability_basis = (
            f"candidate inputs slope={_fmt(parcel.get('slope_deg'))}°, "
            f"landcover={parcel.get('landcover', 'not available')}"
        )
    suitability = (
        f"score {suitability_score}; {suitability_basis}"
        if suitability_score is not None
        else str(suitability_basis)
    )
    risk_driver = _first_field(
        parcel,
        "risk_driver",
        "risk_drivers",
        "triggering_hazard",
        "primary_hazard",
        "hazard_driver",
    ) or _first_field(
        selected,
        "risk_driver",
        "risk_drivers",
        "triggering_hazard",
        "primary_hazard",
    )
    evidence = _first_field(
        parcel,
        "evidence",
        "evidence_source",
        "evidence_sources",
        "data_sources",
        "source",
        "provenance",
        "verification",
        "required_verification",
    ) or _first_field(
        selected,
        "evidence",
        "evidence_source",
        "evidence_sources",
        "source",
        "provenance",
        "verification",
        "required_verification",
    )
    verification = _first_field(
        parcel,
        "verification",
        "required_verification",
    ) or _first_field(selected, "verification", "required_verification")
    centroid = parcel.get("centroid")
    coordinates = (
        f"{centroid[1]}, {centroid[0]} (lat, lon)"
        if isinstance(centroid, list) and len(centroid) >= 2
        else "not available"
    )
    return (
        f"suitability={suitability}; risk driver={risk_driver or 'not available'}; "
        f"evidence={evidence or 'not available'}; coordinates={coordinates}; "
        f"cells={parcel.get('cell_ids', 'not available')}; "
        f"verification={verification or 'not available'}"
    )


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

    if any(w in low for w in ("100-year", "100 year", "return period", "evt", "gev", "rainfall", "storm", "signal", "tail", "station-year", "station year", "stations")):
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

    glacial = "imja" in low or "rolpa" in low or "thulagi" in low
    if glacial or ("lake" in low and signal.get("lake_growth")):
        have("signal.json")
        bits = []
        for lake in signal.get("lake_growth") or []:
            bits.append(
                f"{lake.get('name')}: {lake.get('area_km2_first')} → {lake.get('area_km2_last')} km² "
                f"({lake.get('first_year')}–{lake.get('last_year')}), {lake.get('pct_growth')}% growth"
            )
        return {"answer": "; ".join(bits) or "No lake_growth on the signal artifact.", "sources": used, "invented": False}

    parcel_ids = _parcel_ids(low)
    if parcel_ids or "parcel" in low or "why plant" in low or "why this" in low:
        have("plan.json", "candidates.json")
        selected_rows = plan.get("selected") or []
        selected = {
            row.get("parcel_id"): row
            for row in selected_rows
            if isinstance(row, dict) and row.get("parcel_id")
        }
        ranks = {row.get("parcel_id"): rank for rank, row in enumerate(selected_rows, start=1)}
        cand = {
            row.get("parcel_id"): row
            for row in candidates
            if isinstance(row, dict) and row.get("parcel_id")
        } if isinstance(candidates, list) else {}
        if parcel_ids:
            explanations = []
            for pid in parcel_ids:
                parcel = cand.get(pid)
                selection = selected.get(pid)
                if parcel is None:
                    explanations.append(
                        f"{pid}: not present in candidates; no reason can be inferred"
                    )
                    continue
                if selection is None:
                    status = (
                        "not selected in the current plan; the artifacts do not provide "
                        "a causal rejection reason"
                    )
                else:
                    status = (
                        f"selected at priority {ranks[pid]} by the optimizer; "
                        f"cost=${_fmt(selection.get('cost_usd'))}, annual expected people-risk avoided="
                        f"{_fmt(selection.get('avoided_eal_people'))}, CO₂={_fmt(selection.get('co2_t_10yr'))} "
                        f"t/10yr, livelihood-income potential=${_fmt(selection.get('income_usd_yr'))}/yr"
                    )
                explanations.append(
                    f"{pid}: {status}; type={parcel.get('type', 'not available')}; "
                    f"area={_fmt(parcel.get('area_ha'))} ha; {_parcel_evidence(parcel, selection)}"
                )
            prefix = (
                "The selected order is optimizer output, not observed causal proof. "
                if any(pid in selected for pid in parcel_ids)
                else ""
            )
            return {
                "answer": prefix + " ".join(explanations),
                "sources": used,
                "invented": False,
            }
        top = (plan.get("selected") or [])[:3]
        if not top:
            return {"answer": "The current plan has no selected parcels.", "sources": used, "invented": False}
        lines = []
        for rank, selection in enumerate(top, start=1):
            pid = selection.get("parcel_id")
            parcel = cand.get(pid) or {}
            lines.append(
                f"#{rank} {pid}: ${_fmt(selection.get('cost_usd'))}, annual expected people-risk "
                f"{_fmt(selection.get('avoided_eal_people'))}; {_parcel_evidence(parcel, selection)}"
            )
        return {
            "answer": "Top selected parcels (model output): " + "; ".join(lines),
            "sources": used,
            "invented": False,
        }

    if any(w in low for w in ("csi", "backtest", "sentinel", "sar", "2024", "counterfactual")):
        have("backtest.json")
        csi = backtest.get("critical_success_index")
        cf = backtest.get("counterfactual") or {}
        if csi is None:
            text = (
                "Backtest CSI is not available. The artifact says "
                f"{(backtest.get('provenance') or {}).get('data_status', 'unvalidated')}. "
                "I will not invent a score."
            )
        else:
            text = (
                f"Event {backtest.get('event_date')}: CSI={csi}, POD={backtest.get('hit_rate_pod')}, "
                f"FAR={backtest.get('false_alarm_ratio')}. "
                "The flood method is a Copernicus GLO-30 local-min HAND proxy with stage calibrated "
                "on this event, so these are calibration-event metrics, not independent validation."
            )
        if cf.get("people_exposed_baseline") is not None:
            text += (
                f" Counterfactual simulation exposure {cf.get('people_exposed_baseline')} → "
                f"{cf.get('people_exposed_with_plan')} ({cf.get('reduction_pct')}% reduction); "
                "this is not an observed outcome or unique lives."
            )
        return {"answer": text, "sources": used, "invented": False}

    if "pot" in low or "gpd" in low or "imerg" in low:
        have("signal.json")
        pot = signal.get("pot_gpd") or {}
        imerg = signal.get("imerg") or {}
        return {
            "answer": f"POT/GPD: {pot}. IMERG: {imerg.get('reason') or imerg}.",
            "sources": used,
            "invented": False,
        }

    if any(w in low for w in (
        "prevent", "interven", "measure", "wetland", "lake", "drain", "rajakaluve",
        "what can", "what should", "nature-based", "nbs", "plant", "defense", "defence",
    )):
        have("plan.json", "candidates.json", "backtest.json")
        selected = plan.get("selected") or []
        cand = {c["parcel_id"]: c for c in candidates} if isinstance(candidates, list) else {}
        mix: dict[str, dict] = {}
        for s in selected:
            kind = (cand.get(s["parcel_id"]) or {}).get("type") or "unknown"
            row = mix.setdefault(kind, {"n": 0, "cost": 0.0, "people": 0.0, "ha": 0.0})
            row["n"] += 1
            row["cost"] += float(s.get("cost_usd") or 0)
            row["people"] += float(s.get("avoided_eal_people") or 0)
            row["ha"] += float((cand.get(s["parcel_id"]) or {}).get("area_ha") or 0)
        if not mix:
            return {"answer": "The current city pack has no selected parcels.", "sources": used, "invented": False}
        parts = [
            f"{k}: {v['n']} parcels, {v['ha']:.1f} ha, ${v['cost']:,.0f}, "
            f"people-risk avoided {v['people']:.1f}/yr"
            for k, v in sorted(mix.items(), key=lambda kv: -kv[1]["people"])
        ]
        t = plan.get("totals") or {}
        hazard_method = (backtest.get("provenance") or {}).get("method") or (
            "Copernicus GLO-30 local-min HAND proxy; stage calibrated on this event"
        )
        text = (
            f"Preventive NbS in the current ${ _fmt(plan.get('budget_usd')) } plan "
            f"({len(selected)} parcels, spend ${_fmt(t.get('cost_usd'))}): "
            + "; ".join(parts)
            + ". people_protected is annual expected people-risk avoided, not unique lives. "
            f"Hazard basis: {hazard_method}. This is a local-min HAND proxy calibrated on this event, "
            "not Whitebox HAND or an independently validated hydrodynamic model."
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
            "with carbon and livelihood income computed from literature factors. "
            "people_protected is expected people-risk avoided, not unique people or observed lives saved. "
            "The artifacts do not support a households-reached claim."
        )
        note = (plan.get("provenance") or {}).get("candidates_note")
        if note:
            text += " " + note
        return {"answer": text, "sources": used, "invented": False}

    if "responsible" in low or "government" in low or "attribution" in low:
        have("attribution.json")
        levers = []
        for key in ("government_levers", "community_levers", "household_levers"):
            for row in attribution.get(key) or []:
                if not isinstance(row, dict):
                    continue
                levers.append(
                    f"{row.get('lever')} (provisional lead "
                    f"{row.get('implementation_lead', row.get('owner', 'not available'))})"
                )
        text = (
            "The artifacts do not support causal responsibility percentages, so none are reported. "
            "Available implementation-role assumptions: "
            + ("; ".join(levers) if levers else "none")
            + ". These roles require local confirmation and are not an assignment of blame."
        )
        return {"answer": text, "sources": used, "invented": False}

    have("signal.json", "plan.json")
    h = (signal.get("headline") or {}).get("new_return_period_yrs")
    t = (plan.get("totals") or {})
    text = (
        f"I only state numbers from artifacts. Headline recurrence is {h} years; "
        f"current plan spends ${_fmt(t.get('cost_usd'))} of ${_fmt(plan.get('budget_usd'))}. "
        "Ask about the signal, a selected preventive-measure ID, the plan, landslides, lakes, "
        "or the backtest."
    )
    return {"answer": text, "sources": used, "invented": False}
