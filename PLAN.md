# RootLedger — HackMIT 2026 Master Build Plan

**Track:** Sustainability · **Primary sponsor:** Voloridge ("Signal in the Noise") · **Team:** 4 · **Window:** ~24h

> **Read order:** §0 (deadlines) → §1–3 (context, so everyone can pitch) → §5–7 (how we avoid merge conflicts) →
> **your own section in §9** → §11 (demo). Everything else is reference.

### The team

| Person | Role | Owns (directories) | Ships |
|---|---|---|---|
| **Jeevith** | Signal + Optimizer (the Voloridge core) | `contracts/`, `signal/`, `optimize/` | `signal.json`, `plan.json` |
| **Subodh** | Hazard twin + Backtest | `hazard/` | `hazard.geojson`, `candidates.json`, `backtest.json` |
| **Nalani** | API + AI Agent + Reports | `api/`, `agent/`, `scripts/`, `.gitignore` | the API, `attribution.json`, concept note |
| **Garima** | Frontend + Demo (presents) | `web/`, `demo_cache/`, `README.md` | the thing judges actually see |

---

## §0. Hard constraints — read first

| Constraint | Value | What it means |
|---|---|---|
| **AWS instance TTL** | terminates **2026-09-20T17:12:44Z** | Heavy compute runs in the FIRST half. Everything must be pulled off the box before it dies. |
| **Instance** | `i7i.12xlarge` — 48 vCPU, 384 GiB RAM, multi-TB NVMe | Storage-optimized = perfect for the 600 GB NOAA ISD parse. Use the big NVMe mount, not the root volume. |
| **GPU option** | `g7.24xlarge`, 4× RTX PRO 4500 Blackwell | Only if we go deep-learning. **We probably don't need it** — gradient boosting on 48 cores is plenty. |
| **Demo machine** | A laptop, NOT the AWS box | **The demo runs entirely off cached artifacts.** If AWS dies mid-judging, nothing breaks. |

**Three rules that decide whether we win:**
1. **Artifacts > infrastructure.** Every stage writes a small JSON/GeoJSON to `artifacts/`. The demo reads those files. Nothing live-computes on stage.
2. **Pull everything off AWS by H+16.** `rsync` artifacts to laptops + commit the demo cache. Set a phone alarm.
3. **No secrets in git.** Credentials in a gitignored `.env` only. Treat the AWS box as semi-public — keep nothing sensitive on it.

---

## §1. Context — the hackathon, the track, the sponsor

### The hackathon
HackMIT 2026, Sept 19–20, ~1200 students. Projects are judged on a short demo + Q&A. **Judges see the demo, not
the codebase** — so a working 3-minute story beats a bigger half-working system every time.

### The track: Sustainability
What sustainability judges reward (and how we hit each):
- **A real problem with real stakes** → Himalayan GLOF/flood/landslide; 50+ dead in Kathmandu in 48h, Sept 2024.
- **Systemic, not symptomatic** → we don't warn about disasters, we change the *decisions* that prevent them.
- **Equity built in** → built for data-scarce, under-resourced communities; prioritizes low-income wards; the
  Responsibility Split explicitly refuses to dump systemic failures on individuals.
- **Mitigation + adaptation together** → nature-based defenses sequester carbon *while* reducing risk.
- **Livelihoods** → bamboo/vetiver are real rural economies; we *pay people to grow their own defense.*
- **Scalable** → one engine, any watershed, from free global data.

### The sponsor: Voloridge — "Signal in the Noise"
Voloridge is a quantitative hedge fund (KDD Cup / Kaggle pedigree) that models markets under uncertainty. Their
challenge: *build something with large, noisy public datasets.* Judged on:

| Their criterion | Our artifact |
|---|---|
| **Originality** | Nobody turns NOAA station noise into a risk-adjusted, nature-based **investment plan**. Signal → decision, not signal → chart. |
| **Technical Excellence** | 600 GB fixed-width parse at scale on their cluster; 4-dataset fusion; **EVT (GEV/POT)**; an ML landslide-trigger model; Monte-Carlo + CVaR optimization. |
| **Insight** | Discovered, quantified signals (§9A): rainfall intensification, landslide trigger thresholds, glacial-lake growth — each with uncertainty. |
| **Execution** | One polished demo: noise → signal → plan → proof → funding doc. |

