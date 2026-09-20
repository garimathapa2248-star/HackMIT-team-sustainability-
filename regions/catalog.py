"""City packs: Koshi (default booth) + Bangalore + any city registered in artifacts/cities.json."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

CITIES = {
    "koshi": {
        "id": "koshi",
        "name": "Koshi / Madhesh (Nepal)",
        "bbox": (86.06, 26.30, 87.47, 26.97),
        "hazards": ["monsoon flood", "GLOF (upstream)", "rainfall-triggered landslide"],
        "interventions": "NbS: wetland, floodplain, riverbank, vetiver, bamboo, afforestation",
    },
    "bangalore": {
        "id": "bangalore",
        "name": "Bengaluru (India)",
        "bbox": (77.35, 12.75, 77.85, 13.20),
        "hazards": ["urban pluvial flood", "lake overflow", "storm drain (Rajakaluve) blockage"],
        "interventions": "Lake rejuvenation, Rajakaluve buffers, wetland restore, vetiver bunds, afforestation",
    },
}


def _extra_cities() -> dict:
    path = ROOT / "artifacts" / "cities.json"
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text())
    except (json.JSONDecodeError, OSError):
        return {}
    if isinstance(data, dict) and "cities" in data:
        rows = data["cities"]
    elif isinstance(data, list):
        rows = data
    elif isinstance(data, dict):
        rows = list(data.values()) if data and isinstance(next(iter(data.values()), None), dict) else []
        if not rows and "id" in data:
            rows = [data]
    else:
        rows = []
    out = {}
    for row in rows:
        if isinstance(row, dict) and row.get("id"):
            out[str(row["id"])] = row
    return out


def all_cities() -> dict:
    merged = dict(CITIES)
    merged.update(_extra_cities())
    return merged


def register_city(meta: dict) -> None:
    """Append/update a city in artifacts/cities.json so GET /cities sees it."""
    cid = str(meta["id"])
    extras = _extra_cities()
    extras[cid] = meta
    dest = ROOT / "artifacts" / "cities.json"
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps({"cities": list(extras.values())}, indent=2) + "\n")


def city_dir(city: str) -> Path:
    if city in (None, "", "koshi"):
        return ROOT / "artifacts"
    return ROOT / "artifacts" / "cities" / city


def list_cities() -> list[dict]:
    out = []
    for cid, meta in all_cities().items():
        d = city_dir(cid)
        ready = (d / "plan.json").exists() and (d / "hazard.geojson").exists()
        out.append({**meta, "ready": ready, "path": str(d.relative_to(ROOT))})
    return out
