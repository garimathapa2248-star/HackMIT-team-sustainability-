"""Screening-grade Koshi grid — not a DEM/HAND/SAR twin.

Builds a 12×12 cell lattice around the contract fixture centroid (Tsho Rolpa /
Dudh Koshi) and a parcel universe large enough to fill a $2M budget.  Every
numeric field is seeded, documented noise.  Real hydrology from Subodh should
overwrite ``artifacts/hazard.geojson`` and ``artifacts/candidates.json``.
"""
from __future__ import annotations

import argparse
import json
import random
from datetime import datetime, timezone
from pathlib import Path

from optimize.economics import FACTORS

# Fixture cells stay in-place so p_0007 / p_0008 remain valid.
ORIGIN_LON = 86.444
ORIGIN_LAT = 27.834
CELL = 0.005
NX = NY = 12
SEED = 20260919
FIXTURE_IDS = {(5, 5): "c_00421", (5, 6): "c_00422"}
CHANNEL_ROW = 5  # higher flood / GLOF along this row
N_PARCELS = 280

PROVENANCE = {
    "data_status": (
        "screening-grade synthetic exposure — not DEM/HAND modelled flood, "
        "not Sentinel-1 SAR, not an investment recommendation"
    ),
    "method": (
        "12×12 0.005° lattice around 86.47E 27.86N; landslide rises with row "
        "(proxy slope); flood/GLOF peak on the channel row; parcels typed by "
        "slope/landcover rules. Seeded RNG."
    ),
    "generated_utc": None,
    "seed": SEED,
}


def _cell_id(row: int, col: int) -> str:
    return FIXTURE_IDS.get((row, col), f"c_{row * NX + col:05d}")


def _box(row: int, col: int) -> list[list[list[float]]]:
    x0 = ORIGIN_LON + col * CELL
    y0 = ORIGIN_LAT + row * CELL
    x1, y1 = x0 + CELL, y0 + CELL
    return [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]]


def _centroid(row: int, col: int) -> list[float]:
    return [round(ORIGIN_LON + (col + 0.5) * CELL, 5),
            round(ORIGIN_LAT + (row + 0.5) * CELL, 5)]


def build_hazard(rng: random.Random) -> dict:
    features = []
    for row in range(NY):
        slope_proxy = row / max(NY - 1, 1)  # 0 south (valley) → 1 north (steep)
        for col in range(NX):
            cid = _cell_id(row, col)
            channel = abs(row - CHANNEL_ROW) / max(NY - 1, 1)
            flood100 = round(2.2 * (1.0 - channel) + rng.uniform(-0.15, 0.15), 2)
            flood10 = round(max(0.05, 0.35 * flood100 + rng.uniform(-0.05, 0.08)), 2)
            glof = round(max(0.0, 2.6 * (1.0 - channel) + rng.uniform(-0.2, 0.2)), 2)
            slide = round(min(0.85, 0.08 + 0.7 * slope_proxy + rng.uniform(-0.05, 0.05)), 3)
            pop = int(40 + 420 * (1.0 - 0.55 * slope_proxy) + rng.randint(-20, 40))
            pop = max(12, pop)
            eal_people = round(pop * (0.008 + 0.018 * flood100 / 2.2 + 0.012 * slide), 3)
            eal_usd = round(eal_people * rng.uniform(2200, 2800), 0)
            assets: list[str] = []
            roll = rng.random()
            if roll < 0.06:
                assets.append("school")
            elif roll < 0.09:
                assets.append("clinic")
            elif roll < 0.11:
                assets.append("hydropower")
            if cid == "c_00421":
                assets = ["school"]
                pop, eal_people, eal_usd = 312, 8.4, 22000
                flood10, flood100, glof, slide = 0.4, 1.8, 2.4, 0.23
            elif cid == "c_00422":
                assets = []
                pop, eal_people, eal_usd = 191, 5.1, 13800
                flood10, flood100, glof, slide = 0.2, 1.1, 1.2, 0.35
            features.append({
                "type": "Feature",
                "geometry": {"type": "Polygon", "coordinates": _box(row, col)},
                "properties": {
                    "cell_id": cid,
                    "row": row,
                    "col": col,
                    "flood_depth_m": {"rp10": max(0.0, flood10), "rp100": max(0.05, flood100)},
                    "glof_depth_m": max(0.0, glof),
                    "landslide_prob": max(0.02, min(0.9, slide)),
                    "population": pop,
                    "critical_assets": assets,
                    "eal_people": max(0.05, eal_people),
                    "eal_usd": max(200.0, eal_usd),
                },
            })
    prov = {**PROVENANCE, "generated_utc": datetime.now(timezone.utc).replace(microsecond=0)
            .isoformat().replace("+00:00", "Z")}
    return {"type": "FeatureCollection", "features": features, "provenance": prov}