**The line that wins them:** *"Everyone else visualized a dataset. We pulled the signal out of NOAA's noise with
extreme-value theory — the same tail-risk math you use for VaR — discovered the 100-year storm is now an N-year
storm, and turned it into a plan we backtested against a real flood."*

### Datasets (all cleared)
**Anchor:** NOAA ISD (theirs). **Cleared additions:** GPM IMERG, NASA Global Landslide Catalog/COOLR,
glacial-lake time-series + RGI. **Our open stack:** Copernicus DEM, Sentinel-1 SAR, ESA WorldCover, WorldPop,
GHSL, OpenStreetMap, ICIMOD glacial-lake inventory, NASA LHASA.

---

## §2. What we are building (the product, precisely)

**RootLedger** — a decision engine that reads decades of weather + satellite data for a Himalayan watershed,
figures out who is in danger from glacial-lake floods / monsoon floods / landslides, and then computes the
**optimal portfolio of nature-based defenses** for a given budget — maximizing a **triple return**:

> **lives protected + CO₂ sequestered + household income generated**, per dollar.

It **proves** itself by backtesting against the real September 2024 flood (satellite radar), **explains** every
choice through a grounded AI agent, and **packages** the result as a funder-ready concept note.

**The loop:** `Observe → Measure → Prove → Optimize → Fund → Verify`

**Case study:** one watershed in the Koshi basin, Nepal (below a dangerous glacial lake — e.g. Tsho Rolpa), with
downstream settlements. Lock the exact bounding box at H+0 (see §9B task B0).

---

## §3. Why this wins (the one-paragraph answers)

**"What's the use case?"** Climate funds and development banks (GCF, World Bank, ADB) have billions for
adaptation but can't afford a $100k consultant study per site — we give them a minutes-long screening tool that is
proven and defensible. NGOs (ICIMOD, UNDP) use the output to actually get funded. Communities are the
beneficiaries — and they *own* the outcome, because they grow the defense and earn from it.

**"Who's responsible — government or citizens?"** Both, and we make the split visible *from data*: government
controls zoning, drainage, outlet maintenance, early warning (typically the majority of avoidable risk);
communities control waste/encroachment; households control property-level measures. We tell each what's theirs.

**"Isn't ranking countries just shaming the poor?"** Our index ranks **measured action and trajectory**, not
wealth — a poor country that's genuinely greening outranks a rich one coasting. (Garnish only; see cut list.)

---

## §4. System architecture

```
  NOAA ISD ──┐
  GPM IMERG ─┼─► SIGNAL (Jeevith) ───── signal.json ─────────┐
  Landslide ─┤   EVT / trends / trigger thresholds           │
  Lake TS ───┘                                               ▼
                                              OPTIMIZE (Jeevith) ──► plan.json ──┐
  DEM ───────┐                                               ▲                   │
  WorldCover ┼─► HAZARD (Subodh) ───── hazard.geojson ───────┤                   ▼
  WorldPop   │   HAND / GLOF / landslide / exposure          │        API + AGENT (Nalani) ──► WEB (Garima)
  OSM ───────┤                   candidates.json ────────────┘         tools, Claude,            map, slider,
  Sentinel-1 ┴─► BACKTEST (Subodh) ─ backtest.json ────────────────────► concept note            charts, chat
```

Every arrow is a **file in `artifacts/`**. That is the whole integration story.

---

## §5. Repo layout + ownership (the anti-merge-conflict design)

**One owner per directory. You never edit another person's directory. Ever.**

```
rootledger/
├── contracts/          [Jeevith]   JSON schemas + fixtures. FROZEN at H+1.
│   ├── schemas.md
│   └── fixtures/       fake artifacts so everyone works in parallel from minute one
├── signal/             [Jeevith]   NOAA ISD, EVT, IMERG, landslide thresholds, lake growth
│   └── requirements.txt
├── optimize/           [Jeevith]   economics, Monte-Carlo, knapsack, frontier, CVaR
├── hazard/             [Subodh]    DEM→HAND, GLOF routing, landslide layer, exposure, SAR backtest
│   └── requirements.txt
├── api/                [Nalani]    FastAPI service
├── agent/              [Nalani]    Claude tool-use, concept note, responsibility split
│   └── requirements.txt
├── web/                [Garima]    React + MapLibre/deck.gl frontend
├── artifacts/          [GITIGNORED] generated JSON/GeoJSON — each file has exactly ONE producer
├── demo_cache/         [Garima]    committed once at H+20 — frozen artifacts for the demo
├── scripts/            [Nalani]    sync/bootstrap helpers
├── .env                [GITIGNORED] credentials
└── .gitignore          [Nalani]    set at H+0, nobody else touches
```

