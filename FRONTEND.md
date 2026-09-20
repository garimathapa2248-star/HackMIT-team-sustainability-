# RootLedger — frontend handbook

Use this while you theme and rebuild the site. Everything below is **real backend output** from the Koshi run (plus Bengaluru and Kathmandu screening packs). Do not invent numbers, do not use `contracts/fixtures`, and do not turn on the old static cache (`VITE_USE_CACHE`). Talk to the live API.

**API base:** `http://127.0.0.1:8000`  
**Start it:** from `rootledger/`, `python3 -m api.main`  
**CORS:** already open (`*`).  
**City:** every GET should include `?city=koshi` (or `bangalore`, `kathmandu`). You can also send header `x-rootledger-city`. Default if omitted is `koshi`.

If a field is `null`, show **“not available”**. Never replace it with `0`.

---

## 1. How to frame the product (plain language)

**One line:** Mountain towns already get flood *warnings*. RootLedger answers *what to plant, where, with this budget* — and it checks that answer against real radar floods, including the misses.

**What it actually is:** A decision tool. It reads decades of public weather stations and satellites, estimates where people are in danger from monsoon floods / landslides / glacial-lake floods, then spends a budget on nature-based defenses (restore floodplains, plant slopes, etc.) to get three returns per dollar:

1. **People-risk avoided** (a model score, not “lives saved”)
2. **Carbon stored** (from published per-hectare factors, not a field measurement)
3. **Local livelihood income potential** (same — literature, not wages paid)

**The story in four beats** (use this order on both government and citizen home screens):

| Beat | Plain sentence | Proof on the page |
|---|---|---|
| Rain got fatter | The old “once in 100 years” daily rain now fits about **once in 7.75 years** in Nepal-adjacent stations. | `/signal` headline |
| We checked the flood map | On 27 Sep 2024 radar, our water map scores CSI **0.053**. A simple “seasonal water” map scores **0.067**. We lose, and we say so. | `/backtest` |
| Then we spend a budget | **$1.984M of $2M** → **62 floodplain sites** → **26,306** annual expected people-risk avoided. | `/plan` |
| Someone has to do the work | Government leads floodplain restoration. Communities and households have other measure types in the catalog. Roles are a **planning assumption**, not blame. | `/attribution` |

**Locked Koshi numbers** (do not round CSI up):

| Show this | Value | Label on screen |
|---|---|---|
| Stations / station-years | 498 / 12,066 | observed NOAA weather archive |
| Old 100-year rain now | **7.75 years** | model fit on Nepal-adjacent stations |
| Full mountain-Asia pool | **no shift** | we published our own miss |
| Independent weather re-check | 16.72 years vs 7.75, **partial** | ERA5-Land, 39 of 73 stations |
| 2024 radar score | CSI 0.053 · POD 0.212 · FAR 0.935 | in-sample (we fitted on this flood) |
| JRC seasonal water 2024 | CSI 0.067 | we do **not** beat it |
| 2017 second flood | CSI 0.088 | frozen model, **not the same valley** |
| Plan | 62 sites, $1.984M / $2M | 26,306 people-risk / year |
| Carbon / income | 8,680 t / 10 yr · $74,400 / yr | literature factors |
| Before → after (model) | 77,057 → 54,174 (**29.7%**) | simulation, not a measured rescue |

---

## 2. Two audiences, one backend

Build **two skins of the same data**, not two products. A toggle or two routes is enough: **Government** and **Citizens**.

### Government needs

They need a **defensible screening packet** they can take to a funder or a district meeting.

Show them:

1. **The problem is in the tail, not the average monsoon** — `/signal`, `/noise`, `/replication`
2. **The flood layer was tested, and the miss is public** — `/backtest`, map overlays
3. **A ranked list of sites for this budget** — `/plan`, `/candidates`, map
4. **Money math (screening-grade)** — `plan.appraisal` (BCR, NPV, residual risk)
5. **What the public sector actually has to implement** — `/attribution` `government_levers` + `/scorecard`
6. **A downloadable plan** — `/preventive-measures-plan` and `.pdf`

Government copy tone: precise, labeled, no hype. They should be able to answer a skeptical engineer.

