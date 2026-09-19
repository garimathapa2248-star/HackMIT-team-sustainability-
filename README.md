# RootLedger

A decision engine for Himalayan flood / landslide / GLOF risk: pull the **tail** out of NOAA station rainfall with extreme-value theory, then spend a budget on a nature-based portfolio (annual expected people-risk avoided + modeled CO₂ + modeled livelihood-income potential).

**Headline (real EVT on Voloridge compute):** **498 stations / 12,066 station-years** of NOAA ISD across High Mountain Asia. Nepal-adjacent GEV: the early-period 1-in-100-year daily rainfall depth now has a fitted recurrence of **7.75 years** (1979–1999 vs 2000–2024). HMA-pooled late GEV did not identify a shift; that is stated in `provenance.headline_note`.

**Calibration evidence:** UNOSAT Sentinel-1 flood extent, Koshi/Madhesh, **27 Sep 2024**. Copernicus GLO-30 **local-min HAND proxy**, with stage calibrated on this event: **CSI 0.086**, POD 0.211, FAR 0.873. These are low calibration-event fit metrics, not independent validation and not Whitebox HAND.

The current spoken demo and Q&A are in [`DEMO_SCRIPT.md`](DEMO_SCRIPT.md). It supersedes the stale presentation wording in `PLAN.md §11`.

## Run the demo

```bash
python3 -m pip install -r optimize/requirements.txt -r api/requirements.txt
python3 -m api.main          # http://127.0.0.1:8000
cd web && npm install && npm run dev    # http://127.0.0.1:5173
```

Offline: `bash scripts/sync_artifacts.sh` then `cd web && VITE_USE_CACHE=true npm run dev`.

Read-only cache integrity check:

```bash
python3 scripts/verify_artifacts.py
```

`sync_artifacts.sh` includes `noise.json`. The verifier compares SHA-256 hashes without creating, editing, or deleting files.

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

- **Signal / optimizer** are model outputs fitted to observed NOAA records and screening inputs (GEV + greedy Monte-Carlo).
- **Landslide** is a **rainfall classifier** (AUC 0.934 out-of-sample), not a Caine I–D threshold.
- **Hazard** is a GLO-30 **local-min HAND proxy calibrated on this event**, not Whitebox HAND or a hydrodynamic twin.
- **CSI 0.086** is real and low. POD is 0.211 and FAR is 0.873.
- **Portfolio, carbon, and income** are model outputs that depend on literature assumptions.
- **Counterfactual exposure reduction** is a simulation, not an observed outcome.
- **No household-reach or causal responsibility-percentage claim is supported.**

The generated report is titled **Preventive Measures Plan** and is available at
`/preventive-measures-plan` and `/preventive-measures-plan.pdf`; legacy `/conceptnote` routes remain aliases.
Existing `artifacts/conceptnote.*` files are stale generated artifacts, are no longer synced, and must not be presented.

## Layout

| Path | Role |
|---|---|
| `signals/` | NOAA ISD → `signal.json` |
| `optimize/` | triple-return portfolio → `plan.json` |
| `hazard/proof.py` | UNOSAT CSI + GLO-30 cells |
| `api/` | FastAPI |
| `web/` | MapLibre demo |
| `demo_cache/` | committed freeze |