### Shared-file rules (this is where teams lose hours)
| File | Rule |
|---|---|
| `requirements.txt` | **Never one shared file.** Each module has its own. Duplication is fine; coordination cost is not. |
| `.gitignore` | Nalani writes it at H+0. Nobody else edits. |
| `README.md` | Garima owns. Don't touch during the hack. |
| `contracts/` | Jeevith owns. After H+1 it's **frozen** — a change requires a shout in the group chat + everyone re-pulls. |
| `artifacts/*` | Gitignored. One producer per file. Synced, never merged. |

---

## §6. The contracts (freeze at H+1 — everything depends on this)

**Jeevith writes these schemas AND fake fixtures in the first hour.** The fixtures are what let Subodh, Nalani and
Garima build at full speed before any real data exists. This single step is worth more than any other hour of the
hackathon.

### `artifacts/signal.json` — produced by Jeevith
```json
{
  "region": "koshi_nepal",
  "stations_processed": 412,
  "station_years": 9840,
  "return_levels_mm": { "2": 61.4, "5": 88.2, "10": 107.9, "25": 133.8, "50": 154.1, "100": 175.6 },
  "return_levels_ci95": { "100": [148.2, 209.7] },
  "headline": {
    "statement": "The 1-in-100-year daily rainfall of the 1975-1999 era now recurs every 34 years",
    "old_return_period_yrs": 100,
    "new_return_period_yrs": 34,
    "threshold_mm": 175.6
  },
  "trend": { "metric": "annual_max_1day_precip_mm", "slope_mm_per_decade": 4.2, "p_value": 0.03 },
  "landslide_trigger": { "form": "I = a * D^b", "a": 12.4, "b": -0.42, "n_events": 287, "auc": 0.81 },
  "lake_growth": [
    { "lake_id": "tsho_rolpa", "name": "Tsho Rolpa", "area_km2_first": 1.39, "area_km2_last": 1.76,
      "first_year": 1990, "last_year": 2024, "pct_growth": 26.6 }
  ],
  "provenance": { "datasets": ["NOAA ISD", "GPM IMERG", "NASA COOLR", "RGI"], "generated_utc": "..." }
}
```

### `artifacts/hazard.geojson` — produced by Subodh
FeatureCollection of grid cells (or small polygons). Each feature's `properties`:
```json
{
  "cell_id": "c_00421",
  "flood_depth_m": { "rp10": 0.4, "rp100": 1.8 },
  "glof_depth_m": 2.4,
  "landslide_prob": 0.23,
  "population": 312,
  "critical_assets": ["school"],
  "eal_people": 8.4,
  "eal_usd": 22000
}
```

### `artifacts/candidates.json` — produced by Subodh (the intervention universe)
```json
[{ "parcel_id": "p_0007", "type": "vetiver_slope", "area_ha": 3.2, "centroid": [86.47, 27.86],
   "cell_ids": ["c_00421","c_00422"], "slope_deg": 22.5, "landcover": "bare" }]
```
`type` ∈ `vetiver_slope | bamboo_slope | floodplain_restore | wetland_restore | afforestation | riverbank_bio`

### `artifacts/plan.json` — produced by Jeevith (optimize)
```json
{
  "budget_usd": 2000000, "mode": "expected",
  "selected": [{ "parcel_id": "p_0007", "cost_usd": 18400, "avoided_eal_people": 41.2,
                 "co2_t_10yr": 120, "income_usd_yr": 2400 }],
  "totals": { "cost_usd": 1984000, "people_protected": 28400, "exposure_reduction_pct": 34.1,
              "co2_t_10yr": 12180, "income_usd_yr": 186000, "households_benefiting": 412 },
  "frontier": [{ "budget_usd": 500000, "people_protected": 11200, "co2_t_10yr": 3100 }],
  "cvar": { "mode_available": true, "tail_people_protected": 21900 }
}
```

