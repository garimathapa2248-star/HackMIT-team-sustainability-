"""Build a Bengaluru city pack from public DEM, OSM, WorldPop, Open-Meteo ERA5-Land."""
from __future__ import annotations

import json
import random
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

from hazard.hand import hand
from hazard.osm import fetch_assets, fetch_water
from hazard.proof import _geojson_from_mask, _read_dem
from optimize.counterfactual import apply as apply_counterfactual
from optimize.economics import FACTORS
from optimize.portfolio import optimize
from regions.catalog import city_dir
from regions.openmeteo import daily_precip
from signals.analysis import fit_signal

BBOX = (77.35, 12.75, 77.85, 13.20)
DEM_URLS = [
    "https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_N12_00_E077_00_DEM/Copernicus_DSM_COG_10_N12_00_E077_00_DEM.tif",
    "https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_N13_00_E077_00_DEM/Copernicus_DSM_COG_10_N13_00_E077_00_DEM.tif",
]
WORLDPOP_IND = (
    "https://data.worldpop.org/GIS/Population/Global_2000_2020_1km/2020/IND/"
    "ind_ppp_2020_1km_Aggregated.tif"
)
RES = 0.02  # ~2 km cells for a city pack


def _worldpop(shape, transform):
    """People per destination pixel. WorldPop 1km Aggregated is a count raster.

    Average onto the finer DEM grid (people per ~1 km²), then scale by cell area
    in `_cells`. Do not nansum the oversampled grid.
    """
    import rasterio
    from rasterio.warp import Resampling, reproject
    canvas = np.full(shape, np.nan, dtype=np.float32)
    local = Path(__file__).resolve().parents[1] / "data/pop/ind_ppp_2020_1km_Aggregated.tif"
    src_path = str(local) if local.exists() else "/vsicurl/" + WORLDPOP_IND
    try:
        with rasterio.Env(GDAL_HTTP_TIMEOUT="60", GDAL_HTTP_USERAGENT="RootLedger/0.1"):
            with rasterio.open(src_path) as src:
                reproject(
                    source=rasterio.band(src, 1),
                    destination=canvas,
                    src_transform=src.transform,
                    src_crs=src.crs,
                    src_nodata=src.nodata,
                    dst_transform=transform,
                    dst_crs="EPSG:4326",
                    dst_nodata=np.nan,
                    resampling=Resampling.average,
                )
        if np.isfinite(canvas).mean() < 0.05:
            print("worldpop: too few finite pixels")
            return None
        return canvas
    except Exception as exc:
        print(f"worldpop skipped: {exc}")
        return None


def _cells(elev, transform, flood, pop_grid, assets, water, rng):
    h, w = elev.shape
    gy, gx = np.gradient(np.nan_to_num(elev, nan=float(np.nanmean(elev))))
    slope = np.degrees(np.arctan(np.hypot(gy, gx) / max(abs(transform.a) * 111_320, 1e-3)))
    step = max(1, int(round(RES / abs(transform.a))))
    feats = []
    n = 0
    for r0 in range(0, h - step, step):
        for c0 in range(0, w - step, step):
            block = elev[r0:r0 + step, c0:c0 + step]
            if np.isfinite(block).mean() < 0.4:
                continue
            west, north = transform * (c0, r0)
            east, south = transform * (c0 + step, r0 + step)
            flooded = float(flood[r0:r0 + step, c0:c0 + step].mean())
            z = float(np.nanmean(block))
            sl = float(np.nanmean(slope[r0:r0 + step, c0:c0 + step]))
            if pop_grid is not None:
                dens = float(np.nanmean(np.clip(pop_grid[r0:r0 + step, c0:c0 + step], 0, None)))
                cell_km = step * abs(transform.a) * 111.32
                pop = int(max(50, dens * cell_km * cell_km))
            else:
                pop = int(800 + 4000 * flooded + rng.randint(0, 200))
            lakes = [a for a in water if west <= a["lon"] <= east and south <= a["lat"] <= north and a["kind"] == "lake"]
            drains = [a for a in water if west <= a["lon"] <= east and south <= a["lat"] <= north and a["kind"] == "drain"]
            cell_assets = [a["kind"] for a in assets if west <= a["lon"] <= east and south <= a["lat"] <= north][:4]
            if lakes:
                cell_assets = (["lake"] + cell_assets)[:4]
            depth100 = round(max(0.05, 1.8 * flooded + 0.25 * min(len(lakes), 4) + rng.uniform(0, 0.15)), 2)
            eal = round(pop * (0.008 + 0.07 * flooded + 0.015 * (1 if lakes else 0)), 3)
            feats.append({
                "type": "Feature",
                "geometry": {"type": "Polygon", "coordinates": [[
                    [west, south], [east, south], [east, north], [west, north], [west, south]
                ]]},
                "properties": {
                    "cell_id": f"blr_{n:04d}",
                    "flood_depth_m": {"rp10": round(0.4 * depth100, 2), "rp100": depth100},
                    "glof_depth_m": 0.0,
                    "landslide_prob": round(min(0.25, sl / 120), 3),
                    "population": pop,
                    "critical_assets": cell_assets,
                    "eal_people": eal,
                    "eal_usd": round(eal * 2500, 0),
                    "observed_flood_frac": None,
                    "modeled_flood_frac": round(flooded, 3),
                    "elev_m": round(z, 1),
                    "slope_deg": round(sl, 1),
                    "n_lakes": len(lakes),
                    "n_drains": len(drains),
                    "low_income_score": 0.4 if (pop > 4000 and "clinic" not in cell_assets) else 0.15,
                },
            })
            n += 1
    return feats


