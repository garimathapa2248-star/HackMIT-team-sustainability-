"""Grounded tools the agent may call. Numbers come only from artifacts."""
from __future__ import annotations

from api import loader
from optimize.economics import eal_reduction_frac, parcel_cost
from optimize.portfolio import optimize as run_opt


def _evidence_field(row: dict, *names: str):
    for name in names:
        value = row.get(name)
        if value not in (None, "", [], {}):
            return value
    return None


def get_signal() -> dict:
    return loader.load("signal") or {}


def get_hazard_summary() -> dict:
    haz = loader.load("hazard") or {}
    feats = haz.get("features") or []
    pops = [float((f.get("properties") or {}).get("population") or 0) for f in feats]
    eals = [float((f.get("properties") or {}).get("eal_people") or 0) for f in feats]
    return {
        "n_cells": len(feats),
        "population_sum": round(sum(pops), 1),
        "eal_people_sum": round(sum(eals), 3),
        "osm_assets": (haz.get("provenance") or {}).get("osm_assets"),
        "data_status": (haz.get("provenance") or {}).get("data_status"),
    }


def rank_cells(metric: str = "eal_people", n: int = 5) -> list[dict]:
    haz = loader.load("hazard") or {}
    rows = []
    for f in haz.get("features") or []:
        p = f.get("properties") or {}
        rows.append({
            "cell_id": p.get("cell_id"),
            "value": p.get(metric),
            "population": p.get("population"),
            "observed_flood_frac": p.get("observed_flood_frac"),
        })
    rows.sort(key=lambda r: float(r["value"] or 0), reverse=True)
    return rows[:n]


def explain_parcel(parcel_id: str) -> dict:
    plan = loader.load("plan") or {}
    cands = {c["parcel_id"]: c for c in (loader.load("candidates") or [])}
    selected = {s["parcel_id"]: s for s in plan.get("selected") or []}
    parcel = cands.get(parcel_id)
    if not parcel:
        return {"parcel_id": parcel_id, "error": "not in candidates"}
    selected_row = selected.get(parcel_id)
    return {
        "parcel_id": parcel_id,
        "in_plan": selected_row is not None,
        "type": parcel.get("type"),
        "area_ha": parcel.get("area_ha"),
        "centroid": parcel.get("centroid"),
        "slope_deg": parcel.get("slope_deg"),
        "landcover": parcel.get("landcover"),
        "cost_usd": parcel_cost(parcel),
        "eal_reduction_frac": eal_reduction_frac(parcel),
        "cell_ids": parcel.get("cell_ids"),
        "suitability": _evidence_field(
            parcel,
            "suitability",
            "suitability_evidence",
            "suitability_reason",
            "suitability_reasons",
            "suitability_score",
            "selection_reason",
            "rationale",
            "why_suitable",
        ),
        "suitability_score": parcel.get("suitability_score"),
        "suitability_evidence": parcel.get("suitability_evidence"),
        "rationale": parcel.get("rationale"),
        "risk_driver": _evidence_field(
            parcel,
            "risk_driver",
            "risk_drivers",
            "triggering_hazard",
            "primary_hazard",
            "hazard_driver",
        ),
        "triggering_hazard": parcel.get("triggering_hazard"),
        "evidence": _evidence_field(
            parcel,
            "evidence",
            "evidence_source",
            "evidence_sources",
            "data_sources",
            "source",
            "provenance",
            "verification",
            "required_verification",
        ),
        "data_status": parcel.get("data_status"),
        "provenance": parcel.get("provenance"),
        "verification": parcel.get("verification", parcel.get("required_verification")),
        "selected_row": selected_row,
    }


def run_optimize(budget: float, mode: str = "expected") -> dict:
    plan = run_opt(budget=budget, mode=mode, root=loader.ROOT, draws=120)
    loader.save_plan(plan)
    return {
        "mode": plan.get("mode"),
        "n_selected": len(plan.get("selected") or []),
        "totals": plan.get("totals"),
        "cvar": plan.get("cvar"),
    }


def get_backtest() -> dict:
    return loader.load("backtest") or {}


TOOLS = {
    "get_signal": get_signal,
    "get_hazard_summary": get_hazard_summary,
    "rank_cells": rank_cells,
    "explain_parcel": explain_parcel,
    "run_optimize": run_optimize,
    "get_backtest": get_backtest,
}

SCHEMAS = [
    {"name": "get_signal", "description": "Return the EVT signal artifact.", "input_schema": {"type": "object", "properties": {}}},
    {"name": "get_hazard_summary", "description": "Summarise hazard cells.", "input_schema": {"type": "object", "properties": {}}},
    {"name": "rank_cells", "description": "Rank hazard cells by a numeric property.", "input_schema": {"type": "object", "properties": {"metric": {"type": "string"}, "n": {"type": "integer"}}}},
    {"name": "explain_parcel", "description": "Explain a candidate parcel using its suitability, risk-driver, coordinates, and evidence fields when available.", "input_schema": {"type": "object", "properties": {"parcel_id": {"type": "string"}}, "required": ["parcel_id"]}},
    {"name": "run_optimize", "description": "Re-run the portfolio optimizer.", "input_schema": {"type": "object", "properties": {"budget": {"type": "number"}, "mode": {"type": "string"}}}},
    {"name": "get_backtest", "description": "Return UNOSAT CSI backtest numbers.", "input_schema": {"type": "object", "properties": {}}},
]