### `artifacts/backtest.json` — produced by Subodh
```json
{
  "event_date": "2024-09-27", "sar_scene": "S1A_IW_GRDH_...",
  "observed_flood_km2": 41.2, "modeled_flood_km2": 45.8,
  "hit_rate_pod": 0.78, "false_alarm_ratio": 0.19, "critical_success_index": 0.66,
  "counterfactual": { "people_exposed_baseline": 82000, "people_exposed_with_plan": 54100, "reduction_pct": 34 }
}
```

### `artifacts/attribution.json` — produced by Nalani
```json
{ "government_pct": 71, "community_pct": 19, "household_pct": 10,
  "government_levers": [{ "lever": "drainage_capacity", "risk_share_pct": 28, "fix_cost_usd": 640000,
                          "people_protected": 9100 }] }
```

---

## §7. Git workflow — zero merge conflicts

1. **Everyone works directly on `main`.** With strict directory ownership there is nothing to conflict on, and
   branches+PRs cost more than they're worth in 24h.
2. **`git pull --rebase` before every push.** Make it muscle memory.
3. **Commit small and often** (every ~30 min). A broken uncommitted laptop at H+20 is a project-ending event.
4. **Never `git add .` from the repo root** — use `git add <your-directory>`. This is the single most common way
   people accidentally commit someone else's broken WIP or a 2 GB artifact.
5. **If you genuinely need something in another person's directory: message them.** Do not edit it yourself.
6. **Artifacts are gitignored**; sync them with `scripts/sync_artifacts.sh` (Nalani writes it) or plain `rsync`.

`.gitignore` (Nalani writes at H+0):
```
artifacts/
data/
.env
__pycache__/
*.tif
*.nc
*.zip
node_modules/
web/dist/
.venv/
```

---

## §8. Compute plan (the AWS box)

```bash
ssh student@<instance-ip>          # password from your terminal — never commit it
tmux new -s rootledger             # ALWAYS work in tmux; SSH drops will kill long jobs otherwise
df -h                              # find the big NVMe mount; put data + artifacts there
```

- **Jeevith runs on AWS** (the ISD parse is the only genuinely heavy job — 48 cores, use `multiprocessing` over
  station-years). Subodh may use it for raster ops; Nalani and Garima work locally.
- **Parallelism:** ISD is embarrassingly parallel per station-year — `multiprocessing.Pool(46)`.
- **Checkpoint everything to disk.** Never hold the only copy of a 3-hour computation in a notebook kernel.
- **H+16 — EVACUATION (set an alarm):** `rsync -avz student@<ip>:~/rootledger/artifacts ./artifacts` then commit
  `demo_cache/`. After this point the demo is fully laptop-local.
- **Report the scale number** — "we processed N station-years on Voloridge's cluster" is a Technical Excellence
  point; have `stations_processed` and `station_years` in `signal.json` (§6).

---

## §9. The four workstreams

> Each person: read **only your section** plus §6 (contracts). Deliverables are files in `artifacts/`.

---

### §9A — JEEVITH · Signal + Optimizer  *(owns `contracts/`, `signal/`, `optimize/`)*
**You are the Voloridge prize.** Your headline number is the single most important output of this hackathon.

**H+0 → H+1 — Freeze the contracts (do this before anything else).**
Write `contracts/schemas.md` + `contracts/fixtures/*.json` with realistic fake numbers (copy §6 verbatim).
Commit and tell the team. **Subodh, Nalani and Garima are blocked until this exists — it takes 30 minutes and
unblocks 18 hours of parallel work.**

**H+1 → H+3 — ISD ingest at scale.**
- Use Voloridge's `src/noaa_isd/fetch.py`; fallback `s3://noaa-global-hourly-pds/{year}/{station}.csv`.
- Select stations: filter `isd-history.csv` to the HMA bbox (Nepal + adjacent India/China/Bhutan). Aim for
  **all HMA stations × 40+ years** — that's your scale story.
