"""D8 HAND and a screening-grade GLOF volume fill.

This is the hydrology kernel PLAN.md asked for (fill → D8 → accumulation →
stream → elevation above stream).  It is NumPy, not Whitebox, so it runs
without sudo on the demo laptop.  Provenance must say so.
"""
from __future__ import annotations

import numpy as np

# D8 neighbor offsets and the 1-8 code used internally (row, col).
_D8 = ((-1, 0), (-1, 1), (0, 1), (1, 1), (1, 0), (1, -1), (0, -1), (-1, -1))


def fill_depressions(elev: np.ndarray, iterations: int = 200) -> np.ndarray:
    """Priority-flood lite: raise interior pits toward the min neighbor."""
    z = np.array(elev, dtype=np.float32, copy=True)
    finite = np.isfinite(z)
    if not finite.any():
        return z
    rim = z.copy()
    rim[1:-1, 1:-1] = np.nan
    seed = np.nanmin(z)
    z = np.where(finite, z, seed)
    for _ in range(iterations):
        nb = np.stack([
            np.roll(np.roll(z, dr, 0), dc, 1) for dr, dc in _D8
        ], axis=0)
        mn = np.min(nb, axis=0)
        interior = np.zeros_like(finite)
        interior[1:-1, 1:-1] = True
        pits = interior & (z + 1e-3 < mn)
        if not pits.any():
            break
        z = np.where(pits, mn, z)
    z = np.where(finite, z, np.nan)
    return z


def d8_flowdir(elev: np.ndarray) -> np.ndarray:
    """Return direction index 0..7 of steepest descent, -1 for flats/nodata."""
    z = elev
    h, w = z.shape
    best_drop = np.zeros((h, w), dtype=np.float32)
    direc = np.full((h, w), -1, dtype=np.int8)
    for i, (dr, dc) in enumerate(_D8):
        nb = np.roll(np.roll(z, dr, 0), dc, 1)
        drop = z - nb
        dist = 1.4142 if dr and dc else 1.0
        slope = drop / dist
        better = np.isfinite(z) & np.isfinite(nb) & (slope > best_drop)
        direc = np.where(better, i, direc)
        best_drop = np.where(better, slope, best_drop)
    direc[0, :] = direc[-1, :] = direc[:, 0] = direc[:, -1] = -1
    return direc


def flow_accumulation(direc: np.ndarray) -> np.ndarray:
    h, w = direc.shape
    acc = np.ones((h, w), dtype=np.float32)
    # Process from high cells toward low using a simple topological sweep.
    order = np.argsort((-np.nan_to_num(np.indices((h, w))[0] * 0 + np.arange(h * w).reshape(h, w))).ravel())
    # Cheaper: iterate downhill from every cell once in raster order, 8 passes.
    donors = acc.copy()
    for _ in range(8):
        add = np.zeros_like(acc)
        for i, (dr, dc) in enumerate(_D8):
            mask = direc == i
            if not mask.any():
                continue
            rr, cc = np.where(mask)
            nr, nc = rr + dr, cc + dc
            ok = (nr >= 0) & (nr < h) & (nc >= 0) & (nc < w)
            np.add.at(add, (nr[ok], nc[ok]), donors[rr[ok], cc[ok]])
        donors = add
        acc += add
    return acc


def hand(elev: np.ndarray, stream_frac: float = 0.02) -> np.ndarray:
    """Elevation above the nearest downstream stream (iterated D8 min)."""
    filled = fill_depressions(elev)
    direc = d8_flowdir(filled)
    acc = flow_accumulation(direc)
    finite = np.isfinite(elev)
    thresh = np.nanquantile(acc[finite], 1.0 - stream_frac)
    is_stream = acc >= thresh
    stream_z = np.where(is_stream, elev, np.inf)
    se = stream_z.copy()
    h, w = elev.shape
    for _ in range(max(h, w)):
        nb = np.stack([np.roll(np.roll(se, dr, 0), dc, 1) for dr, dc in _D8], axis=0)
        nxt = np.min(nb, axis=0)
        nxt = np.where(is_stream, elev, nxt)
        nxt[0, :] = nxt[-1, :] = nxt[:, 0] = nxt[:, -1] = np.inf
        if np.allclose(nxt, se, equal_nan=True):
            break
        se = nxt
    out = elev - se
    out = np.where(finite & np.isfinite(out), np.maximum(out, 0.0), np.nan)
    return out


def glof_fill(elev: np.ndarray, volume_m3: float, cell_area_m2: float,
              start: tuple[int, int]) -> np.ndarray:
    """Greedy downhill fill until the outburst volume is consumed."""
    h, w = elev.shape
    sr, sc = start
    remaining = volume_m3
    depth = np.zeros((h, w), dtype=np.float32)
    visited = np.zeros((h, w), dtype=bool)
    import heapq
    heap = [(float(elev[sr, sc]), sr, sc)]
    while heap and remaining > 0:
        z, r, c = heapq.heappop(heap)
        if visited[r, c] or not np.isfinite(elev[r, c]):
            continue
        visited[r, c] = True
        take = min(remaining, cell_area_m2 * 2.0)  # cap 2 m per cell per visit
        depth[r, c] += take / cell_area_m2
        remaining -= take
        for dr, dc in _D8:
            nr, nc = r + dr, c + dc
            if 0 <= nr < h and 0 <= nc < w and not visited[nr, nc] and np.isfinite(elev[nr, nc]):
                heapq.heappush(heap, (float(elev[nr, nc]), nr, nc))
    return depth
