"""City packs: Koshi (default booth) + Bangalore (urban lakes / stormwater)."""
from __future__ import annotations

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


def city_dir(city: str) -> Path:
    if city in (None, "", "koshi"):
        return ROOT / "artifacts"
    return ROOT / "artifacts" / "cities" / city


def list_cities() -> list[dict]:
    out = []
    for cid, meta in CITIES.items():
        d = city_dir(cid)
        ready = (d / "plan.json").exists() and (d / "hazard.geojson").exists()
        out.append({**meta, "ready": ready, "path": str(d.relative_to(ROOT))})
    return out