- **The noise is the point:** handle missing sentinels (`9999`), quality codes, duplicate records, inconsistent
  precip accumulation periods (ISD `AA1–AA4` = period + depth; normalize to 24h). Log what you cleaned — judges
  love the cleaning story.
- Output: tidy parquet of station × date × daily precip on NVMe.

**H+3 → H+6 — EVT + the headline (THE deliverable).**
- Annual maxima per station → fit **GEV** (`scipy.stats.genextreme`, or `pyextremes`); also **POT/GPD** as a
  cross-check. Bootstrap 95% CIs.
- **Non-stationarity = the headline.** Fit early period (e.g. 1975–1999) vs late (2000–2024), *or* a GEV with a
  time-varying location parameter. Then: *"the 1-in-100-year storm of the old era now recurs every N years."*
- Write `artifacts/signal.json` with real numbers. **Ship this by H+6 even if rough** — Subodh's flood depths key
  off the return levels.

**H+6 → H+9 — Fusion (the two extra signals).**
- **IMERG:** easiest path is Google Earth Engine (`NASA/GPM_L3/IMERG_V07`) → daily precip over the watershed;
  use it to fill the ungauged high-altitude gaps and to sanity-check ISD. (Avoid GES DISC auth pain.)
- **Landslide trigger:** load COOLR/GLC events in the region → join each to antecedent rainfall (nearest ISD
  station or IMERG cell) → compute intensity–duration pairs → fit a threshold curve `I = a·D^b`, *or* train a
  gradient-boosted classifier (rainfall features → event/no-event with sampled negatives) and report **AUC**.
  **Fit out-of-sample** (temporal split) — do not tune on what you show.
- **Lake growth:** in GEE, compute water-mask area per year (Landsat/Sentinel-2 NDWI) for the ICIMOD dangerous
  lakes → `% growth`. One chart of a named lake swelling is worth a thousand words.

**H+9 → H+18 — The optimizer.**
- `economics.py`: per-parcel **cost** (per ha by type), **avoided EAL** (apply cited effect sizes to Subodh's
  hazard), **CO₂** (sequestration factor × area × 10yr), **income** (livelihood value × area). Every factor in one
  table with a `source` string — this table is your honesty backbone.
- `portfolio.py`: Monte-Carlo over hazard scenarios (sample return periods from your EVT distribution) →
  distribution of avoided loss per parcel → **greedy by risk-adjusted triple-return/$** (ship this first, it
  always works) → then **0/1 knapsack** (`PuLP`) if time → **efficient frontier** by sweeping budget →
  **CVaR mode** optimizing the worst-case tail.
- Output `artifacts/plan.json`. Expose `optimize(budget, mode)` as a plain Python function Nalani can import.

**H+18 → H+22 — Support the demo.** Triple-check numbers; prepare the two charts Garima needs (return-level curve
with CIs; frontier). Rehearse your 30-second explanation of EVT for the Voloridge judge.

**Done =** `signal.json` + `plan.json` are real, the headline number is defensible, and you can explain GEV to a
quant in 30 seconds.

---

### §9B — SUBODH · Hazard twin + Backtest  *(owns `hazard/`)*
**You own the map everyone sees and the proof that it's real.**

**H+0 → H+1 — B0: Lock the study area.** Pick the watershed (Koshi basin below a dangerous ICIMOD lake — Tsho
Rolpa is the recommended default) and **publish the bounding box to the team in the group chat.** Everything
downstream keys off it. Verify a good Sentinel-1 scene exists for late Sept 2024 *before* committing.

**H+1 → H+4 — Terrain + HAND.**
- Copernicus GLO-30 DEM (via GEE or OpenTopography), clipped to the bbox.
- **Use `whitebox` (WhiteboxTools)** — it has `elevation_above_stream` (= HAND) built in, which saves you hours
  vs. hand-rolling flow routing. Pipeline: fill depressions → D8 flow dir → flow accumulation → stream network at
  a threshold → `elevation_above_stream`.
- Flood depth at a return period = `max(0, stage(RP) − HAND)`. Get `stage(RP)` from a simple monotone mapping off
  Jeevith's return-level rainfall — **and calibrate that mapping with the backtest** (this is legitimate screening
  practice; say so out loud).

