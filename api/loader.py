"""Load RootLedger artifacts, falling back to contract fixtures. Never raise for a missing file."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "artifacts"
FIX = ROOT / "contracts" / "fixtures"
CACHE = ROOT / "demo_cache"

NAMES = {
    "signal": "signal.json",
    "plan": "plan.json",
    "candidates": "candidates.json",
    "backtest": "backtest.json",
    "attribution": "attribution.json",
    "hazard": "hazard.geojson",
}


def _first(*paths: Path) -> Path | None:
    for path in paths:
        if path.exists():
            return path
    return None


def load(name: str):
    filename = NAMES[name]
    path = _first(ART / filename, CACHE / filename, FIX / filename)
    if path is None:
        return None
    return json.loads(path.read_text())


def save_plan(plan: dict) -> Path:
    ART.mkdir(parents=True, exist_ok=True)
    dest = ART / "plan.json"
    dest.write_text(json.dumps(plan, indent=2) + "\n")
    return dest
