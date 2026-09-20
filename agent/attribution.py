"""Evidence-linked implementation roles without synthetic responsibility shares."""
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


def build(root: Path | str = ".") -> dict:
    root = Path(root)
    art = root if (root / "plan.json").exists() else root / "artifacts"
    plan = json.loads((art / "plan.json").read_text())
    cands = {c["parcel_id"]: c for c in json.loads((art / "candidates.json").read_text())}
    levers: dict[str, dict] = {}
    for row in plan.get("selected") or []:
        parcel = cands.get(row["parcel_id"])
        if not parcel:
            continue
        ptype = parcel["type"]
        owner = OWNER.get(ptype, "community")
        cost = float(row.get("cost_usd") or parcel_cost(parcel))
        slot = levers.setdefault(ptype, {
            "lever": ptype,
            "implementation_lead": owner,
            "owner": owner,  # Backward-compatible key; this is not causal ownership.
            "risk_share_pct": None,
            "plan_spend_usd": 0.0,
            "fix_cost_usd": 0.0,  # Backward-compatible alias for plan_spend_usd.
            "annual_expected_people_risk_avoided": 0.0,
            "people_protected": 0.0,  # Backward-compatible model-output key.
            "risk_driver": FACTORS[ptype].get("primary_hazard"),
            "source": FACTORS[ptype]["source"],
        })
        slot["plan_spend_usd"] += cost
        slot["fix_cost_usd"] += cost
        avoided = float(row.get("avoided_eal_people") or 0)
        slot["annual_expected_people_risk_avoided"] += avoided
        slot["people_protected"] += avoided
    for slot in levers.values():
        slot["plan_spend_usd"] = round(slot["plan_spend_usd"], 0)
        slot["fix_cost_usd"] = round(slot["fix_cost_usd"], 0)
        slot["annual_expected_people_risk_avoided"] = round(
            slot["annual_expected_people_risk_avoided"], 3
        )
        slot["people_protected"] = round(slot["people_protected"], 3)
    extra = {
        "lever": "drainage_and_glof_outlet",
        "implementation_lead": "government",
        "owner": "government",
        "risk_share_pct": None,
        "plan_spend_usd": None,
        "fix_cost_usd": 0,
        "annual_expected_people_risk_avoided": None,
        "people_protected": None,
        "risk_driver": "flood and GLOF",
        "source": (
            "Planning role only: zoning, drainage, and outlet works normally require public authority. "
            "No causal share or plan benefit is quantified."
        ),
    }
    gov_levers = [
        value for value in levers.values()
        if value["implementation_lead"] == "government"
    ] + [extra]
    payload = {
        "government_pct": None,
        "community_pct": None,
        "household_pct": None,
        "quantified_responsibility_split_available": False,
        "government_levers": gov_levers,
        "community_levers": [
            value for value in levers.values()
            if value["implementation_lead"] == "community"
        ],
        "household_levers": [
            value for value in levers.values()
            if value["implementation_lead"] == "household"
        ],
        "driver_shares": None,
        "provenance": {
            "data_status": (
                "planning assumptions plus model-output spend; no empirical causal attribution percentages"
            ),
            "method": (
                "intervention type mapped to a provisional implementation lead; "
                "roles require local confirmation"
            ),
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
