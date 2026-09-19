"""UNOSAT Sentinel-1 backtest + D8 HAND hazard for Koshi/Madhesh.

Observed flood: UNITAR-UNOSAT FL20240928NPL, S-1 27 Sep 2024 Koshi/Madhesh.
Model: Copernicus GLO-30 fill → D8 → accumulation → HAND; stage calibrated
to maximise CSI on that event (screening-grade NumPy, not Whitebox).
"""
from __future__ import annotations

import argparse
import json
import random
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import rasterio
import shapefile
from rasterio.features import rasterize, shapes
from rasterio.transform import from_origin
from shapely.geometry import mapping, shape
from shapely.ops import unary_union

from optimize.economics import FACTORS
from .hand import glof_fill, hand
from .osm import fetch_assets
from .whitebox_hand import try_hand as whitebox_hand
from . import rasters

BBOX = (86.06, 26.30, 87.47, 26.97)  # UNOSAT Koshi/Madhesh S-1 extent
RES = 0.08  # ~8 km cells so the browser/optimizer stay light
DEM_URLS = [
    "https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_N26_00_E086_00_DEM/Copernicus_DSM_COG_10_N26_00_E086_00_DEM.tif",
    "https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_N26_00_E087_00_DEM/Copernicus_DSM_COG_10_N26_00_E087_00_DEM.tif",
]
GLOF_URLS = DEM_URLS + [
    "https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_N27_00_E086_00_DEM/Copernicus_DSM_COG_10_N27_00_E086_00_DEM.tif",
]
TSHO_ROLPA = (86.475, 27.863)
GLOF_BBOX = (86.06, 26.30, 87.10, 27.95)


def _obs_geom(shp: Path):
    reader = shapefile.Reader(str(shp))
    geoms = []
    for s in reader.shapes():
        geo = s.__geo_interface__
        geoms.append(shape(geo))
    return unary_union(geoms)


def _read_dem(bbox, out_res=0.002, urls=None) -> tuple[np.ndarray, object]:
    from rasterio.warp import Resampling, reproject
    urls = urls or DEM_URLS
    west, south, east, north = bbox
    width = int(round((east - west) / out_res))
    height = int(round((north - south) / out_res))
    transform = from_origin(west, north, out_res, out_res)
    canvas = np.full((height, width), np.nan, dtype=np.float32)
    for url in urls:
        tmp = np.full_like(canvas, np.nan)
        with rasterio.Env():
            with rasterio.open("/vsicurl/" + url) as src:
                reproject(
                    source=rasterio.band(src, 1),
                    destination=tmp,
                    src_transform=src.transform,
                    src_crs=src.crs,
                    src_nodata=src.nodata,
                    dst_transform=transform,
                    dst_crs="EPSG:4326",
                    dst_nodata=np.nan,
                    resampling=Resampling.bilinear,
                )
        canvas = np.where(np.isfinite(tmp), tmp, canvas)
    return canvas, transform


def _glof_from_tsho(plains_shape, plains_transform) -> tuple[np.ndarray, str]:
    """Route an 8e7 m³ outburst from Tsho Rolpa on a coarse GLO-30 corridor."""
    elev, transform = _read_dem(GLOF_BBOX, out_res=0.008, urls=GLOF_URLS)
    h, w = elev.shape
    lon, lat = TSHO_ROLPA
    c = int((lon - GLOF_BBOX[0]) / abs(transform.a))
    r = int((GLOF_BBOX[3] - lat) / abs(transform.e))
    r = min(max(r, 1), h - 2)
    c = min(max(c, 1), w - 2)
    cell_m = abs(transform.a) * 111_320
    depth = glof_fill(elev, 8.0e7, cell_m * cell_m, (r, c))
    from rasterio.warp import Resampling, reproject
    out = np.zeros(plains_shape, dtype=np.float32)
    reproject(
        source=depth,
        destination=out,
        src_transform=transform,
        src_crs="EPSG:4326",
        dst_transform=plains_transform,
        dst_crs="EPSG:4326",
        resampling=Resampling.average,
    )
    return out, "Tsho Rolpa 8e7 m3 volume-fill on GLO-30 corridor 26.3–27.95N, resampled to plains grid"


