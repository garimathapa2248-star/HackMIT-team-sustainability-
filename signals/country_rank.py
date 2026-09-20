"""Frozen High Mountain Asia country ranking from Nepal-adjacent NOAA stations.

Worse rainfall-tail intensification ranks higher. This is not ND-GAIN and not a
GFDRR ThinkHazard dump. Countries without a national GEV inherit the Nepal-adjacent
pooled headline and are labeled ``fit: pooled_nepal_adjacent``.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from .hazard_classes import classify, ordinal

COUNTRIES = (
    {"id": "NP", "name": "Nepal"},
    {"id": "IN", "name": "India"},
    {"id": "BD", "name": "Bangladesh"},
    {"id": "CN", "name": "China"},
    {"id": "BT", "name": "Bhutan"},
)

# Screening boxes inside the Nepal-adjacent ISD bbox (79–89.5E, 25–31.5N).
# Order matters: first match wins.
_BOXES: tuple[tuple[str, float, float, float, float], ...] = (
    ("CN", 79.0, 30.15, 89.5, 31.5),
    ("BD", 88.0, 25.0, 89.5, 26.65),
    ("BT", 88.5, 26.7, 89.5, 28.4),
    ("NP", 80.05, 26.36, 88.2, 30.45),
    ("IN", 79.0, 25.0, 89.5, 31.5),
)


def assign_country(lon: float, lat: float) -> str | None:
    for code, lon0, lat0, lon1, lat1 in _BOXES:
        if lon0 <= lon <= lon1 and lat0 <= lat <= lat1:
            return code
    return None


def _load_json(path: Path | None) -> dict | list | None:
    if path is None or not path.is_file():
        return None
    return json.loads(path.read_text())


def _first(*paths: Path) -> Path | None:
    for path in paths:
        if path.is_file():
            return path
    return None


def _station_counts(geojson: dict) -> dict[str, int]:
    counts = {row["id"]: 0 for row in COUNTRIES}
    for feat in geojson.get("features") or []:
        geom = feat.get("geometry") or {}
        coords = geom.get("coordinates") or [None, None]
        try:
            lon, lat = float(coords[0]), float(coords[1])
        except (TypeError, ValueError, IndexError):
            continue
        code = assign_country(lon, lat)
        if code in counts:
            counts[code] += 1
    return counts


def _tail_score(new_rp: float | None) -> float:
    if new_rp is None or new_rp <= 0:
        return 0.0
    return max(0.0, min(100.0, 100.0 * (1.0 - min(new_rp, 100.0) / 100.0)))


def _composite(classes: dict, new_rp: float | None) -> float:
    class_part = (
        ordinal(classes["flood"]["level"])
        + ordinal(classes["landslide"]["level"])
        + ordinal(classes["glof"]["level"])
    ) / 9.0 * 50.0
    return round(class_part + 0.5 * _tail_score(new_rp), 1)


def _class_for_country(code: str, regional: dict, india_signal: dict | None) -> dict:
    if code == "IN" and india_signal:
        classes = classify(india_signal)
        # Bangalore pack has no GLOF series; keep that honest.
        return classes
    classes = {
        "flood": dict(regional["flood"]),
        "landslide": dict(regional["landslide"]),
        "glof": dict(regional["glof"]),
    }
    if code != "NP":
        classes["glof"] = {
            "hazard": "glof",
            "level": "data_deficient",
            "evidence": "ICIMOD lake series in this pack are Nepal Himalayan lakes.",
        }
    return classes


def build(root: Path | str = ".") -> dict[str, Any]:
    root = Path(root)
    stations_path = _first(
        root / "demo_cache" / "stations_nepal.geojson",
        root / "web" / "public" / "demo_cache" / "stations_nepal.geojson",
        root / "artifacts" / "stations_nepal.geojson",
    )
    signal_path = _first(
        root / "artifacts" / "signal.json",
        root / "demo_cache" / "signal.json",
        root / "contracts" / "fixtures" / "signal.json",
    )
    india_path = _first(
        root / "demo_cache" / "cities" / "bangalore" / "signal.json",
        root / "artifacts" / "cities" / "bangalore" / "signal.json",
        root / "web" / "public" / "demo_cache" / "cities" / "bangalore" / "signal.json",
    )
    if signal_path is None:
        raise FileNotFoundError("signal.json required to rank countries")
    signal = _load_json(signal_path) or {}
    india_signal = _load_json(india_path) if india_path else None
    geojson = _load_json(stations_path) if stations_path else {"features": []}
    counts = _station_counts(geojson if isinstance(geojson, dict) else {"features": []})
    regional = classify(signal)
    nepal_rp = regional["flood"].get("new_return_period_yrs")
    india_classes = classify(india_signal) if india_signal else None
    india_rp = (india_classes or {}).get("flood", {}).get("new_return_period_yrs")

    places = []
    for meta in COUNTRIES:
        code = meta["id"]
        stations = counts.get(code, 0)
        if code == "NP":
            fit = "country"
            new_rp = nepal_rp
            note = "Nepal-adjacent GEV headline applied to Nepal."
        elif code == "IN" and india_rp is not None:
            fit = "city_pack"
            new_rp = india_rp
            note = "India tail from the Bengaluru city pack GEV, not a national fit."
        else:
            fit = "pooled_nepal_adjacent"
            new_rp = nepal_rp
            note = (
                "Stations sit in the Nepal-adjacent GEV pool; not a country-specific GEV."
            )
        classes = _class_for_country(code, regional, india_signal if code == "IN" else None)
        if stations == 0 and code not in ("NP", "IN"):
            fit = "none"
            new_rp = None
            note = "No Nepal-adjacent NOAA ISD station assigned to this country in the frozen geojson."
            classes = {
                "flood": {"hazard": "flood", "level": "data_deficient", "evidence": note},
                "landslide": {"hazard": "landslide", "level": "data_deficient", "evidence": note},
                "glof": {"hazard": "glof", "level": "data_deficient", "evidence": note},
            }
        places.append({
            "id": code,
            "name": meta["name"],
            "is_country": True,
            "stations": stations,
            "new_return_period_yrs": new_rp,
            "fit": fit,
            "note": note,
            "classes": {
                "flood": classes["flood"]["level"],
                "landslide": classes["landslide"]["level"],
                "glof": classes["glof"]["level"],
            },
            "class_evidence": {
                "flood": classes["flood"].get("evidence"),
                "landslide": classes["landslide"].get("evidence"),
                "glof": classes["glof"].get("evidence"),
            },
            "composite": _composite(classes, new_rp),
        })

    ranked = sorted(
        [row for row in places if row["is_country"] and row["fit"] != "none"],
        key=lambda row: (-float(row["composite"]), float(row["new_return_period_yrs"] or 999), -row["stations"]),
    )
    leftover = [row for row in places if row not in ranked]
    for i, row in enumerate(ranked, start=1):
        row["rank"] = i
    for row in leftover:
        row["rank"] = None
        row["composite"] = row.get("composite")

    hma_stations = int((signal or {}).get("stations_processed") or 0)
    control = {
        "id": "HMA",
        "name": "High Mountain Asia (pooled)",
        "is_country": False,
        "rank": None,
        "stations": hma_stations,
        "new_return_period_yrs": None,
        "fit": "none",
        "classes": {"flood": "data_deficient", "landslide": regional["landslide"]["level"], "glof": regional["glof"]["level"]},
        "composite": None,
        "note": (
            "HMA-pooled late GEV did not identify a recurrence shift. Negative control — "
            "not a country rank."
        ),
    }

    return {
        "region": "nepal_adjacent",
        "sort": "worse_signals_higher_rank",
        "places": ranked + leftover,
        "control": control,
        "provenance": {
            "data_status": (
                "model output — country assignment is a screening lat/lon box on "
                "Nepal-adjacent NOAA ISD sites; tails are fitted GEV products"
            ),
            "stations_source": str(stations_path) if stations_path else None,
            "not": "ND-GAIN, GFDRR ThinkHazard, or a live Open-Meteo city board",
            "method": (
                "Composite = 50% ThinkHazard-style class ordinals (flood/landslide/GLOF) "
                "+ 50% intensification of the early 100-year depth."
            ),
        },
    }


def write(root: Path | str = ".", output: str = "artifacts/rankings.json") -> Path:
    payload = build(root)
    dest = Path(root) / output if not Path(output).is_absolute() else Path(output)
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(payload, indent=2) + "\n")
    return dest


def selftest() -> None:
    assert assign_country(85.32, 27.72) == "NP"
    assert assign_country(88.917, 25.75) == "BD"
    assert assign_country(77.59, 12.97) is None  # Bangalore is outside Nepal-adjacent bbox boxes... 
    # 77.59 is west of 79.0 so None is correct for this geojson universe.
    assert assign_country(87.0, 26.0) == "IN"
    payload = {
        "headline": {"new_return_period_yrs": 7.75, "old_return_period_yrs": 100},
        "landslide_trigger": {"auc": 0.934, "n_events": 138},
        "lake_growth": [{"name": "Imja Tsho", "pct_growth": 113.3}],
        "stations_processed": 498,
    }
    classes = classify(payload)
    assert classes["flood"]["level"] == "high"
    assert classes["landslide"]["level"] == "high"
    assert classes["glof"]["level"] == "high"
    print("country_rank selftest ok")


def main() -> None:
    parser = argparse.ArgumentParser(description="Write frozen HMA country rankings.json")
    parser.add_argument("--root", default=".")
    parser.add_argument("--output", default="artifacts/rankings.json")
    parser.add_argument("--selftest", action="store_true")
    args = parser.parse_args()
    if args.selftest:
        selftest()
        return
    dest = write(args.root, args.output)
    payload = json.loads(dest.read_text())
    top = next((p for p in payload["places"] if p.get("rank") == 1), None)
    print(f"wrote {dest}: {len(payload['places'])} countries, rank-1={top['name'] if top else None}")


if __name__ == "__main__":
    main()
