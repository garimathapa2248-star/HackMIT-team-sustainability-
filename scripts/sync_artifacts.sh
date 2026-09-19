#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/demo_cache" "$ROOT/web/public/demo_cache"
for f in signal.json plan.json candidates.json hazard.geojson backtest.json attribution.json conceptnote.md; do
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
echo "synced artifacts -> demo_cache and web/public/demo_cache"