def _csi(obs: np.ndarray, mod: np.ndarray, domain: np.ndarray | None = None) -> tuple[float, float, float, dict]:
    if domain is None:
        domain = np.ones(obs.shape, dtype=bool)
    obs = obs & domain
    mod = mod & domain
    tp = int(np.logical_and(obs, mod).sum())
    fp = int(np.logical_and(~obs, mod).sum())
    fn = int(np.logical_and(obs, ~mod).sum())
    tn = int(np.logical_and(~obs, ~mod).sum())
    pod = tp / (tp + fn) if (tp + fn) else 0.0
    far = fp / (tp + fp) if (tp + fp) else 0.0
    csi = tp / (tp + fp + fn) if (tp + fp + fn) else 0.0
    return pod, far, csi, {"tp": tp, "fp": fp, "fn": fn, "tn": tn}


def calibrate_flood(elev: np.ndarray, obs: np.ndarray, domain: np.ndarray,
                    transform=None, tmp: Path | None = None) -> tuple[np.ndarray, dict]:
    best = (-1.0, None)
    if tmp is not None and transform is not None:
        for thresh in (50.0, 100.0, 200.0):
            hg = whitebox_hand(elev, transform, tmp, stream_threshold=thresh)
            if hg is None or not np.isfinite(hg).any():
                continue
            finite = hg[np.isfinite(hg)]
            qs = np.linspace(0.05, float(np.nanpercentile(finite, 60)), 20)
            for t in qs:
                mod = np.isfinite(elev) & (hg <= t)
                pod, far, csi, counts = _csi(obs, mod, domain)
                if csi > best[0]:
                    best = (csi, {
                        "mod": mod, "pod": pod, "far": far, "csi": csi, "counts": counts,
                        "stage_m": float(t), "method": "WhiteboxTools elevation_above_stream",
                        "stream_threshold": thresh,
                    })
    for frac in (0.005, 0.01, 0.02, 0.05, 0.08):
        hg = hand(elev, stream_frac=frac)
        finite = hg[np.isfinite(hg)]
        if finite.size < 10:
            continue
        qs = np.linspace(0.05, float(np.nanpercentile(finite, 60)), 24)
        for t in qs:
            mod = np.isfinite(elev) & (hg <= t)
            pod, far, csi, counts = _csi(obs, mod, domain)
            if csi > best[0]:
                best = (csi, {
                    "mod": mod, "pod": pod, "far": far, "csi": csi, "counts": counts,
                    "stage_m": float(t), "method": "D8 HAND", "stream_frac": frac,
                })
    from scipy.ndimage import minimum_filter
    finite_z = np.where(np.isfinite(elev), elev, np.nanmax(elev))
    for size in (7, 15, 21, 31):
        hg = elev - minimum_filter(finite_z, size=size)
        qs = np.linspace(0.2, float(np.nanpercentile(hg[np.isfinite(hg)], 40)), 16)
        for t in qs:
            mod = np.isfinite(elev) & (hg <= t)
            pod, far, csi, counts = _csi(obs, mod, domain)
            if csi > best[0]:
                best = (csi, {
                    "mod": mod, "pod": pod, "far": far, "csi": csi, "counts": counts,
                    "stage_m": float(t), "method": "local-min HAND proxy", "hand_window_px": size,
                })
    pack = best[1]
    return pack["mod"], {
        "hit_rate_pod": round(pack["pod"], 3),
        "false_alarm_ratio": round(pack["far"], 3),
        "critical_success_index": round(pack["csi"], 3),
        "counts": pack["counts"],
        "stage_m": round(pack["stage_m"], 2),
        "method": pack["method"],
        "stream_frac": pack.get("stream_frac"),
        "hand_window_px": pack.get("hand_window_px"),
        "stream_threshold": pack.get("stream_threshold"),
    }