### Citizens need

They need to know **what is changing near them**, **who is supposed to act**, and **what they can do or demand** — without being told the flood is “their fault.”

Show them:

1. **Rain is coming more often** — 7.75-year headline in one sentence
2. **Where water actually was in 2024** — `/flood_observed` (blue) vs `/flood_modeled` (outline)
3. **The proposal is planting / restoring, not another siren** — `/plan` sites on the map
4. **What government should do here** — floodplain restore + drainage / glacial-lake outlet (from `/attribution`)
5. **What communities and households *can* do** — measure catalog + role map below (even if this $2M Koshi plan did not pick those types)
6. **A short brief they can screenshot** — `/citizenbrief`

Citizen copy tone: short sentences, no jargon. Never say “you should have planted.” Say “here is the public plan, here is what you can verify, here is what only the district can approve.”

### Who does which kind of work (from the real role map)

This mapping is in the backend (`agent/attribution.py`). It is a **planning lead**, not a legal assignment.

| Measure type | Who leads | What it is in plain words | In this Koshi $2M plan? |
|---|---|---|---|
| `floodplain_restore` | **Government** | Reconnect / restore floodplain so water has room | **Yes — all 62 sites** |
| `wetland_restore` | **Government** | Restore wetlands that soak peak flow | In the engine, not selected here |
| `riverbank_bio` | **Government** | Live plants holding the riverbank | In the engine, not selected here |
| `drainage_and_glof_outlet` | **Government** | Drains, zoning, glacial-lake outlet works | Listed as a role, **no dollar figure** |
| `afforestation` | **Community** | Catchment tree planting | In the engine, not selected here |
| `bamboo_slope` | **Community** | Bamboo on slopes (also a cash crop) | In the engine, not selected here |
| `vetiver_slope` | **Household** | Vetiver hedges on a family’s slope | In the engine, not selected here |

**Honest Koshi fact for the UI:** this frozen plan is almost entirely **public floodplain restoration**. Do not fake household projects onto the Koshi map. Instead:

- Government view: 62 sites, $1.984M, delivery scorecard.
- Citizen view: “The district plan is 62 floodplain sites. You can see them, ask why a site was chosen, and use the checklist below. Slope-planting options exist in the engine for other places / a different budget — they were not selected under this $2M Koshi run.”

Pull that catalog from `GET /plan` → `measure_catalog` (real types, costs per hectare, O&M). Do not hardcode a fake citizen project list.

### Suggested screens

```
/                      Choose: Government  |  Citizens     (same map behind)
/gov                   Briefing + proof + portfolio
/gov/proof             2024 radar vs model, 2017 transfer
/gov/plan              62 sites, money, pathway, export
/gov/ask               Grounded questions
/citizen               What changed + map of proposed sites
/citizen/do            What gov must do vs what you can do
/citizen/brief         Short shareable brief
```

Keep a city switcher on both (`koshi` / `bangalore` / `kathmandu`). For non-Koshi cities, **hide 2017 layers** and **do not invent a CSI**.

---

## 3. Words to use, words to ban

| Instead of | Say |
|---|---|
| Lives saved / people protected (as unique people) | **Annual expected people-risk avoided** |
| Validated flood model | **Screening flood map**, tested against radar |
| Same valley (2017) | **Transfer** — different river reach, frozen 2024 settings |
| We beat climatology | **We do not beat JRC seasonal water** (0.053 vs 0.067) |
| Climate change made storms worse | **Fitted tail:** old 100-year depth now recurs every 7.75 years |
| Households benefiting | **Not available** (`totals.households_benefiting` is `null`) |
| Government is 70% responsible | **No blame percentages.** Roles are planning leads. |
| Whitebox HAND / hydrodynamic twin | **Local-min HAND proxy** on Copernicus elevation |

Four evidence labels — stamp every number:

1. **Observed** — rain gauges, radar flood extent  
2. **Model output** — GEV fit, HAND map, optimizer ranking  
3. **Literature** — cost per hectare, carbon, income factors  
4. **Counterfactual** — “if we had planted, exposure would be…”

---

## 4. How every request works

