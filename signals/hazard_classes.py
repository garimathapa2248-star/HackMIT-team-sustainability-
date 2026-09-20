"""ThinkHazard-style flood / landslide / GLOF classes from RootLedger artifacts.

Levels are derived from fitted NOAA tails, the rainfall-landslide classifier, and
ICIMOD lake growth — not from GFDRR ThinkHazard layers.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

LEVELS = ("high", "medium", "low", "data_deficient")


def _headline_rp(signal: dict) -> float | None:
    raw = (signal.get("headline") or {}).get("new_return_period_yrs")
    try:
        value = float(raw)
    except (TypeError, ValueError):
        return None
    if value != value or value <= 0:  # NaN / non-positive
        return None
    # Unstable GEV recurrences (Kathmandu pack) are not a class.
    if value > 500:
        return None
    return value


def classify_flood(signal: dict) -> dict[str, Any]:
    new_rp = _headline_rp(signal)
    old_rp = (signal.get("headline") or {}).get("old_return_period_yrs") or 100
    if new_rp is None:
        return {
            "hazard": "flood",
            "level": "data_deficient",
            "evidence": "No credible late-sample recurrence for the early 100-year depth.",
        }
    if new_rp <= 10:
        level = "high"
    elif new_rp <= 25:
        level = "medium"
    else:
        level = "low"
    return {
        "hazard": "flood",
        "level": level,
        "new_return_period_yrs": round(new_rp, 2),
        "evidence": (
            f"Early {old_rp}-year daily rainfall depth now has a fitted recurrence of "
            f"{new_rp:.2f} years."
        ),
    }


def classify_landslide(signal: dict) -> dict[str, Any]:
    trigger = signal.get("landslide_trigger") or {}
    auc = trigger.get("auc")
    n_events = int(trigger.get("n_events") or 0)
    try:
        auc_f = float(auc) if auc is not None else None
    except (TypeError, ValueError):
        auc_f = None
    if auc_f is None or n_events < 10:
        return {
            "hazard": "landslide",
            "level": "data_deficient",
            "evidence": "Rainfall-landslide classifier not available in this pack.",
        }
    if auc_f >= 0.7 and n_events >= 50:
        level = "high"
    elif auc_f >= 0.6:
        level = "medium"
    else:
        level = "low"
    return {
        "hazard": "landslide",
        "level": level,
        "auc": round(auc_f, 3),
        "n_events": n_events,
        "evidence": (
            f"Rainfall classifier AUC {auc_f:.3f} on {n_events} events "
            "(not a Caine intensity–duration threshold)."
        ),
    }


def classify_glof(signal: dict) -> dict[str, Any]:
    lakes = signal.get("lake_growth") or []
    if not lakes:
        return {
            "hazard": "glof",
            "level": "data_deficient",
            "evidence": "No ICIMOD glacial-lake growth series in this pack.",
        }
    ranked = sorted(lakes, key=lambda row: float(row.get("pct_growth") or 0), reverse=True)
    top = ranked[0]
    growth = float(top.get("pct_growth") or 0)
    name = str(top.get("name") or top.get("lake_id") or "lake")
    if growth >= 50:
        level = "high"
    elif growth >= 20:
        level = "medium"
    else:
        level = "low"
    return {
        "hazard": "glof",
        "level": level,
        "max_pct_growth": round(growth, 1),
        "lake": name,
        "evidence": f"{name} area grew {growth:.1f}% in the compiled ICIMOD series.",
    }


RECS = {
    ("flood", "high"): {
        "technical": "Avoid new occupancy on rp10 HAND-proxy cells. Prioritise floodplain and wetland restore; treat drainage as a government lever.",
        "climate_change": "Design storms should use the late-sample GEV, not a 1975–1999 100-year depth.",
        "linked_measure_types": ["floodplain_restore", "wetland_restore", "riverbank_bio"],
    },
    ("flood", "medium"): {
        "technical": "Keep floodplain connectivity and inspect riverbank bioengineering after each monsoon.",
        "climate_change": "Re-fit the GEV when the late sample grows; do not lock a 100-year map.",
        "linked_measure_types": ["floodplain_restore", "riverbank_bio"],
    },
    ("flood", "low"): {
        "technical": "Maintain drainage and monitor the rainfall tail; NbS still has co-benefits.",
        "climate_change": "A quiet tail can still shift — keep the station archive live.",
        "linked_measure_types": ["afforestation"],
    },
    ("landslide", "high"): {
        "technical": "Vetiver or bamboo on bare/grass/cropland slopes. Do not cut the toe of slopes.",
        "climate_change": "Heavier daily totals raise the rainfall-classifier trigger rate; plant before the next monsoon.",
        "linked_measure_types": ["vetiver_slope", "bamboo_slope", "afforestation"],
    },
    ("landslide", "medium"): {
        "technical": "Stabilise the steepest bare slopes first; keep a rainfall-trigger watch.",
        "climate_change": "The classifier is rainfall-only — not a Caine I–D threshold.",
        "linked_measure_types": ["vetiver_slope", "bamboo_slope"],
    },
    ("glof", "high"): {
        "technical": "Outlet works and downstream zoning. Nature-based parcels do not stop a lake burst.",
        "climate_change": "Lake-area growth is the watch metric; pair with the rainfall tail, do not substitute.",
        "linked_measure_types": [],
    },
    ("glof", "medium"): {
        "technical": "Keep lake-area monitoring and a downstream warning path.",
        "climate_change": "Growth below 50% is not a clearance to ignore outlet works.",
        "linked_measure_types": [],
    },
}


def recommendations(classes: dict[str, Any]) -> list[dict[str, Any]]:
    rows = []
    for hazard in ("flood", "landslide", "glof"):
        level = (classes.get(hazard) or {}).get("level") or "data_deficient"
        rec = RECS.get((hazard, level), {
            "technical": "Not enough of this hazard in the pack to issue a planner rec.",
            "climate_change": None,
            "linked_measure_types": [],
        })
        rows.append({
            "hazard": hazard,
            "level": level,
            "technical": rec["technical"],
            "climate_change": rec.get("climate_change"),
            "linked_measure_types": rec.get("linked_measure_types") or [],
            "source": "ThinkHazard-style recs on RootLedger classes; not GFDRR text",
        })
    return rows


def classify(signal: dict) -> dict[str, Any]:
    flood = classify_flood(signal)
    landslide = classify_landslide(signal)
    glof = classify_glof(signal)
    classes = {
        "flood": flood,
        "landslide": landslide,
        "glof": glof,
        "source": "RootLedger fitted products (NOAA ISD GEV, rainfall classifier, ICIMOD lakes)",
        "not": "GFDRR ThinkHazard layers",
    }
    classes["recommendations"] = recommendations(classes)
    return classes


def ordinal(level: str) -> int:
    return {"high": 3, "medium": 2, "low": 1, "data_deficient": 0}.get(level, 0)


def attach(signal: dict) -> dict:
    out = dict(signal)
    classes = classify(signal)
    out["hazard_classes"] = classes
    out["recommendations"] = classes.get("recommendations")
    return out


def attach_file(path: Path) -> dict:
    signal = json.loads(path.read_text())
    updated = attach(signal)
    path.write_text(json.dumps(updated, indent=2) + "\n")
    return updated["hazard_classes"]


def main() -> None:
    parser = argparse.ArgumentParser(description="Attach ThinkHazard-style classes to signal.json")
    parser.add_argument("--root", default=".")
    args = parser.parse_args()
    root = Path(args.root)
    candidates = [
        root / "artifacts" / "signal.json",
        root / "demo_cache" / "signal.json",
        root / "contracts" / "fixtures" / "signal.json",
    ]
    path = next((p for p in candidates if p.is_file()), None)
    if path is None:
        raise SystemExit("signal.json not found")
    classes = attach_file(path)
    print(f"wrote hazard_classes on {path}: "
          f"flood={classes['flood']['level']} "
          f"landslide={classes['landslide']['level']} "
          f"glof={classes['glof']['level']}")


if __name__ == "__main__":
    main()
