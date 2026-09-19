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
sleep 0.8
code=$(curl -s -o /tmp/rl-off.html -w "%{http_code}" http://127.0.0.1:4173/)
sig=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4173/demo_cache/signal.json)
bt=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4173/demo_cache/backtest.json)
kill $PID 2>/dev/null || true
echo "offline index=$code signal=$sig backtest=$bt"
test "$code" = "200" && test "$sig" = "200" && test "$bt" = "200"
echo "offline cache drill passed"
