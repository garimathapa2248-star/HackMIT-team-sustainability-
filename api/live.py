"""V2 live worldwide risk briefing — public APIs, in-memory cache, no RunPod.

v1 artifact routes are untouched. These helpers are used only by /live/*.
"""
from __future__ import annotations

import asyncio
import math
import os
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Awaitable, Callable, Dict, List, Optional, Tuple

import httpx

from api.live_measures import build_measures

USER_AGENT = os.environ.get(
    "NOMINATIM_USER_AGENT",
    "RootLedger-HackMIT/1.0 (live-prevention; educational; contact=hackmit)",
)
HEADERS = {"User-Agent": USER_AGENT, "Accept": "application/json"}

CELL = 0.05  # ~5 km hover grid
PLACE_TTL = 12 * 60
RANK_TTL = 12 * 60
GEOCODE_TTL = 24 * 3600
FEED_TTL = 30 * 60

WMO = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
}

# Seed list only — scores are always fetched live.
CITIES: List[Dict[str, Any]] = [
    {"id": "nyc", "name": "New York", "country": "United States", "lat": 40.71, "lng": -74.01},
    {"id": "lax", "name": "Los Angeles", "country": "United States", "lat": 34.05, "lng": -118.24},
    {"id": "mia", "name": "Miami", "country": "United States", "lat": 25.76, "lng": -80.19},
    {"id": "anc", "name": "Anchorage", "country": "United States", "lat": 61.22, "lng": -149.90},
    {"id": "mex", "name": "Mexico City", "country": "Mexico", "lat": 19.43, "lng": -99.13},
    {"id": "sao", "name": "São Paulo", "country": "Brazil", "lat": -23.55, "lng": -46.63},
    {"id": "lim", "name": "Lima", "country": "Peru", "lat": -12.05, "lng": -77.04},
    {"id": "bog", "name": "Bogotá", "country": "Colombia", "lat": 4.71, "lng": -74.07},
    {"id": "scl", "name": "Santiago", "country": "Chile", "lat": -33.45, "lng": -70.67},
    {"id": "lon", "name": "London", "country": "United Kingdom", "lat": 51.51, "lng": -0.13},
    {"id": "par", "name": "Paris", "country": "France", "lat": 48.86, "lng": 2.35},
    {"id": "ath", "name": "Athens", "country": "Greece", "lat": 37.98, "lng": 23.73},
    {"id": "ist", "name": "Istanbul", "country": "Türkiye", "lat": 41.01, "lng": 28.98},
    {"id": "rey", "name": "Reykjavík", "country": "Iceland", "lat": 64.15, "lng": -21.94},
    {"id": "cai", "name": "Cairo", "country": "Egypt", "lat": 30.04, "lng": 31.24},
    {"id": "lag", "name": "Lagos", "country": "Nigeria", "lat": 6.52, "lng": 3.38},
    {"id": "nbo", "name": "Nairobi", "country": "Kenya", "lat": -1.29, "lng": 36.82},
    {"id": "jnb", "name": "Johannesburg", "country": "South Africa", "lat": -26.20, "lng": 28.05},
    {"id": "dak", "name": "Dakar", "country": "Senegal", "lat": 14.72, "lng": -17.47},
    {"id": "dxb", "name": "Dubai", "country": "United Arab Emirates", "lat": 25.20, "lng": 55.27},
    {"id": "del", "name": "Delhi", "country": "India", "lat": 28.61, "lng": 77.21},
    {"id": "bom", "name": "Mumbai", "country": "India", "lat": 19.08, "lng": 72.88},
    {"id": "blr", "name": "Bengaluru", "country": "India", "lat": 12.97, "lng": 77.59},
    {"id": "dac", "name": "Dhaka", "country": "Bangladesh", "lat": 23.81, "lng": 90.41},
    {"id": "ktm", "name": "Kathmandu", "country": "Nepal", "lat": 27.72, "lng": 85.32},
    {"id": "bir", "name": "Biratnagar / Koshi", "country": "Nepal", "lat": 26.45, "lng": 87.27},
    {"id": "bkk", "name": "Bangkok", "country": "Thailand", "lat": 13.76, "lng": 100.50},
    {"id": "jkt", "name": "Jakarta", "country": "Indonesia", "lat": -6.21, "lng": 106.85},
    {"id": "mnl", "name": "Manila", "country": "Philippines", "lat": 14.60, "lng": 120.98},
    {"id": "sgn", "name": "Ho Chi Minh City", "country": "Vietnam", "lat": 10.82, "lng": 106.63},
    {"id": "sin", "name": "Singapore", "country": "Singapore", "lat": 1.35, "lng": 103.82},
    {"id": "tyo", "name": "Tokyo", "country": "Japan", "lat": 35.68, "lng": 139.69},
    {"id": "sel", "name": "Seoul", "country": "South Korea", "lat": 37.57, "lng": 126.98},
    {"id": "pek", "name": "Beijing", "country": "China", "lat": 39.90, "lng": 116.41},
    {"id": "sha", "name": "Shanghai", "country": "China", "lat": 31.23, "lng": 121.47},
    {"id": "kar", "name": "Karachi", "country": "Pakistan", "lat": 24.86, "lng": 67.00},
    {"id": "syd", "name": "Sydney", "country": "Australia", "lat": -33.87, "lng": 151.21},
    {"id": "akl", "name": "Auckland", "country": "New Zealand", "lat": -36.85, "lng": 174.76},
]

