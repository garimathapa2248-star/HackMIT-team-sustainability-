"""Extra OSS-inspired screening layers on RootLedger artifacts.

CLIMADA: exceedance, waterfall, event view, pathways.
Rhodium: regret across objective books × climates.
FloodAdapt: 30-year flood likelihood, measure catalog / O&M.
ThinkHazard: recommendations live in signals/hazard_classes.py.
"""
from __future__ import annotations

from collections import defaultdict
from typing import Any, Iterable

from . import economics, finance

DEPTH_THRESH_M = 0.05  # HAND proxy is centimetre-scale; not a 0.5 m damage threshold.
HIGH_EQUITY = 1.2
RPS = (2, 5, 10, 25, 50, 100)
EVENT_RPS = (10, 100)


def _quantile(sorted_vals: list[float], q: float) -> float:
    if not sorted_vals:
        return 0.0
    q = min(1.0, max(0.0, q))
    idx = int(round(q * (len(sorted_vals) - 1)))
    return float(sorted_vals[idx])


def exceedance(baseline_draws, residual_draws) -> dict[str, Any]:
    """Empirical people-risk exceedance from Monte-Carlo draws (CLIMADA freq curve analog)."""
    base = sorted(float(x) for x in (baseline_draws if getattr(baseline_draws, "size", 0) else []))
    resid = sorted(float(x) for x in (residual_draws if getattr(residual_draws, "size", 0) else []))
    points = []
    for rp in RPS:
        q = 1.0 - 1.0 / rp
        no_m = _quantile(base, q)
        with_p = _quantile(resid, q)
        points.append({
            "rp_yr": rp,
            "no_measures": round(no_m, 3),
            "with_plan": round(with_p, 3),
            "averted": round(max(0.0, no_m - with_p), 3),
        })
    eal_no = round(sum(base) / len(base), 3) if base else 0.0
    eal_with = round(sum(resid) / len(resid), 3) if resid else 0.0
    return {
        "unit": "annual_people_risk",
        "points": points,
        "eal_no_measures": eal_no,
        "eal_with_plan": eal_with,
        "method": (
            "Empirical (1-1/RP) quantile of Monte-Carlo annual people-risk. "
            "Not a CLIMADA Impact.calc_freq_curve run."
        ),
    }


def waterfall(baseline: float, people_protected: float, freq_mult: float) -> dict[str, Any]:
    present = float(baseline)
    future_no = present * float(freq_mult)
    climate_inc = future_no - present
    averted = float(people_protected) * float(freq_mult)
    residual_future = max(0.0, future_no - averted)
    closes = (100.0 * averted / climate_inc) if climate_inc > 0 else 0.0
    return {
        "present_year": finance.START_YEAR,
        "future_year": finance.END_YEAR,
        "present_people_risk": round(present, 3),
        "future_no_measures": round(future_no, 3),
        "climate_increment": round(climate_inc, 3),
        "development_increment": 0.0,
        "averted_by_plan": round(averted, 3),
        "residual_future": round(residual_future, 3),
        "adaptation_closes_pct_of_climate_increment": round(closes, 1),
        "note": (
            "CLIMADA-style waterfall with zero socioeconomic development. "
            "Measures keep today's fractional efficacy under the screening climate multiplier."
        ),
    }


