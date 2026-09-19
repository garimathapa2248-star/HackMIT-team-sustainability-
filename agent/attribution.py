"""Responsibility split from hazard drivers + selected plan spend."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from optimize.economics import FACTORS, parcel_cost

OWNER = {
    "wetland_restore": "government",
    "floodplain_restore": "government",
    "riverbank_bio": "government",
    "afforestation": "community",
    "bamboo_slope": "community",
    "vetiver_slope": "household",
}


def _driver_shares(hazard: dict) -> dict[str, float]:
    flood = slide = glof = 0.0
    for feat in hazard.get("features") or []:
        p = feat.get("properties") or {}
        eal = float(p.get("eal_people") or 0)
        flood += eal * float(p.get("modeled_flood_frac") or 0)
        slide += eal * float(p.get("landslide_prob") or 0)
        glof += eal * min(1.0, float(p.get("glof_depth_m") or 0) / 2.0)
    tot = flood + slide + glof or 1.0
    # Government holds drainage / outlet class risk; slope risk is community+household.
    gov = 100.0 * (flood + glof) / tot
    rest = 100.0 - gov
    return {"government": gov, "community": 0.6 * rest, "household": 0.4 * rest}


def build(root: Path | str = ".") -> dict:
    root = Path(root)
    art = root if (root / "plan.json").exists() else root / "artifacts"
    plan = json.loads((art / "plan.json").read_text())
    cands = {c["parcel_id"]: c for c in json.loads((art / "candidates.json").read_text())}
    hazard = json.loads((art / "hazard.geojson").read_text())
    drivers = _driver_shares(hazard)
    buckets = {"government": 0.0, "community": 0.0, "household": 0.0}
    levers: dict[str, dict] = {}
    for row in plan.get("selected") or []:
        parcel = cands.get(row["parcel_id"])
        if not parcel:
            continue
        ptype = parcel["type"]
        owner = OWNER.get(ptype, "community")
        cost = float(row.get("cost_usd") or parcel_cost(parcel))
        buckets[owner] += cost
        slot = levers.setdefault(ptype, {
            "lever": ptype,
            "owner": owner,
            "risk_share_pct": 0.0,
            "fix_cost_usd": 0.0,
            "people_protected": 0.0,
            "source": FACTORS[ptype]["source"],
        })
        slot["fix_cost_usd"] += cost
        slot["people_protected"] += float(row.get("avoided_eal_people") or 0)
    spend_tot = sum(buckets.values()) or 1.0
    # Mix: 70% hazard-driver split (PLAN: government typically majority of avoidable flood/GLOF),
    # 30% selected-spend mix so the NbS portfolio still shows up.
    mixed = {
        k: 0.7 * drivers[k] + 0.3 * (100 * buckets[k] / spend_tot)
        for k in ("government", "community", "household")
    }
    gov, com, hh = [int(round(mixed[k])) for k in ("government", "community", "household")]
    gov += 100 - (gov + com + hh)
    gov = max(0, gov)
    for slot in levers.values():
        slot["risk_share_pct"] = round(100 * slot["fix_cost_usd"] / spend_tot, 1)
        slot["fix_cost_usd"] = round(slot["fix_cost_usd"], 0)
        slot["people_protected"] = round(slot["people_protected"], 3)
    extra = {
        "lever": "drainage_and_glof_outlet",
        "owner": "government",
        "risk_share_pct": round(drivers["government"], 1),
        "fix_cost_usd": 0,
        "people_protected": None,
        "source": "Share of modeled EAL on flood + GLOF cells — zoning/drainage/outlet class, not a CSI.",
    }
    gov_levers = [v for v in levers.values() if v["owner"] == "government"] + [extra]
    payload = {
        "government_pct": gov,
        "community_pct": com,
        "household_pct": hh,
        "government_levers": gov_levers,
        "community_levers": [v for v in levers.values() if v["owner"] == "community"],
        "household_levers": [v for v in levers.values() if v["owner"] == "household"],
        "driver_shares": {k: round(v, 1) for k, v in drivers.items()},
        "provenance": {
            "data_status": "model output — 70% hazard-driver EAL + 30% selected spend; not a legal assignment of blame",
            "method": "flood+GLOF EAL → government; landslide EAL → community/household; mix with plan spend",
            "generated_utc": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        },
    }
    dest = art / "attribution.json"
    dest.write_text(json.dumps(payload, indent=2) + "\n")
    return payload


def main() -> None:
    print(json.dumps(build("."), indent=2))


if __name__ == "__main__":
    main()