```
GET  http://127.0.0.1:8000/<endpoint>?city=koshi
POST http://127.0.0.1:8000/<endpoint>   with JSON body { ..., "city": "koshi" }
```

Missing files do **not** 500. You get HTTP 200 plus `{ "error": "...", "data_status": "missing" }`. Treat `data_status === "missing"` as empty state.

City packs live under `artifacts/cities/<id>/`. Koshi lives under `artifacts/`.

`GET /cities` tells you which packs are ready (`ready: true` means `plan.json` + `hazard.geojson` exist).

---

## 5. Endpoint catalog

Plain-English purpose, then the JSON you actually use.

### Health and cities

#### `GET /health`
Wake-up ping. `{ "ok": true }` means the API is up. If this fails, show “backend offline” — do not silently swap in made-up data.

#### `GET /cities`
List packs.

```json
{ "cities": [ { "id": "koshi", "name": "Koshi / Madhesh (Nepal)", "ready": true, "bbox": [86.06, 26.30, 87.47, 26.97], "hazards": ["..."] } ] }
```

Use `id` in every later `?city=`. Ready cities today: **koshi**, **bangalore**, **kathmandu**.

---

### Rain: the noisy archive and the tail

#### `GET /noise` → Noise / “the archive is messy”
**Audience:** both (one visual), extra detail for government.

| Field | Use |
|---|---|
| `scale.stations_processed` / `station_years` | 498 stations, 12,066 station-years |
| `scale.compute` | Parsed on Voloridge’s 48-core box |
| `scale.source` | NOAA ISD |
| `reproducible_subset.station_years_no_record_pct` | 37.4% of requested years simply do not exist |
| `reproducible_subset.station_years_by_decade` | Bar chart of coverage |
| `cleaning[]` | `{ step, detail }` — what we stripped out |
| `distribution` | Dry-day fraction, days ≥50 mm / ≥100 mm |
| `punchline` | Ready-made caption |

This is **observed**. Gold dots on the map (Nepal-adjacent stations) are **not** an API route today. Serve the real file `demo_cache/stations_nepal.geojson` (real ISD coordinates, not fake gauges). Do not generate random points.

#### `GET /signal` → Tail / “how often does extreme rain recur?”
**Audience:** government (full), citizens (headline only).

| Field | Use |
|---|---|
| `headline.new_return_period_yrs` | **7.75** |
| `headline.old_return_period_yrs` | 100 |
| `headline.early_period` / `late_period` | 1979–1999 vs 2000–2024 |
| `headline.headline_region` | `nepal_adjacent` — not the whole continent |
| `stations_processed` / `station_years` | 498 / 12066 |
| `return_levels_mm` + `return_levels_ci95` | Return-level curve with 95% band |
| `trend.slope_mm_per_decade` / `p_value` | +5.229 mm/decade, p=0.00035 (supporting, not the claim) |
| `provenance.headline_note` | HMA pool: **no shift** — print this |
| `pot_gpd` | Cross-check, different sample, do not replace the 7.75 headline |
| `imerg.available` | `false` — say IMERG was not fused |
| `landslide_trigger.auc` | 0.934 out-of-sample **rainfall classifier**, not a physics law |
| `lake_growth[]` | Imja / Thulagi / Tsho Rolpa % area growth |
| `hazard_classes` | flood / landslide / GLOF chips (`high` / `medium` / `low`) |
| `recommendations[]` | Planner text + `linked_measure_types` |

Citizen one-liner from this file:  
“The kind of daily rain that used to be called a 100-year storm now fits about every **8 years** in this Nepal station set. That is a statistical fit, not a weather forecast.”

#### `GET /replication` → Independent check (Koshi only)
ERA5-Land at the same station coordinates.

| Field | Use |
|---|---|
| `verdict` | `partially replicates` |
| `isd_headline_new_return_yrs` | 7.75 |
| `era5_headline_new_return_yrs` | 16.72 |
| `agreement.annmax_pearson_r` | 0.128 |
| `agreement.scatter[]` | `{ station, isd_mm, era5_mm }` |
| `era5_signal.stations_processed` | 39 of 73 |
| `fetch_failures[]` | Rate limits — show the count, don’t hide it |

