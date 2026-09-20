# RootLedger — Refine to Win Voloridge (18 hours)

**Track:** HackMIT 2026 · Voloridge *Signal in the Noise* (primary) · Sustainability (secondary)  
**Case:** Koshi / Madhesh, Nepal · NOAA ISD + UNOSAT S-1 27 Sep 2024  
**Constraint:** ~18 hours left · Voloridge AWS (`i7i.12xlarge`, 48 vCPU / 384 GiB) until **2026-09-20T17:12:44Z** · demo must run **offline from `demo_cache/`**  
**Decision:** **Do not pivot the product.** Stay on the original POV: **preventive measures** — nature-based defenses on the ground (vetiver, bamboo, afforestation, floodplain/wetland, riverbank bioengineering) chosen so fewer people are in the path of the next monsoon / landslide / GLOF. The GCF-shaped note is a *hand-off document*, not the product. Do not rebrand this as a climate-finance origination startup.

---

## 0. One-line product (lock this; say it the same way every time)

**RootLedger reads decades of noisy NOAA station rain, finds who is in danger in a Himalayan catchment, and tells you what to plant and where — a budgeted portfolio of nature-based defenses, not an alert.**

Not an alert app. Not a flood map. Not a chatbot. Not a grant-writing tool.  
**Signal → who is exposed → what to build/plant → proof it matches a real flood.**

The original loop still stands: `Observe → Measure → Prove → Optimize → Fund → Verify`. **Optimize (the plan on the map) is the demo.** Fund/verify is packaging.

Pitch sentence for a Voloridge judge:

> Everyone else visualized a dataset. We pulled the *tail* out of NOAA ISD with the same extreme-value math you use for VaR, discovered the old 1-in-100-year daily depth now recurs every **7.75 years** on the Nepal-adjacent subset (498 stations / 12,066 station-years on your cluster), and spent that uncertainty on a **preventive NbS portfolio** — where to plant, for how much — backtested against the real 27 Sep 2024 Koshi flood.

---

## 1. What Voloridge actually scores

From the official brief (PDF, 3 pages). They are a **quant shop**. They will not be impressed by “AI for climate” unless the *data work* is real.

| Criterion | What they wrote | What wins in this room | How we hit it |
|---|---|---|---|
| **Originality** | Unexpected / clever | Almost every other team will chart taxis, GDELT tone, or OpenAQ. We convert **station noise → a decision under a budget**. | Keep the pipeline. Do not add a random LLM wrapper as the product. |
| **Technical excellence** | Robust, scalable, impressive | 600 GB ISD, sentinels, quality flags, EVT, bootstrap CIs, Monte-Carlo + CVaR, satellite CSI with **honest** scores. | Scale number + cleaning log + POT cross-check + CVaR toggle. |
| **Insight** | Meaningful information, useful analysis | A *fitted* non-stationary tail, not a vibe. Plus a **negative result** (HMA-pooled GEV did *not* shift) — quants love that. | Put the negative result on the Signal tab. |
| **Execution** | Polished, usable, well demonstrated | 3.5 min demo that never 500s, offline cache, every number traceable. | Freeze `demo_cache/` 4h before judging. Rehearse 5×. |

**Datasets they listed (use as ammunition, not a shopping list):**

1. NOAA ISD — **anchor, already used at scale. This is the prize.**  
2. OpenAlex — skip (not our story).  
3. GDELT — **optional 2-hour add-on**: news shock vs physical tail (see §7).  
4. NYC TLC — skip.  
5. OpenAQ — skip unless a judge asks “why not air?”  
6. PUDL — skip.  
7. Materials Project — skip.

They explicitly allow **other datasets** if you talk to the booth. We already fused NASA COOLR, ICIMOD lakes, Copernicus GLO-30, UNOSAT S-1, WorldPop. **Visit the booth twice** and say: *ISD parse on your box → GEV → NbS CVaR plan → UNOSAT CSI.* That visit is part of winning.

