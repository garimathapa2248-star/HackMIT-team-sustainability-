# RootLedger demo — source of truth

This is the only current spoken demo script. It supersedes the older demo wording in `PLAN.md §11`.
Do not quote cached concept-note prose or `households_benefiting`.

## 90-second booth path (v1)

Open `http://127.0.0.1:5173/?v=1`. Click **Play 90-second demo** (or press `D`). Read the cue bar; `→` advances.

Spoken, compressed:

1. **Proof 2024** — “Radar flood, 27 Sep 2024. CSI 0.053. We lose to JRC 0.067 and we say so.”
2. **Proof 2017** — “Frozen model on a flood it never saw. Transfer CSI 0.088. Not the same valley.”
3. **Noise** — “498 NOAA stations, 12,066 station-years, parsed on Voloridge compute. Gaps counted, not smoothed.”
4. **Tail** — “Old 100-year rain now 7.75 years. Nepal ranks first in this decision region. HMA pool: no shift.”
5. **Plan** — “$2M, 62 sites, 26,306 people-risk / yr. Screening BCR, NPV, a three-phase pathway. Equity in the objective.”
6. **Ask** — a chip fires automatically. “Answers only from artifacts.”
7. **Export** — “The screening plan a district takes to a funder.”

Keyboard: `1`–`6` chapters, `Esc` landing. Full 3:20 script below if you have time.

## Value lock

These values are locked to the current root artifacts:

- `signal.json` generated `2026-09-19T19:43:26Z`: 498 stations, 12,066 station-years, fitted Nepal-adjacent recurrence **7.75 years**. HMA-pooled late GEV: no recurrence shift.
- `backtest.json` generated `2026-09-19T22:54:53Z`: **in-sample** CSI **0.053**, POD 0.212, FAR 0.935 on UNOSAT 27 Sep 2024 (observed 121.00 km² vs modeled 393.62 km²). JRC seasonal-water CSI **0.067**; area-matched elevation CSI **0.001**. Skill vs scale **falls** (0.053 → 0.000). Permanent water: JRC GSW ≥50% excluded from both masks.
- `backtest.json` validation (2017-08-13 ICIMOD RDS 33616): **transfer**, not same-valley. Frozen 2024 model, CSI **0.088**, POD 0.335, FAR 0.894, vs JRC CSI **0.141**. Product bbox 82.03–84.98°E; Koshi calibration is 86.06–87.47°E.
- `backtest.json` spatial_holdout (2024 west-fit / east-test): CSI **0.056**. Same storm, spatial split only.
- `replication.json`: ERA5-Land at **39 of 73** Nepal-adjacent ISD coordinates (Open-Meteo rate-limited the rest). Two-era GEV **16.72-year** recurrence vs ISD 7.75. Verdict: **partially replicates**. Mean-annmax Pearson r=0.128, bias +43.96 mm (n=30 after dropping empty ISD series). IMERG `available: false`.
- `plan.json`: $2,000,000 budget, **$1,984,000** modeled spend, **62** floodplain-restoration measures, **26,306.075** annual expected people-risk avoided, **8,680** tCO₂/10yr, **$74,400**/yr modeled livelihood-income. Knapsack gap **0%** (greedy matches the relaxed independent-value bound). Equity weight up to **1.5×** on selected parcels.
- Counterfactual: **77,057.1** → **54,173.5** people-exposure units (**29.7%** simulated reduction). Not unique lives.

If any source artifact changes, update this lock and every matching spoken value before presenting. Run
`python3 scripts/verify_artifacts.py` to check cache hashes; it is read-only.

**Swear-jar:** never say “same valley” for 2017, never say the model beats JRC, never say skill-vs-scale rises, never say 16,058 people were saved.

## Exact 3:20 script

Stage directions are in brackets and are not spoken. Rehearse to the timestamp boundaries; finish at exactly 3:20.

### 0:00–0:20 — Hook

[Optional 0:00–0:15 landing: “Plant 62 sites. Next flood, smaller.” Three numbers + Rain / Radar / Plant. CTA **See the plan** opens Plan. Judged path: `?console=1` skips landing onto Proof.]

“On 27 September 2024 the Koshi flooded. Monsoon clouds blind optical satellites, so this is radar — UNOSAT’s
Sentinel-1 flood extent. Everyone else builds the warning for next time. We built the plan for what to *plant*
so next time is smaller.”

### 0:20–0:50 — Proof, twice

[Proof chapter (default). Toggle modeled/observed; flip event toggle to 2017 transfer.]

“Our screening flood model was calibrated on this one event — in-sample CSI 0.053. It beats a naïve elevation
baseline (CSI 0.001) and **does not beat** JRC seasonal-water climatology (CSI 0.067). We report the miss.
Then we froze every parameter and replayed a flood it had never seen: 13 August 2017, ICIMOD Sentinel-1 over
the western Terai — a spatial-plus-temporal *transfer*, not the same valley. Out-of-sample CSI 0.088; JRC is
0.141 there too. Permanent river water is excluded from scoring on both sides. Skill versus scale on 2024
falls, it does not rise — the curve is on the Proof tab.”

### 0:50–1:20 — The signal

[Tail chapter, return-level curve, ERA5 card. Gold dots are the 73 real ISD coordinates.]

“Upstream: 498 NOAA stations, 12,066 station-years, parsed on Voloridge’s 48-core box — sentinels, broken
accumulation windows, duplicate days, all cleaned and counted. Extreme-value theory, the same tail math as
VaR. Nepal-adjacent result: the old 1-in-100-year daily rainfall now fits a **7.75-year** recurrence. Inside this
decision region Nepal ranks first on rainfall-tail intensification; the HMA pool as a whole did not shift. Two
controls: the full-HMA pool shows **no shift** — we published our own miss — and an independent re-fit on
ERA5-Land at the same station coordinates **partially replicates** (16.72-year vs 7.75-year). Magnitudes
disagree; we show the scatter instead of averaging it away. IMERG was not fused.”

