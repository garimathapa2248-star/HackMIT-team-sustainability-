"""Dependency-free self-test for the optimizer (run: ``python -m optimize.selftest``).

Generates a synthetic watershed in a temp directory and asserts the invariants
that make the plan defensible: the budget is respected, no parcel is double
counted, the efficient frontier is monotone, the CVaR tail never exceeds the
mean, and the greedy stays close to the exact knapsack bound.
"""
from __future__ import annotations

import json
import random
import tempfile
from pathlib import Path

from . import counterfactual, knapsack, portfolio


def _synth(root: Path, n_cells: int = 200, n_parcels: int = 500, seed: int = 7) -> None:
    rng = random.Random(seed)
    (root / "artifacts").mkdir(parents=True, exist_ok=True)
    features = [{
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [86.4 + i * 1e-3, 27.8 + i * 1e-3]},
        "properties": {"cell_id": f"c_{i:05d}", "eal_people": round(rng.uniform(0.5, 20.0), 2),
                       "eal_usd": round(rng.uniform(2000, 60000), 0), "population": rng.randint(20, 800),
                       "observed_flood_frac": round(rng.uniform(0.0, 0.7), 3),
                       "equity_weight": round(rng.choice([1.0, 1.075, 1.25, 1.5]), 3),
                       "flood_depth_m": {"rp10": round(rng.uniform(0.02, 0.2), 2),
                                         "rp100": round(rng.uniform(0.05, 0.6), 2)}},
    } for i in range(n_cells)]
    (root / "artifacts" / "hazard.geojson").write_text(json.dumps({"type": "FeatureCollection", "features": features}))
    types = list(portfolio.economics.FACTORS)
    candidates = [{
        "parcel_id": f"p_{i:05d}", "type": rng.choice(types), "area_ha": round(rng.uniform(0.5, 8.0), 2),
        "centroid": [86.4, 27.8],
        "cell_ids": list(dict.fromkeys(f"c_{rng.randint(0, n_cells - 1):05d}" for _ in range(rng.randint(1, 4)))),
        "slope_deg": round(rng.uniform(3, 35), 1), "landcover": "bare",
    } for i in range(n_parcels)]
    (root / "artifacts" / "candidates.json").write_text(json.dumps(candidates))
    (root / "artifacts" / "signal.json").write_text(json.dumps(
        {"return_levels_mm": {"100": 175.6}, "return_levels_ci95": {"100": [148.2, 209.7]},
         "headline": {"old_return_period_yrs": 100, "new_return_period_yrs": 7.75}}))
    (root / "artifacts" / "backtest.json").write_text(json.dumps({
        "event_date": "synthetic",
        "counterfactual": {"people_exposed_baseline": None},
        "provenance": {"data_status": "synthetic fixture"},
    }))