_client: Optional[httpx.AsyncClient] = None
_nom_lock = asyncio.Lock()
_nom_last = 0.0
_cache: Dict[str, Tuple[float, Any]] = {}
_cache_locks: Dict[str, asyncio.Lock] = {}
_locks_guard = asyncio.Lock()


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(ts: Optional[datetime] = None) -> str:
    return (ts or _now()).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def cell_key(lat: float, lng: float, size: float = CELL) -> str:
    return f"{round(lat / size) * size:.2f},{round(lng / size) * size:.2f}"


def haversine_km(a_lat: float, a_lng: float, b_lat: float, b_lng: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(a_lat), math.radians(b_lat)
    dp = math.radians(b_lat - a_lat)
    dl = math.radians(b_lng - a_lng)
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(min(1.0, math.sqrt(h)))


async def get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            timeout=httpx.Timeout(10.0, connect=5.0),
            headers=HEADERS,
            follow_redirects=True,
        )
    return _client


async def cache_get(key: str, ttl: float, factory: Callable[[], Awaitable[Any]]) -> Any:
    now = time.time()
    hit = _cache.get(key)
    if hit and hit[0] > now:
        return hit[1]
    async with _locks_guard:
        lock = _cache_locks.get(key)
        if lock is None:
            lock = asyncio.Lock()
            _cache_locks[key] = lock
    async with lock:
        hit = _cache.get(key)
        if hit and hit[0] > time.time():
            return hit[1]
        value = await factory()
        _cache[key] = (time.time() + ttl, value)
        return value


async def _get_json(url: str, params: Optional[dict] = None, timeout: float = 8.0) -> Tuple[Optional[Any], Optional[str]]:
    last_err = None
    host = url.split("/")[2] if "//" in url else "source"
    for attempt in range(3):
        try:
            client = await get_client()
            response = await client.get(url, params=params, timeout=timeout)
            if response.status_code == 429:
                last_err = f"{host} HTTP 429"
                await asyncio.sleep(0.7 * (attempt + 1))
                continue
            if response.status_code >= 400:
                return None, f"{host} HTTP {response.status_code}"
            return response.json(), None
        except Exception as exc:  # noqa: BLE001 — live sources must degrade
            last_err = f"{host}: {exc.__class__.__name__}"
            await asyncio.sleep(0.35 * (attempt + 1))
    return None, last_err


def heat_index_c(temp_c: Optional[float], rh: Optional[float]) -> Optional[float]:
    if temp_c is None or rh is None:
        return None
    t = temp_c * 9.0 / 5.0 + 32.0
    if t < 80:
        return temp_c
    hi = (
        -42.379
        + 2.04901523 * t
        + 10.14333127 * rh
        - 0.22475541 * t * rh
        - 0.00683783 * t * t
        - 0.05481717 * rh * rh
        + 0.00122874 * t * t * rh
        + 0.00085282 * t * rh * rh
        - 0.00000199 * t * t * rh * rh
    )
    return (hi - 32.0) * 5.0 / 9.0


def pm25_to_us_aqi(pm: float) -> float:
    bps = [
        (0.0, 12.0, 0, 50),
        (12.1, 35.4, 51, 100),
        (35.5, 55.4, 101, 150),
        (55.5, 150.4, 151, 200),
        (150.5, 250.4, 201, 300),
        (250.5, 500.4, 301, 500),
    ]
    for c_low, c_high, a_low, a_high in bps:
        if pm <= c_high:
            return (a_high - a_low) / (c_high - c_low) * (pm - c_low) + a_low
    return 500.0


def _num(value: Any) -> Optional[float]:
    try:
        if value is None:
            return None
        n = float(value)
        if math.isnan(n) or math.isinf(n):
            return None
        return n
    except (TypeError, ValueError):
        return None


def _sum_tail(values: Optional[List[Any]], n: int) -> Optional[float]:
    if not values:
        return None
    chunk = [_num(v) for v in values[-n:]]
    ok = [v for v in chunk if v is not None]
    if not ok:
        return None
    return float(sum(ok))


async def reverse_geocode(lat: float, lng: float) -> Dict[str, Any]:
    async def _fetch() -> Dict[str, Any]:
        global _nom_last
        async with _nom_lock:
            wait = 1.1 - (time.time() - _nom_last)
            if wait > 0:
                await asyncio.sleep(wait)
            data, err = await _get_json(
                "https://nominatim.openstreetmap.org/reverse",
                {
                    "lat": f"{lat:.5f}",
                    "lon": f"{lng:.5f}",
                    "format": "jsonv2",
                    "zoom": 10,
                    "addressdetails": 1,
                },
                timeout=8.0,
            )
            _nom_last = time.time()
        if not data:
            return {
                "ok": False,
                "error": err or "reverse geocode failed",
                "name": None,
                "display": f"{lat:.2f}°, {lng:.2f}°",
                "country": None,
                "country_code": None,
                "admin": None,
                "kind": "coordinate",
            }
        addr = data.get("address") or {}
        name = (
            data.get("name")
            or addr.get("city")
            or addr.get("town")
            or addr.get("village")
            or addr.get("county")
            or addr.get("state")
            or addr.get("ocean")
            or addr.get("sea")
        )
        country = addr.get("country")
        code = (addr.get("country_code") or "").upper() or None
        admin = addr.get("state") or addr.get("region") or addr.get("county")
        display = ", ".join([p for p in (name, admin, country) if p]) or data.get("display_name") or f"{lat:.2f}°, {lng:.2f}°"
        return {
            "ok": True,
            "error": None,
            "name": name,
            "display": display,
            "country": country,
            "country_code": code,
            "admin": admin,
            "kind": data.get("addresstype") or data.get("type") or "place",
            "osm": data.get("display_name"),
        }

    return await cache_get(f"geo:{cell_key(lat, lng)}", GEOCODE_TTL, _fetch)