**H+4 → H+7 — Backtest (your headline).**
- Sentinel-1 GRD in GEE: pre-event and post-event (late Sept 2024), VV, speckle filter → water mask via Otsu or
  a fixed threshold.
- Compare observed vs modeled extent → **POD / FAR / CSI**. Tune `stage(RP)` so the 2024 event matches, then
  report honestly that it was calibrated on this event.
- Write `artifacts/backtest.json`. **This single file is the credibility of the whole project.**

**H+7 → H+10 — The other two hazards.**
- **GLOF:** lake volume from area (`V = c·A^γ` scaling), route the release down the D8 flow path, fill valley
  cells until the volume is consumed → depth grid → downstream exposure. Screening-grade and defensible.
- **Landslide:** NASA LHASA susceptibility, or slope × landcover × Jeevith's rainfall-trigger threshold.

**H+10 → H+13 — Exposure + EAL.** WorldPop × depth/probability; tag OSM critical assets (schools, health, roads,
hydropower). Produce `eal_people` and `eal_usd` per cell → write `artifacts/hazard.geojson`.

**H+13 → H+16 — Candidates.** Suitability rules per intervention type (slope band, landcover, distance to
channel, not-already-built) → `artifacts/candidates.json`. **Jeevith is blocked on this for the optimizer — ship
it by H+15 at the latest.**

**H+16 → H+20 — Map polish.** Keep the GeoJSON small enough for the browser (simplify geometry, round floats,
aim < 10 MB — Garima will thank you). Produce the before/after layers for the demo.

**Done =** `hazard.geojson`, `candidates.json`, `backtest.json` are real, and the CSI number is something you'd
defend to a hydrologist.

---

### §9C — NALANI · API + AI Agent + Reports  *(owns `api/`, `agent/`, `scripts/`, `.gitignore`)*
**You turn numbers into language, and you're the glue.**

**H+0 → H+1 — Bootstrap the repo.** Create the directory skeleton (§5), `.gitignore` (§7), and
`scripts/sync_artifacts.sh`. Push immediately so everyone can clone. Then **you are unblocked by Jeevith's
fixtures**.

**H+1 → H+5 — FastAPI against fixtures.** Endpoints, reading from `artifacts/` with fixture fallback:
```
GET  /signal                    -> signal.json
GET  /hazard                    -> hazard.geojson
GET  /backtest                  -> backtest.json
POST /optimize {budget, mode}   -> plan.json   (import Jeevith's optimize(); fixture until it lands)
GET  /attribution               -> attribution.json
POST /ask {question}            -> agent answer
POST /conceptnote               -> markdown/PDF
```
CORS open for Garima. **Ship a working fixture-backed API by H+5** — Garima cannot finish without it.

**H+5 → H+10 — The Claude agent (tool-use, grounded).**
- Tools: `get_signal()`, `get_hazard_summary()`, `rank_cells(metric)`, `explain_parcel(id)`,
  `run_optimize(budget, mode)`, `get_backtest()`.
- **System prompt rule (non-negotiable):** *"You may only state numbers returned by tools. Never estimate,
  interpolate, or invent a figure. If a tool didn't return it, say you don't have it."* This is what makes the
  whole project defensible — and it's the honest engineering pattern.
- Must nail: *"Why plant parcel p_0007 before p_0031?"* → answers from real EAL/cost numbers.

**H+10 → H+14 — Responsibility Split + reports.**
- A rules table mapping each risk driver → government / community / household lever, with risk share and fix
  cost → `artifacts/attribution.json`.
- **Government scorecard** + **citizen brief** generators (markdown).

**H+14 → H+18 — The concept note (the "data → dollars" moment).** Fill a GCF/Adaptation-Fund-shaped template from
`plan.json` + `signal.json` + `backtest.json`: problem, evidence, intervention, budget table, expected impact
(lives/CO₂/income), M&E via satellite MRV, citations. Render markdown → downloadable. **This is the demo's
closing beat — make it look like a real document.**

**H+18 → H+22 — Optional Twilio SMS demo + hardening.** Every endpoint returns cached data if a dependency is
missing. Nothing 500s on stage, ever.

**Done =** `/ask` answers from real numbers, `/conceptnote` produces something that looks fundable, and the API
never crashes.

