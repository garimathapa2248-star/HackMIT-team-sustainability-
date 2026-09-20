#!/usr/bin/env bash
# Wifi-off insurance: build the Vite app against demo_cache and serve it
# with the API down. Judges can open dist/ without a backend.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
bash scripts/sync_artifacts.sh
cd "$ROOT/web"
VITE_USE_CACHE=true npm run build
cd "$ROOT/web/dist"
python3 -m http.server 4173 >/tmp/rootledger-offline.log 2>&1 &
PID=$!
trap 'kill "$PID" 2>/dev/null || true' EXIT
sleep 0.8
code=$(curl -s -o /tmp/rl-off.html -w "%{http_code}" http://127.0.0.1:4173/)
sig=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4173/demo_cache/signal.json)
noise=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4173/demo_cache/noise.json)
bt=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4173/demo_cache/backtest.json)
plan=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4173/demo_cache/plan.json)
candidates=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4173/demo_cache/candidates.json)
before=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4173/demo_cache/risk_before.geojson)
after=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4173/demo_cache/risk_with_plan.geojson)
report=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4173/demo_cache/preventive_measures_plan.md)
pdf=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4173/demo_cache/preventive_measures_plan.pdf)
echo "offline index=$code signal=$sig noise=$noise backtest=$bt plan=$plan candidates=$candidates risk=$before/$after report=$report pdf=$pdf"
test "$code" = "200" && test "$sig" = "200" && test "$noise" = "200" && test "$bt" = "200"
test "$plan" = "200" && test "$candidates" = "200" && test "$before" = "200" && test "$after" = "200"
test "$report" = "200" && test "$pdf" = "200"
echo "offline cache drill passed"