---

## 2. The problem that actually exists (market void)

### 2.1 What is *not* the void

Do not tell judges “nobody maps flood risk.” That is false and they will know it.

| Existing product | What it does | Why it is not us |
|---|---|---|
| ThinkHazard / INFORM | Country / admin hazard *labels* | No “plant here” plan, no EVT, no budget. |
| GLOFAS / flood early warning | Forecasts / alerts | Symptomatic. We change *what gets planted before the next monsoon*. |
| NASA LHASA | Landslide *nowcast* | Classifier, not a defense portfolio. |
| Fathom / JBA / Swiss Re CAT | Commercial flood risk | Prices damage. Does not pick vetiver vs bamboo on a slope. |
| **GCA × Oxford Global NbS Tool (2025)** | NbS screening for **road/rail infrastructure** corridors | Closest cousin. Protects grey assets. We site **community slope/floodplain defenses** from **station tails**. |
| Consultant studies | Full proposals / concept notes | Slow and expensive. Useful later; **not** what the demo is for. |

### 2.2 The real void (cite this) — stay on prevention

The gap is **decision, not warning.** Koshi/Madhesh already flooded on 27 Sep 2024 (UNOSAT). Early-warning and hazard maps exist. What data-scarce Himalayan catchments still lack is a **defensible, budgeted list of nature-based preventive measures** tied to a *fitted rainfall tail*, not a vibe.

1. **Alerts do not move dirt.** After a monsoon, NGOs and district offices still ask: *which slopes, which banks, which wetlands, for $2M?* Spreadsheets and consultant GIS, or nothing.  
2. **The rain signal is buried in NOAA ISD** — sentinels, gappy gauges, inconsistent AA1 accumulation periods. That is Voloridge’s dataset. Global flood tools skip it because it is ugly; EVT is how you pull the *preventive* design storm out of it.  
3. **Nature is the prevention we can actually field.** Vetiver and bamboo are real Nepali rural practice (ICIMOD bioengineering, INBAR). They cut erosion, hold slopes, sequester carbon, and pay households. Concrete walls are not the default here.  
4. **Triple return is how you choose among preventive parcels:** people-risk avoided + CO₂ + household income, per dollar, with no double-counting. That is the product.  
5. **GCF/Adaptation Fund note (optional close):** if a district wants to take the plan to a funder, we fill a screening template from the same numbers. Do not lead with “we solve climate finance.” Lead with **“here is what to plant so the next 7.75-year storm hits fewer people.”**

**Buyer (be specific):**

| Buyer | Job to be done | What they pay for today | What we sell in the demo |
|---|---|---|---|
| **Primary:** District / watershed officer, ICIMOD / UNDP field team, community forest user group planner | “Where do we plant, and in what order, with this budget?” | GIS consultant + Excel | Map + parcel list + slider |
| **Secondary:** National adaptation / NDA staff | Screening a nature-based package | Months of studies | Same plan, exportable note |
| **Tertiary (Voloridge flavor):** Anyone who cares that the *design storm* is a fitted tail | Is the 100-year day still 100 years? | Internal research | GEV + CIs + era split |

### 2.3 Why this is not “another climate dashboard”

The unit of output is a **preventive portfolio under a budget**:

- **What to do:** parcels of vetiver / bamboo / afforestation / floodplain / wetland / riverbank bio.  
- **Why this parcel first:** marginal triple-return per dollar, cells cannot be claimed twice.  
- **Under whose weather:** Monte-Carlo from the GEV 100-year CI; CVaR = worst 10% of climate draws.  
- **Proof the hazard is not fiction:** UNOSAT 27 Sep 2024 overlay, CSI reported honestly.  
- **Hand-off (not the pitch):** a screening concept note generated from the plan.

Voloridge angle: same tail-risk discipline as a book, applied to **where prevention goes**.

---

## 3. Honest progress audit (as of 19 Sep 2026, ~18h remaining)