---

### §9D — GARIMA · Frontend + Demo  *(owns `web/`, `demo_cache/`, `README.md`)*
**You own what the judges actually see. This is a full-time job — do not get pulled into backend work.**

**H+0 → H+1 — Scaffold.** `npm create vite@latest web -- --template react-ts`. Stack: **MapLibre GL + deck.gl**
(`GeoJsonLayer`) — lighter and more controllable than embedding kepler.gl. Charts: Recharts.

**H+1 → H+6 — Build the whole UI against Jeevith's fixtures.** You should have the complete layout working with
fake data before any real data exists. Views:
1. **Map** — hazard choropleth, flood layer, critical assets, selected-parcel overlay.
2. **Signal panel** — return-level curve with CI band + the headline callout ("100-yr → N-yr").
3. **Backtest toggle** — modeled vs SAR-observed extent, with the CSI number.
4. **Plan view** — budget slider → re-fetch `/optimize` → map repaints; triple-return readout (people / CO₂ /
   income); efficient-frontier chart.
5. **Ask panel** — chat box hitting `/ask`.
6. **Report** — rendered concept note with a download button.

**H+6 → H+14 — Wire to the real API** as each artifact lands. Handle missing data gracefully (skeleton states,
never a white screen).

**H+14 → H+18 — Make it beautiful.** One accent color, generous whitespace, real typography, dark map basemap so
the data pops. A clean UI reads as "finished product" to judges more than any feature. Number formatting matters:
`28,400 people`, not `28400.0`.

**H+18 → H+20 — FREEZE + cache.** Copy final artifacts into `demo_cache/` and **commit them**. Add a
`VITE_USE_CACHE=true` mode that reads `demo_cache/` instead of the API, so the demo runs with **zero backend**.
Test it with wifi off. This is your insurance policy.

**H+20 → H+24 — Rehearse.** Run the §11 script end-to-end **5 times**, out loud, on the demo laptop. Time it.
Fix the two things that feel awkward. You are the one presenting.

**Done =** the demo runs offline from cache, looks polished, and lands in under 3.5 minutes.

---

## §10. Integration checkpoints (whole team, 10 min, non-negotiable)

| Time | Gate | If it's not met |
|---|---|---|
| **H+1** | Contracts + fixtures committed; repo skeleton pushed | Everything stops until it exists. Nothing matters more. |
| **H+6** | Real `signal.json` (headline number exists); fixture-backed API live; UI shell renders | Jeevith slips → Subodh uses placeholder return levels and continues. |
| **H+10** | `backtest.json` real; agent answers from tools | Backtest failing → fall back to a qualitative overlay, keep going. |
| **H+15** | `candidates.json` + `hazard.geojson` real; optimizer running end-to-end | Cut knapsack, ship greedy. |
| **H+18** | Full path works with real data; concept note renders | Start cutting from §12 immediately. |
| **H+20** | **Artifacts evacuated from AWS; `demo_cache/` committed; offline demo verified** | Hard stop. Nothing new after this. |

---

## §11. The demo script (~3.5 min — rehearse 5×)

1. **0:00 Hook.** "The Himalaya floods hardest during the monsoon — exactly when clouds blind normal satellites.
   So we use radar." Show the SAR flood layer.
2. **0:25 Proof.** "Does our model work? We replayed the September 2024 flood." Modeled vs satellite-observed
   overlay → **CSI number**. "Validated against a real disaster."
3. **0:45 The signal (Voloridge core — never cut).** "Floods start with rain, so we processed **N station-years**
   of NOAA's messy hourly records on Voloridge's cluster and extracted the tail with extreme-value theory — the
   same math a quant desk uses. **The 1-in-100-year storm now recurs every N years.**"
4. **1:15 The stakes.** Zoom to the valley below Tsho Rolpa: "If this lake bursts — 9,400 people, two schools, a
   hydropower intake. Plus monsoon floods and landslide slopes."
5. **1:35 The pivot.** "Every other tool would now send an alert. We asked: what do we *build* so fewer people are
   ever in danger — with nature, not concrete?"
6. **1:50 The plan.** "$2M. Protect the most people, store the most carbon, generate income." Map lights up.
   **"Exposure −34%. 12,180 tonnes CO₂. $186k/year to 412 households — we pay them to grow their own defense."**
   Drag the budget slider; everything re-optimizes. Flip to tail-risk mode.
