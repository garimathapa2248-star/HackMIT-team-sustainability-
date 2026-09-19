# RootLedger

A decision engine for Himalayan flood / landslide / GLOF risk: pull the **tail** out of NOAA station rainfall with extreme-value theory, then spend a budget on a **triple-return** nature-based portfolio (people-risk avoided + CO₂ + household income).

**Headline (real EVT):** the early-period 1-in-100-year daily rainfall depth now has a fitted recurrence of **7.75 years** (1979–1999 vs 2000–2024), from **72 stations / 1,511 station-years**.

## Run the demo

From `rootledger/`:

```bash
python3 -m pip install -r optimize/requirements.txt -r api/requirements.txt
python3 -m api.main          # http://127.0.0.1:8000
```

In another terminal:

```bash
cd web && npm install && npm run dev    # http://127.0.0.1:5173
```

Offline (no API): copy artifacts into the UI cache and start Vite with cache mode.

```bash
bash scripts/sync_artifacts.sh
cd web && VITE_USE_CACHE=true npm run dev
```

Regenerate the screening watershed + $2M plan:

```bash
python3 -m hazard.synth
python3 -m optimize.pipeline --budget 2000000
python3 -m optimize.charts
python3 -c "from api.conceptnote import render; open('artifacts/conceptnote.md','w').write(render())"
bash scripts/sync_artifacts.sh
```

## Honesty labels

- **Signal / optimizer** are measured model output (GEV + greedy Monte-Carlo).
- **Landslide** is a **rainfall classifier** (AUC 0.934 out-of-sample), not a Caine I–D threshold.
- **Hazard / candidates** in `demo_cache/` are a **screening-grade lattice**, not DEM/HAND/SAR. Drop real files on `artifacts/` and re-run the optimizer.
- **Backtest CSI** is null until the SAR twin lands. The UI and `/ask` will not invent a score.

## Layout

| Path | Role |
|---|---|
| `signals/` | NOAA ISD → `signal.json` |
| `optimize/` | triple-return portfolio → `plan.json` |
| `hazard/synth.py` | screening grid until the real twin |
| `api/` | FastAPI over artifacts, then fixtures |
| `web/` | MapLibre demo |
| `demo_cache/` | committed freeze for judging |
| `contracts/` | frozen schemas + tiny fixtures |