def pathways(frontier: list[dict], selected: list[dict], baseline: float, budget: float) -> dict[str, Any]:
    if not frontier:
        return {"phases": [], "note": "Frontier unavailable."}
    n = len(frontier)
    picks = [frontier[max(0, n // 3 - 1)], frontier[max(0, (2 * n) // 3 - 1)], frontier[-1]]
    labels = (
        ("now", finance.START_YEAR, "Plant the no-regret core now."),
        ("if_tail_holds", 2035, "Add the next tranche if late-sample recurrence stays ≤ 10 yr."),
        ("full_2M", 2040, "Full $2M book."),
    )
    phases = []
    id_sets: list[set[str]] = []
    for (pid, year, blurb), row in zip(labels, picks):
        ids = list(row.get("parcel_ids") or [])
        id_sets.append(set(ids))
        people = float(row.get("people_protected") or 0)
        residual = max(0.0, float(baseline) - people)
        phases.append({
            "id": pid,
            "year": year,
            "budget_usd": row.get("budget_usd"),
            "cost_usd": row.get("cost_usd") or row.get("budget_usd"),
            "n_selected": row.get("n_selected") or len(ids),
            "people_protected": round(people, 3),
            "residual_people_risk": round(residual, 3),
            "parcel_ids": ids[:12],
            "blurb": blurb,
        })
    core = set.intersection(*id_sets) if id_sets and all(id_sets) else set()
    if not core and selected:
        # Fall back: parcels that survive expected vs CVaR are the transferable core.
        core = {row["parcel_id"] for row in selected if row.get("selected_in_both_objectives")}
    return {
        "trigger": "if late-sample recurrence of the early 100-yr depth stays ≤ 10 yr",
        "phases": phases,
        "transferable_core_n": len(core),
        "transferable_core": sorted(core)[:24],
        "note": (
            "Independent-benefit add like CLIMADA combine_measures on the greedy frontier. "
            "Per-cell overlap capping still applies within a phase. Not an adaptation-pathway solver."
        ),
    }


def regret(objectives: list[dict], freq_mult: float) -> dict[str, Any]:
    if not objectives:
        return {"table": [], "robust_pick": None}
    current_best = max(float(row.get("people_protected") or 0) for row in objectives)
    table = []
    for row in objectives:
        people = float(row.get("people_protected") or 0)
        intensified = people * float(freq_mult)
        tail = float(row.get("tail_people_protected") or people)
        rec = {
            "strategy": row.get("id"),
            "label": row.get("label"),
            "current": round(people, 3),
            "intensified_tail": round(intensified, 3),
            "cvar_tail": round(tail, 3),
            "regret_current": round(current_best - people, 3),
            "regret_intensified": round(current_best * float(freq_mult) - intensified, 3),
        }
        rec["max_regret_people"] = round(max(rec["regret_current"], rec["regret_intensified"]), 3)
        table.append(rec)
    robust = min(table, key=lambda r: (r["max_regret_people"], -r["current"]))
    return {
        "climates": ["current", "intensified_tail", "cvar_tail"],
        "metric": "people_protected",
        "table": table,
        "robust_pick": robust["strategy"],
        "note": (
            "Rhodium-style regret: each objective book scored in current vs GEV intensified_tail. "
            "Not a SWMM rainfall file. Intensified people-risk is the screening climate multiplier."
        ),
    }


def equity_split(selected: list[dict], remaining_by_cell: dict[str, float], hazard: dict[str, dict]) -> dict[str, Any]:
    high = other = 0.0
    for row in selected:
        people = float(row.get("avoided_eal_people") or 0)
        if float(row.get("equity_weight") or 1.0) >= HIGH_EQUITY:
            high += people
        else:
            other += people
    total = high + other
    resid_high = resid_all = 0.0
    for cid, cell in hazard.items():
        eal = float(cell.get("eal_people") or 0)
        remain = float(remaining_by_cell.get(cid, 1.0))
        resid_all += eal * remain
        if float(cell.get("equity_weight") or 1.0) >= HIGH_EQUITY:
            resid_high += eal * remain
    return {
        "method": "rural-dense proxy already on hazard cells; not CDC SVI",
        "high_equity_threshold": HIGH_EQUITY,
        "people_protected_high_equity": round(high, 3),
        "people_protected_other": round(other, 3),
        "share_of_benefit_high_equity_pct": round(100.0 * high / total, 1) if total else 0.0,
        "residual_share_high_equity_pct": round(100.0 * resid_high / resid_all, 1) if resid_all else 0.0,
        "note": "Who captured the avoided people-risk, using the existing 1.0–1.5× equity weight.",
    }


def event_view(hazard: dict[str, dict], remaining_by_cell: dict[str, float]) -> dict[str, Any]:
    no_m: dict[str, float] = {}
    with_p: dict[str, float] = {}
    for rp in EVENT_RPS:
        key = str(rp)
        exposed = 0.0
        remain = 0.0
        for cid, cell in hazard.items():
            depths = cell.get("flood_depth_m") or {}
            try:
                depth = float(depths.get(f"rp{rp}") or 0)
            except (TypeError, ValueError):
                continue
            if depth < DEPTH_THRESH_M:
                continue
            pop = float(cell.get("population") or 0)
            exposed += pop
            remain += pop * float(remaining_by_cell.get(cid, 1.0))
        no_m[key] = round(exposed, 1)
        with_p[key] = round(remain, 1)
    return {
        "return_periods": list(EVENT_RPS),
        "depth_threshold_m": DEPTH_THRESH_M,
        "no_measures": no_m,
        "with_plan": with_p,
        "note": (
            f"People in cells with HAND-proxy depth ≥ {DEPTH_THRESH_M} m at that RP. "
            "Not a 0.5 m building-damage threshold and not a CLIMADA event view."
        ),
    }


def flood_exceedance_30yr(hazard: dict[str, dict], remaining_by_cell: dict[str, float]) -> dict[str, Any]:
    """FloodAdapt infographic: P(damaging flood in 30 yr) > 50% ≈ damaging RP ≤ ~43 yr → rp10 cells."""
    no_m = with_p = 0.0
    n_cells = 0
    for cid, cell in hazard.items():
        depths = cell.get("flood_depth_m") or {}
        try:
            d10 = float(depths.get("rp10") or 0)
        except (TypeError, ValueError):
            continue
        if d10 < DEPTH_THRESH_M:
            continue
        pop = float(cell.get("population") or 0)
        no_m += pop
        with_p += pop * float(remaining_by_cell.get(cid, 1.0))
        n_cells += 1
    p30 = round(1.0 - (1.0 - 1.0 / 10.0) ** 30, 3)
    return {
        "period_yr": 30,
        "depth_threshold_m": DEPTH_THRESH_M,
        "p30_rp10": p30,
        "cells": n_cells,
        "people_likely_flooded_no_measures": round(no_m, 1),
        "people_likely_flooded_with_plan": round(with_p, 1),
        "p30_formula": "1-(1-1/RP)^30 on rp10 cells with HAND-proxy depth ≥ threshold",
        "note": (
            "FloodAdapt LikelyFlooded analog. Counts modeled people in rp10 cells, not unique homes. "
            "Threshold is 5 cm because this HAND proxy is centimetre-scale."
        ),
    }


def measure_catalog(selected: Iterable[dict]) -> list[dict[str, Any]]:
    counts: dict[str, dict[str, float]] = defaultdict(lambda: {"n": 0, "spend": 0.0})
    for row in selected:
        key = str(row.get("type") or "unknown")
        counts[key]["n"] += 1
        counts[key]["spend"] += float(row.get("cost_usd") or 0)
    catalog = []
    for factor in economics.factor_table():
        name = str(factor["type"])
        catalog.append({
            "type": name,
            "category": "hazard",
            "primary_hazard": factor.get("primary_hazard"),
            "cost_per_ha": factor.get("cost_per_ha"),
            "eal_reduction_frac": factor.get("eal_reduction_frac"),
            "lifetime_yr": factor.get("lifetime_yr", 20),
            "om_frac_of_capex_yr": factor.get("om_frac_of_capex_yr", finance.OM_FRAC),
            "n_selected": int(counts[name]["n"]),
            "spend_usd": round(counts[name]["spend"], 2),
            "source": factor.get("source"),
        })
    catalog.append({
        "type": "elevate_or_floodproof",
        "category": "impact",
        "primary_hazard": "flood",
        "n_selected": 0,
        "spend_usd": 0,
        "out_of_catalog": True,
        "note": "RootLedger is NbS-only. FloodAdapt household elevate/buyout/floodproof measures are out of catalog.",
    })
    return catalog
