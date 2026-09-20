"""WhiteboxTools HAND. Optional — NumPy HAND remains the fallback."""
from __future__ import annotations

import subprocess
from pathlib import Path

import numpy as np
import rasterio


def _wbt_run(binary: Path, tool: str, wd: Path, **params) -> bool:
    """Call the whitebox_tools binary directly; the Python frontend's argument
    quoting makes the Rust binary panic ("Error unwrapping 'output'")."""
    args = [str(binary), f"--run={tool}", f"--wd={wd}"]
    for key, value in params.items():
        if value is True:
            args.append(f"--{key}")
        else:
            args.append(f"--{key}={value}")
    try:
        result = subprocess.run(args, capture_output=True, text=True, timeout=1800)
    except Exception:
        return False
    return result.returncode == 0


def try_hand(elev: np.ndarray, transform, tmp: Path, stream_threshold: float = 100.0) -> np.ndarray | None:
    try:
        import whitebox
    except ImportError:
        return None
    binary = Path(whitebox.__file__).parent / "WBT" / "whitebox_tools"
    if not binary.exists():
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
    for stale in (filled, ptr, acc, streams, hand):
        stale.unlink(missing_ok=True)
    ok = (
        _wbt_run(binary, "FillDepressions", tmp, dem=dem.name, output=filled.name,
                 fix_flats=True, flat_increment=0.001)
        and _wbt_run(binary, "D8Pointer", tmp, dem=filled.name, output=ptr.name)
        and _wbt_run(binary, "D8FlowAccumulation", tmp, input=filled.name, output=acc.name, out_type="cells")
        and _wbt_run(binary, "ExtractStreams", tmp, flow_accum=acc.name, output=streams.name,
                     threshold=stream_threshold)
        and _wbt_run(binary, "ElevationAboveStream", tmp, dem=filled.name, streams=streams.name,
                     output=hand.name)
    )
    if not ok or not hand.exists():
        return None
    with rasterio.open(hand) as src:
        arr = src.read(1).astype(np.float32)
        nd = src.nodata
    if nd is not None:
        arr = np.where(arr == nd, np.nan, arr)
    arr = np.where(np.isfinite(elev), arr, np.nan)
    return arr
