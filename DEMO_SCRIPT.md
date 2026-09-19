# RootLedger demo — source of truth

This is the only current spoken demo script. It supersedes the older demo wording in `PLAN.md §11`.
Do not quote cached concept-note prose or `households_benefiting`.

## Value lock

These values are locked to the current root artifacts:

- `signal.json` generated `2026-09-19T19:43:26Z`: 498 stations, 12,066 station-years, fitted Nepal-adjacent recurrence 7.75 years.
- `backtest.json` generated `2026-09-19T20:39:09Z`: CSI 0.086, POD 0.211, FAR 0.873; local-min HAND proxy calibrated on the 27 Sep 2024 event.
- `plan.json`: $2,000,000 budget, $1,760,000 modeled spend, 16,058.307 annual expected people-risk avoided, 7,700 tCO₂/10yr, and $66,000/yr modeled livelihood-income potential.
- `backtest.json` counterfactual: 54,993.4 baseline exposure units to 38,912.4 with-plan units, a 29.24% simulated reduction.

If any source artifact changes, update this lock and every matching spoken value before presenting. Run
`python3 scripts/verify_artifacts.py` to check cache hashes; it is read-only.

## Exact 3:20 script

Stage directions are in brackets and are not spoken. Rehearse to the timestamp boundaries; finish at exactly 3:20.

### 0:00–0:20 — Hook

[Show the Sentinel-1 observed flood layer.]

“During the monsoon, clouds hide floods from normal optical satellites. RootLedger starts with observed radar:
this is UNOSAT’s Sentinel-1 flood extent from 27 September 2024 over Koshi and Madhesh.”

### 0:20–0:45 — Calibration evidence

[Toggle observed versus modeled.]

“We compare that observation with a screening model: a Copernicus GLO-30 local-min HAND proxy, with stage
calibrated on this same event. Its calibration-event CSI is 0.086, POD 0.211, and FAR 0.873. That is low, and it
is not independent validation; we show it because honest evidence is more useful than a polished fake score.”

### 0:45–1:15 — Signal in the noise

[Open the signal panel and return-level chart.]

“Upstream, we processed 498 NOAA stations and 12,066 station-years across High Mountain Asia. We cleaned missing
sentinels, quality flags, duplicate days, and mixed accumulation windows, then fit extreme-value models. In the
Nepal-adjacent subset, the old one-in-one-hundred-year rainfall depth has a fitted late-sample recurrence of 7.75
years. That is model output from observed records, not a forecast, and the HMA-pooled fit did not show the same
shift.”

### 1:15–1:35 — Evidence labels

[Point to the evidence labels.]

“RootLedger keeps four categories separate: observed data, model output, literature assumptions, and
counterfactual simulation. The rainfall record and radar extent are observations. Hazard and optimization are
models. Cost, carbon, efficacy, and income factors come from literature.”

### 1:35–2:05 — Preventive pivot

[Open the plan and highlight selected parcels.]

“Most tools stop at warning. We ask what preventive measures fit a fixed budget: wetland and floodplain
restoration, riverbank bioengineering, vetiver, bamboo, and afforestation. The optimizer ranks candidate parcels
with per-cell expected-loss capping and Monte Carlo climate uncertainty. Each recommendation carries a centroid,
budget, risk metric, and the available suitability and evidence fields; if an artifact does not support a reason,
the agent says so.”

### 2:05–2:35 — Current portfolio

[Set the budget to $2M; do not mention households.]

“At a two-million-dollar ceiling, modeled spend is 1,760,000 dollars. The output is 16,058 annual expected
people-risk units avoided, not unique people or observed lives saved; 7,700 tonnes of carbon over ten years; and
66,000 dollars per year of livelihood-income potential from per-hectare literature factors. Those are screening
outputs, not measured impact, income, jobs, wages, or households reached.”

### 2:35–2:55 — Grounded ask

[Ask exactly: “Why is parcel p_c_00098_floodplain_restore ahead of p_c_00115_floodplain_restore?”]

“The answer is grounded in the candidate and selected-plan rows. The first floodplain-restoration opportunity is
at 26.53 north, 87.14 east: 32,000 dollars, suitability 0.235, and 2,499.3286 annual people-risk units avoided.
The second is also 32,000 dollars, with suitability 0.28 and 1,886.9204 units. The order is model output, not
observed causal proof.”

### 2:55–3:10 — Data to action

[Open “Preventive Measures Plan”.]

“One click produces a Preventive Measures Plan: prioritized interventions with coordinates and budget, an
evidence register, literature assumptions, monitoring and verification, and limitations. It never turns the
counterfactual into an observed claim or assigns synthetic responsibility percentages.”

### 3:10–3:20 — Close

[Return to the map.]

“RootLedger turns noisy public data into a transparent prevention shortlist—and keeps every claim auditable.”

## Q&A — exact answers

**“Is this a validated flood model?”**  
“No. It is a screening-grade Copernicus GLO-30 local-min HAND proxy, with stage calibrated on the 27 September
2024 event. CSI 0.086, POD 0.211, and FAR 0.873 are calibration-event fit metrics, not independent validation.”

**“Why is the CSI so low?”**  
“The proxy overpredicts extent: modeled area is 221.82 km² versus 134.18 km² observed, and FAR is 0.873. We keep
the result visible and limit the use case to screening. Independent events or a hydrodynamic model are needed
before design or investment.”

**“Did you save 16,058 people?”**  
“No. `people_protected` is the model’s sum of annual expected people-risk avoided. It is not unique people, an
observed outcome, or lives saved.”

**“Is the 29.24% reduction observed?”**  
“No. It is a counterfactual simulation: observed-flood fraction times population, reduced by modeled
nature-based-solution capture. It is not a measured causal effect.”

**“How many households benefit?”**  
“We do not have defensible participant or household data, so we make no household-reach claim. The income value
is modeled potential from per-hectare literature assumptions and must be measured during implementation.”

**“Who is responsible: government, communities, or households?”**  
“The data does not identify causal responsibility percentages. We show provisional implementation roles for
planning, and those require local governance and community confirmation; they are not an allocation of blame.”

**“Why is p_c_00098_floodplain_restore ahead of p_c_00115_floodplain_restore?”**  
“The current selected order places them first and second. Both cost 32,000 dollars; the first has 2,499.3286
annual expected people-risk units avoided versus 1,886.9204 for the second. The candidate records also expose
their centroids, risk driver, suitability score and evidence, assumptions, and required verification. The order
is model output, not observed causal proof.”

**“What is observed versus assumed?”**  
“Observed: NOAA station records and the UNOSAT Sentinel-1 flood extent. Model output: GEV recurrence, hazard
proxy, expected risk, ranking, carbon, and income calculations. Literature assumptions: unit cost, efficacy,
carbon, and income factors. Counterfactual simulation: with-plan exposure.”

**“Can this fund construction now?”**  
“No. It is a screening shortlist. Parcel boundaries, tenure, suitability, safeguards, costs, engineering,
governance roles, and monitoring baselines all need field verification.”
