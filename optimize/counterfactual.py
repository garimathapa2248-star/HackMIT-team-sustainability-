"""Fill backtest.counterfactual from the selected plan and hazard cells."""
from __future__ import annotations

import copy
import json
from pathlib import Path

from .economics import eal_reduction_frac


def apply(root: Path, plan: dict) -> dict | None:
    root = Path(root)
    art = root / "artifacts" if (root / "artifacts").exists() and not (root / "backtest.json").exists() else root
    back_path = art / "backtest.json"
    haz_path = art / "hazard.geojson"
    cand_path = art / "candidates.json"
    if not (back_path.exists() and haz_path.exists() and cand_path.exists()):
        return None
    backtest = json.loads(back_path.read_text())
    hazard = json.loads(haz_path.read_text())
    candidates = {c["parcel_id"]: c for c in json.loads(cand_path.read_text())}
    remaining: dict[str, float] = {}
    pops: dict[str, float] = {}
    obs: dict[str, float] = {}
    for feat in hazard.get("features", []):
        p = feat.get("properties") or {}
        cid = str(p.get("cell_id"))
        remaining[cid] = 1.0
        pops[cid] = float(p.get("population") or 0)
        obs[cid] = float(p.get("observed_flood_frac") or 0)
    for row in plan.get("selected") or []:
        parcel = candidates.get(row["parcel_id"])
        if not parcel:
            continue
        effect = eal_reduction_frac(parcel)
        for cid in parcel.get("cell_ids") or []:
            if cid not in remaining:
                continue
            cap = min(effect, remaining[cid])
            remaining[cid] -= cap
    baseline = sum(pops[c] * obs[c] for c in pops)
    with_plan = sum(pops[c] * obs[c] * remaining[c] for c in pops)
    reduction = 100.0 * (1.0 - with_plan / baseline) if baseline else 0.0
    before_features = []
    with_plan_features = []
    for feat in hazard.get("features", []):
        props = feat.get("properties") or {}
        cid = str(props.get("cell_id"))
        base_risk = float(props.get("eal_people") or 0.0)
        remain = float(remaining.get(cid, 1.0))

        before = copy.deepcopy(feat)
        before["properties"] = {
            **props,
            "scenario": "current_risk_model",
            "people_risk_eal": round(base_risk, 4),
            "data_status": "model output",
        }
        before_features.append(before)

        after = copy.deepcopy(feat)
        after["properties"] = {
            **props,
            "scenario": "with_preventive_measures",
            "people_risk_eal": round(base_risk * remain, 4),
            "modeled_reduction_pct": round(100.0 * (1.0 - remain), 2),
            "data_status": (
                "counterfactual simulation using literature-based intervention effects; "
                "not an observed intervention trial"
            ),
        }
        with_plan_features.append(after)

    risk_before = {
        "type": "FeatureCollection",
        "features": before_features,
        "provenance": {
            "data_status": "model output",
            "metric": "annual expected people-risk",
            "source": haz_path.name,
        },
    }
    risk_with_plan = {
        "type": "FeatureCollection",
        "features": with_plan_features,
        "provenance": {
            "data_status": (
                "counterfactual simulation using deterministic candidate suitability and "
                "literature-based effect sizes; field verification required"
            ),
            "metric": "annual expected people-risk after selected preventive measures",
            "source": haz_path.name,
        },
    }
    (art / "risk_before.geojson").write_text(json.dumps(risk_before))
    (art / "risk_with_plan.geojson").write_text(json.dumps(risk_with_plan))

    backtest["counterfactual"] = {
        "people_exposed_baseline": round(baseline, 1),
        "people_exposed_with_plan": round(with_plan, 1),
        "reduction_pct": round(reduction, 2),
        "note": (
            "Counterfactual simulation: observed-flood-fraction × population, reduced by "
            "literature-based effects for the selected preventive measures. Not unique lives "
            "and not an observed intervention trial."
        ),
        "risk_layers": {
            "before": "risk_before.geojson",
            "with_plan": "risk_with_plan.geojson",
        },
    }
    back_path.write_text(json.dumps(backtest, indent=2) + "\n")
    return backtest["counterfactual"]
