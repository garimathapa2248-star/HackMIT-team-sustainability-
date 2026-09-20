#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/demo_cache" "$ROOT/web/public/demo_cache"
for f in signal.json noise.json plan.json candidates.json hazard.geojson backtest.json attribution.json preventive_measures_plan.md preventive_measures_plan.pdf flood_observed.geojson flood_modeled.geojson flood_observed_2017.geojson flood_modeled_2017.geojson risk_before.geojson risk_with_plan.geojson government_scorecard.md citizen_brief.md replication.json cities.json; do
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
echo "synced artifacts -> demo_cache and web/public/demo_cache"
