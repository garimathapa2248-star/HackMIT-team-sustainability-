# RootLedger

A decision engine for Himalayan flood / landslide / GLOF risk: pull the **tail** out of NOAA station rainfall with extreme-value theory, then spend a budget on a nature-based portfolio (annual expected people-risk avoided + modeled CO₂ + modeled livelihood-income potential).

**Headline (real EVT on Voloridge compute):** **498 stations / 12,066 station-years** of NOAA ISD across High Mountain Asia. Nepal-adjacent GEV: the early-period 1-in-100-year daily rainfall depth now has a fitted recurrence of **7.75 years** (1979–1999 vs 2000–2024). HMA-pooled late GEV did not identify a shift; that is stated in `provenance.headline_note`. ERA5-Land at 39 of the same 73 station coordinates **partially replicates** (16.72-year vs 7.75-year); see `artifacts/replication.json`.

**Calibration evidence:** UNOSAT Sentinel-1 flood extent, Koshi/Madhesh, **27 Sep 2024**. Copernicus GLO-30 **local-min HAND proxy**, stage calibrated on this event: **CSI 0.053**, POD 0.212, FAR 0.935. Beats an area-matched elevation baseline (CSI 0.001); **does not beat** JRC seasonal-water climatology (CSI 0.067). These are in-sample calibration-event metrics, not Whitebox HAND.

**Transfer evidence:** frozen 2024 model on ICIMOD 13 Aug 2017 western Terai (RDS 33616; **not** the Koshi bbox): CSI **0.088** vs JRC 0.141. 2024 west/east spatial holdout: CSI **0.056**.

The current spoken demo and Q&A are in [`DEMO_SCRIPT.md`](DEMO_SCRIPT.md). Plume paste text is in [`PLUME.md`](PLUME.md).

## Run the demo

```bash
python3 -m pip install -r optimize/requirements.txt -r api/requirements.txt
python3 -m api.main          # http://127.0.0.1:8000
cd web && npm install && npm run dev    # http://127.0.0.1:5173
```

**Judging freeze (offline, does not call `/optimize`):**

```bash
bash scripts/sync_artifacts.sh
python3 scripts/verify_artifacts.py
cd web && VITE_USE_CACHE=true npm run build
python3 -m http.server 4173 -d dist
```

`sync_artifacts.sh` includes `replication.json` and `cities.json`. The verifier compares SHA-256 hashes without creating, editing, or deleting files.

City packs: `python3 -m regions.build_bangalore` and `python3 -m regions.build_any --city "Kathmandu"`. Catalog merges `artifacts/cities.json`.

HMA parse on the booth box (resumable):

```bash
BBOX=hma bash signals/bootstrap_aws.sh
python3 -m signals.scale --s3-bucket noaa-global-hourly-pds --workers 46 --stations-json "$DATA_DIR/stations.json" --output artifacts/signal.json
```

UNOSAT + DEM backtest (do not re-run unless a Koshi-overlapping 2017 raster arrives):

```bash
python3 -m hazard.proof
python3 -m optimize.pipeline --budget 2000000 --draws 500
bash scripts/sync_artifacts.sh
```

## Honesty labels

- **Signal / optimizer** are model outputs fitted to observed NOAA records and screening inputs (GEV + greedy Monte-Carlo).
- **Landslide** is a **rainfall classifier** (AUC 0.934 out-of-sample), not a Caine I–D threshold.
- **Hazard** is a GLO-30 **local-min HAND proxy calibrated on this event**, not Whitebox HAND or a hydrodynamic twin.
- **CSI 0.053** is real and low. POD is 0.212 and FAR is 0.935. The model does not beat JRC seasonal water.
- **2017 CSI 0.088** is a frozen transfer, not same-valley validation.
- **ERA5** partially replicates; IMERG is not fused.
- **Portfolio, carbon, and income** are model outputs that depend on literature assumptions. Equity weight is 1.0–1.5× on EAL.
- **Counterfactual exposure reduction** is a simulation, not an observed outcome.
- **No household-reach or causal responsibility-percentage claim is supported.**
- **Bengaluru / Kathmandu** packs have **CSI null** unless a SAR scene is wired.

The generated report is titled **Preventive Measures Plan** and is available at
`/preventive-measures-plan` and `/preventive-measures-plan.pdf`; legacy `/conceptnote` routes remain aliases.

## Layout

| Path | Role |
|---|---|
| `signals/` | NOAA ISD → `signal.json`; ERA5 replication → `replication.json` |
| `optimize/` | triple-return portfolio → `plan.json` |
| `hazard/proof.py` | UNOSAT CSI + GLO-30 cells |
| `regions/` | Bangalore + any-city packs |
| `api/` | FastAPI |
| `web/` | MapLibre demo |
| `demo_cache/` | committed freeze |