Hide this card on Bengaluru / Kathmandu if the file is missing.

#### `GET /rankings` → Country table (decision region, not a shame index)
| Field | Use |
|---|---|
| `places[]` | `name`, `rank`, `stations`, `new_return_period_yrs`, `classes.flood/landslide/glof`, `composite` |
| `control` | High Mountain Asia pool — **no shift** |

Nepal is first in this table because the **rainfall tail** intensified in this box. Do not present it as “Nepal is the poorest / least prepared.”

---

### Map layers (GeoJSON)

All of these are GeoJSON `FeatureCollection`. Coordinates are `[longitude, latitude]`.

#### `GET /hazard`
Grid cells with people and risk.

Useful properties on each feature:

`cell_id`, `population`, `eal_people`, `eal_usd`, `flood_depth_m.rp10` / `rp100`, `landslide_prob`, `observed_flood_frac`, `modeled_flood_frac`, `equity_weight`, `low_income_score`, `critical_assets`, `slope_deg`, `landcover`

**Government:** choropleth of `eal_people` or `population`.  
**Citizen:** simpler “more people in harm’s way” coloring — still this file.

#### `GET /flood_observed` and `GET /flood_modeled`
2024 Koshi radar water (observed) vs our outline (modeled).  
**Citizen map default:** both on.  
**Government proof:** toggles none / observed / modeled / both.

#### `GET /flood_observed_2017` and `GET /flood_modeled_2017`
Second flood (13 Aug 2017, western Terai). **Koshi only.** Do not draw these on Bengaluru or Kathmandu.

#### `GET /risk_before` and `GET /risk_with_plan`
Same grid, current vs “if the plan were in place” (simulation). Toggle label: **no measures** vs **with the $2M plan**.

#### `GET /candidates`
Array of possible planting / restoration sites (not only the 62 selected).

Important fields: `parcel_id`, `type`, `centroid` `[lon, lat]`, `area_ha`, `cell_ids`, `slope_deg`, `landcover`, `risk_driver`, `suitability_score`, `rationale`, `verification` / `required_verification`.

Paint **selected** sites from `/plan` in a strong color; other candidates pale.

---

### Proof

#### `GET /backtest`
**This is the honesty page.** Government should see all of it. Citizens need the 2024 picture + one sentence that the model is imperfect.

| Field | Meaning |
|---|---|
| `event_date` | 2024-09-27 |
| `critical_success_index` / `hit_rate_pod` / `false_alarm_ratio` | 0.053 / 0.212 / 0.935 |
| `observed_flood_km2` / `modeled_flood_km2` | 121 vs 394 km² |
| `counts` | tp, fp, fn, tn — why false alarms are high |
| `baselines.jrc_seasonal_water.csi` | **0.067 — we lose** |
| `baselines.area_matched_elevation.csi` | 0.001 — we beat a naïve elevation map |
| `skill_vs_scale[]` | CSI vs km — **it falls**, do not say it rises |
| `validation` | 2017 transfer CSI 0.088, JRC 0.141 |
| `spatial_holdout.critical_success_index` | 0.056 (same storm, west/east split) |
| `counterfactual.people_exposed_baseline` | 77057.1 |
| `counterfactual.people_exposed_with_plan` | 54173.5 |
| `counterfactual.reduction_pct` | 29.7 |
| `counterfactual.flood_exceedance` | 30-year “likely flooded” people counts |
| `permanent_water_mask` | caption: rivers already wet were excluded |

`people_exposed_*` are **exposure units in a simulation**, not unique residents rescued.

On Bengaluru / Kathmandu, `critical_success_index` is **null**. Show a banner: “No radar scene for this city, so we will not borrow Koshi’s score.”

---

### The plan (what to plant)

#### `GET /plan`
The frozen $2M answer. **Do not POST /optimize from the public site** unless you mean to overwrite this file.

**Top-line**

| Field | Koshi |
|---|---|
| `budget_usd` | 2,000,000 |
| `totals.cost_usd` | 1,984,000 |
| `selected.length` | 62 |
| `totals.people_protected` | 26306.075 — **people-risk / year** |
| `totals.co2_t_10yr` | 8680 |
| `totals.income_usd_yr` | 74400 |
| `totals.households_benefiting` | `null` — hide or say unavailable |
| `mode` | `expected` (CVaR also exists) |