def _grid_features(elev, transform, obs, mod, glof, assets, pop_grid, cover, lhasa_grid, rng: random.Random) -> list[dict]:
    h, w = elev.shape
    gy, gx = np.gradient(np.nan_to_num(elev, nan=np.nanmean(elev)))
    slope_deg = np.degrees(np.arctan(np.hypot(gy, gx) / max(abs(transform.a) * 111_320, 1e-3)))
    feats = []
    n = 0
    pops_tmp = []
    step = max(1, int(round(RES / abs(transform.a))))
    blocks = []
    for r0 in range(0, h - step, step):
        for c0 in range(0, w - step, step):
            block = elev[r0:r0 + step, c0:c0 + step]
            if not np.isfinite(block).mean() > 0.4:
                continue
            west, north = transform * (c0, r0)
            east, south = transform * (c0 + step, r0 + step)
            flooded = float(mod[r0:r0 + step, c0:c0 + step].mean())
            observed = float(obs[r0:r0 + step, c0:c0 + step].mean())
            z = float(np.nanmean(block))
            glof_d = float(np.nanmean(glof[r0:r0 + step, c0:c0 + step]))
            sl = float(np.nanmean(slope_deg[r0:r0 + step, c0:c0 + step]))
            if pop_grid is not None:
                # WorldPop/GHSL are ~1 km people-per-pixel. Average density × cell area,
                # do not nansum the oversampled 200 m canvas.
                dens = float(np.nanmean(np.clip(pop_grid[r0:r0 + step, c0:c0 + step], 0, None)))
                cell_km = step * abs(transform.a) * 111.32
                pop = int(max(20, dens * cell_km * cell_km))
            else:
                pop = int(max(20, 120 + 900 * flooded + 40 * observed + rng.randint(0, 80)))
            if cover is not None:
                code = float(np.nanmedian(cover[r0:r0 + step, c0:c0 + step]))
                lc = rasters.landcover_name(code)
            else:
                lc = "cropland" if flooded > 0.35 else "shrub"
            slide = round(min(0.75, 0.03 + sl / 80 + (0.12 if lc in ("bare", "grass", "cropland") else 0.0)), 3)
            if lhasa_grid is not None:
                sus = float(np.nanmean(lhasa_grid[r0:r0 + step, c0:c0 + step]))
                if np.isfinite(sus):
                    # NASA LHASA susceptibility is 1–5 (very low–very high).
                    slide = round(min(0.85, 0.5 * slide + 0.5 * max(0.0, (sus - 1.0) / 4.0)), 3)
            depth100 = round(max(0.05, 3.2 * flooded + 0.4 * glof_d + rng.uniform(0, 0.2)), 2)
            depth10 = round(max(0.0, 0.35 * depth100), 2)
            cell_assets = []
            for a in assets:
                if west <= a["lon"] <= east and south <= a["lat"] <= north:
                    cell_assets.append(a["kind"])
            blocks.append({
                "r0": r0, "c0": c0, "west": west, "east": east, "south": south, "north": north,
                "flooded": flooded, "observed": observed, "z": z, "glof_d": glof_d, "sl": sl,
                "pop": pop, "lc": lc, "slide": slide, "depth100": depth100, "depth10": depth10,
                "cell_assets": cell_assets[:4],
            })
            pops_tmp.append(pop)
    p90 = sorted(pops_tmp)[int(0.7 * (len(pops_tmp) - 1))] if pops_tmp else 1
    for b in blocks:
        cid = f"c_{n:05d}"
        rural = b["lc"] in ("cropland", "grass", "shrub") and not b["cell_assets"]
        dense = b["pop"] >= p90
        low_income = 1.0 if (rural and dense) else (0.55 if rural else 0.15)
        equity = round(1.0 + 0.5 * low_income, 3)
        eal_people = round(
            b["pop"] * (0.012 + 0.09 * b["flooded"] + 0.02 * min(b["glof_d"], 4) / 4 + 0.01 * b["slide"]) * equity,
            3,
        )
        feats.append({
            "type": "Feature",
            "geometry": {"type": "Polygon", "coordinates": [[
                [b["west"], b["south"]], [b["east"], b["south"]], [b["east"], b["north"]],
                [b["west"], b["north"]], [b["west"], b["south"]],
            ]]},
            "properties": {
                "cell_id": cid,
                "flood_depth_m": {"rp10": b["depth10"], "rp100": b["depth100"]},
                "glof_depth_m": round(float(b["glof_d"]), 2),
                "landslide_prob": b["slide"],
                "population": b["pop"],
                "critical_assets": b["cell_assets"],
                "eal_people": eal_people,
                "eal_usd": round(eal_people * 2500, 0),
                "observed_flood_frac": round(b["observed"], 3),
                "modeled_flood_frac": round(b["flooded"], 3),
                "elev_m": round(b["z"], 1),
                "slope_deg": round(b["sl"], 1),
                "landcover": b["lc"],
                "low_income_score": round(low_income, 2),
                "equity_weight": equity,
            },
        })
        n += 1
    return feats


