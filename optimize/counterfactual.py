"""Fill backtest.counterfactual from the selected plan and hazard cells."""
from __future__ import annotations

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
    backtest["counterfactual"] = {
        "people_exposed_baseline": round(baseline, 1),
        "people_exposed_with_plan": round(with_plan, 1),
        "reduction_pct": round(reduction, 2),
        "note": "Observed-flood-fraction × population, reduced by greedy NbS capture. Not unique lives.",
    }
    back_path.write_text(json.dumps(backtest, indent=2) + "\n")
    return backtest["counterfactual"]