Score: **~65% of a winning project, 90% of the science story, 50% of the preventive-plan demo.** (Do not spend the remaining hours turning this into a finance product.)

### 3.1 Built and real (do not rebuild)

| Artifact | Status | What is actually true |
|---|---|---|
| `artifacts/signal.json` | **Real** | 498 stations, **12,066 station-years**, GEV return levels + bootstrap 95% CIs. Headline **7.75 yr** on **Nepal-adjacent** subset. Trend +5.229 mm/decade, p=0.00035. Provenance already admits **HMA-pooled late GEV did not shift**. |
| Landslide | **Real, carefully labeled** | Rainfall classifier, AUC **0.934** OOS (train 2008–2015, test 2016–2017), n=138. **Not** a Caine I–D curve (`b` is positive — do not present it as physics). |
| Lakes | **Real / inventory-derived** | Imja +113.3%, Thulagi +30.3%, Tsho Rolpa +26.6% (1990–2024). |
| `candidates.json` + `plan.json` | **Real optimizer, screening parcels** | 137 parcels selected, spend **$1,820,330** of $2M, 48.5 people-risk/yr, 21,962 tCO₂ / 10 yr, $243k/yr income, 814 households. Greedy + CVaR implemented. |
| `backtest.json` | **Real satellite comparison** | UNOSAT S-1 27 Sep 2024. Observed 134.18 km² vs modeled 213.99 km². **CSI 0.087, POD 0.207, FAR 0.870.** Stage 1.39 m, calibrated on this event. Local-min HAND proxy, **not Whitebox**. |
| API | **Working** | FastAPI, CORS, `/optimize`, `/ask`, `/conceptnote`, never-500 fallbacks. |
| Agent | **Grounded** | Tool-use + regex fallback; “do not invent CSI.” |
| Web | **Demo-shaped** | MapLibre, budget slider, return-level chart, concept-note download, honesty banner. |
| Compute story | **Done** | Parallel ISD parse (`signals/scale.py`), checkpoints, booth box. |

### 3.2 Gaps that will lose if left open

| Gap | Why a judge kills you | Severity |
|---|---|---|
| **CSI 0.087 / FAR 0.87** | Looks like the flood model is wrong. If you hide it, you look dishonest; if you show it with no improvement story, you look unfinished. | **P0** |
| **Counterfactual still `null` in cached `backtest.json`** | `optimize/counterfactual.py` exists but the freeze may not have been re-run. Demo beat 6 (“exposure −X%”) is empty. | **P0** |
| **~8 km cells (`RES = 0.08°`)** | Map looks like a toy lattice. “Screening-grade” is honest; 8 km is *too* honest for a wow map. | **P0** |
| **HAND is local-min filter, not D8/Whitebox** | Hydrologist / skeptical quant: “that is not HAND.” README already promises we will not pretend. | **P0** |
| **Attribution.json is a synthetic fixture** | 71/19/10 split is made up. Cut from pitch or replace with a rules table tied to OSM assets. | **P1** |
| **IMERG unused** | Fusion story is incomplete; module only records “no Earthdata.” | **P1** |
| **No ISD cleaning dashboard** | Voloridge brief *celebrates* messy data. We cleaned it and never *show* sentinels, AA1 periods, dupes. | **P0 for Voloridge** |
| **HMA vs Nepal-adjacent split is in JSON, not UI** | If you only shout 7.75 without the negative pooled result, a careful reader of `headline_note` will think you cherrypicked. **Lean into it.** | **P0** |
| **UI copy is still “twin hasn’t landed”** | Map legend contradicts the fact that UNOSAT + DEM *did* land. Looks internally inconsistent. | **P0** |
| **CVaR not on the slider** | Code exists; demo only calls `expected`. You built the Voloridge feature and hid it. | **P0** |
| **No offline-verified freeze ritual** | AWS dies **17:12 UTC 20 Sep**. If artifacts are only on the box, the project dies. | **P0** |
| **Concept note looks like a markdown dump** | Optional close: a 2-page *prevention plan* that a district could hand to a funder. Not the headline. | **P1** |
| **people_protected = 48.5** | Easy to overclaim as “48 lives.” Label is correct in code; presenters will still slip. Rehearse the phrase **annual expected people-risk avoided**. | **P0 (pitch)** |