def _type_for(slope: float, landcover: str, rng: random.Random) -> str:
    if slope >= 18:
        return rng.choice(["vetiver_slope", "bamboo_slope", "afforestation"])
    if slope <= 8:
        return rng.choice(["wetland_restore", "floodplain_restore", "riverbank_bio"])
    return rng.choice(list(FACTORS))


def build_candidates(hazard: dict, rng: random.Random) -> list[dict]:
    cells = [f["properties"]["cell_id"] for f in hazard["features"]]
    index = {(f["properties"]["row"], f["properties"]["col"]): f for f in hazard["features"]}
    parcels = []

    # Keep the two contract parcels so existing demos don't break.
    parcels.append({
        "parcel_id": "p_0007", "type": "vetiver_slope", "area_ha": 3.2,
        "centroid": [86.4715, 27.8615], "cell_ids": ["c_00421", "c_00422"],
        "slope_deg": 22.5, "landcover": "bare",
    })
    parcels.append({
        "parcel_id": "p_0008", "type": "riverbank_bio", "area_ha": 1.6,
        "centroid": [86.4765, 27.8615], "cell_ids": ["c_00422"],
        "slope_deg": 7.2, "landcover": "cropland",
    })

    n = 9
    while len(parcels) < N_PARCELS:
        row, col = rng.randrange(NY), rng.randrange(NX)
        feat = index[(row, col)]
        cid = feat["properties"]["cell_id"]
        slope = round(6 + 28 * (row / max(NY - 1, 1)) + rng.uniform(-3, 3), 1)
        slope = max(2.0, min(38.0, slope))
        landcover = "bare" if slope >= 16 else ("cropland" if slope <= 10 else "shrub")
        ptype = _type_for(slope, landcover, rng)
        area = round(rng.uniform(0.8, 5.5), 2)
        neighbours = [cid]
        if rng.random() < 0.35:
            ncol = min(NX - 1, col + 1)
            neighbours.append(index[(row, ncol)]["properties"]["cell_id"])
        neighbours = list(dict.fromkeys(neighbours))
        parcels.append({
            "parcel_id": f"p_{n:04d}",
            "type": ptype,
            "area_ha": area,
            "centroid": _centroid(row, col),
            "cell_ids": neighbours,
            "slope_deg": slope,
            "landcover": landcover,
        })
        n += 1
        if n > 9000:
            break
    return parcels


def write_artifacts(root: Path | str = ".", dest: Path | str | None = None) -> tuple[Path, Path]:
    root = Path(root)
    out = Path(dest) if dest else root / "artifacts"
    out.mkdir(parents=True, exist_ok=True)
    rng = random.Random(SEED)
    hazard = build_hazard(rng)
    candidates = build_candidates(hazard, rng)
    hp = out / "hazard.geojson"
    cp = out / "candidates.json"
    hp.write_text(json.dumps(hazard) + "\n")
    cp.write_text(json.dumps(candidates) + "\n")
    return hp, cp


def main() -> None:
    parser = argparse.ArgumentParser(description="Write screening-grade hazard + candidates.")
    parser.add_argument("--root", default=".")
    parser.add_argument("--output-dir", default="artifacts")
    args = parser.parse_args()
    hp, cp = write_artifacts(args.root, Path(args.root) / args.output_dir)
    hazard = json.loads(hp.read_text())
    cands = json.loads(cp.read_text())
    print(f"{hp}: {len(hazard['features'])} cells")
    print(f"{cp}: {len(cands)} parcels")


if __name__ == "__main__":
    main()
