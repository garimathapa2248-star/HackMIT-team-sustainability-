"""Load RootLedger artifacts, falling back to contract fixtures. Never raise for a missing file."""
from __future__ import annotations

import json
from contextvars import ContextVar
from pathlib import Path

from regions.catalog import city_dir

_CITY = ContextVar("rootledger_city", default="koshi")


def set_city(city: str | None) -> None:
    _CITY.set(city or "koshi")


def current_city() -> str:
    return _CITY.get() or "koshi"

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "artifacts"
FIX = ROOT / "contracts" / "fixtures"
CACHE = ROOT / "demo_cache"

NAMES = {
    "signal": "signal.json",
    "noise": "noise.json",
    "plan": "plan.json",
    "candidates": "candidates.json",
    "backtest": "backtest.json",
    "attribution": "attribution.json",
    "hazard": "hazard.geojson",
    "flood_observed": "flood_observed.geojson",
    "flood_modeled": "flood_modeled.geojson",
    "flood_observed_2017": "flood_observed_2017.geojson",
    "flood_modeled_2017": "flood_modeled_2017.geojson",
    "risk_before": "risk_before.geojson",
    "risk_with_plan": "risk_with_plan.geojson",
    "replication": "replication.json",
    "rankings": "rankings.json",
    "scenarios": "scenarios.json",
}


def _first(*paths: Path) -> Path | None:
    for path in paths:
        if path.exists():
            return path
    return None


def load(name: str, city: str | None = None):
    filename = NAMES[name]
    city = city or current_city()
    filename = NAMES[name]
    d = city_dir(city)
    cache = CACHE / "cities" / city / filename if city not in (None, "", "koshi") else CACHE / filename
    path = _first(d / filename, cache, FIX / filename)
    if path is None and city != "koshi":
        path = _first(ART / filename, CACHE / filename, FIX / filename)
    if path is None:
        return None
    return json.loads(path.read_text())


def save_plan(plan: dict, city: str | None = None) -> Path:
    dest_dir = city_dir(city or current_city())
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / "plan.json"
    dest.write_text(json.dumps(plan, indent=2) + "\n")
    return dest