### 3.3 What we will *not* do in 18 hours

- New product idea, new country as the headline case, or “platform for all hazards.”  
- Deep learning on GPU (`g7.24xlarge`) — no time, no need.  
- Hydrologist-grade 2D hydraulic model.  
- Claiming CSI we did not compute.  
- OpenAlex / TLC / Materials / PUDL tourism.  
- Country “shame index.”  
- Twilio SMS.  
- Perfect Whitebox-on-30 m for the whole Koshi if it blows the clock — see fallback in §6.

---

## 4. Strategy: how this becomes a *winning* project (not a bigger one)

Winning = **one sharp loop: noisy rain → fitted tail → preventive parcels on a map.** One honest CSI. One buyer who plants. One demo that cannot fail.

### 4.1 Keep the old POV (do not “upgrade” it away)

**The frame we already had in `PLAN.md` is the right one.** Do not replace it with climate-finance origination.

> Every other tool would now send an alert. We asked: what do we *build* so fewer people are ever in danger — with nature, not concrete?

Voloridge cares that the *design storm* is a fitted tail. Sustainability cares that the *action* is preventive NbS with livelihoods. Both are already in the stack.

Three proofs you must land:

1. **Noise was real** — ISD sentinels, accumulation periods, missing years (Technical excellence).  
2. **Signal is a fitted tail, with a negative control** — 7.75 yr Nepal-adjacent; HMA-pooled **no shift** (Insight + honesty).  
3. **Prevention is a portfolio** — $2M of parcels on the map, greedy vs CVaR, no double-count, satellite CSI (Originality + Execution).

### 4.2 The “extremely good use case” in one paragraph (memorize)

After the Koshi flood, the question is not “did we warn people?” It is **where do we plant so the next one is smaller on the ground.** Districts and ICIMOD-style programs already know vetiver, bamboo, and riverbank bioengineering work; they do not have a way to rank parcels against a *changing* rainfall tail pulled from NOAA’s mess. RootLedger parses that archive at cluster scale, fits EVT, maps exposure, and emits a **preventive plan**: these 137 parcels, this spend, this triple return, checked against UNOSAT’s 27 Sep 2024 water. We are not a siren and we are not a CAT-model vendor. We are the missing step between “the 100-year day is now 7.75 years” and “plant here first.”

### 4.3 Competitive wedge (say this if asked “doesn’t X exist?”)

ThinkHazard / GLOFAS: labels and alerts. GCA NbS tool: nature as armor for roads and rails. Fathom: commercial damage grids. **We site community preventive measures from station-level extremes, under a budget.** Different job.

---

## 5. 18-hour operating plan

Clock: treat **now = T+0**, judging ≈ **T+18**, AWS kill ≈ check the instance clock and set **two alarms: T+10 evacuate dry-run, T+14 hard evacuate**.

### Team (from `PLAN.md`) — keep ownership, but **integrate**. The first 18h were correctly siloed. The next 18h are lost if you stay siloed.

| Person | Next 18h job | Definition of done |
|---|---|---|
| **Jeevith** | Voloridge core: cleaning report, POT vs GEV, negative-control UI numbers, CVaR wired, GDELT optional | Judge can audit the tail in 30s |
| **Subodh** | Hazard that doesn’t embarrass CSI; fill counterfactual; finer cells *or* floodplain-masked CSI | CSI story: “low because X, improved to Y on floodplain mask / better HAND” |
| **Nalani** | Attribution from OSM rules or **delete from pitch**; 2-page **prevention plan** (optional funder export); agent canned Qs | Closing beat is the parcel list, note is extra |
| **Garima** | Demo narrative UI; CVaR toggle; honesty that isn’t sloppy; offline cache; 5 rehearsals | 3:20 script, wifi-off |