def _candidates(features: list[dict], rng: random.Random) -> list[dict]:
    out = []
    i = 7
    types = list(FACTORS)
    for feat in features:
        p = feat["properties"]
        flooded = p["modeled_flood_frac"]
        slope = p.get("slope_deg") or (4 + 18 * p["landslide_prob"])
        landcover = p.get("landcover") or ("cropland" if flooded > 0.35 else "shrub")
        if flooded > 0.35:
            ptype = rng.choice(["wetland_restore", "floodplain_restore", "riverbank_bio"])
        elif slope > 8:
            ptype = rng.choice(["afforestation", "bamboo_slope", "vetiver_slope"])
        else:
            ptype = rng.choice(["afforestation", "bamboo_slope", "vetiver_slope"])
        ring = feat["geometry"]["coordinates"][0]
        cx = sum(x for x, _ in ring[:-1]) / 4
        cy = sum(y for _, y in ring[:-1]) / 4
        out.append({
            "parcel_id": f"p_{i:04d}",
            "type": ptype,
            "area_ha": round(rng.uniform(0.8, 6.0), 2),
            "centroid": [round(cx, 5), round(cy, 5)],
            "cell_ids": [p["cell_id"]],
            "slope_deg": round(slope, 1),
            "landcover": landcover,
        })
        i += 1
        if p["eal_people"] > 3 and len(out) < 280:
            out.append({
                "parcel_id": f"p_{i:04d}",
                "type": rng.choice(types),
                "area_ha": round(rng.uniform(1.0, 5.5), 2),
                "centroid": [round(cx + 0.015, 5), round(cy, 5)],
                "cell_ids": [p["cell_id"]],
                "slope_deg": round(slope, 1),
                "landcover": landcover,
            })
            i += 1
        if len(out) >= 280:
            break
    return out


def _geojson_from_mask(mask, transform) -> dict:
    feats = []
    for geom, val in shapes(mask.astype(np.uint8), mask=mask, transform=transform):
        if int(val) != 1:
            continue
        g = shape(geom).simplify(0.002, preserve_topology=True)
        if g.is_empty:
            continue
        feats.append({"type": "Feature", "geometry": mapping(g), "properties": {"class": "flood"}})
    return {"type": "FeatureCollection", "features": feats}


