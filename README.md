# RootLedger

A decision engine for Himalayan flood / landslide / GLOF risk: pull the **tail** out of NOAA station rainfall with extreme-value theory, then spend a budget on a **triple-return** nature-based portfolio (people-risk avoided + CO₂ + household income).

**Headline (real EVT on Voloridge compute):** **498 stations / 12,066 station-years** of NOAA ISD across High Mountain Asia. Nepal-adjacent GEV: the early-period 1-in-100-year daily rainfall depth now has a fitted recurrence of **7.75 years** (1979–1999 vs 2000–2024). HMA-pooled late GEV did not identify a shift; that is stated in `provenance.headline_note`.

**Proof:** UNOSAT Sentinel-1 flood extent, Koshi/Madhesh, **27 Sep 2024**. Local-min HAND proxy on Copernicus GLO-30, stage calibrated on this event: **CSI 0.087**, POD 0.207, FAR 0.870 (screening-grade; not Whitebox HAND).

## Run the demo

```bash
python3 -m pip install -r optimize/requirements.txt -r api/requirements.txt
python3 -m api.main          # http://127.0.0.1:8000
cd web && npm install && npm run dev    # http://127.0.0.1:5173
```

Offline: `bash scripts/sync_artifacts.sh` then `cd web && VITE_USE_CACHE=true npm run dev`.

HMA parse on the booth box (resumable):

```bash
BBOX=hma bash signals/bootstrap_aws.sh
python3 -m signals.scale --s3-bucket noaa-global-hourly-pds --workers 46 --stations-json "$DATA_DIR/stations.json" --output artifacts/signal.json
```

UNOSAT + DEM backtest:

```bash
python3 -m hazard.proof
python3 -m optimize.pipeline --budget 2000000
bash scripts/sync_artifacts.sh
```

## Honesty labels

- **Signal / optimizer** are measured model output (GEV + greedy Monte-Carlo).
- **Landslide** is a **rainfall classifier** (AUC 0.934 out-of-sample), not a Caine I–D threshold.
- **Hazard** is a GLO-30 HAND *proxy* calibrated to UNOSAT S-1, not a hydrologist-grade twin.
- **CSI 0.087** is real and low — we will not round it up.

## Layout

| Path | Role |
|---|---|
| `signals/` | NOAA ISD → `signal.json` |
| `optimize/` | triple-return portfolio → `plan.json` |
| `hazard/proof.py` | UNOSAT CSI + GLO-30 cells |
| `api/` | FastAPI |
| `web/` | MapLibre demo |
| `demo_cache/` | committed freeze |
