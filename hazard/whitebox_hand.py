"""WhiteboxTools HAND. Optional — NumPy HAND remains the fallback."""
from __future__ import annotations

from pathlib import Path

import numpy as np
import rasterio


def try_hand(elev: np.ndarray, transform, tmp: Path, stream_threshold: float = 100.0) -> np.ndarray | None:
    try:
        import whitebox
    except ImportError:
        return None
    tmp.mkdir(parents=True, exist_ok=True)
    dem = tmp / "dem.tif"
    filled = tmp / "filled.tif"
    ptr = tmp / "d8.tif"
    acc = tmp / "acc.tif"
    streams = tmp / "streams.tif"
    hand = tmp / "hand.tif"
    nodata = -9999.0
    z = np.where(np.isfinite(elev), elev, nodata).astype(np.float32)
    profile = {
        "driver": "GTiff",
        "height": z.shape[0],
        "width": z.shape[1],
        "count": 1,
        "dtype": "float32",
        "crs": "EPSG:4326",
        "transform": transform,
        "nodata": nodata,
    }
    with rasterio.open(dem, "w", **profile) as dst:
        dst.write(z, 1)
    wbt = whitebox.WhiteboxTools()
    wbt.set_verbose_mode(False)
    wbt.work_dir = str(tmp)
    try:
        wbt.fill_depressions(i=str(dem), o=str(filled))
        wbt.d8_pointer(dem=str(filled), output=str(ptr))
        wbt.d8_flow_accumulation(i=str(filled), o=str(acc), out_type="cells")
        wbt.extract_streams(flow_accum=str(acc), output=str(streams), threshold=stream_threshold)
        wbt.elevation_above_stream(dem=str(filled), streams=str(streams), output=str(hand))
    except Exception:
        return None
    if not hand.exists():
        return None
    with rasterio.open(hand) as src:
        arr = src.read(1).astype(np.float32)
        nd = src.nodata
    if nd is not None:
        arr = np.where(arr == nd, np.nan, arr)
    arr = np.where(np.isfinite(elev), arr, np.nan)
    return arr