async def fetch_weather(lat: float, lng: float) -> Dict[str, Any]:
    async def _fetch() -> Dict[str, Any]:
        data, err = await _get_json(
            "https://api.open-meteo.com/v1/forecast",
            {
                "latitude": lat,
                "longitude": lng,
                "current": "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,is_day",
                "hourly": "precipitation,soil_moisture_0_to_7cm,temperature_2m",
                "daily": "weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,precipitation_sum,precipitation_probability_max,wind_gusts_10m_max,uv_index_max",
                "past_days": 7,
                "forecast_days": 7,
                "timezone": "auto",
                "wind_speed_unit": "kmh",
            },
        )
        return {"ok": not err, "error": err, "data": data, "fetched_at": _iso()}

    return await cache_get(f"wx:{cell_key(lat, lng)}", PLACE_TTL, _fetch)


async def fetch_air(lat: float, lng: float) -> Dict[str, Any]:
    async def _fetch() -> Dict[str, Any]:
        data, err = await _get_json(
            "https://air-quality-api.open-meteo.com/v1/air-quality",
            {
                "latitude": lat,
                "longitude": lng,
                "current": "pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,dust,uv_index,us_aqi,european_aqi",
                "forecast_days": 2,
            },
        )
        return {"ok": not err, "error": err, "data": data, "fetched_at": _iso()}

    return await cache_get(f"aq:{cell_key(lat, lng)}", PLACE_TTL, _fetch)


async def fetch_flood(lat: float, lng: float) -> Dict[str, Any]:
    async def _fetch() -> Dict[str, Any]:
        data, err = await _get_json(
            "https://flood-api.open-meteo.com/v1/flood",
            {
                "latitude": lat,
                "longitude": lng,
                "daily": "river_discharge,river_discharge_mean,river_discharge_median,river_discharge_p75,river_discharge_max",
                "forecast_days": 5,
            },
        )
        return {"ok": not err, "error": err, "data": data, "fetched_at": _iso()}

    return await cache_get(f"fl:{cell_key(lat, lng)}", PLACE_TTL, _fetch)


async def fetch_quakes_near(lat: float, lng: float) -> Dict[str, Any]:
    start = (_now() - timedelta(days=30)).date().isoformat()

    async def _fetch() -> Dict[str, Any]:
        data, err = await _get_json(
            "https://earthquake.usgs.gov/fdsnws/event/1/query",
            {
                "format": "geojson",
                "latitude": lat,
                "longitude": lng,
                "maxradiuskm": 400,
                "minmagnitude": 2.5,
                "orderby": "time",
                "limit": 20,
                "starttime": start,
            },
        )
        return {"ok": not err, "error": err, "data": data, "fetched_at": _iso()}

    return await cache_get(f"eq:{cell_key(lat, lng, 0.5)}", PLACE_TTL, _fetch)


async def fetch_eonet() -> Dict[str, Any]:
    async def _fetch() -> Dict[str, Any]:
        data, err = await _get_json(
            "https://eonet.gsfc.nasa.gov/api/v3/events",
            {"status": "open", "limit": 80},
            timeout=12.0,
        )
        return {"ok": not err, "error": err, "data": data, "fetched_at": _iso()}

    return await cache_get("eonet:open", FEED_TTL, _fetch)


async def fetch_usgs_month() -> Dict[str, Any]:
    async def _fetch() -> Dict[str, Any]:
        data, err = await _get_json(
            "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_month.geojson",
            timeout=12.0,
        )
        return {"ok": not err, "error": err, "data": data, "fetched_at": _iso()}

    return await cache_get("usgs:4.5month", FEED_TTL, _fetch)


async def fetch_reliefweb(iso3: Optional[str], country: Optional[str]) -> Dict[str, Any]:
    if not iso3 and not country:
        return {"ok": False, "error": "no country", "data": None, "fetched_at": _iso()}

    async def _fetch() -> Dict[str, Any]:
        params = {
            "appname": "rootledger-v2",
            "profile": "lite",
            "limit": 8,
            "preset": "latest",
        }
        if iso3:
            params["query[value]"] = f"primary_country.iso3.exact:{iso3.lower()} AND status:current"
        else:
            params["query[value]"] = str(country)
        data, err = await _get_json("https://api.reliefweb.int/v1/disasters", params, timeout=8.0)
        return {"ok": not err, "error": err, "data": data, "fetched_at": _iso()}

    return await cache_get(f"rw:{iso3 or country}", FEED_TTL, _fetch)


def _event_coords(event: dict) -> Optional[Tuple[float, float]]:
    geoms = event.get("geometry") or []
    if not geoms:
        return None
    last = geoms[-1]
    coords = last.get("coordinates") if isinstance(last, dict) else None
    if not coords or len(coords) < 2:
        return None
    try:
        return float(coords[1]), float(coords[0])
    except (TypeError, ValueError):
        return None


