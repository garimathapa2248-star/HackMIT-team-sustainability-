"""FloodAdapt Event × Projection × Strategy grammar on RootLedger artifacts.

Mirrors Deltares FloodAdapt object names (event, projection, GreenInfrastructure
measures, no_measures vs named strategies, scenarios). Does not run SFINCS or
Delft-FIAT.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from .portfolio import _first_existing
from .finance import climate_freq_mult

TYPE_TO_MEASURE = {
    "floodplain_restore": "green_infrastructure",
    "wetland_restore": "green_infrastructure",
    "vetiver_slope": "green_infrastructure",
    "bamboo_slope": "green_infrastructure",
    "afforestation": "green_infrastructure",
    "riverbank_bio": "green_infrastructure",
}


def _load(path: Path | None) -> Any:
    if path is None or not path.is_file():
        return None
    return json.loads(path.read_text())


def _paths(root: Path) -> dict[str, Path | None]:
    art, cache, fix = root / "artifacts", root / "demo_cache", root / "contracts" / "fixtures"
    return {
        "plan": _first_existing(root / "plan.json", art / "plan.json", cache / "plan.json", fix / "plan.json"),
        "signal": _first_existing(root / "signal.json", art / "signal.json", cache / "signal.json", fix / "signal.json"),
        "backtest": _first_existing(root / "backtest.json", art / "backtest.json", cache / "backtest.json", fix / "backtest.json"),
    }


def _measure(row: dict) -> dict:
    parcel_type = str(row.get("type") or "afforestation")
    return {
        "name": row.get("parcel_id"),
        "type": TYPE_TO_MEASURE.get(parcel_type, "green_infrastructure"),
        "subtype": parcel_type,
        "selection_type": "polygon",
        "area_ha": row.get("area_ha"),
        "cost_usd": row.get("cost_usd"),
        "effect_fraction_assumed": row.get("effect_fraction_assumed"),
        "centroid": row.get("centroid"),
    }


def _objective_strategy(row: dict) -> dict:
    return {
        "name": {
            "blended": "nbs_blended_2M",
            "people": "people_first",
            "carbon": "carbon_first",
            "income": "income_first",
        }.get(row.get("id"), str(row.get("id"))),
        "description": row.get("label") or row.get("id"),
        "measures": row.get("parcel_ids") or [],
        "n_selected": row.get("n_selected"),
        "cost_usd": row.get("cost_usd"),
        "people_protected": row.get("people_protected"),
        "co2_t_10yr": row.get("co2_t_10yr"),
        "income_usd_yr": row.get("income_usd_yr"),
    }


def build(root: Path | str = ".", plan: dict | None = None) -> dict[str, Any]:
    root = Path(root)
    paths = _paths(root)
    plan = plan or _load(paths["plan"]) or {}
    signal = _load(paths["signal"]) or {}
    backtest = _load(paths["backtest"]) or {}
    headline = signal.get("headline") or {}
    appraisal = plan.get("appraisal") or {}
    totals = plan.get("totals") or {}
    selected = plan.get("selected") or []
    cf = backtest.get("counterfactual") or {}

    events = [
        {
            "name": "Koshi_27Sep2024",
            "type": "event",
            "date": backtest.get("event_date") or "2024-09-27",
            "source": backtest.get("sar_scene") or "UNOSAT Sentinel-1",
            "kind": "calibration",
        },
        {
            "name": "WesternTerai_13Aug2017",
            "type": "event",
            "date": (backtest.get("validation") or {}).get("event_date") or "2017-08-13",
            "source": (backtest.get("validation") or {}).get("source") or "ICIMOD RDS 33616",
            "kind": "transfer",
        },
    ]
    projections = [
        {
            "name": "current",
            "description": "Late-sample climate as observed in the GEV fit window.",
        },
        {
            "name": "intensified_tail",
            "old_return_period_yrs": headline.get("old_return_period_yrs") or 100,
            "new_return_period_yrs": headline.get("new_return_period_yrs"),
            "description": headline.get("statement") or "NOAA ISD GEV tail intensification.",
        },
    ]
    measures = [_measure(row) for row in selected]
    strategies = [
        {
            "name": "no_measures",
            "description": "Business as usual — FloodAdapt empty strategy.",
            "measures": [],
            "n_selected": 0,
            "cost_usd": 0,
            "people_protected": 0,
        },
    ]
    seen = {"no_measures"}
    blended = {
        "name": "nbs_blended_2M",
        "description": "Budgeted nature-based portfolio (triple return).",
        "measures": [row.get("parcel_id") for row in selected],
        "n_selected": len(selected),
        "cost_usd": totals.get("cost_usd"),
        "people_protected": totals.get("people_protected"),
        "co2_t_10yr": totals.get("co2_t_10yr"),
        "income_usd_yr": totals.get("income_usd_yr"),
    }
    strategies.append(blended)
    seen.add("nbs_blended_2M")
    for row in plan.get("objectives") or []:
        strat = _objective_strategy(row)
        if strat["name"] in seen:
            # Replace blended with the objectives row if ids match.
            if strat["name"] == "nbs_blended_2M":
                strategies[1] = {**blended, **{k: v for k, v in strat.items() if v is not None}}
            continue
        strategies.append(strat)
        seen.add(strat["name"])

    baseline = appraisal.get("baseline_people_risk")
    with_plan = None
    if baseline is not None and totals.get("people_protected") is not None:
        with_plan = round(float(baseline) - float(totals["people_protected"]), 3)
    freq_mult, freq_note = climate_freq_mult(signal)
    if plan.get("appraisal", {}).get("climate_freq_mult"):
        freq_mult = float(plan["appraisal"]["climate_freq_mult"])
    future_no = round(float(baseline) * freq_mult, 3) if baseline is not None else None
    future_with = round(float(with_plan) * freq_mult, 3) if with_plan is not None else None
    scenarios = [
        {
            "name": "Koshi2024_current_no_measures",
            "event": "Koshi_27Sep2024",
            "projection": "current",
            "strategy": "no_measures",
            "people_risk_eal": baseline if baseline is not None else cf.get("people_exposed_baseline"),
            "people_exposed_event": cf.get("people_exposed_baseline"),
        },
        {
            "name": "Koshi2024_current_nbs_blended_2M",
            "event": "Koshi_27Sep2024",
            "projection": "current",
            "strategy": "nbs_blended_2M",
            "people_risk_eal": with_plan,
            "people_exposed_event": cf.get("people_exposed_with_plan"),
            "reduction_pct": cf.get("reduction_pct") or appraisal.get("residual_pct"),
        },
        {
            "name": "Koshi2024_intensified_tail_no_measures",
            "event": "Koshi_27Sep2024",
            "projection": "intensified_tail",
            "strategy": "no_measures",
            "people_risk_eal": future_no,
            "note": freq_note,
        },
        {
            "name": "Koshi2024_intensified_tail_nbs_blended_2M",
            "event": "Koshi_27Sep2024",
            "projection": "intensified_tail",
            "strategy": "nbs_blended_2M",
            "people_risk_eal": future_with,
            "note": "Same fractional efficacy under the screening climate multiplier; not a second SFINCS run.",
        },
    ]
    waterfall = plan.get("waterfall") or {}
    return {
        "site": "koshi_madhesh",
        "kernel": "not_sfincs",
        "events": events,
        "projections": projections,
        "measures": measures,
        "strategies": strategies,
        "scenarios": scenarios,
        "compare": [
            {"strategy": "no_measures", "projection": "current", "people_risk_eal": scenarios[0]["people_risk_eal"]},
            {"strategy": "nbs_blended_2M", "projection": "current", "people_risk_eal": scenarios[1]["people_risk_eal"]},
            {"strategy": "no_measures", "projection": "intensified_tail", "people_risk_eal": scenarios[2]["people_risk_eal"]},
            {"strategy": "nbs_blended_2M", "projection": "intensified_tail", "people_risk_eal": scenarios[3]["people_risk_eal"]},
        ],
        "waterfall": waterfall,
        "climate_freq_mult": freq_mult,
        "provenance": {
            "data_status": (
                "FloodAdapt planning grammar on HAND + literature NbS effects. "
                "Not a SFINCS compound-flood simulation and not Delft-FIAT damages."
            ),
            "method": "scenario = event × projection × strategy; strategies from the greedy portfolio",
            "source": "https://github.com/Deltares-research/FloodAdapt",
        },
    }


def write(root: Path | str = ".", plan: dict | None = None,
          output: str = "artifacts/scenarios.json") -> Path:
    payload = build(root, plan=plan)
    dest = Path(root) / output if not Path(output).is_absolute() else Path(output)
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(payload, indent=2) + "\n")
    return dest


def main() -> None:
    parser = argparse.ArgumentParser(description="Write FloodAdapt-shaped scenarios.json")
    parser.add_argument("--root", default=".")
    parser.add_argument("--output", default="artifacts/scenarios.json")
    args = parser.parse_args()
    dest = write(args.root, output=args.output)
    payload = json.loads(dest.read_text())
    names = [s["name"] for s in payload.get("strategies") or []]
    print(f"wrote {dest}: strategies={names}")


if __name__ == "__main__":
    main()
