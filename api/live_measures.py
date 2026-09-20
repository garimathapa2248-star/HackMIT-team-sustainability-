"""Location-specific preventive measures grounded in public-health / climate / disaster guidance.

Rules consume live signals. Citation URLs point at WHO, CDC, NOAA/NWS, EPA, FEMA, USGS, IPCC, and IFRC.
"""
from __future__ import annotations

from typing import Any, Dict, List


def _m(
    mid: str,
    hazard: str,
    severity: str,
    score: float,
    action: str,
    why: str,
    agency: str,
    title: str,
    url: str,
    guidance: str,
) -> Dict[str, Any]:
    return {
        "id": mid,
        "hazard": hazard,
        "severity": severity,
        "score": round(float(score), 1),
        "action": action,
        "why_here_now": why,
        "citation": {
            "agency": agency,
            "title": title,
            "url": url,
            "guidance": guidance,
        },
    }


def build_measures(ctx: Dict[str, Any]) -> List[Dict[str, Any]]:
    c = ctx.get("conditions") or {}
    risks = {row["id"]: row for row in (ctx.get("risks") or []) if isinstance(row, dict) and row.get("id")}
    place = ctx.get("place") or {}
    events = ctx.get("events") or {}
    quakes = events.get("quakes") or []
    eonet = events.get("eonet") or []
    relief = events.get("reliefweb") or []
    loc = place.get("display") or place.get("name") or "this location"
    country = place.get("country") or ""

    t = c.get("temperature_c")
    apparent = c.get("apparent_c")
    hi = c.get("heat_index_c")
    rh = c.get("humidity_pct")
    aqi = c.get("us_aqi")
    pm25 = c.get("pm25")
    ozone = c.get("ozone")
    gust = c.get("gust_kmh")
    wind = c.get("wind_kmh")
    precip = c.get("precip_mm")
    precip_24h = c.get("precip_24h_mm")
    precip_7d = c.get("precip_7d_mm")
    precip_next = c.get("precip_forecast_mm")
    uv = c.get("uv_index")
    discharge = c.get("river_discharge")
    discharge_mean = c.get("river_discharge_mean")
    soil = c.get("soil_moisture")
    wcode = c.get("weather_code")
    wtext = c.get("weather_text") or "current weather"
    tmax = c.get("tmax_c")
    tmin = c.get("tmin_c")

    heat_c = apparent if apparent is not None else t
    ratio = None
    if discharge is not None and discharge_mean not in (None, 0):
        try:
            ratio = float(discharge) / float(discharge_mean)
        except (TypeError, ValueError, ZeroDivisionError):
            ratio = None

    nearby_fires = [e for e in eonet if e.get("category") == "wildfires"]
    nearby_storms = [e for e in eonet if e.get("category") in ("severeStorms", "severe storms")]
    nearby_volcano = [e for e in eonet if e.get("category") == "volcanoes"]
    nearest_quake = quakes[0] if quakes else None

    out: List[Dict[str, Any]] = []

    # --- Heat (NOAA NWS heat index bands + CDC / WHO heat-health) ---
    heat_ref = hi if hi is not None else heat_c
    if heat_ref is not None:
        if heat_ref >= 46 or (tmax is not None and tmax >= 46):
            out.append(
                _m(
                    "heat-emergency",
                    "heat",
                    "emergency",
                    98,
                    "Treat this as a heat emergency: stop strenuous outdoor work, move to the coolest indoor space available, drink water even if you are not thirsty, and check on children, older adults, and outdoor workers every hour.",
                    (
                        f"{loc} is running at {heat_ref:.1f}°C apparent/heat-index"
                        f"{f' (air {t:.1f}°C, humidity {rh:.0f}%)' if t is not None and rh is not None else ''}. "
                        "That is NOAA’s Extreme Danger / upper Danger band, where heat stroke becomes likely with continued exposure."
                    ),
                    "CDC HeatHealth + NOAA NWS",
                    "Heat and Health Prevention / Heat Safety",
                    "https://www.cdc.gov/heat-health/prevention/index.html",
                    "NWS: Extreme Danger ≥125°F heat index. CDC: move to cooling, hydrate, never leave people or pets in vehicles.",
                )
            )
        elif heat_ref >= 39 or (tmax is not None and tmax >= 40):
            out.append(
                _m(
                    "heat-danger",
                    "heat",
                    "warning",
                    86,
                    "Limit outdoor exertion to early morning or evening, use shade and rest-water-shade cycles, and prioritize access to air-conditioning or a public cooling space.",
                    (
                        f"Apparent/heat-index temperature is {heat_ref:.1f}°C at {loc}"
                        f"{f'; today’s max is {tmax:.1f}°C' if tmax is not None else ''}. "
                        "NOAA classifies this as Danger: heat cramps and heat exhaustion are likely; heat stroke is possible with continued activity."
                    ),
                    "NOAA National Weather Service",
                    "Heat index and heat safety",
                    "https://www.weather.gov/safety/heat",
                    "Danger band ~103–124°F heat index. NIOSH/CDC: rest-water-shade for outdoor labor.",
                )
            )
        elif heat_ref >= 32 or (tmax is not None and tmax >= 35):
            out.append(
                _m(
                    "heat-caution",
                    "heat",
                    "advisory",
                    64,
                    "Slow down outdoor activity, drink water before thirst, and watch for dizziness, nausea, or confusion — early heat-illness signs.",
                    (
                        f"It is {heat_ref:.1f}°C apparent at {loc}"
                        f"{f' with {rh:.0f}% relative humidity' if rh is not None else ''}. "
                        "WHO heat-health guidance and NWS Extreme Caution both apply once daily maxima sit in the mid-30s °C with humidity."
                    ),
                    "WHO + NOAA NWS",
                    "Climate change, heat and health / Heat safety",
                    "https://www.who.int/news-room/fact-sheets/detail/climate-change-heat-and-health",
                    "WHO: heat-related mortality rises sharply above local thresholds; NWS Extreme Caution ~90–103°F heat index.",
                )
            )
        if tmin is not None and tmin >= 25 and heat_ref is not None and heat_ref >= 30:
            out.append(
                _m(
                    "heat-nights",
                    "heat",
                    "advisory",
                    58,
                    "Plan for hot nights: use fans only when indoor air is below ~35°C, wet-skin cooling, and sleep in the lowest floor or coolest room. Check on neighbors who lack cooling.",
                    f"Tonight’s minimum is {tmin:.1f}°C at {loc}. WHO notes that hot nights prevent recovery from daytime heat and raise cardiovascular and all-cause mortality.",
                    "WHO",
                    "Heat and health fact sheet",
                    "https://www.who.int/news-room/fact-sheets/detail/climate-change-heat-and-health",
                    "Hot nights remove the physiological recovery window that normally follows a hot day.",
                )
            )

    if heat_c is not None and heat_c <= -20:
        out.append(
            _m(
                "cold-extreme",
                "cold",
                "warning",
                82,
                "Limit time outdoors, wear layered dry clothing covering skin, and watch for numbness or white patches (frostbite). Keep a warm indoor space and never heat with unventilated combustion.",
                f"Apparent temperature is {heat_c:.1f}°C at {loc}. CDC winter-weather guidance: frostbite can occur on exposed skin within minutes in extreme cold, and indoor heating raises carbon-monoxide risk.",
                "CDC",
                "Winter weather — frostbite and hypothermia",
                "https://www.cdc.gov/winter-weather/prevention/index.html",
                "CDC: hypothermia can occur above freezing if wet and wind-exposed; never use generators or grills indoors.",
            )
        )
    elif heat_c is not None and heat_c <= 0:
        out.append(
            _m(
                "cold-watch",
                "cold",
                "watch",
                44,
                "Dress in layers, stay dry, and use only vented heating. Check pipes and unhoused neighbors.",
                f"Apparent temperature is {heat_c:.1f}°C at {loc}. CDC: wet clothing and wind multiply heat loss; carbon monoxide from indoor heating is a leading winter killer.",
                "CDC",
                "Winter weather prevention",
                "https://www.cdc.gov/winter-weather/prevention/index.html",
                "Hypothermia prevention: dry layers, limited exposure, CO detectors.",
            )
        )

    # --- Air quality (EPA AQI breakpoints + WHO AQG 2021) ---
    if aqi is not None:
        if aqi >= 301:
            out.append(
                _m(
                    "aqi-hazardous",
                    "air",
                    "emergency",
                    96,
                    "Stay indoors with windows closed. Run HEPA / HVAC recirculation. Avoid all outdoor exertion. Use a well-fitted N95/P2 if you must go outside.",
                    f"US AQI is {aqi:.0f} at {loc}"
                    + (f" (PM2.5 {pm25:.1f} µg/m³)" if pm25 is not None else "")
                    + ". EPA’s Hazardous band (301–500): everyone is likely to be affected.",
                    "U.S. EPA / AirNow",
                    "AQI basics and breakpoints",
                    "https://www.airnow.gov/aqi/aqi-basics/",
                    "Hazardous: health warning of emergency conditions. WHO 24-hour PM2.5 AQG is 15 µg/m³.",
                )
            )
        elif aqi >= 201:
            out.append(
                _m(
                    "aqi-very-unhealthy",
                    "air",
                    "warning",
                    88,
                    "Keep children, older adults, and people with asthma or heart disease indoors. Cancel outdoor sports. Use N95/P2 respirators outdoors and a portable HEPA filter if you have one.",
                    f"US AQI is {aqi:.0f} ({_aqi_band(aqi)}) at {loc}"
                    + (f"; PM2.5 is {pm25:.1f} µg/m³" if pm25 is not None else "")
                    + ". EPA: Very Unhealthy — everyone may experience more serious health effects.",
                    "U.S. EPA / AirNow",
                    "AQI basics",
                    "https://www.airnow.gov/aqi/aqi-basics/",
                    "Very Unhealthy 201–300: health alert; everyone may be affected.",
                )
            )
        elif aqi >= 151:
            out.append(
                _m(
                    "aqi-unhealthy",
                    "air",
                    "warning",
                    76,
                    "Everyone should reduce prolonged or heavy outdoor exertion. Sensitive groups should remain indoors and keep rescue inhalers available.",
                    f"US AQI is {aqi:.0f} at {loc}"
                    + (f" with PM2.5 {pm25:.1f} µg/m³" if pm25 is not None else "")
                    + ". EPA Unhealthy (151–200): some members of the general public and all sensitive groups may experience health effects.",
                    "U.S. EPA / AirNow",
                    "AQI basics",
                    "https://www.airnow.gov/aqi/aqi-basics/",
                    "Unhealthy 151–200. WHO 2021 AQG: 24-hour PM2.5 = 15 µg/m³.",
                )
            )
        elif aqi >= 101:
            out.append(
                _m(
                    "aqi-sensitive",
                    "air",
                    "advisory",
                    58,
                    "People with asthma, COPD, heart disease, children, and older adults should shorten outdoor activity and move exercise indoors.",
                    f"US AQI is {aqi:.0f} (Unhealthy for Sensitive Groups) at {loc}"
                    + (f". Ozone is {ozone:.0f} µg/m³." if ozone is not None else "."),
                    "U.S. EPA / AirNow",
                    "AQI basics",
                    "https://www.airnow.gov/aqi/aqi-basics/",
                    "101–150: sensitive groups should reduce outdoor exertion.",
                )
            )
        elif aqi >= 51:
            out.append(
                _m(
                    "aqi-moderate",
                    "air",
                    "watch",
                    34,
                    "Unusually sensitive people should consider reducing prolonged outdoor exertion; everyone else can be active but watch symptoms.",
                    f"US AQI is {aqi:.0f} (Moderate) at {loc}. EPA: air quality is acceptable; there may be a risk for some unusually sensitive people.",
                    "U.S. EPA / AirNow",
                    "AQI basics",
                    "https://www.airnow.gov/aqi/aqi-basics/",
                    "Moderate 51–100.",
                )
            )
    if pm25 is not None and pm25 >= 15 and (aqi is None or aqi < 101):
        out.append(
            _m(
                "pm25-who",
                "air",
                "watch",
                40,
                "Reduce time next to traffic and smoke; prefer indoor activity if you have respiratory or cardiac disease.",
                f"PM2.5 is {pm25:.1f} µg/m³ at {loc}, above the WHO 2021 24-hour air-quality guideline of 15 µg/m³ (annual guideline is 5 µg/m³).",
                "WHO",
                "WHO Global Air Quality Guidelines 2021",
                "https://www.who.int/publications/i/item/9789240034228",
                "WHO AQG 2021: PM2.5 15 µg/m³ (24 h), 5 µg/m³ (annual).",
            )
        )

    smoke_fire = next((e for e in nearby_fires if (e.get("distance_km") or 9999) <= 250), None)
    if smoke_fire and (aqi is None or aqi >= 51):
        dist = smoke_fire.get("distance_km")
        out.append(
            _m(
                "wildfire-smoke",
                "wildfire",
                "warning" if (dist or 99) <= 80 or (aqi or 0) >= 151 else "advisory",
                80 if (dist or 99) <= 80 else 62,
                "Prepare to shelter from smoke: close windows, set HVAC to recirculate, use N95/P2 outdoors, and pack go-bags if fire is nearby.",
                f"NASA EONET lists an active wildfire ({smoke_fire.get('title') or 'wildfire'}) about {dist:.0f} km from {loc}."
                + (f" US AQI is {aqi:.0f}." if aqi is not None else ""),
                "CDC + NASA EONET",
                "Wildfire smoke and your health",
                "https://www.cdc.gov/air-quality/prevention/wildfire-smoke-and-your-health.html",
                "CDC: N95 for smoke, indoor HEPA, extra care for children and people with asthma. Event catalog: NASA EONET.",
            )
        )

    # Fire weather analog (NWS Red Flag: dry + wind + heat)
    if (
        heat_c is not None
        and rh is not None
        and wind is not None
        and heat_c >= 32
        and rh <= 25
        and wind >= 25
    ):
        out.append(
            _m(
                "fire-weather",
                "wildfire",
                "advisory",
                70,
                "Treat this as fire-weather: avoid outdoor burning, clear a defensible space around structures if you can do so safely, and review two evacuation routes.",
                f"Temperature {heat_c:.1f}°C, humidity {rh:.0f}%, wind {wind:.0f} km/h at {loc}. Those three together match the spirit of NWS Red Flag conditions (hot, dry, windy) that drive extreme fire spread.",
                "NOAA NWS + NFPA",
                "Fire weather / Ready for wildfire",
                "https://www.weather.gov/safety/wildfire",
                "NWS Red Flag Warning: combination of strong wind, low humidity, and dry fuels. NFPA: defensible space and go-bags.",
            )
        )

    # --- Flood / heavy rain (FEMA, NWS Turn Around Don’t Drown, CDC) ---
    flood_severe = False
    if ratio is not None and ratio >= 2.0:
        flood_severe = True
        out.append(
            _m(
                "flood-discharge",
                "flood",
                "warning",
                min(94, 55 + ratio * 12),
                "Move people, documents, and chemicals off the lowest floor. Do not walk or drive through moving water. If told to evacuate, leave early on designated routes.",
                f"GloFAS river discharge at this cell is {discharge:.2f} vs a model mean of {discharge_mean:.2f} ({ratio:.1f}×). "
                "FEMA and NWS: 15 cm of moving water can knock a person down; 30 cm can float a car.",
                "FEMA Ready + NOAA NWS",
                "Floods / Turn Around Don’t Drown",
                "https://www.weather.gov/safety/flood-turn-around-dont-drown",
                "NWS: Turn Around Don’t Drown. FEMA: know flood zones, elevate utilities, pack a kit.",
            )
        )
    elif ratio is not None and ratio >= 1.4:
        out.append(
            _m(
                "flood-elevated",
                "flood",
                "advisory",
                60,
                "Stay off low water crossings, clear storm drains you can reach safely, and move valuables above floor level.",
                f"Modeled river discharge is {ratio:.1f}× the GloFAS mean at {loc} (Open-Meteo flood / ECMWF GloFAS). That is an elevated, not necessarily inundating, signal.",
                "ECMWF GloFAS + FEMA",
                "Global Flood Awareness System / Floods",
                "https://www.ready.gov/floods",
                "GloFAS provides global riverine flood awareness. FEMA: avoid floodwater, elevate, insure.",
            )
        )
    if precip_24h is not None and precip_24h >= 75:
        flood_severe = True
        out.append(
            _m(
                "flash-flood",
                "flood",
                "warning",
                84,
                "Assume flash-flood risk in drainages, underpasses, and steep catchments. Get to higher ground; never drive into flooded roadways.",
                f"About {precip_24h:.0f} mm of precipitation has fallen / is falling in the last 24 hours at {loc}"
                + (f"; the 7-day total is {precip_7d:.0f} mm" if precip_7d is not None else "")
                + ". NWS flash-flood guidance is local, but ≥75 mm in a day is widely treated as a dangerous urban/steep-terrain threshold.",
                "NOAA NWS",
                "Flood safety — Turn Around Don’t Drown",
                "https://www.weather.gov/safety/flood",
                "Most flood deaths occur in vehicles. 6 inches of moving water can knock you down.",
            )
        )
    elif (precip_24h is not None and precip_24h >= 40) or (
        precip_next is not None and precip_next >= 50
    ):
        out.append(
            _m(
                "heavy-rain",
                "flood",
                "advisory",
                56,
                "Avoid underpasses and flooded paths; delay travel through low-lying roads; keep storm drains clear.",
                (
                    f"24-hour precipitation is {precip_24h:.0f} mm"
                    if precip_24h is not None
                    else f"Forecast precipitation is {precip_next:.0f} mm"
                )
                + f" at {loc} ({wtext}). Urban drainage systems are often sized to historical design storms that IPCC AR6 notes are being exceeded more often.",
                "NOAA NWS + IPCC AR6 WG1",
                "Flood safety / AR6 extreme precipitation",
                "https://www.weather.gov/safety/flood",
                "IPCC AR6: heavy precipitation extremes have intensified over most land regions with warming.",
            )
        )

    if flood_severe or (ratio is not None and ratio >= 1.8):
        out.append(
            _m(
                "flood-health",
                "flood",
                "advisory",
                61,
                "Stay out of floodwater: it can hide sewage, chemicals, and downed power lines. After water recedes, discard food that contacted floodwater and treat drinking water until officials say otherwise. Drain standing water to limit mosquitoes.",
                f"Flood signals are elevated at {loc}. CDC flood-health guidance covers drowning, electrocution, wound infection (including Vibrio in some coasts), waterborne disease, and post-flood mosquito-borne risk.",
                "CDC",
                "Flood safety",
                "https://www.cdc.gov/floods/safety/index.html",
                "CDC: never drive through floodwater; boil or bottled water until cleared; standing water → mosquitoes (WNV, dengue where endemic).",
            )
        )

    # --- Wind / thunderstorms ---
    if gust is not None and gust >= 90:
        out.append(
            _m(
                "wind-extreme",
                "storm",
                "warning",
                85,
                "Stay indoors away from windows. Secure loose outdoor objects only if it is still safe to do so. Avoid trees, scaffolds, and flooded underpasses.",
                f"Wind gusts are {gust:.0f} km/h at {loc}. That is near or above severe-thunderstorm / high-wind warning territory in most NWS offices (≈58+ mph).",
                "NOAA NWS",
                "Wind safety",
                "https://www.weather.gov/safety/wind",
                "NWS High Wind Warning typically ≥40 kt sustained or ≥58 mph gusts depending on office.",
            )
        )
    elif gust is not None and gust >= 60:
        out.append(
            _m(
                "wind-advisory",
                "storm",
                "advisory",
                58,
                "Expect difficult driving for high-profile vehicles; stow outdoor furniture; stay back from weak trees and power lines.",
                f"Gusts are {gust:.0f} km/h at {loc} (sustained {wind:.0f} km/h)."
                if wind is not None
                else f"Gusts are {gust:.0f} km/h at {loc}.",
                "NOAA NWS",
                "Wind safety",
                "https://www.weather.gov/safety/wind",
                "Wind advisories often begin near 30–40 mph gusts for hazardous driving.",
            )
        )
    if wcode is not None and int(wcode) >= 95:
        out.append(
            _m(
                "thunder",
                "storm",
                "warning",
                72,
                "Use the 30-30 rule: if thunder follows lightning by 30 seconds or less, be indoors; wait 30 minutes after the last thunder to resume outdoor activity. Avoid high ground, water, and wired equipment.",
                f"Open-Meteo reports weather code {int(wcode)} ({wtext}) at {loc}. NWS: if you can hear thunder, you can be struck.",
                "NOAA NWS",
                "Lightning safety",
                "https://www.weather.gov/safety/lightning",
                "30-30 rule. No place outdoors is safe when thunderstorms are in the area.",
            )
        )
    storm_ev = next((e for e in nearby_storms if (e.get("distance_km") or 9999) <= 400), None)
    if storm_ev:
        out.append(
            _m(
                "eonet-storm",
                "storm",
                "advisory",
                66,
                "Follow official tropical or severe-storm watches: know your evacuation zone, charge devices, and keep a 3-day water/food kit.",
                f"NASA EONET open event “{storm_ev.get('title')}” is about {storm_ev.get('distance_km'):.0f} km from {loc}.",
                "NASA EONET + FEMA",
                "EONET severe storms / Ready hurricanes",
                "https://www.ready.gov/hurricanes",
                "FEMA: know zone, assemble kit, follow local emergency management — not social media rumors.",
            )
        )

    # --- Seismic ---
    if nearest_quake:
        mag = nearest_quake.get("mag")
        distq = nearest_quake.get("distance_km")
        age_h = nearest_quake.get("age_hours")
        recent_strong = mag is not None and mag >= 5 and (distq or 999) <= 350
        if mag is not None and mag >= 6 and (distq or 999) <= 250:
            out.append(
                _m(
                    "quake-strong",
                    "seismic",
                    "warning",
                    90,
                    "Expect aftershocks. Drop, Cover, and Hold On if shaking resumes. Stay away from damaged buildings, slopes, and the coast until officials clear tsunami risk.",
                    f"USGS reports M{mag:.1f} about {distq:.0f} km from {loc}"
                    + (f" {age_h:.0f} hours ago" if age_h is not None else "")
                    + f" ({nearest_quake.get('place') or 'see USGS'}). Aftershocks can continue for days.",
                    "USGS + FEMA",
                    "What to do during an earthquake / Ready earthquakes",
                    "https://www.usgs.gov/faqs/what-should-i-do-during-earthquake",
                    "Drop, Cover, Hold On. Do not run outside during shaking. FEMA: secure hazards before the next event.",
                )
            )
        elif recent_strong or (mag is not None and mag >= 4.5 and (distq or 999) <= 150):
            out.append(
                _m(
                    "quake-recent",
                    "seismic",
                    "advisory",
                    62,
                    "Practice Drop, Cover, Hold On. Secure tall furniture and water heaters. Keep shoes, a flashlight, and water by the bed. If you are on the coast after a long or strong quake, move inland/uphill without waiting for an official siren.",
                    f"Recent seismicity: M{mag:.1f} at {distq:.0f} km ({nearest_quake.get('place') or 'USGS'}). "
                    f"{loc}{f', {country}' if country else ''} sits close enough that USGS aftershock and tsunami-self-evacuation guidance applies.",
                    "USGS + FEMA Ready",
                    "Earthquake safety",
                    "https://www.ready.gov/earthquakes",
                    "FEMA/USGS: Drop Cover Hold On; coastal self-evacuate on long/strong shaking.",
                )
            )
        elif mag is not None:
            out.append(
                _m(
                    "quake-context",
                    "seismic",
                    "info",
                    28,
                    "Know how to Drop, Cover, and Hold On, and secure heavy furniture — even moderate regional seismicity is a reminder that the next damaging quake may have little warning.",
                    f"Nearest recent event: M{mag:.1f}, {distq:.0f} km away ({nearest_quake.get('place') or 'USGS'}).",
                    "USGS",
                    "Earthquake hazards",
                    "https://www.usgs.gov/natural-hazards/earthquake-hazards",
                    "Most injuries are from falling objects, not collapsing buildings, in moderate shaking.",
                )
            )

    if nearby_volcano:
        v = nearby_volcano[0]
        out.append(
            _m(
                "volcano",
                "volcano",
                "advisory",
                68,
                "If ash is falling: stay indoors, wear an N95, protect water cisterns, and avoid driving. Follow local exclusion zones.",
                f"NASA EONET flags “{v.get('title')}” about {v.get('distance_km'):.0f} km from {loc}. USGS/CDC: volcanic ash irritates lungs and eyes and can disable vehicles.",
                "USGS Volcano Hazards + CDC",
                "Volcanic ash",
                "https://www.usgs.gov/programs/VHP/volcanic-ash-dangers-prevention-and-protection",
                "N95, sealed buildings, avoid travel until ash is cleared.",
            )
        )

    # --- Drought / water ---
    dry = precip_7d is not None and precip_7d < 3
    if dry and soil is not None and soil < 0.18 and (heat_c is None or heat_c > 8):
        out.append(
            _m(
                "drought",
                "drought",
                "watch",
                48,
                "Conserve water (shorter showers, delay non-essential outdoor use). Watch heat-drought compounding: wildfire risk and agricultural water stress rise together.",
                f"Only {precip_7d:.1f} mm of rain in 7 days at {loc}"
                + (f" and soil moisture is {soil:.2f} m³/m³" if soil is not None else "")
                + ". NOAA NIDIS and IPCC AR6 highlight compound drought-heat as a rising risk to health, crops, and fire.",
                "NOAA NIDIS + IPCC AR6 WG1/WG2",
                "U.S. Drought Monitor / compound extremes",
                "https://www.drought.gov/",
                "IPCC AR6: concurrent heat and drought have increased in some regions; water conservation and heat plans should be joint.",
            )
        )

    # --- UV ---
    if uv is not None and uv >= 8:
        out.append(
            _m(
                "uv",
                "uv",
                "advisory" if uv >= 11 else "info",
                50 if uv >= 11 else 32,
                "Seek shade 10:00–16:00, use SPF 30+ broad-spectrum sunscreen, sunglasses, and a hat. Extra care near water, snow, or sand.",
                f"UV index is {uv:.1f} at {loc}. WHO/WMO INTERSUN: 8–10 is very high; 11+ is extreme — unprotected skin can burn in minutes.",
                "WHO / WMO INTERSUN + U.S. EPA",
                "UV index scale",
                "https://www.epa.gov/sunsafety/uv-index-scale-0",
                "EPA/WHO: UV 8–10 very high; 11+ extreme. Shade, clothing, SPF 30+.",
            )
        )

    # ReliefWeb ongoing disasters — location-specific, not generic
    for row in relief[:2]:
        title = row.get("title") or "Active humanitarian disaster"
        dtype = (row.get("type") or "disaster").lower()
        hazard = "flood" if "flood" in dtype else "storm" if "storm" in dtype or "cycl" in dtype else "wildfire" if "fire" in dtype else "health"
        out.append(
            _m(
                f"relief-{row.get('id') or title[:12]}",
                hazard,
                "advisory",
                63,
                "Follow official humanitarian and civil-protection instructions for this event; verify aid offers; use only designated shelters and water points.",
                f"ReliefWeb currently lists “{title}” affecting {row.get('country') or country or loc}. This is an operational disaster record, not a model.",
                "UN OCHA ReliefWeb",
                "ReliefWeb disasters",
                row.get("url") or "https://reliefweb.int/",
                "Use official situation reports; informal social posts are often wrong during disasters.",
            )
        )

    # Baseline preparedness when the location is relatively quiet
    max_score = max((m["score"] for m in out), default=0)
    if max_score < 50:
        out.append(
            _m(
                "ready-kit",
                "preparedness",
                "info",
                22,
                "Keep a 3-day household kit (water 4 L/person/day, food, medicines, flashlight, battery radio, copies of IDs) and know how official alerts reach you in this country.",
                f"Live signals at {loc} are not in a warning band right now ({wtext}"
                + (f", AQI {aqi:.0f}" if aqi is not None else "")
                + f", {heat_c:.0f}°C apparent)."
                if heat_c is not None
                else f"Live signals at {loc} are not in a warning band right now.",
                "FEMA Ready + IFRC",
                "Build a kit / IFRC household preparedness",
                "https://www.ready.gov/kit",
                "IFRC and FEMA: kits and warning channels save hours when a fast-onset hazard arrives.",
            )
        )
        out.append(
            _m(
                "climate-trend",
                "climate",
                "info",
                18,
                "When you plan buildings, drainage, or outdoor work calendars, use up-to-date extremes — not a 1980s design storm. Heat, heavy rain, and compound drought-fire are trending up in many regions.",
                f"Even a quiet day at {loc} sits inside a non-stationary climate. IPCC AR6: the frequency and intensity of hot extremes and heavy precipitation have increased at global scale with warming.",
                "IPCC AR6",
                "Sixth Assessment Report — WGI/WGII",
                "https://www.ipcc.ch/report/ar6/wg2/",
                "AR6 WGII SPM: hot extremes, heavy precipitation, and agricultural/ecological droughts have increased in many regions.",
            )
        )

    # De-duplicate by id, rank by score then severity
    rank = {"emergency": 5, "warning": 4, "advisory": 3, "watch": 2, "info": 1}
    uniq: Dict[str, Dict[str, Any]] = {}
    for row in out:
        prev = uniq.get(row["id"])
        if prev is None or row["score"] > prev["score"]:
            uniq[row["id"]] = row
    measures = sorted(uniq.values(), key=lambda r: (-r["score"], -rank.get(r["severity"], 0)))
    for i, row in enumerate(measures, start=1):
        row["priority"] = i
    return measures[:8]


def _aqi_band(aqi: float) -> str:
    if aqi <= 50:
        return "Good"
    if aqi <= 100:
        return "Moderate"
    if aqi <= 150:
        return "Unhealthy for Sensitive Groups"
    if aqi <= 200:
        return "Unhealthy"
    if aqi <= 300:
        return "Very Unhealthy"
    return "Hazardous"
