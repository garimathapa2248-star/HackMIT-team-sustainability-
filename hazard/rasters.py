"""Windowed reads for WorldPop / WorldCover / GHSL / LHASA. Prefer local files."""
from __future__ import annotations

from pathlib import Path

import numpy as np
import rasterio
from rasterio.warp import Resampling, reproject

ROOT = Path(__file__).resolve().parents[1]
LOCAL_WORLDPOP = ROOT / "data/pop/npl_ppp_2020_1km_Aggregated.tif"
LOCAL_LHASA = ROOT / "data/lhasa/global-landslide-susceptibility-map-2-27-23.tif"
LOCAL_GHSL = ROOT / "data/pop/GHS_POP_E2020_GLOBE_R2023A_4326_30ss_V1_0_R7_C27.tif"

WORLDPOP_URLS = (
    "https://data.worldpop.org/GIS/Population/Global_2000_2020_1km/2020/NPL/npl_ppp_2020_1km_Aggregated.tif",
)

WORLDCOVER_URLS = (
    "https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_N24E084_Map.tif",
    "https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_N24E087_Map.tif",
    "https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_N27E084_Map.tif",
    "https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_N27E087_Map.tif",
)

GHSL_POP = (
    "https://jeodpp.jrc.ec.europa.eu/ftp/jrc-opendata/GHSL/"
    "GHS_POP_GLOBE_R2023A/GHS_POP_E2020_GLOBE_R2023A_4326_30ss/V1-0/"
    "GHS_POP_E2020_GLOBE_R2023A_4326_30ss_V1_0.tif"
)

WC_NAME = {
    10: "tree",
    20: "shrub",
    30: "grass",
    40: "cropland",
    50: "built",
    60: "bare",
    80: "water",
    90: "wetland",
}


def _warp_src(src, shape, transform, resampling, dtype=np.float32, nodata=np.nan):
    canvas = np.full(shape, nodata, dtype=dtype)
    reproject(
        source=rasterio.band(src, 1),
        destination=canvas,
        src_transform=src.transform,
        src_crs=src.crs,
        src_nodata=src.nodata,
        dst_transform=transform,
        dst_crs="EPSG:4326",
        dst_nodata=nodata,
        resampling=resampling,
    )
    return canvas


def _warp_path(path: Path, shape, transform, resampling, dtype=np.float32, nodata=np.nan):
    with rasterio.open(path) as src:
        return _warp_src(src, shape, transform, resampling, dtype, nodata)


def _warp_url(url: str, shape, transform, resampling, dtype=np.float32, nodata=np.nan):
    with rasterio.Env(
        GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR",
        CPL_VSIL_CURL_ALLOWED_EXTENSIONS=".tif",
        GDAL_HTTP_TIMEOUT="25",
        CPL_VSIL_CURL_CHUNK_SIZE="32768",
    ):
        with rasterio.open("/vsicurl/" + url) as src:
            return _warp_src(src, shape, transform, resampling, dtype, nodata)


def worldpop(shape, transform):
    if LOCAL_WORLDPOP.exists():
        try:
            grid = _warp_path(LOCAL_WORLDPOP, shape, transform, Resampling.average)
            if np.isfinite(grid).mean() > 0.05:
                return grid, str(LOCAL_WORLDPOP)
        except Exception:
            pass
    for url in WORLDPOP_URLS:
        try:
            grid = _warp_url(url, shape, transform, Resampling.average)
            if np.isfinite(grid).mean() > 0.05:
                return grid, url
        except Exception:
            continue
    return None, None


def worldcover(shape, transform):
    canvas = np.zeros(shape, dtype=np.uint8)
    ok = False
    for url in WORLDCOVER_URLS:
        try:
            tile = _warp_url(url, shape, transform, Resampling.mode, dtype=np.float32, nodata=0)
            canvas = np.where(tile > 0, tile.astype(np.uint8), canvas)
            ok = True
        except Exception:
            continue
    return (canvas if ok and (canvas > 0).any() else None), ok


def ghsl_pop(shape, transform):
    if LOCAL_GHSL.exists():
        try:
            grid = _warp_path(LOCAL_GHSL, shape, transform, Resampling.average)
            if np.isfinite(grid).mean() > 0.05:
                return grid, str(LOCAL_GHSL)
        except Exception:
            pass
    try:
        grid = _warp_url(GHSL_POP, shape, transform, Resampling.average)
        if np.isfinite(grid).mean() > 0.05:
            return grid, GHSL_POP
    except Exception:
        return None, None
    return None, None


def lhasa(shape, transform):
    if not LOCAL_LHASA.exists():
        return None, None
    try:
        grid = _warp_path(LOCAL_LHASA, shape, transform, Resampling.bilinear)
        if np.isfinite(grid).mean() > 0.01:
            return grid, str(LOCAL_LHASA)
    except Exception:
        return None, None
    return None, None


def landcover_name(code: float) -> str:
    return WC_NAME.get(int(code), "unknown")