### Phase A — T+0 to T+3 · *Make the signal unkillable* (Jeevith + Garima)

1. **Cleaning card (Voloridge catnip).** From the ISD parse, emit `artifacts/noise.json`:
   - rows dropped for 9999 / 99999 sentinels  
   - AA1–AA4 period renormalizations  
   - duplicate station-days resolved  
   - stations skipped vs kept  
   - missing-year histogram  
   Show this as 4 numbers on the Signal tab: *“this is the noise; the GEV is the signal.”*

2. **POT/GPD cross-check** on the same annual-maxima stations (peaks over 95th percentile). If GEV 100-yr and POT 100-yr agree within CI, put both on the chart. If they disagree, **say so** — that is insight.

3. **Negative control, on purpose.** UI must show two lines:
   - Nepal-adjacent: 100-yr depth → **7.75 yr**  
   - HMA-pooled: **no identified recurrence shift**  
   One sentence: *“We did not force a headline on the full 498-station pool.”*

4. **Update EVT pitch** (`optimize/EVT_PITCH.md`) — it still says 72 stations / 1,511 years and a 2-parcel fixture. That file would lose you the booth conversation.

### Phase B — T+1 to T+8 · *Make the map defensible* (Subodh, parallel)

Priority order (stop when the clock hits T+8):

1. **Re-run `python3 -m optimize.pipeline --budget 2000000`** so `backtest.counterfactual` is **not null**. This is 5 minutes and currently breaks the demo math.  
2. **Floodplain-masked CSI** (already have `eval_mask: dilated UNOSAT water`). Report **two CSIs**: raw grid vs floodplain-only. If floodplain CSI is higher, that is the number you *explain*, while still showing raw CSI.  
3. **Real HAND:** Whitebox `elevation_above_stream` on GLO-30 **clipped to the UNOSAT bbox**, not 8 km local-min. If Whitebox install fights you for >45 min, ship **D8 HAND already sketched in `hazard/hand.py`** at ~90–120 m, then aggregate to display cells.  
4. **Target:** CSI that you can defend as “screening, calibrated, low because SAR overbank vs DEM HAND mismatch,” **not** “we think it’s 0.66.” Do not invent 0.66 from the old fixture.  
5. **If CSI stays ~0.1:** the win condition is **radical honesty + overlay that looks real** (observed vs modeled polygons already in `flood_*.geojson`). Add a sentence in the UI: *“FAR is high because HAND over-inundates flats; we still will not round CSI.”* Voloridge will respect that more than a fake 0.8.

**Compute:** DEM reproject + HAND on the 48-core box. Do **not** run this on a laptop.

### Phase C — T+3 to T+10 · *Product, not pipeline* (Garima + Nalani)

Must-have UI changes (small, high leverage):

1. **Five-beat chrome**, not five equal tabs. Default landing = **Signal**. Progress strip: `Noise → Tail → Hazard → Plant → Proof`. (Not “Note.”)  
2. **CVaR toggle** next to the budget slider (`optimize(budget, "cvar")`). Caption: *“Same math as a trading book’s tail: spend the budget on parcels that still work in the worst 10% of climate draws.”*  
3. **Fix the map legend** (currently claims the twin hasn’t landed).  
4. **Backtest overlay toggle** on the map (observed vs modeled), not only a paragraph.  
5. **Clicked parcel → agent prefill:** “Why plant {id} before the next-best parcel?”  
6. **Prevention plan export:** two pages max: problem, evidence, **intervention list**, budget, expected impact, M&E. Watermark **SCREENING — model output**. Funder-shaped headings are fine; the title should read like a **defense plan**, not a grant application.  
7. **Kill or relabel attribution.** If still synthetic, remove from demo. Do not show 71% government as a finding.