Each `selected[]` row: `parcel_id`, `type`, `centroid`, `cost_usd`, `avoided_eal_people`, `co2_t_10yr`, `income_usd_yr`, `bcr`, `priority_rank`, `equity_weight` (if present), `suitability_score`.

**Money (government)**

- `appraisal.bcr`, `appraisal.residual_people_risk`, `appraisal.note`
- `appraisal.npv.npv_usd`, `bcr_npv`, `irr`, `series[]` (discounted benefits vs costs)
- Label: **screening-grade**, 3% discount, 2% O&M, **not** a field benefit-cost ratio

**Four books, same budget** — `objectives[]`  
`blended` / `people` / `carbon` / `income` with sites, people-risk, tCO₂, income.

**Pathway** — `pathways.phases[]`  
Three phases with year, cost, site count, blurb. `transferable_core_n` = parcels that survive every phase.

**Other charts already in the JSON** (government deep-dive; fold them so citizens are not buried):

- `waterfall` — today vs 2050 vs averted vs residual  
- `exceedance.points[]` — people-risk at 2/5/10/25/50/100-year  
- `regret.table[]` + `regret.robust_pick`  
- `event_view` — people in deep cells at 10-year and 100-year  
- `infographic` — 30-year likely-flooded people, with vs without plan  
- `equity.share_of_benefit_high_equity_pct` — 68.6% of avoided risk in higher-equity-weight cells  
- `measure_catalog[]` — types, $/ha, lifetime, O&M %  
- `optimality.gap_pct` — 0% vs relaxed knapsack bound  
- `cvar.tail_people_protected` — worst 10% of climate draws  
- `robustness.overlap_pct` — expected vs CVaR overlap  
- `frontier[]` — people-risk vs budget curve  

#### `POST /optimize`
Body:

```json
{ "budget": 2000000, "mode": "expected", "draws": 200, "city": "koshi" }
```

`mode` is `expected` or `cvar`. **This writes a new `plan.json`.** Keep it behind a government “recalculate” that is off for judging unless you really want a live solve. On failure the API still returns 200 with `{ error, plan, data_status: "cached fallback" }`.

#### `GET /scenarios`
FloodAdapt-style names on **our** HAND numbers (not a Dutch flood engine).

Use `scenarios[]`: `name`, `event`, `projection`, `strategy`, `people_risk_eal`.  
Highlight `no_measures` vs `nbs_blended_2M`.

---

### Government vs citizen delivery

#### `GET /attribution`
**This is the “who does what” payload.** The API **zeros out** any old percentage splits. You will always see:

```json
{
  "government_pct": null,
  "community_pct": null,
  "household_pct": null,
  "quantified_responsibility_split_available": false,
  "government_levers": [ ... ],
  "community_levers": [ ... ],
  "household_levers": [ ... ]
}
```

Each lever:

| Field | Meaning |
|---|---|
| `lever` | e.g. `floodplain_restore` |
| `implementation_lead` | `government` / `community` / `household` |
| `plan_spend_usd` | dollars in **this** plan (`null` if role-only) |
| `annual_expected_people_risk_avoided` | model output |
| `risk_driver` | flood / landslide / … |
| `source` | literature citation string |
| `risk_share_pct` | always `null` — do not draw a pie chart of blame |

**Koshi right now**

- Government: `floodplain_restore` ($1,984,000, 26,306 people-risk/yr) **and** `drainage_and_glof_outlet` (role only, no $)
- Community: `[]`
- Household: `[]`

UI for citizens still has work to do: explain the public plan, show the government to-do, and show **catalog options** for household/community types from `plan.measure_catalog` as “available in the engine, not in this budget pick.”

#### `GET /scorecard` (markdown)
Government delivery scorecard, generated from the same artifacts. Render as markdown or restyle. Filename energy: *Preventive Measures Delivery Scorecard*.