def _candidates(features, rng):
    out = []
    i = 1
    for feat in features:
        p = feat["properties"]
        ring = feat["geometry"]["coordinates"][0]
        cx = sum(x for x, _ in ring[:-1]) / 4
        cy = sum(y for _, y in ring[:-1]) / 4
        if p["n_lakes"] > 0 or p["modeled_flood_frac"] > 0.25:
            ptype = rng.choice(["wetland_restore", "floodplain_restore"])
            landcover = "wetland"
        elif p["n_drains"] > 0:
            ptype = "riverbank_bio"
            landcover = "urban"
        elif p["slope_deg"] > 4:
            ptype = rng.choice(["afforestation", "vetiver_slope"])
            landcover = "shrub"
        else:
            ptype = rng.choice(["wetland_restore", "afforestation", "bamboo_slope"])
            landcover = "urban"
        out.append({
            "parcel_id": f"blr_p_{i:04d}",
            "type": ptype,
            "area_ha": round(rng.uniform(0.6, 4.5), 2),
            "centroid": [round(cx, 5), round(cy, 5)],
            "cell_ids": [p["cell_id"]],
            "slope_deg": p["slope_deg"],
            "landcover": landcover,
        })
        i += 1
        if p["eal_people"] > 8 and i < 220:
            out.append({
                "parcel_id": f"blr_p_{i:04d}",
                "type": rng.choice(list(FACTORS)),
                "area_ha": round(rng.uniform(0.5, 3.5), 2),
                "centroid": [round(cx + 0.008, 5), round(cy, 5)],
                "cell_ids": [p["cell_id"]],
                "slope_deg": p["slope_deg"],
                "landcover": landcover,
            })
            i += 1
    return out


def run(root: Path | None = None) -> Path:
    dest = city_dir("bangalore")
    dest.mkdir(parents=True, exist_ok=True)
    rows = daily_precip(12.9716, 77.5946)
    signal = fit_signal(rows, "bangalore", bootstrap_draws=200)
    signal["provenance"]["datasets"] = [
        "Open-Meteo archive ERA5-Land daily precipitation at Bengaluru (12.97N, 77.59E)",
        "Copernicus GLO-30 DEM",
        "OpenStreetMap lakes / drains / schools / clinics",
        "WorldPop India 1km 2020 (if available)",
    ]
    signal["provenance"]["data_status"] = (
        "model output — GEV on ERA5-Land daily precip at city centroid; not IMD gauge fusion"
    )
    signal["lake_growth"] = []
    (dest / "signal.json").write_text(json.dumps(signal, indent=2) + "\n")

    elev, transform = _read_dem(BBOX, out_res=0.002, urls=DEM_URLS)

    domain = np.isfinite(elev)
    # No SAR scene: do not invent CSI. Model flood = low HAND (urban valleys / lake beds).
    hg = hand(elev, stream_frac=0.04)
    stage = float(np.nanpercentile(hg[np.isfinite(hg)], 18))
    flood = domain & (hg <= stage)
    pop_grid = _worldpop(elev.shape, transform)
    assets = fetch_assets(BBOX)
    water = fetch_water(BBOX)
    rng = random.Random(20260919)
    cells = _cells(elev, transform, flood, pop_grid, assets, water, rng)
    hazard = {
        "type": "FeatureCollection",
        "features": cells,
        "provenance": {
            "data_status": "model output — D8 HAND valleys as pluvial-flood proxy; no SAR CSI for Bengaluru",
            "generated_utc": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
            "bbox": BBOX,
            "osm_assets": len(assets),
            "osm_water": len(water),
            "worldpop": pop_grid is not None,
            "method": f"HAND ≤ {stage:.2f} m (18th percentile) on GLO-30",
        },
    }
    (dest / "hazard.geojson").write_text(json.dumps(hazard))
    cands = _candidates(cells, rng)
    (dest / "candidates.json").write_text(json.dumps(cands))
    modeled = _geojson_from_mask(flood, transform)
    (dest / "flood_modeled.geojson").write_text(json.dumps(modeled))
    (dest / "flood_observed.geojson").write_text(json.dumps({"type": "FeatureCollection", "features": []}))
    backtest = {
        "event_date": None,
        "sar_scene": None,
        "observed_flood_km2": None,
        "modeled_flood_km2": round(float(flood.sum()) * abs(transform.a * transform.e) * 111.32 * 111.32, 2),
        "hit_rate_pod": None,
        "false_alarm_ratio": None,
        "critical_success_index": None,
        "stage_m": round(stage, 2),
        "counterfactual": {"people_exposed_baseline": None, "people_exposed_with_plan": None, "reduction_pct": None},
        "provenance": {
            "data_status": "unvalidated — no UNOSAT/Sentinel-1 scene wired for Bengaluru; CSI is null and will not be invented",
            "method": "HAND valley mask only",
            "generated_utc": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        },
    }
    (dest / "backtest.json").write_text(json.dumps(backtest, indent=2) + "\n")

    plan = optimize(budget=2_000_000, mode="expected", root=dest, draws=160)
    (dest / "plan.json").write_text(json.dumps(plan, indent=2) + "\n")
    apply_counterfactual(dest, plan)
    from agent.attribution import build as build_attr
    build_attr(dest)
    print(f"bangalore pack: cells={len(cells)} parcels={len(cands)} lakes/drains={len(water)} "
          f"assets={len(assets)} CSI=null pop_grid={pop_grid is not None}")
    return dest


def main():
    run()


if __name__ == "__main__":
    main()