### Phase D — T+8 to T+12 · *Optional insight that is uniquely Voloridge* (Jeevith, only if A+B are green)

**GDELT × ISD (2–3 hours, not a rewrite).**

Question: *Do global news tone/volume about Himalayan floods lag or lead the physical rainfall tail?*

- Pull GDELT 2.0 events / GKG for Nepal + “flood” / “landslide” / “glacial” 2000–2024 (Voloridge bucket tools).  
- Join to basin-season ISD annual maxima.  
- Chart: physical return-level years vs media “goldstein / tone.”  
- **Insight we actually want:** media is a lagging, biased sensor; **stations see the tail first**. That is a *signal-in-the-noise* punchline using **two of their listed datasets**.

If GDELT fights you, **cut immediately**. Do not jeopardize freeze.

**IMERG:** only if GEE is already authenticated. Fill high-altitude gaps; one scatter ISD vs IMERG. Otherwise keep the honest `imerg.py` status.

### Phase E — T+10 to T+14 · *Evacuate and freeze* (whole team)

1. `rsync` artifacts off AWS.  
2. `bash scripts/sync_artifacts.sh`  
3. Commit **only** `demo_cache/` + code (no 600 GB, no `.env`).  
4. `VITE_USE_CACHE=true npm run build` and **open `web/dist` with wifi off**.  
5. Screenshot every tab.  
6. Confirm AWS job logs (station-years) are copied into README.

**Hard rule:** no new science after T+14. Only copy, timing, and crash fixes.

### Phase F — T+14 to T+18 · *Win the room*

1. Rehearse §8 script **five times out loud** on the demo laptop.  
2. One person is **Garima (presents)**, one is **Jeevith (EVT answers)**, one is **Subodh (CSI answers)**, one is **Nalani (who plants, cost, livelihoods)**.  
3. Booth visit #2: 90-second version for Voloridge staff. Ask them what they want to see. If they say “show the parse,” have `noise.json` ready.  
4. Sleep 90 minutes if possible. Tired presenters overclaim 48.5 as lives.

---

## 6. Technical worklist (exact, ordered)

### P0 — must ship

| # | Task | Owner | Command / file | Time box |
|---|---|---|---|---|
| 1 | Fill counterfactual | Jeevith | `python3 -m optimize.pipeline --budget 2000000` | 15m |
| 2 | `noise.json` + UI card | Jeevith / Garima | extend `signals/ingest.py` counters; Signal tab | 2h |
| 3 | POT vs GEV overlay | Jeevith | `signals/analysis.py` | 2h |
| 4 | Dual headline (Nepal vs HMA pooled) | Garima | App.tsx | 45m |
| 5 | CVaR toggle | Garima | `optimize(budget, mode)` | 45m |
| 6 | Map legend + SAR overlay | Garima / Subodh | HazardMap.tsx, flood geojson | 2h |
| 7 | HAND upgrade **or** dual CSI | Subodh | `hazard/proof.py`, `hazard/hand.py` | 4–6h |
| 8 | 2-page prevention plan export | Nalani | `api/conceptnote.py` (keep filename; retitle the doc) | 2h |
| 9 | Drop synthetic attribution from pitch | Nalani | delete or mark fixture | 30m |
| 10 | Offline cache + wifi-off test | Garima | `scripts/sync_artifacts.sh` | 1h |
| 11 | Rewrite EVT_PITCH.md to current numbers | Jeevith | 20m |
| 12 | Fix banner typo “CSI is CSI is” | Garima | App.tsx:148–149 | 5m |

### P1 — if P0 green

| # | Task | Why |
|---|---|---|
| 13 | GDELT vs rain tail | Second listed dataset; originality |
| 14 | IMERG scatter if GEE works | Fusion completeness |
| 15 | Finer display grid (2–4 km) | Map wow |
| 16 | Knapsack vs greedy delta | “We checked optimality” |
| 17 | Print CSS for concept note | Execution |
| 18 | Station map of which gauges drove the 7.75 | Insight |