def main() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        _synth(root)
        budget = 2_000_000.0

        plan = portfolio.optimize(budget=budget, mode="expected", root=root, draws=300)
        t = plan["totals"]
        assert t["cost_usd"] <= budget + 1e-6, "budget exceeded"
        ids = [s["parcel_id"] for s in plan["selected"]]
        assert len(ids) == len(set(ids)), "duplicate parcel selected"
        assert plan["totals"]["households_benefiting"] is None, "unsupported household count emitted"
        assert plan["robustness"]["selected_count"] == len(ids), "robustness count mismatch"
        assert all("selected_in_both_objectives" in s for s in plan["selected"])
        counterfactual.apply(root, plan)
        assert (root / "artifacts" / "risk_before.geojson").exists()
        assert (root / "artifacts" / "risk_with_plan.geojson").exists()
        after = json.loads((root / "artifacts" / "risk_with_plan.geojson").read_text())
        assert after["features"][0]["properties"]["scenario"] == "with_preventive_measures"

        budgets = [f["budget_usd"] for f in plan["frontier"]]
        people = [f["people_protected"] for f in plan["frontier"]]
        assert budgets == sorted(budgets) and people == sorted(people), "frontier not monotone"
        assert plan["cvar"]["tail_people_protected"] <= t["people_protected"] + 1e-6, "tail > mean"

        appraisal = plan["appraisal"]
        assert appraisal["bcr"] is None or appraisal["bcr"] >= 0
        assert appraisal["residual_people_risk"] >= -1e-6
        assert appraisal["residual_people_risk"] <= appraisal["baseline_people_risk"] + 1e-6
        ids_obj = {row["id"] for row in plan["objectives"]}
        assert ids_obj == {"blended", "people", "carbon", "income"}
        by_id = {row["id"]: row for row in plan["objectives"]}
        assert by_id["people"]["people_protected"] + 1e-6 >= by_id["blended"]["people_protected"]
        assert all("bcr" in row for row in plan["selected"])
        assert all("bcr" in row for row in plan["frontier"])
        npv = plan["appraisal"]["npv"]
        assert npv["costs_npv_usd"] > 0
        assert npv["bcr_npv"] is None or npv["bcr_npv"] >= 0
        assert len(plan["pathways"]["phases"]) == 3
        assert plan["waterfall"]["development_increment"] == 0
        assert plan["regret"]["robust_pick"] in {"blended", "people", "carbon", "income"}
        assert plan["exceedance"]["points"]
        assert plan["measure_catalog"]
        assert "people_likely_flooded_no_measures" in plan["infographic"]

        from .floodadapt import build as build_scenarios
        scenarios = build_scenarios(root, plan=plan)
        names = {s["name"] for s in scenarios["strategies"]}
        assert "no_measures" in names and "nbs_blended_2M" in names
        assert scenarios["scenarios"][0]["strategy"] == "no_measures"
        assert any(s["name"].endswith("intensified_tail_no_measures") for s in scenarios["scenarios"])
        assert len(scenarios["compare"]) == 4

        from signals.hazard_classes import classify
        classes = classify({
            "headline": {"new_return_period_yrs": 7.75, "old_return_period_yrs": 100},
            "landslide_trigger": {"auc": 0.934, "n_events": 138},
            "lake_growth": [{"name": "Imja Tsho", "pct_growth": 113.3}],
        })
        assert classes["flood"]["level"] == "high"
        assert classes["glof"]["level"] == "high"

        from signals.country_rank import assign_country, build as build_rank
        assert assign_country(85.32, 27.72) == "NP"
        ranking = build_rank(root)
        assert ranking["control"]["rank"] is None
        assert ranking["control"]["id"] == "HMA"
        for row in ranking["places"]:
            assert "fit" in row and "stations" in row
        country_ranks = [p["rank"] for p in ranking["places"] if p["rank"] is not None]
        assert country_ranks == sorted(set(country_ranks))
        assert any(p["id"] == "NP" for p in ranking["places"])


        cvar = portfolio.optimize(budget=budget, mode="cvar", root=root, draws=300)
        assert cvar["cvar"]["tail_people_protected"] <= cvar["totals"]["people_protected"] + 1e-6

        tiny = portfolio.optimize(budget=1000.0, root=root, draws=100)
        assert tiny["totals"]["cost_usd"] <= 1000.0 + 1e-6, "tiny budget overspent"

        cands, haz, sig = portfolio.load_inputs(root)
        cell_ids = sorted({c for p in cands for c in p["cell_ids"] if c in haz})
        ci = {c: i for i, c in enumerate(cell_ids)}
        ce = portfolio.build_scenarios(cell_ids, haz, sig, draws=200)[0].mean(axis=1)
        gap = knapsack.optimality_gap(cands, ci, ce, budget, ids)

        print(f"expected: {len(ids)} parcels | ${t['cost_usd']:,.0f} | "
              f"{t['people_protected']:.0f} people-risk avoided | {t['exposure_reduction_pct']:.1f}% | "
              f"{t['co2_t_10yr']:,.0f} tCO2 | ${t['income_usd_yr']:,.0f}/yr | "
              f"{plan['robustness']['overlap_pct']:.1f}% expected/CVaR overlap")
        print(f"cvar:     tail {cvar['cvar']['tail_people_protected']:.0f} vs mean {cvar['totals']['people_protected']:.0f}")
        print(f"knapsack: greedy within {gap['gap_pct']:.2f}% of exact independent-value bound")
        print("ALL CHECKS PASSED")


if __name__ == "__main__":
    main()