### 1:20–1:35 — Evidence labels

[Point at the top-bar evidence labels.]

“Four categories, never mixed: observed data, model output, literature assumptions, counterfactual
simulation.”

### 1:35–2:05 — The pivot + the plan

[Plan chapter, top 5 of 62 sites. Recalculate stays disabled on the frozen `VITE_USE_CACHE=true` build.]

“So what do we do with a fatter tail? Not an alert. A budget. At two million dollars the optimizer selects
62 preventive measures — here, floodplain restoration on the Terai cells the evidence supports — 26,306
annual expected people-risk avoided, 8,680 tonnes of CO₂ over ten years, 74,400 dollars per year of modeled
livelihood income. Screening benefit-cost is the CLIMADA-style appraisal on the Plan tab — literature
monetisation, not a field BCR. Same budget, four books — lives, carbon, income, and the blend. NPV at 3% and a
three-phase adaptation pathway sit on the same card. FloodAdapt labels the before/after as no_measures versus
nbs_blended_2M, and the 2×2 includes the intensified tail.
Cells flagged low-income carry up to 1.5× weight — equity is in the objective function,
not the slide deck.”

### 2:05–2:25 — Tail-risk mode

[Open the Budget / CVaR fold if judges ask. Offline freeze: do not drag live controls.]

“Same discipline as a trading book: CVaR re-ranks for the worst 10% of climate draws. Greedy matches the
relaxed knapsack upper bound — gap 0 percent. The bound ignores per-cell overlap capping, so the true gap
is smaller.”

### 2:25–2:45 — Grounded agent

[Ask: “Why was preventive measure p_c_00132_floodplain_restore selected before p_c_00097_floodplain_restore?”]

“The agent answers only from artifact numbers. If a tool didn’t return it, it says it doesn’t have it.”

### 2:45–3:00 — It generalizes

[City dropdown → Bengaluru, then Kathmandu if asked. CSI-null banner must stay visible; 2017/ERA5/Koshi overlays stay hidden.]

“Same engine, any watershed: Bengaluru’s urban-lake pack from the same public stack, CSI null — we will not
invent a score — and Kathmandu is pre-built the same way.”

### 3:00–3:20 — Close

[Back to Koshi map. Export chapter — plan / scorecard / citizen brief.]

“One click exports the screening plan a district can take to a funder. Noisy public rain → a fitted tail →
a validated-against-radar flood model → a budget spent on prevention. RootLedger makes resilience a
portfolio — and every claim is auditable.”

**Cut order if over time:** knapsack line → generalization beat → agent beat. **Never cut:** proof-twice
(with the JRC miss), the 7.75 + negative control + ERA5 verdict, the $2M plan.

## Q&A — exact answers

**“Is this a validated flood model?”**
“No. It is a screening-grade Copernicus GLO-30 local-min HAND proxy, with stage calibrated on the 27 September
2024 event. CSI 0.053, POD 0.212, and FAR 0.935 are in-sample calibration-event metrics. The 2017 row is a
frozen transfer onto a different Terai reach, CSI 0.088.”

**“Why is the CSI so low?”**
“At 200 m against speckled SAR paddy flooding, yes — that is the strictest test. Skill vs scale does not
rescue it: CSI stays 0.052 at ~1 km and falls to 0 at 4.5 km. We still beat elevation (0.001) and we still
lose to JRC seasonal water (0.067). We would rather show a real 0.053 than a fake 0.8.”

**“Is the 2017 test truly out-of-sample?”**
“Parameters were frozen on 2024 before the 2017 raster was scored — that part is true out-of-sample. The
product does not overlap Koshi (82–85°E vs 86–87°E), so we call it a transfer, not same-valley. A 2024
west/east spatial holdout on Koshi itself is CSI 0.056.”

**“Did you save 26,306 people?”**
“No. `people_protected` is the model’s sum of annual expected people-risk avoided. It is not unique people,
an observed outcome, or lives saved.”

**“Is the 29.7% reduction observed?”**
“No. It is a counterfactual simulation: observed-flood fraction times population, reduced by modeled
nature-based-solution capture. It is not a measured causal effect.”

**“Reanalysis assimilates gauges — is ERA5 really independent?”**
“Quasi-independent; the card says exactly that. Different system, different failure modes. It partially
replicates the direction (16.72-year vs 7.75-year) on 39 of 73 coordinates; Pearson r on mean annual maxima
is 0.128. We show the disagreement. IMERG was not fused.”

**“How close is greedy to optimal?”**
“The independent-value knapsack bound matches greedy to 0%. That bound ignores per-cell overlap capping, so
the true gap is smaller.”

**“How many households benefit?”**
“We do not have defensible participant or household data, so we make no household-reach claim. The income
value is modeled potential from per-hectare literature assumptions.”

**“Why is p_c_00132_floodplain_restore ahead of p_c_00097_floodplain_restore?”**
“Both cost 32,000 dollars. The first is at 26.37 north, 87.14 east, suitability 0.313, 2,384.558 annual
people-risk units avoided, equity weight 1.5. The second is at 26.53 north, 87.06 east, suitability 0.283,
2,094.981 units, also weight 1.5. The order is model output, not observed causal proof.”

**“Can this fund construction now?”**
“No. It is a screening shortlist. Parcel boundaries, tenure, suitability, safeguards, costs, engineering,
governance roles, and monitoring baselines all need field verification.”