### P2 — cut without guilt

GPU models, 3D GLOF flythrough, SMS, country index, OpenAlex, second country as headline, live ISD during judging.

---

## 7. Science rules (so we do not get destroyed in Q&A)

1. **Headline geography.** 7.75 years is **Nepal-adjacent GEV**, not all 498 stations. The 498 / 12,066 number is the **compute and sample** story. Never conflate.  
2. **Two-era split, not a trend line as the claim.** The claim is: *old 100-year depth evaluated on the late distribution*. The +5.229 mm/decade is supporting, with a p-value.  
3. **Wide 100-year CI** (52.98–120.75 mm) is a feature. That width **is** the Monte-Carlo sigma. Say: “the optimizer is fed the uncertainty, not a point forecast.”  
4. **Landslide:** AUC 0.934, n=138, many events skipped (176 far from station, 450 data gap). Do not hide skip counts.  
5. **CSI:** calibrated on the verification event → say **“in-sample calibration, out-of-sample would be another flood.”** That sentence saves you.  
6. **48.5** is **EAL people**, not 48 people moved.  
7. **CO₂ and income factors** live in `optimize/economics.py` with sources. If a judge asks “where did $50/t come from?”, answer from that table, not from memory.  
8. **Screening-grade** on every slide. Never “prediction.” Never “lives saved.”

---

## 8. Demo script (3:20) — winning version

**Never cut:** SAR proof, EVT 7.75 + negative control, **$2M plant-here plan**.  
**Cut if over:** agent, CVaR, GDELT, concept-note download.

| Time | Beat | Words (approx) | On screen |
|---|---|---|---|
| 0:00 | Hook | “In Sep 2024 the Koshi flooded. Clouds hide optical satellites. Radar does not.” | UNOSAT observed water |
| 0:20 | Proof | “We replayed that scene. Modeled vs observed. CSI is **0.087** — we are not going to pretend it’s 0.8. Screening HAND, calibrated on this event. The overlay is real UNOSAT.” | toggle modeled / observed |
| 0:45 | Noise | “Floods start as rain. NOAA ISD is 600 GB of sentinels, broken accumulation periods, and gaps. We parsed **12,066 station-years** on Voloridge’s 48-core box.” | noise.json KPIs |
| 1:05 | Signal | “Same tail math as VaR. GEV on annual maxima. Nepal-adjacent: the 1979–99 100-year daily depth now has a **7.75-year** recurrence. Full HMA pool: **no shift**. We published the miss.” | return-level curve + CI |
| 1:35 | Pivot | “Every other tool would now send an alert. We asked: what do we *plant* so fewer people are in the path — nature, not concrete.” | — |
| 1:50 | Plan | “$2M. Vetiver, bamboo, trees, floodplain. Protect people, store carbon, pay households to grow the defense.” Drag slider. Flip **CVaR**. “Still plant under the worst 10% of climate draws.” | parcels light up |
| 2:35 | Ask | “Why this parcel first?” Agent answers from artifacts only. | chat |
| 2:50 | Hand-off | Optional: download the screening plan. “Same numbers a district can take to a funder. The product is the map.” | report tab |
| 3:10 | Close | “Prevention is a portfolio. The signal was in their noisiest dataset. We spent it on slopes.” | headline + parcels |

---

## 9. Judge Q&A crib sheet

**“Did you cherrypick Nepal because the full sample didn’t move?”**  
Yes we subsetted; no we didn’t hide it. HMA-pooled GEV: no recurrence shift. Mountain convection + station density ≠ one GEV. The useful decision unit is the catchment, not the continent.

**“CSI is terrible.”**  
Agreed. Local-min HAND overpredicts flats (FAR 0.87). We calibrated stage on this event, so this is not a blind test. We still report raw CSI. The *use* of the model is relative ranking of parcels, not a legal flood zone.