def nearby_eonet(lat: float, lng: float, payload: Dict[str, Any], radius_km: float = 400.0) -> List[Dict[str, Any]]:
    data = (payload or {}).get("data") or {}
    out = []
    for event in data.get("events") or []:
        coords = _event_coords(event)
        if not coords:
            continue
        dist = haversine_km(lat, lng, coords[0], coords[1])
        if dist > radius_km:
            continue
        cats = event.get("categories") or []
        cat = (cats[0].get("id") if cats else None) or "event"
        out.append(
            {
                "id": event.get("id"),
                "title": event.get("title"),
                "category": cat,
                "distance_km": round(dist, 1),
                "link": (event.get("sources") or [{}])[0].get("url"),
            }
        )
    out.sort(key=lambda r: r["distance_km"])
    return out[:8]


def parse_quakes(lat: float, lng: float, payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    data = (payload or {}).get("data") or {}
    out = []
    now = _now()
    for feat in data.get("features") or []:
        props = feat.get("properties") or {}
        geom = feat.get("geometry") or {}
        coords = geom.get("coordinates") or [None, None]
        try:
            qlng, qlat = float(coords[0]), float(coords[1])
        except (TypeError, ValueError, IndexError):
            continue
        mag = _num(props.get("mag"))
        t_ms = props.get("time")
        age_h = None
        if isinstance(t_ms, (int, float)):
            age_h = (now - datetime.fromtimestamp(t_ms / 1000.0, tz=timezone.utc)).total_seconds() / 3600.0
        dist = haversine_km(lat, lng, qlat, qlng)
        out.append(
            {
                "mag": mag,
                "place": props.get("place"),
                "distance_km": round(dist, 1),
                "age_hours": round(age_h, 1) if age_h is not None else None,
                "url": props.get("url"),
            }
        )
    out.sort(key=lambda r: (-(r["mag"] or 0), r["distance_km"]))
    return out[:12]


def parse_relief(payload: Dict[str, Any], country: Optional[str]) -> List[Dict[str, Any]]:
    data = (payload or {}).get("data") or {}
    out = []
    for row in data.get("data") or []:
        fields = row.get("fields") or {}
        countries = fields.get("country") or fields.get("primary_country") or []
        names = []
        if isinstance(countries, list):
            names = [c.get("name") for c in countries if isinstance(c, dict)]
        elif isinstance(countries, dict):
            names = [countries.get("name")]
        title = fields.get("name") or fields.get("title")
        dtype = ""
        tlist = fields.get("type") or []
        if isinstance(tlist, list) and tlist:
            dtype = (tlist[0].get("name") if isinstance(tlist[0], dict) else str(tlist[0])) or ""
        url = None
        html = fields.get("url") or {}
        if isinstance(html, dict):
            url = html.get("html") or html.get("self")
        out.append(
            {
                "id": row.get("id"),
                "title": title,
                "type": dtype,
                "country": ", ".join([n for n in names if n]),
                "url": url,
            }
        )
    if country:
        lowered = country.lower()
        filtered = [r for r in out if lowered in (r.get("country") or "").lower()]
        if filtered:
            return filtered[:4]
    return out[:3]


def conditions_from(weather: Dict[str, Any], air: Dict[str, Any], flood: Dict[str, Any]) -> Dict[str, Any]:
    w = (weather.get("data") or {}) if weather else {}
    a = (air.get("data") or {}) if air else {}
    f = (flood.get("data") or {}) if flood else {}
    cur = w.get("current") or {}
    daily = w.get("daily") or {}
    hourly = w.get("hourly") or {}
    acur = a.get("current") or {}
    fdaily = f.get("daily") or {}
    t = _num(cur.get("temperature_2m"))
    rh = _num(cur.get("relative_humidity_2m"))
    apparent = _num(cur.get("apparent_temperature"))
    code = cur.get("weather_code")
    try:
        code_i = int(code) if code is not None else None
    except (TypeError, ValueError):
        code_i = None
    pm25 = _num(acur.get("pm2_5"))
    us_aqi = _num(acur.get("us_aqi"))
    if us_aqi is None and pm25 is not None:
        us_aqi = pm25_to_us_aqi(pm25)
    precip_hourly = hourly.get("precipitation") or []
    tmaxs = daily.get("temperature_2m_max") or []
    tmins = daily.get("temperature_2m_min") or []
    uv_daily = daily.get("uv_index_max") or []
    precip_daily = daily.get("precipitation_sum") or []
    # past_days=7 then forecast; "today" is index 7 if 7 past days present
    today_i = 7 if len(precip_daily) >= 8 else 0
    discharge = None
    dmean = None
    dlist = fdaily.get("river_discharge") or []
    mlist = fdaily.get("river_discharge_mean") or []
    if dlist:
        discharge = _num(dlist[0])
    if mlist:
        dmean = _num(mlist[0])
    soil_list = hourly.get("soil_moisture_0_to_7cm") or []
    soil = _num(soil_list[-1]) if soil_list else None
    uv_now = _num(acur.get("uv_index"))
    if uv_now is None and uv_daily:
        uv_now = _num(uv_daily[min(today_i, len(uv_daily) - 1)])
    precip_24h = _sum_tail(precip_hourly, 24)
    if precip_24h is None and precip_daily:
        precip_24h = _num(precip_daily[min(today_i, len(precip_daily) - 1)])
    precip_7d = None
    if precip_daily:
        start = max(0, today_i - 6)
        chunk = [_num(v) for v in precip_daily[start : today_i + 1]]
        ok = [v for v in chunk if v is not None]
        precip_7d = float(sum(ok)) if ok else None
    precip_forecast = None
    if precip_daily and today_i + 3 < len(precip_daily):
        chunk = [_num(v) for v in precip_daily[today_i : today_i + 3]]
        ok = [v for v in chunk if v is not None]
        precip_forecast = float(sum(ok)) if ok else None
    return {
        "temperature_c": t,
        "apparent_c": apparent,
        "heat_index_c": heat_index_c(t, rh),
        "humidity_pct": rh,
        "precip_mm": _num(cur.get("precipitation")),
        "precip_24h_mm": precip_24h,
        "precip_7d_mm": precip_7d,
        "precip_forecast_mm": precip_forecast,
        "wind_kmh": _num(cur.get("wind_speed_10m")),
        "gust_kmh": _num(cur.get("wind_gusts_10m")),
        "weather_code": code_i,
        "weather_text": WMO.get(code_i or -1, "Observed conditions"),
        "us_aqi": us_aqi,
        "european_aqi": _num(acur.get("european_aqi")),
        "pm25": pm25,
        "pm10": _num(acur.get("pm10")),
        "ozone": _num(acur.get("ozone")),
        "no2": _num(acur.get("nitrogen_dioxide")),
        "river_discharge": discharge,
        "river_discharge_mean": dmean,
        "uv_index": uv_now,
        "soil_moisture": soil,
        "tmax_c": _num(tmaxs[min(today_i, len(tmaxs) - 1)]) if tmaxs else None,
        "tmin_c": _num(tmins[min(today_i, len(tmins) - 1)]) if tmins else None,
        "timezone": w.get("timezone"),
        "elevation_m": _num(w.get("elevation")),
    }


def score_risks(cond: Dict[str, Any], quakes: List[dict], eonet_rows: List[dict]) -> List[Dict[str, Any]]:
    heat_c = cond.get("heat_index_c")
    if heat_c is None:
        heat_c = cond.get("apparent_c")
    aqi = cond.get("us_aqi")
    gust = cond.get("gust_kmh") or 0
    precip_24h = cond.get("precip_24h_mm") or 0
    discharge = cond.get("river_discharge")
    dmean = cond.get("river_discharge_mean")
    ratio = None
    if discharge is not None and dmean not in (None, 0):
        ratio = discharge / dmean
    soil = cond.get("soil_moisture")
    precip_7d = cond.get("precip_7d_mm")
    rh = cond.get("humidity_pct")
    wind = cond.get("wind_kmh") or 0
    wcode = cond.get("weather_code") or 0

    def heat_score() -> Tuple[float, str, str]:
        if heat_c is None:
            return 0, "unknown", "Temperature unavailable."
        if heat_c >= 46:
            return 96, "emergency", f"Heat index / apparent {heat_c:.1f}°C — NOAA Extreme Danger."
        if heat_c >= 39:
            return 84, "warning", f"Heat index / apparent {heat_c:.1f}°C — NOAA Danger band."
        if heat_c >= 32:
            return 62, "advisory", f"Heat index / apparent {heat_c:.1f}°C — Extreme Caution / WHO heat-health."
        if heat_c >= 27:
            return 34, "watch", f"Warm: {heat_c:.1f}°C apparent."
        if heat_c <= -20:
            return 82, "warning", f"Extreme cold {heat_c:.1f}°C apparent."
        if heat_c <= 0:
            return 38, "watch", f"Freezing {heat_c:.1f}°C apparent."
        return max(0, 18 - abs(heat_c - 18) * 0.4), "info", f"{heat_c:.1f}°C apparent — not a heat warning."

    def air_score() -> Tuple[float, str, str]:
        if aqi is None:
            return 0, "unknown", "Air-quality feed unavailable."
        if aqi >= 301:
            return 98, "emergency", f"US AQI {aqi:.0f} Hazardous (EPA)."
        if aqi >= 201:
            return 90, "warning", f"US AQI {aqi:.0f} Very Unhealthy (EPA)."
        if aqi >= 151:
            return 78, "warning", f"US AQI {aqi:.0f} Unhealthy (EPA)."
        if aqi >= 101:
            return 58, "advisory", f"US AQI {aqi:.0f} Unhealthy for Sensitive Groups (EPA)."
        if aqi >= 51:
            return 32, "watch", f"US AQI {aqi:.0f} Moderate (EPA)."
        return 8, "info", f"US AQI {aqi:.0f} Good (EPA)."

    def flood_score() -> Tuple[float, str, str]:
        score = 0.0
        bits = []
        if ratio is not None:
            if ratio >= 2.5:
                score = max(score, 90)
                bits.append(f"GloFAS discharge {ratio:.1f}× mean")
            elif ratio >= 1.8:
                score = max(score, 72)
                bits.append(f"GloFAS discharge {ratio:.1f}× mean")
            elif ratio >= 1.35:
                score = max(score, 48)
                bits.append(f"GloFAS discharge {ratio:.1f}× mean")
        if precip_24h >= 75:
            score = max(score, 86)
            bits.append(f"{precip_24h:.0f} mm / 24 h")
        elif precip_24h >= 40:
            score = max(score, 55)
            bits.append(f"{precip_24h:.0f} mm / 24 h")
        if not bits:
            return 10, "info", "No elevated river or 24-hour rain signal."
        level = "warning" if score >= 70 else "advisory" if score >= 45 else "watch"
        return score, level, "; ".join(bits)

    def storm_score() -> Tuple[float, str, str]:
        score = 0.0
        bits = []
        if gust >= 90:
            score = max(score, 88)
            bits.append(f"gusts {gust:.0f} km/h")
        elif gust >= 60:
            score = max(score, 58)
            bits.append(f"gusts {gust:.0f} km/h")
        if wcode >= 95:
            score = max(score, 74)
            bits.append(WMO.get(wcode, "thunderstorm"))
        storms = [e for e in eonet_rows if "storm" in (e.get("category") or "").lower()]
        if storms:
            score = max(score, 64)
            bits.append(storms[0].get("title") or "EONET storm")
        if not bits:
            return 12, "info", "No severe-wind or thunderstorm signal."
        level = "warning" if score >= 70 else "advisory"
        return score, level, "; ".join(bits)

    def seismic_score() -> Tuple[float, str, str]:
        if not quakes:
            return 6, "info", "No M≥2.5 USGS events within 400 km in 30 days."
        top = quakes[0]
        mag = top.get("mag") or 0
        dist = top.get("distance_km") or 999
        age = top.get("age_hours")
        recent = age is not None and age <= 24 * 7
        if mag >= 6 and dist <= 250 and recent:
            return 88, "warning", f"M{mag:.1f} at {dist:.0f} km ({top.get('place')})"
        if mag >= 5 and dist <= 350:
            return 64, "advisory", f"M{mag:.1f} at {dist:.0f} km ({top.get('place')})"
        if mag >= 4:
            return 36, "watch", f"M{mag:.1f} at {dist:.0f} km ({top.get('place')})"
        return 18, "info", f"Nearest: M{mag:.1f} at {dist:.0f} km"

    def fire_score() -> Tuple[float, str, str]:
        fires = [e for e in eonet_rows if "wildfire" in (e.get("category") or "").lower() or e.get("category") == "wildfires"]
        score = 0.0
        bits = []
        if fires:
            d0 = fires[0].get("distance_km") or 999
            if d0 <= 80:
                score = 86
            elif d0 <= 250:
                score = 64
            else:
                score = 40
            bits.append(f"{fires[0].get('title')} ({d0:.0f} km)")
        if heat_c is not None and rh is not None and heat_c >= 32 and rh <= 25 and wind >= 25:
            score = max(score, 68)
            bits.append(f"fire-weather analog: {heat_c:.0f}°C / {rh:.0f}% RH / {wind:.0f} km/h")
        if not bits:
            return 8, "info", "No nearby EONET wildfire or red-flag analog."
        level = "warning" if score >= 75 else "advisory"
        return score, level, "; ".join(bits)

    def drought_score() -> Tuple[float, str, str]:
        if precip_7d is None:
            return 0, "unknown", "Precipitation history unavailable."
        if precip_7d < 3 and (soil is None or soil < 0.2) and (heat_c is None or heat_c > 8):
            return 52, "watch", f"Only {precip_7d:.1f} mm rain in 7 days" + (f"; soil {soil:.2f}" if soil is not None else "")
        if precip_7d < 8 and heat_c is not None and heat_c >= 32:
            return 40, "watch", f"{precip_7d:.1f} mm / 7 d with heat {heat_c:.0f}°C"
        return 10, "info", f"{precip_7d:.1f} mm precipitation over 7 days"

    specs = [
        ("heat", "Heat", heat_score),
        ("air", "Air quality", air_score),
        ("flood", "Flood / rain", flood_score),
        ("storm", "Wind / storms", storm_score),
        ("seismic", "Seismic", seismic_score),
        ("wildfire", "Wildfire / smoke", fire_score),
        ("drought", "Drought", drought_score),
    ]
    risks = []
    for rid, label, fn in specs:
        score, level, summary = fn()
        risks.append(
            {
                "id": rid,
                "label": label,
                "score": round(float(score), 1),
                "level": level,
                "summary": summary,
            }
        )
    risks.sort(key=lambda r: -r["score"])
    return risks


def composite_score(risks: List[Dict[str, Any]]) -> float:
    if not risks:
        return 0.0
    weights = {
        "air": 0.22,
        "heat": 0.20,
        "flood": 0.18,
        "storm": 0.14,
        "wildfire": 0.12,
        "seismic": 0.08,
        "drought": 0.06,
    }
    by_id = {r["id"]: r["score"] for r in risks}
    peak = max(by_id.values()) if by_id else 0
    weighted = sum(weights.get(k, 0) * by_id.get(k, 0) for k in weights)
    return round(min(100.0, 0.5 * peak + 0.5 * weighted), 1)


def iso3_from_cc(cc: Optional[str]) -> Optional[str]:
    if not cc or len(cc) != 2:
        return None
    # Nominatim gives ISO 3166-1 alpha-2; ReliefWeb wants alpha-3. Small map of common codes.
    table = {
        "US": "USA",
        "GB": "GBR",
        "FR": "FRA",
        "DE": "DEU",
        "IN": "IND",
        "CN": "CHN",
        "JP": "JPN",
        "KR": "KOR",
        "NP": "NPL",
        "BD": "BGD",
        "PK": "PAK",
        "ID": "IDN",
        "TH": "THA",
        "VN": "VNM",
        "PH": "PHL",
        "SG": "SGP",
        "AE": "ARE",
        "EG": "EGY",
        "NG": "NGA",
        "KE": "KEN",
        "ZA": "ZAF",
        "SN": "SEN",
        "BR": "BRA",
        "MX": "MEX",
        "PE": "PER",
        "CO": "COL",
        "CL": "CHL",
        "AU": "AUS",
        "NZ": "NZL",
        "TR": "TUR",
        "GR": "GRC",
        "IS": "ISL",
        "CA": "CAN",
    }
    return table.get(cc.upper())


async def brief_place(lat: float, lng: float, place_hint: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    lat = max(-90.0, min(90.0, float(lat)))
    lng = ((float(lng) + 180) % 360) - 180
    key = f"brief:{cell_key(lat, lng)}"

    async def _build() -> Dict[str, Any]:
        weather, air, flood, quakes_raw, eonet_raw, place = await asyncio.gather(
            fetch_weather(lat, lng),
            fetch_air(lat, lng),
            fetch_flood(lat, lng),
            fetch_quakes_near(lat, lng),
            fetch_eonet(),
            reverse_geocode(lat, lng) if place_hint is None else _as_place(place_hint),
        )
        cond = conditions_from(weather, air, flood)
        quakes = parse_quakes(lat, lng, quakes_raw)
        eonet_rows = nearby_eonet(lat, lng, eonet_raw)
        rw = await fetch_reliefweb(iso3_from_cc(place.get("country_code")), place.get("country"))
        relief = parse_relief(rw, place.get("country"))
        risks = score_risks(cond, quakes, eonet_rows)
        measures = build_measures(
            {
                "conditions": cond,
                "risks": risks,
                "place": place,
                "events": {"quakes": quakes, "eonet": eonet_rows, "reliefweb": relief},
            }
        )
        sources = [
            {"id": "open-meteo-forecast", "ok": bool(weather.get("ok")), "error": weather.get("error"), "fetched_at": weather.get("fetched_at")},
            {"id": "open-meteo-air-quality", "ok": bool(air.get("ok")), "error": air.get("error"), "fetched_at": air.get("fetched_at")},
            {"id": "open-meteo-flood-glofas", "ok": bool(flood.get("ok")), "error": flood.get("error"), "fetched_at": flood.get("fetched_at")},
            {"id": "usgs-earthquakes", "ok": bool(quakes_raw.get("ok")), "error": quakes_raw.get("error"), "fetched_at": quakes_raw.get("fetched_at")},
            {"id": "nasa-eonet", "ok": bool(eonet_raw.get("ok")), "error": eonet_raw.get("error"), "fetched_at": eonet_raw.get("fetched_at")},
            {"id": "nominatim-osm", "ok": bool(place.get("ok")), "error": place.get("error"), "fetched_at": _iso()},
            {"id": "reliefweb", "ok": bool(rw.get("ok")), "error": rw.get("error"), "fetched_at": rw.get("fetched_at")},
        ]
        failed = [s for s in sources if not s["ok"]]
        primary = {"open-meteo-forecast", "open-meteo-air-quality", "usgs-earthquakes", "nominatim-osm"}
        primary_failed = [s for s in failed if s["id"] in primary]
        degraded = len(primary_failed) > 0
        note = None
        if not any(s["ok"] for s in sources if s["id"].startswith("open-meteo")):
            note = "Live weather and air feeds failed. Showing geocoded place and any remaining signals, with baseline preparedness measures."
        elif primary_failed:
            note = "Some core feeds failed; measures use whatever signals arrived. Failed: " + ", ".join(
                s["id"] for s in primary_failed
            )
        top = risks[0] if risks else None
        return {
            "ok": True,
            "degraded": degraded,
            "note": note,
            "cell": cell_key(lat, lng),
            "lat": round(lat, 4),
            "lng": round(lng, 4),
            "queried_at": _iso(),
            "place": place,
            "conditions": cond,
            "risks": risks,
            "composite": composite_score(risks),
            "top_hazard": top,
            "measures": measures,
            "events": {"quakes": quakes[:6], "eonet": eonet_rows[:6], "reliefweb": relief},
            "sources": sources,
        }

    try:
        return await cache_get(key, PLACE_TTL, _build)
    except Exception as exc:  # noqa: BLE001
        return {
            "ok": False,
            "degraded": True,
            "note": f"Live briefing failed ({exc.__class__.__name__}). Baseline preparedness still applies; retry in a moment.",
            "cell": cell_key(lat, lng),
            "lat": lat,
            "lng": lng,
            "queried_at": _iso(),
            "place": {
                "ok": False,
                "display": f"{lat:.2f}°, {lng:.2f}°",
                "name": None,
                "country": None,
            },
            "conditions": {},
            "risks": [],
            "composite": 0,
            "measures": build_measures(
                {
                    "conditions": {},
                    "risks": [],
                    "place": {"display": f"{lat:.2f}°, {lng:.2f}°"},
                    "events": {},
                }
            ),
            "events": {"quakes": [], "eonet": [], "reliefweb": []},
            "sources": [{"id": "pipeline", "ok": False, "error": str(exc), "fetched_at": _iso()}],
        }


async def _as_place(hint: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "ok": True,
        "error": None,
        "name": hint.get("name"),
        "display": f"{hint.get('name')}, {hint.get('country')}",
        "country": hint.get("country"),
        "country_code": None,
        "admin": None,
        "kind": "city",
    }


async def city_snapshot(city: Dict[str, Any], eonet_raw: Dict[str, Any], usgs_month: Dict[str, Any]) -> Dict[str, Any]:
    lat, lng = city["lat"], city["lng"]
    weather, air, flood = await asyncio.gather(
        fetch_weather(lat, lng),
        fetch_air(lat, lng),
        fetch_flood(lat, lng),
    )
    cond = conditions_from(weather, air, flood)
    quakes = parse_quakes(lat, lng, usgs_month if usgs_month.get("ok") else await fetch_quakes_near(lat, lng))
    eonet_rows = nearby_eonet(lat, lng, eonet_raw)
    risks = score_risks(cond, quakes, eonet_rows)
    top = risks[0] if risks else None
    scores = {r["id"]: r["score"] for r in risks}
    return {
        "id": city["id"],
        "name": city["name"],
        "country": city["country"],
        "lat": lat,
        "lng": lng,
        "composite": composite_score(risks),
        "scores": scores,
        "top_hazard": top,
        "conditions": {
            "temperature_c": cond.get("temperature_c"),
            "apparent_c": cond.get("apparent_c"),
            "us_aqi": cond.get("us_aqi"),
            "pm25": cond.get("pm25"),
            "precip_24h_mm": cond.get("precip_24h_mm"),
            "gust_kmh": cond.get("gust_kmh"),
            "weather_text": cond.get("weather_text"),
        },
        "queried_at": _iso(),
        "degraded": not (weather.get("ok") and air.get("ok")),
        "source_ok": {"weather": bool(weather.get("ok")), "air": bool(air.get("ok")), "flood": bool(flood.get("ok"))},
    }


async def live_rankings(metric: str = "composite") -> Dict[str, Any]:
    allowed = {"composite", "air", "heat", "flood", "storm", "seismic", "wildfire", "drought"}
    metric = metric if metric in allowed else "composite"

    async def _build() -> Dict[str, Any]:
        eonet_raw, usgs_month = await asyncio.gather(fetch_eonet(), fetch_usgs_month())
        sem = asyncio.Semaphore(8)

        async def one(city: Dict[str, Any]) -> Dict[str, Any]:
            async with sem:
                try:
                    return await city_snapshot(city, eonet_raw, usgs_month)
                except Exception as exc:  # noqa: BLE001
                    return {
                        "id": city["id"],
                        "name": city["name"],
                        "country": city["country"],
                        "lat": city["lat"],
                        "lng": city["lng"],
                        "composite": 0,
                        "scores": {},
                        "top_hazard": None,
                        "conditions": {},
                        "queried_at": _iso(),
                        "degraded": True,
                        "error": str(exc),
                    }

        rows = await asyncio.gather(*[one(c) for c in CITIES])
        rows_list = list(rows)

        def sort_key(row: Dict[str, Any]) -> float:
            if metric == "composite":
                return float(row.get("composite") or 0)
            return float((row.get("scores") or {}).get(metric) or 0)

        ranked = sorted(rows_list, key=sort_key, reverse=True)
        for i, row in enumerate(ranked, start=1):
            row["rank"] = i
            row["metric_score"] = round(sort_key(row), 1)
        return {
            "ok": True,
            "metric": metric,
            "updated_at": _iso(),
            "count": len(ranked),
            "places": ranked,
            "sources": [
                {"id": "open-meteo-forecast", "note": "Current weather, 7-day precip, UV"},
                {"id": "open-meteo-air-quality", "note": "US AQI, PM2.5, ozone (CAMS)"},
                {"id": "open-meteo-flood-glofas", "note": "ECMWF GloFAS river discharge"},
                {"id": "usgs-earthquakes", "note": "M≥4.5 global month feed + local scoring"},
                {"id": "nasa-eonet", "note": "Open natural-event catalog (wildfire, storms, volcanoes)"},
            ],
            "method": "Higher = worse live risk. Composite = 0.5× peak hazard + 0.5× weighted air/heat/flood/storm/fire/seismic/drought. City list is a geographic seed; every score is fetched live.",
        }

    return await cache_get(f"rank:{metric}", RANK_TTL, _build)


async def search_places(query: str) -> Dict[str, Any]:
    q = (query or "").strip()
    if len(q) < 2:
        return {"ok": True, "results": []}

    async def _fetch() -> Dict[str, Any]:
        global _nom_last
        async with _nom_lock:
            wait = 1.1 - (time.time() - _nom_last)
            if wait > 0:
                await asyncio.sleep(wait)
            data, err = await _get_json(
                "https://nominatim.openstreetmap.org/search",
                {"q": q, "format": "jsonv2", "limit": 6, "addressdetails": 1},
            )
            _nom_last = time.time()
        if err or not data:
            return {"ok": False, "error": err or "no results", "results": []}
        results = []
        for row in data:
            try:
                results.append(
                    {
                        "name": row.get("display_name"),
                        "lat": float(row["lat"]),
                        "lng": float(row["lon"]),
                        "kind": row.get("type"),
                    }
                )
            except (KeyError, TypeError, ValueError):
                continue
        return {"ok": True, "results": results}

    return await cache_get(f"search:{q.lower()}", 600, _fetch)


async def warmup() -> None:
    try:
        await live_rankings("composite")
    except Exception:
        return