#### `GET /citizenbrief` (markdown)
Citizen / local brief: 7.75-year sentence, proposed measures, what the model estimates, “verify on the ground” closer.

#### `GET /preventive-measures-plan` and `POST /preventive-measures-plan`
Markdown screening plan (legacy alias: `/conceptnote`).

#### `GET /preventive-measures-plan.pdf` (alias `/conceptnote.pdf`)
PDF of the same. Open in a new tab or offer download. Pass `?city=`.

---

### Ask (grounded LLM)

#### `POST /ask`
```json
{ "question": "Why was preventive measure p_c_00132_floodplain_restore selected?", "city": "koshi" }
```

Response:

```json
{ "answer": "...", "sources": ["get_backtest"], "invented": false }
```

Uses a **free OpenRouter model** with tools that only read artifacts (`get_signal`, `get_backtest`, `explain_parcel`, …). If the key is missing or the model fails, it falls back to a regex agent that still only uses disk numbers.

**Frontend rules**

- Suggested chips should be real questions (CSI, 7.75, NPV, “why this parcel”).
- Show `sources` under the answer.
- If `invented` is ever true, do not display the answer.
- Timeout: free models can take ~10s.

---

### Optional / skip

#### `POST /sms`
Twilio demo. Returns `{ sent: false, reason: "..." }` unless Twilio secrets exist. **Do not fake a sent SMS.** Safe to omit from the new site.

---

## 6. Wire-up cheat sheet (copy into your client)

```ts
const API = "http://127.0.0.1:8000";

async function getJson(path: string, city = "koshi") {
  const res = await fetch(`${API}${path}?city=${encodeURIComponent(city)}`);
  const data = await res.json();
  if (data && data.data_status === "missing") return null;
  return data;
}

// Parallel load for a city home screen
const city = "koshi";
const [
  signal, noise, plan, candidates, backtest, attribution,
  hazard, observed, modeled, rankings, scenarios, replication,
] = await Promise.all([
  getJson("/signal", city),
  getJson("/noise", city),
  getJson("/plan", city),
  getJson("/candidates", city),
  getJson("/backtest", city),
  getJson("/attribution", city),
  getJson("/hazard", city),
  getJson("/flood_observed", city),
  getJson("/flood_modeled", city),
  getJson("/rankings", city),
  getJson("/scenarios", city),
  getJson("/replication", city),
]);
```

Markdown:

```ts
const md = await fetch(`${API}/citizenbrief?city=${city}`).then(r => r.text());
```

Ask:

```ts
const { answer, sources } = await fetch(`${API}/ask`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ question, city }),
}).then(r => r.json());
```

2017 layers — **only if** `city === "koshi"`:

```ts
getJson("/flood_observed_2017", "koshi")
getJson("/flood_modeled_2017", "koshi")
```

Risk toggle:

```ts
getJson("/risk_before", city)
getJson("/risk_with_plan", city)
```

---

## 7. Page → endpoint map

| UI block | Government | Citizens | Endpoints |
|---|---|---|---|
| Hero numbers | 62 sites, $1.984M, CSI 0.053, 7.75-yr | “Plant 62 places so the next flood is smaller” | `/plan`, `/signal`, `/backtest` |
| Map | Hazard + sites + radar overlay | Same map, fewer toggles | `/hazard`, `/candidates`, `/plan`, `/flood_*` |
| Rain story | Noise bars + GEV curve + ERA5 scatter | One sentence + 7.75 | `/noise`, `/signal`, `/replication` |
| Proof | Full CSI table, 2017, JRC miss | “Radar vs our map; we report the miss” | `/backtest` |
| Portfolio | KPIs, pathway, NPV, four books | Top 5 sites in plain words | `/plan` |
| Who acts | Scorecard + government levers | To-do for district vs household catalog | `/attribution`, `/scorecard`, `/citizenbrief` |
| Ask | Parcel why? BCR? CSI? | “Why this field by the river?” | `POST /ask` |
| Export | MD + PDF | Citizen brief download | `/preventive-measures-plan`, `.pdf`, `/citizenbrief` |
| Other cities | Same engine, CSI null banner | Same | `?city=bangalore` / `kathmandu` |

---