**“Isn’t this just GCA / Fathom / an alert app?”**  
Alerts warn. Fathom prices damage. GCA sites nature to protect roads. We site **community preventive measures** (plant/restore) from public station tails, under a budget. Open stack.

**“Are you a GCF proposal generator?”**  
No. We produce a **where-to-plant plan**. A screening note is an export of that plan if someone needs paper. We do not claim to disburse climate funds.

**“48 people?”**  
No. **48.5 annual expected people-risk avoided** under the stated EAL model. Not unique lives, not fatalities.

**“AUC 0.93 seems high.”**  
Temporal split 2016–17, n=138, lots of events dropped for distance/gaps. It’s a rainfall classifier, not a slope-physics model. We will not call it Caine.

**“Why NOAA not reanalysis?”**  
Because the challenge *is* the noisy observational archive, and because stations are what parametric insurance and national Met services still settle on.

**“Can it run anywhere?”**  
Same pipeline, new bbox, new ISD subset. Koshi is the proof point, not a one-off hardcoded miracle — but tonight the demo is Koshi.

---

## 10. Scoring ourselves like Voloridge (target at freeze)

| Criterion | Now | At T+14 target |
|---|---|---|
| Originality | Strong idea, medium packaging | Unique: EVT tail → **preventive NbS parcels** + CVaR + negative control |
| Technical excellence | Scale yes, HAND weak, cleaning invisible | Scale + noise card + POT + better HAND/CSI story |
| Insight | 7.75 is real; easy to oversell | 7.75 **and** pooled miss **and** (optional) GDELT lag |
| Execution | UI exists, copy inconsistent, counterfactual null | Offline, CVaR, overlays, 3:20, no fixture numbers in the mouth |

**Win condition:** a Voloridge judge repeats *your* sentence to another judge:  
“They did VaR on rainfall and turned it into a plant-here plan.”

---

## 11. Risks (remaining)

| Risk | Mitigation |
|---|---|
| AWS dies before evacuate | Copy now; don’t wait for “final” HAND |
| Whitebox / DEM download fails | Keep current CSI; dual-mask; overlays |
| GDELT rabbit hole | 3h cap then cut |
| Presenter says “lives saved” | Swear jar; script uses “people-risk avoided” |
| Wifi dies on stage | `VITE_USE_CACHE=true` verified |
| Judge wants live re-optimize | Slider hits API **or** precompute 5 budgets into cache |
| Ethics: NbS efficacy factors | Always “literature screening factors, not a field trial” |

---

## 12. What “extremely good” looks like at submission

A stranger can:

1. Open the laptop **offline**.  
2. See 12,066 station-years and the noise we removed.  
3. See a return-level curve with CIs and a **7.75 vs no-shift** pair.  
4. Toggle a real flood.  
5. Drag $2M → **parcels to plant**. Toggle CVaR.  
6. Click a parcel and hear why it was chosen. Optional: download the screening plan.  
7. Ask a number; the agent refuses to invent.

If those seven are true, we are in contention. Everything else is garnish.

---

## 13. Immediate next actions (first 30 minutes)

1. Jeevith: re-run optimizer; start `noise.json` counters from existing checkpoints on AWS.  
2. Subodh: start HAND/CSI improvement on the box; do not touch `web/`.  
3. Garima: CVaR toggle, legend, CSI banner typo, dual headline.  
4. Nalani: retitle the export as a **prevention plan**; strip fake attribution.  
5. All: set phone alarm for AWS TTL minus 4 hours.  
6. Book 10 minutes at the Voloridge booth with the current `signal.json` in hand.

**Do not start a new repo. Do not rename the product. Do not add a second case study as the headline. Do not pivot to “climate finance origination.”** The sentence that must stay true: *noisy rain → fitted tail → preventive measures on the map.*