7. **2:40 It defends itself.** *"Why parcel 7 first?"* → the agent answers from the numbers.
8. **2:55 Data → dollars.** Click **Generate concept note** → a real funding application. "A consultant charges
   six figures and takes months. One click, from free public data."
9. **3:15 Close.** "We keep verifying it from space, so the carbon and the protection stay auditable. **We're
   making resilience an asset class** — and it runs on any watershed on Earth."

**If you're over time, cut in this order:** tail-risk beat → the agent Q&A → the stakes zoom. **Never cut** 2, 3,
6, or 8.

---

## §12. Cut list & risk register

**Cut in this order when behind:**
1. Adaptation Action Index (country leaderboard) — 8-second garnish
2. 3D GLOF flythrough
3. Twilio SMS
4. CVaR / rebalancing glidepath (ship the expected-value plan only)
5. Knapsack optimizer → greedy only
6. Auto-generated concept note → show a hand-filled template
7. IMERG fusion → ISD only (the headline signal still stands)

**Never cut:** the EVT signal, the SAR backtest, the optimizer, the demo polish.

| Risk | Mitigation |
|---|---|
| ISD parse too slow / messy | Subset to Nepal-only stations first, get `signal.json` shipped, *then* scale out to all HMA for the big number. |
| GEE quota/auth trouble | Pre-download DEM + one SAR pair to NVMe early as a fallback. |
| No usable SAR scene for Sept 2024 | Pick a different documented flood with good coverage — decide by H+5, not H+15. |
| Optimizer too slow | Greedy on ~500 candidate parcels is milliseconds. Cap the candidate set. |
| AWS dies early | Everything is in `artifacts/` + `demo_cache/`. Evacuate at H+16. |
| Agent hallucinates a number | Tool-use-only system prompt; Garima displays numbers from artifacts, not from prose. |
| Demo laptop wifi fails | `VITE_USE_CACHE=true` — verified offline at H+20. |

---

## §13. Definition of Done

**Voloridge:** ✅ ISD parsed at scale (report station-years) ✅ EVT return levels with CIs ✅ ≥2 discovered signals
✅ 4-dataset fusion ✅ out-of-sample backtest with CSI ✅ reproducible pipeline ✅ booth visited twice.

**Sustainability:** ✅ real watershed, real people ✅ nature-based, not concrete ✅ triple return incl. livelihoods
✅ equity (low-income prioritization + responsibility split) ✅ scalable to any watershed ✅ honest limits stated.

**Demo:** ✅ runs offline from cache ✅ under 3.5 min ✅ rehearsed 5× ✅ every number traceable to an artifact.

---

## §14. Appendix

**Bootstrap (Nalani runs at H+0):**
```bash
mkdir -p rootledger/{contracts/fixtures,signal,optimize,hazard,api,agent,web,artifacts,demo_cache,scripts}
cd rootledger && git init && git add . && git commit -m "skeleton"
```

**On AWS (Jeevith):**
```bash
ssh student@<instance-ip>
tmux new -s signal
python3 -m venv .venv && source .venv/bin/activate
pip install pandas pyarrow numpy scipy pyextremes boto3 tqdm
aws s3 sync --no-sign-request s3://voloridge-hack-mit-2026/src ./src   # their fetch tools
```

**Key libraries:** `whitebox` (HAND), `rasterio`, `geopandas`, `pysheds`, `earthengine-api`+`geemap`,
`scipy`/`pyextremes` (EVT), `PuLP` (knapsack), `fastapi`+`uvicorn`, `anthropic`, `deck.gl`+`maplibre-gl`,
`recharts`.

**Honesty labels (use these everywhere in the UI):** `observed` · `model output` · `assumption` ·
`simulation`. Say "screening-grade", "counterfactual simulation", never "prediction".

**Citations to keep handy:** UNEP Adaptation Gap 2024 ($187–359B/yr) · ICIMOD (47 dangerous glacial lakes, 21 in
Nepal) · vetiver ↓ erosion >90% · NbS ↓ flood depth ~15–40% · Nepal bamboo = real rural economy.
