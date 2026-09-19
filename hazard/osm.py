"""OSM Overpass: critical assets + Bangalore-style lakes / drains."""
from __future__ import annotations

import json
import urllib.parse
import urllib.request

ASSET_QUERY = """
[out:json][timeout:40];
(
  node["amenity"~"school|hospital|clinic"]({s},{w},{n},{e});
  way["amenity"~"school|hospital|clinic"]({s},{w},{n},{e});
  node["power"="substation"]({s},{w},{n},{e});
  way["power"="substation"]({s},{w},{n},{e});
);
out center 400;
"""

LAKE_QUERY = """
[out:json][timeout:40];
(
  way["natural"="water"]({s},{w},{n},{e});
  relation["natural"="water"]({s},{w},{n},{e});
  way["water"="lake"]({s},{w},{n},{e});
  way["waterway"="drain"]({s},{w},{n},{e});
  way["waterway"="canal"]({s},{w},{n},{e});
);
out center 400;
"""


def _overpass(q: str) -> list[dict]:
    url = "https://overpass-api.de/api/interpreter"
    body = ("data=" + urllib.parse.quote(q)).encode()
    req = urllib.request.Request(url, data=body, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    req.add_header("User-Agent", "RootLedger/0.1 (hackmit demo)")
    with urllib.request.urlopen(req, timeout=45) as resp:
        return json.loads(resp.read().decode()).get("elements", [])


def _point(el: dict) -> tuple[float, float] | None:
    lat, lon = el.get("lat"), el.get("lon")
    if lat is None:
        c = el.get("center") or {}
        lat, lon = c.get("lat"), c.get("lon")
    if lat is None:
        return None
    return float(lon), float(lat)


def fetch_assets(bbox: tuple[float, float, float, float]) -> list[dict]:
    w, s, e, n = bbox
    try:
        elements = _overpass(ASSET_QUERY.format(s=s, w=w, n=n, e=e))
    except Exception:
        return []
    out = []
    for el in elements:
        pt = _point(el)
        if not pt:
            continue
        lon, lat = pt
        tags = el.get("tags") or {}
        kind = tags.get("amenity") or tags.get("power") or "asset"
        if kind == "hospital":
            kind = "clinic"
        if kind == "substation":
            kind = "hydropower"
        out.append({"lon": lon, "lat": lat, "kind": kind, "name": tags.get("name")})
    return out


def fetch_water(bbox: tuple[float, float, float, float]) -> list[dict]:
    w, s, e, n = bbox
    try:
        elements = _overpass(LAKE_QUERY.format(s=s, w=w, n=n, e=e))
    except Exception:
        return []
    out = []
    for el in elements:
        pt = _point(el)
        if not pt:
            continue
        lon, lat = pt
        tags = el.get("tags") or {}
        kind = "lake" if tags.get("natural") == "water" or tags.get("water") == "lake" else "drain"
        out.append({"lon": lon, "lat": lat, "kind": kind, "name": tags.get("name")})
    return out