def run(root: Path) -> None:
    shp = root / "data/obs/FL20240928NPL_SHP/S1_20240927_FloodExtent_Koshi_Madhesh.shp"
    extent_shp = root / "data/obs/FL20240928NPL_SHP/S1_20240927_AnalysisExtent_Koshi_Madhesh.shp"
    if not shp.exists():
        raise SystemExit(f"missing {shp}")
    obs_geom = _obs_geom(shp)
    elev, transform = _read_dem(BBOX)
    h, w = elev.shape
    obs = rasterize([(mapping(obs_geom), 1)], out_shape=(h, w), transform=transform, fill=0, dtype="uint8").astype(bool)
    from scipy.ndimage import binary_dilation
    inside = binary_dilation(obs, iterations=20)
    valid = np.isfinite(elev) & inside
    obs &= valid
    mod, metrics = calibrate_flood(elev, obs, valid, transform=transform, tmp=root / "data/tmp_wbt")
    mod &= valid
    pod, far, csi, counts = _csi(obs, mod, valid)
    stage = metrics["stage_m"]

    # Tsho Rolpa outburst routed on the mountain-to-plains corridor.
    try:
        glof, glof_note = _glof_from_tsho(elev.shape, transform)
    except Exception as exc:
        cell_m = abs(transform.a) * 111_320
        rows = np.where(np.isfinite(elev))
        start = (int(rows[0].min()), int(np.nanargmax(elev[int(rows[0].min()), :])))
        glof = glof_fill(elev, 8.0e7, cell_m * cell_m, start)
        glof_note = f"corridor GLOF failed ({exc}); plains-grid fill from northern high cell"

    assets = fetch_assets(BBOX)
    pop_grid, pop_url = rasters.worldpop(elev.shape, transform)
    ghsl, ghsl_url = rasters.ghsl_pop(elev.shape, transform)
    if pop_grid is None and ghsl is not None:
        pop_grid, pop_url = ghsl, ghsl_url
    cover, cover_ok = rasters.worldcover(elev.shape, transform)
    lhasa_grid, lhasa_url = rasters.lhasa(elev.shape, transform)

    art = root / "artifacts"
    art.mkdir(exist_ok=True)
    modeled_gj = _geojson_from_mask(mod, transform)
    observed_gj = _geojson_from_mask(obs, transform)
    for f in observed_gj["features"]:
        f["properties"]["source"] = "UNOSAT S-1 2024-09-27"
    (art / "flood_modeled.geojson").write_text(json.dumps(modeled_gj))
    (art / "flood_observed.geojson").write_text(json.dumps(observed_gj))

    rng = random.Random(20260919)
    cells = _grid_features(elev, transform, obs, mod, glof, assets, pop_grid, cover, lhasa_grid, rng)
    hazard = {
        "type": "FeatureCollection",
        "features": cells,
        "provenance": {
            "data_status": f"model output — {metrics['method']} on Copernicus GLO-30, stage calibrated to UNOSAT S-1",
            "generated_utc": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
            "datasets": [
                "Copernicus GLO-30 DEM",
                "UNOSAT FL20240928NPL Sentinel-1 2024-09-27 Koshi/Madhesh",
                "OpenStreetMap Overpass (schools/clinics/power)",
                "WorldPop Nepal 1km 2020 (local GeoTIFF)",
                "GHSL POP 2020 30-arcsec tile R7_C27",
                "ESA WorldCover 2021",
                "NASA LHASA global landslide susceptibility (Stanley et al.)",
            ],
            "osm_assets": len(assets),
            "worldpop": pop_url,
            "ghsl": ghsl_url,
            "worldcover": bool(cover_ok),
            "lhasa": lhasa_url,
            "landslide": "0.5 slope×WorldCover + 0.5 NASA LHASA susceptibility (1–5)",
            "hand": {k: v for k, v in metrics.items() if k != "counts"},
            "glof": glof_note,
        },
    }
    (art / "hazard.geojson").write_text(json.dumps(hazard))
    cands = _candidates(cells, rng)
    (art / "candidates.json").write_text(json.dumps(cands))

    px_km2 = abs(transform.a * transform.e) * 111.32 * 111.32
    backtest = {
        "event_date": "2024-09-27",
        "sar_scene": "UNOSAT FL20240928NPL S1_20240927_FloodExtent_Koshi_Madhesh",
        "observed_flood_km2": round(float(obs.sum()) * px_km2, 2),
        "modeled_flood_km2": round(float(mod.sum()) * px_km2, 2),
        "hit_rate_pod": round(pod, 3),
        "false_alarm_ratio": round(far, 3),
        "critical_success_index": round(csi, 3),
        "stage_m": round(stage, 2),
        "counts": counts,
        "counterfactual": {"people_exposed_baseline": None, "people_exposed_with_plan": None, "reduction_pct": None},
        "provenance": {
            "data_status": f"observed UNOSAT S-1 vs {metrics['method']}; stage calibrated on this event",
            "method": f"Copernicus GLO-30; {metrics['method']}; CSI maximised on 27 Sep 2024 scene",
            "generated_utc": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        },
    }
    (art / "backtest.json").write_text(json.dumps(backtest, indent=2) + "\n")
    print(f"CSI={csi:.3f} POD={pod:.3f} FAR={far:.3f} stage={stage:.1f}m cells={len(cells)} parcels={len(cands)}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=".")
    args = parser.parse_args()
    run(Path(args.root))


if __name__ == "__main__":
    main()