## 8. Citizen “what can I do?” (only from real data)

Do **not** invent a volunteer program. Build three lists from JSON:

**A. What government should do here (Koshi, this plan)**  
From `attribution.government_levers`:

1. Restore floodplains at the 62 selected `parcel_id`s ($1.984M modeled).  
2. Drainage, zoning, and glacial-lake outlet works (`drainage_and_glof_outlet`) — listed as a public duty, **no modeled dollar amount**.

**B. What you can check as a resident**  
From each selected candidate’s `verification` / `required_verification` and the citizen brief closer:

- Is this actually public / community land? Tenure.  
- Does the community agree? Consent.  
- Are there ecological safeguards?  
- Are the map dots on the right field? (centroid is a **cell**, not a surveyed plot boundary.)

**C. What households / communities *could* plant** (engine catalog, not this Koshi pick)  
From `plan.measure_catalog` and the role table: vetiver (household), bamboo and afforestation (community). Show cost per hectare and the literature `source` string. Caption: “Available in the optimizer; not selected under this $2M Koshi floodplain run.”

Recommendations in `/signal` → `recommendations[]` are already written for planners, e.g. flood: *avoid new occupancy on frequent-flood cells; prioritise floodplain and wetland restore; treat drainage as a government lever.* You may paraphrase for citizens; do not add new claims.

---

## 9. Government “what do we need to do?” (only from real data)

1. **Treat this as a screening shortlist**, not a construction permit. (`plan.provenance.data_status` says field verification is required.)  
2. **Fund / implement the 62 floodplain sites** in rank order (`priority_rank`).  
3. **Keep equity in the ranking** — low-income rural cells already carry up to **1.5×** weight; 68.6% of modeled benefit lands on higher-equity cells (`plan.equity`).  
4. **Own drainage and GLOF outlet** even though they have no line-item in this NbS budget.  
5. **Take the PDF** (`/preventive-measures-plan.pdf`) and the **scorecard** to a funder.  
6. **Say the miss out loud** in any public briefing: CSI 0.053 vs JRC 0.067.  
7. **Do not quote household counts or blame percentages** — the API will not give you any.

Pathway (`plan.pathways`) is the phasing story if they ask “we cannot spend $2M this year.”

---

## 10. What you must not put in the new frontend

- Hardcoded demo numbers that can drift from the API  
- `contracts/fixtures` (synthetic, labeled as such — not Nepal)  
- Koshi CSI painted onto Bengaluru or Kathmandu  
- 2017 flood polygons on non-Koshi cities  
- A pie chart of “% government vs % citizen responsible”  
- “Saved 26,306 people”  
- Fake household projects on the Koshi map  
- A second live “world hover” product (removed)  
- Calling `/optimize` on every slider drag during a judged demo  

The old `web/` app is a **reference** for fields and labels. You are free to throw away its layout. Keep its honesty rules.

---

## 11. Quick glossary

| Term on the API | Say on the website |
|---|---|
| CSI | How well the water map matches radar (1 = perfect, 0 = no overlap) |
| POD | Of the real flood, how much we caught |
| FAR | Of our flood map, how much was a false alarm |
| GEV / tail | Math for rare extreme rain, like a 100-year storm |
| CVaR | Plan for the **worst 10%** of climate draws, not the average |
| HAND proxy | “Height above nearby low point” from a global elevation map — a screening flood sketch, not a river model |
| EAL / people-risk | Expected yearly harm to people in a cell, not a body count |
| NbS | Nature-based solution: plants, floodplains, wetlands instead of only concrete |
| Transfer (2017) | We froze the 2024 settings and tested a **different** flood |

---

## 12. Sanity check before you call the UI “done”

- [ ] Every number on screen can be traced to one of the endpoints above  
- [ ] `null` renders as “not available”  
- [ ] Government and citizen routes use the **same** `/plan` and `/attribution`  
- [ ] Koshi shows 2017 + ERA5; other cities do not steal those layers  
- [ ] Ask answers show `sources`  
- [ ] PDF / scorecard / citizen brief download from the API, not a handwritten file  
- [ ] No responsibility pie chart  
- [ ] People-risk is never captioned “lives saved”
