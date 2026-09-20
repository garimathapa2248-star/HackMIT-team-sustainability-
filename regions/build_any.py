"""Build a screening city pack from a place name using public, keyless sources."""
from __future__ import annotations

import argparse
import json
import math
import re
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

from hazard.hand import hand
from hazard.osm import fetch_assets, fetch_water
from hazard.proof import _geojson_from_mask, _read_dem
from optimize.counterfactual import apply as apply_counterfactual
from optimize.portfolio import optimize
from regions.build_bangalore import _candidates, _cells, _worldpop, _write_unvalidated_backtest
from regions.catalog import city_dir, register_city
from regions.openmeteo import daily_precip
from signals.analysis import fit_signal

ISO3 = {
    "NP": "NPL",
    "IN": "IND",
    "US": "USA",
    "BD": "BGD",
    "PK": "PAK",
    "PH": "PHL",
    "ID": "IDN",
    "BR": "BRA",
    "KE": "KEN",
    "VN": "VNM",
}


def _slug(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")
    return slug or "city"


def geocode(name: str) -> dict:
    q = urllib.parse.urlencode({"name": name, "count": 1})
    url = "https://geocoding-api.open-meteo.com/v1/search?" + q
    req = urllib.request.Request(url, headers={"User-Agent": "RootLedger/0.1"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode())
    results = data.get("results") or []
    if not results:
        raise SystemExit(f"geocode missed {name!r}")
    hit = results[0]
    lat, lon = float(hit["latitude"]), float(hit["longitude"])
    bbox = (lon - 0.25, lat - 0.225, lon + 0.25, lat + 0.225)
    return {
        "name": hit.get("name") or name,
        "country_code": (hit.get("country_code") or "").upper(),
        "country": hit.get("country") or "",
        "lat": lat,
        "lon": lon,
        "bbox": bbox,
        "admin1": hit.get("admin1") or "",
    }


def _glo30_urls(bbox) -> list[str]:
    west, south, east, north = bbox
    urls = []
    for la in range(int(math.floor(south)), int(math.ceil(north))):
        ns = "N" if la >= 0 else "S"
        la_abs = abs(la)
        for lo in range(int(math.floor(west)), int(math.ceil(east))):
            ew = "E" if lo >= 0 else "W"
            lo_abs = abs(lo)
            name = f"Copernicus_DSM_COG_10_{ns}{la_abs:02d}_00_{ew}{lo_abs:03d}_00_DEM"
            urls.append(f"https://copernicus-dem-30m.s3.amazonaws.com/{name}/{name}.tif")
    return urls


def _worldpop_url(country_code: str) -> tuple[str | None, str | None]:
    iso3 = ISO3.get(country_code)
    if not iso3:
        return None, None
    lower = iso3.lower()
    url = (
        f"https://data.worldpop.org/GIS/Population/Global_2000_2020_1km/2020/{iso3}/"
        f"{lower}_ppp_2020_1km_Aggregated.tif"
    )
    return url, f"{lower}_ppp_2020_1km_Aggregated.tif"


def _precip_rows(lat: float, lon: float, city_id: str) -> tuple[list[dict], str]:
    try:
        rows = daily_precip(lat, lon, retries=1)
        for row in rows:
            row["station_id"] = f"era5_{city_id}"
        return rows, f"ERA5-Land at city centroid ({lat:.2f}N, {lon:.2f}E)"
    except Exception as exc:
        print(f"centroid precip failed ({exc}); using nearest cached ERA5 station", flush=True)
    cache_dir = Path(__file__).resolve().parents[1] / "data" / "era5_cache"
    stations_path = Path(__file__).resolve().parents[1] / "data" / "stations_nepal.json"
    stations = json.loads(stations_path.read_text()) if stations_path.exists() else []
    best = None
    best_d = 1e9
    for st in stations:
        sid = str(st["station"])
        if not (cache_dir / f"{sid}.json").exists():
            continue
        d = (float(st["lat"]) - lat) ** 2 + (float(st["lon"]) - lon) ** 2
        if d < best_d:
            best, best_d = st, d
    if best is None:
        raise SystemExit("no ERA5 cache and Open-Meteo unavailable")
    payload = json.loads((cache_dir / f"{best['station']}.json").read_text())
    rows = payload.get("rows") or []
    for row in rows:
        row["station_id"] = f"era5_{city_id}"
    note = (
        f"ERA5-Land from nearest cached ISD coordinate {best.get('name')} "
        f"({best['lat']}, {best['lon']}); city centroid fetch was rate-limited"
    )
    return rows, note


def _sanitize_headline(signal: dict) -> dict:
    """Drop numerically unstable two-era recurrences from a 1-series city pack."""
    headline = signal.get("headline") or {}
    yrs = headline.get("new_return_period_yrs")
    if isinstance(yrs, (int, float)) and (yrs > 500 or yrs < 0.5):
        headline["new_return_period_yrs"] = None
        headline["raw_fitted_return_period_yrs"] = yrs
        headline["statement"] = (
            "Late-period GEV did not identify a credible intensification of the early "
            f"100-year depth (raw fitted recurrence {yrs:.3g} yr discarded as unstable)."
        )
        signal["headline"] = headline
    return signal


def run(city_name: str) -> Path:
    place = geocode(city_name)
    city_id = _slug(place["name"])
    bbox = tuple(place["bbox"])
    dest = city_dir(city_id)
    dest.mkdir(parents=True, exist_ok=True)
    print(f"building {place['name']} ({city_id}) bbox={bbox}", flush=True)

    rows, precip_note = _precip_rows(place["lat"], place["lon"], city_id)
    signal = _sanitize_headline(fit_signal(rows, city_id, bootstrap_draws=200))
    signal["provenance"]["datasets"] = [
        precip_note,
        "Copernicus GLO-30 DEM",
        "OpenStreetMap lakes / drains / schools / clinics",
        "WorldPop 1km 2020 (if available)",
    ]
    signal["provenance"]["data_status"] = (
        f"model output — GEV on {precip_note}; not gauge fusion"
    )
    signal["lake_growth"] = []
    (dest / "signal.json").write_text(json.dumps(signal, indent=2) + "\n")

    urls = _glo30_urls(bbox)
    elev, transform = _read_dem(bbox, out_res=0.002, urls=urls)
    domain = np.isfinite(elev)
    if not np.isfinite(elev).any():
        raise SystemExit(f"no DEM coverage for {city_id} (ocean or missing tiles)")
    hg = hand(elev, stream_frac=0.04)
    finite = hg[np.isfinite(hg)]
    stage = float(np.nanpercentile(finite, 18)) if finite.size else 1.0
    flood = domain & np.isfinite(hg) & (hg <= stage)

    wp_url, wp_local = _worldpop_url(place["country_code"])
    pop_grid = _worldpop(elev.shape, transform, url=wp_url, local_name=wp_local) if wp_url else None
    assets = fetch_assets(bbox)
    water = fetch_water(bbox)
    prefix = city_id[:3]
    cells = _cells(elev, transform, flood, pop_grid, assets, water, prefix=prefix)
    hazard = {
        "type": "FeatureCollection",
        "features": cells,
        "provenance": {
            "data_status": (
                f"model output — D8 HAND valleys as pluvial-flood proxy; no SAR CSI for {place['name']}"
            ),
            "generated_utc": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
            "bbox": bbox,
            "osm_assets": len(assets),
            "osm_water": len(water),
            "worldpop": pop_grid is not None,
            "method": f"HAND ≤ {stage:.2f} m (18th percentile) on GLO-30",
        },
    }
    (dest / "hazard.geojson").write_text(json.dumps(hazard))
    cands = _candidates(cells, prefix=prefix)
    (dest / "candidates.json").write_text(json.dumps(cands))
    modeled = _geojson_from_mask(flood, transform)
    (dest / "flood_modeled.geojson").write_text(json.dumps(modeled))
    (dest / "flood_observed.geojson").write_text(json.dumps({"type": "FeatureCollection", "features": []}))
    _write_unvalidated_backtest(dest, flood, transform, stage, place["name"])

    plan = optimize(budget=2_000_000, mode="expected", root=dest, draws=160)
    (dest / "plan.json").write_text(json.dumps(plan, indent=2) + "\n")
    apply_counterfactual(dest, plan)
    from agent.attribution import build as build_attr
    build_attr(dest)
    from api import conceptnote, loader
    loader.set_city(city_id)
    (dest / "preventive_measures_plan.md").write_text(conceptnote.render())
    (dest / "preventive_measures_plan.pdf").write_bytes(conceptnote.render_pdf())

    register_city({
        "id": city_id,
        "name": f"{place['name']} ({place['country'] or place['country_code']})",
        "bbox": bbox,
        "hazards": ["screening HAND flood proxy"],
        "interventions": "NbS screening pack from public DEM / OSM / ERA5-Land",
        "geocode": place,
    })
    print(f"{city_id} pack: cells={len(cells)} parcels={len(cands)} lakes/drains={len(water)} "
          f"assets={len(assets)} CSI=null pop_grid={pop_grid is not None}")
    return dest


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a RootLedger screening pack for any city.")
    parser.add_argument("--city", required=True, help='Place name, e.g. "Kathmandu"')
    args = parser.parse_args()
    run(args.city)


if __name__ == "__main__":
    main()
