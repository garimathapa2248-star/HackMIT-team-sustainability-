"""IMERG fusion is gated on NASA Earthdata. This module records that honestly."""
from __future__ import annotations

STATUS = {
    "available": False,
    "product": "NASA/GPM_L3/IMERG_V07",
    "reason": (
        "Daily IMERG is not on an unauthenticated public URL. "
        "Use Google Earth Engine NASA/GPM_L3/IMERG_V07 or Earthdata if credentials exist. "
        "RootLedger's headline remains NOAA ISD GEV."
    ),
}


def status() -> dict:
    return dict(STATUS)
