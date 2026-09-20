#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/demo_cache" "$ROOT/web/public/demo_cache"
for f in signal.json noise.json plan.json candidates.json hazard.geojson backtest.json attribution.json preventive_measures_plan.md preventive_measures_plan.pdf flood_observed.geojson flood_modeled.geojson flood_observed_2017.geojson flood_modeled_2017.geojson risk_before.geojson risk_with_plan.geojson government_scorecard.md citizen_brief.md replication.json cities.json rankings.json scenarios.json; do
  if [[ -f "$ROOT/artifacts/$f" ]]; then
    cp "$ROOT/artifacts/$f" "$ROOT/demo_cache/$f"
    cp "$ROOT/artifacts/$f" "$ROOT/web/public/demo_cache/$f"
  elif [[ -f "$ROOT/contracts/fixtures/$f" ]]; then
    cp "$ROOT/contracts/fixtures/$f" "$ROOT/demo_cache/$f"
    cp "$ROOT/contracts/fixtures/$f" "$ROOT/web/public/demo_cache/$f"
  fi
done
if [[ -d "$ROOT/artifacts/charts" ]]; then
  mkdir -p "$ROOT/demo_cache/charts" "$ROOT/web/public/demo_cache/charts"
  cp -R "$ROOT/artifacts/charts/." "$ROOT/demo_cache/charts/"
  cp -R "$ROOT/artifacts/charts/." "$ROOT/web/public/demo_cache/charts/"
fi
if [[ -d "$ROOT/artifacts/cities" ]]; then
  mkdir -p "$ROOT/demo_cache/cities" "$ROOT/web/public/demo_cache/cities"
  cp -R "$ROOT/artifacts/cities/." "$ROOT/demo_cache/cities/"
  cp -R "$ROOT/artifacts/cities/." "$ROOT/web/public/demo_cache/cities/"
fi
python3 - "$ROOT" <<'PY'
import json
import sys
from pathlib import Path
root = Path(sys.argv[1])
src = root / "data" / "stations_nepal.json"
if src.is_file():
    stations = json.loads(src.read_text())
    features = []
    for row in stations:
        lat, lon = row.get("lat"), row.get("lon")
        if lat is None or lon is None:
            continue
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [float(lon), float(lat)]},
            "properties": {
                "station": row.get("station"),
                "name": row.get("name"),
                "begin": row.get("begin"),
                "end": row.get("end"),
                "elev_m": row.get("elev_m"),
            },
        })
    fc = {
        "type": "FeatureCollection",
        "name": "stations_nepal",
        "title": "Nepal-adjacent NOAA ISD sites used for the 7.75-year headline",
        "features": features,
    }
    text = json.dumps(fc, indent=2) + "\n"
    for dest in (root / "demo_cache", root / "web" / "public" / "demo_cache"):
        dest.mkdir(parents=True, exist_ok=True)
        (dest / "stations_nepal.geojson").write_text(text)
    print(f"synced {len(features)} NOAA ISD stations -> demo_cache")
PY
echo "synced artifacts -> demo_cache and web/public/demo_cache"
