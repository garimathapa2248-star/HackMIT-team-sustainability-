# Preventive Measures Plan — bangalore

**SCREENING-GRADE WATERMARK.** Not an engineering design, not a field-verified parcel survey, not an observed intervention trial.
**Purpose:** screening-grade, funder-oriented preventive action plan (auto-filled from artifacts)
**Portfolio status:** counterfactual simulation — deterministic candidate suitability plus literature-based intervention effects; field verification required
**Evidence labels:** observed data · model output · literature assumption · counterfactual simulation

## 1. Decision context

The early-period 1-in-100-year daily rainfall depth now has a fitted recurrence of 14.28 years in the late-period sample. **[model output from observed NOAA ISD]**

Annual-max trend: **5.201 mm/decade**. **[model output]**

Lake-area series summary: not available. **[observed/derived inventory data]**

Independent check (ERA5-Land at the same station coordinates): **replicates** (13.42-yr vs ISD 7.75-yr; annmax Pearson r=0.432, mean bias 28.09 mm). quasi-independent: reanalysis assimilates some gauges, but it is a different measurement and modeling system from raw ISD station records **[model output on reanalysis]**

## 2. Evidence register

- **Observed data:** 1 NOAA stations / 45 station-years; UNOSAT Sentinel-1 flood extent for None; observed flood area not available km².
- **Model output:** GEV return levels {'2': 36.407, '5': 53.87, '10': 71.947, '25': 106.451, '50': 144.409, '100': 197.22} with bootstrap intervals {'2': [33.247, 40.912], '5': [44.305, 64.93], '10': [54.709, 96.766], '25': [69.342, 169.086], '50': [83.578, 287.942], '100': [96.386, 463.762]}; landslide rainfall classifier, AUC out-of-sample — not a Caine-style I–D threshold with held-out AUC None on 0 events; modeled flood area 493.46 km².
- **Hazard method:** HAND valley mask only. This is a **local-min HAND proxy calibrated on this event**, not Whitebox HAND or an independently validated hydrodynamic model.
- **Calibration-event metrics:** Calibration-event metrics are unavailable; this plan does not invent a score..
- **Validation table:**
| Event | Role | CSI | POD | FAR |
|---|---|---:|---:|---:|
| calibration | in-sample calibration | not available | not available | not available |

Baselines (same 2024 domain): not computed. Permanent-water rule: permanent water excluded where available.
- **Counterfactual simulation:** Counterfactual exposure 0.0 → 0.0 (0.0% reduction; simulation using observed-flood fraction × population, not observed outcomes or unique lives).
- **Tail cross-check:** POT/GPD return levels {'2': 42.192, '5': 53.748, '10': 63.56, '25': 78.127, '50': 90.495, '100': 104.161} **[model output; different sample from the GEV headline]**.
- **Data gap:** GPM IMERG V07 is on NASA Earthdata (login). Not fused; headline is ISD GEV only.

## 3. Prioritized preventive interventions

Priority follows the optimizer's selected order. Coordinates are candidate centroids in EPSG:4326 and require site verification before procurement.

| Priority | Measure ID | Measure | Coordinates (lat, lon) | Budget USD | Annual expected people-risk avoided | Risk driver | Suitability evidence | Evidence basis |
|---:|---|---|---|---:|---:|---|---|---|
| 1 | blr_p_0275 | riverbank_bio | 12.97000, 77.56000 | 6,000 | 714.9 | flood | candidate inputs: slope 1.4°, land cover urban | Bioengineered riverbank protection (live crib walls, brush layering) per ICIMOD/DSCWM manuals. |
| 2 | blr_p_0274 | riverbank_bio | 12.97000, 77.54000 | 6,000 | 683.9 | flood | candidate inputs: slope 1.4°, land cover urban | Bioengineered riverbank protection (live crib walls, brush layering) per ICIMOD/DSCWM manuals. |
| 3 | blr_p_0253 | riverbank_bio | 12.99000, 77.60000 | 6,000 | 664.3 | flood | candidate inputs: slope 1.4°, land cover urban | Bioengineered riverbank protection (live crib walls, brush layering) per ICIMOD/DSCWM manuals. |
| 4 | blr_p_0205 | riverbank_bio | 13.03000, 77.60000 | 6,000 | 636.8 | flood | candidate inputs: slope 1.3°, land cover urban | Bioengineered riverbank protection (live crib walls, brush layering) per ICIMOD/DSCWM manuals. |
| 5 | blr_p_0226 | riverbank_bio | 13.01000, 77.54000 | 6,000 | 591.3 | flood | candidate inputs: slope 2.0°, land cover urban | Bioengineered riverbank protection (live crib walls, brush layering) per ICIMOD/DSCWM manuals. |
| 6 | blr_p_0251 | riverbank_bio | 12.99000, 77.56000 | 6,000 | 580.4 | flood | candidate inputs: slope 1.5°, land cover urban | Bioengineered riverbank protection (live crib walls, brush layering) per ICIMOD/DSCWM manuals. |
| 7 | blr_p_0203 | riverbank_bio | 13.03000, 77.56000 | 6,000 | 547.2 | flood | candidate inputs: slope 1.1°, land cover urban | Bioengineered riverbank protection (live crib walls, brush layering) per ICIMOD/DSCWM manuals. |
| 8 | blr_p_0252 | riverbank_bio | 12.99000, 77.58000 | 6,000 | 544.8 | flood | candidate inputs: slope 1.4°, land cover urban | Bioengineered riverbank protection (live crib walls, brush layering) per ICIMOD/DSCWM manuals. |
| 9 | blr_p_0224 | riverbank_bio | 13.01000, 77.50000 | 6,000 | 519.9 | flood | candidate inputs: slope 1.6°, land cover urban | Bioengineered riverbank protection (live crib walls, brush layering) per ICIMOD/DSCWM manuals. |
| 10 | blr_p_0204 | riverbank_bio | 13.03000, 77.58000 | 6,000 | 497.7 | flood | candidate inputs: slope 1.3°, land cover urban | Bioengineered riverbank protection (live crib walls, brush layering) per ICIMOD/DSCWM manuals. |
| 11 | blr_p_0206 | riverbank_bio | 13.03000, 77.62000 | 6,000 | 476.5 | flood | candidate inputs: slope 1.1°, land cover urban | Bioengineered riverbank protection (live crib walls, brush layering) per ICIMOD/DSCWM manuals. |
| 12 | blr_p_0273 | riverbank_bio | 12.97000, 77.52000 | 6,000 | 444.5 | flood | candidate inputs: slope 2.4°, land cover urban | Bioengineered riverbank protection (live crib walls, brush layering) per ICIMOD/DSCWM manuals. |

## 4. Budget and modeled outputs

| Measure | Sites | Modeled spend USD | Annual expected people-risk avoided |
|---|---:|---:|---:|
| wetland_restore | 52 | 1,872,000 | 45207.1 |
| riverbank_bio | 21 | 126,000 | 9046.4 |

- Budget ceiling: **$2,000,000**; modeled spend: **$1,998,000**; mode: **expected**.
- Annual expected people-risk avoided: **54253.6** **[model output; not unique people or observed lives saved]**.
- Ten-year carbon: **9,780 tCO₂** **[model output from literature factors]**.
- Annual livelihood-income potential: **$72,900** **[model output from per-hectare literature assumptions; not measured income, jobs, wages, or households reached]**.
- Optimality: Greedy gap vs relaxed knapsack upper bound: 0.00% (bound $272,485,877). Upper bound ignores per-cell overlap capping, so the true gap is smaller.

## 5. Assumptions and evidence basis

- **vetiver_slope** — cost 5,000 USD/ha; effect fraction 0.35; carbon 12.0 tCO₂/ha/10yr; income 600 USD/ha/yr. Source: Vetiver hedgerows cut slope erosion >90% (Truong et al.); cost/income from ICIMOD bioengineering field costings. **[literature assumption]**
- **bamboo_slope** — cost 4,000 USD/ha; effect fraction 0.30; carbon 45.0 tCO₂/ha/10yr; income 850 USD/ha/yr. Source: Bamboo root reinforcement for shallow landslides; bamboo is an established Nepali rural cash crop (INBAR). **[literature assumption]**
- **floodplain_restore** — cost 8,000 USD/ha; effect fraction 0.30; carbon 35.0 tCO₂/ha/10yr; income 300 USD/ha/yr. Source: NbS flood-depth reduction ~15-40% (UNEP); floodplain reconnection costs from World Bank NbS catalogue. **[literature assumption]**
- **wetland_restore** — cost 12,000 USD/ha; effect fraction 0.35; carbon 60.0 tCO₂/ha/10yr; income 400 USD/ha/yr. Source: Wetland attenuation of peak flows; high soil-carbon uptake (Ramsar / IPCC wetlands supplement). **[literature assumption]**
- **afforestation** — cost 3,000 USD/ha; effect fraction 0.20; carbon 80.0 tCO₂/ha/10yr; income 250 USD/ha/yr. Source: Catchment afforestation for slope stability and infiltration; sequestration from IPCC AFOLU defaults. **[literature assumption]**
- **riverbank_bio** — cost 6,000 USD/ha; effect fraction 0.25; carbon 20.0 tCO₂/ha/10yr; income 500 USD/ha/yr. Source: Bioengineered riverbank protection (live crib walls, brush layering) per ICIMOD/DSCWM manuals. **[literature assumption]**

The optimizer applies marginal greedy triple-return per dollar, per-cell EAL capping, and Monte-Carlo climate multipliers derived from the GEV 100-year confidence interval. **[model design assumption]**

Equity weighting (verbatim from hazard/proof.py _grid_features): rural = landcover in cropland/grass/shrub AND no critical_assets; dense = population at or above the 70th percentile of cell pops; low_income_score = 1.0 if (rural and dense) else (0.55 if rural else 0.15); equity_weight = 1.0 + 0.5 * low_income_score (range 1.075-1.5x). eal_people is multiplied by equity_weight, so low-income rural exposure ranks higher in expected-loss. **[model design assumption]**

No causal percentage is assigned to government, communities, or households. Implementation roles require local governance and community confirmation.

## 6. Monitoring and verification

- **Rainfall signal:** append observed NOAA ISD records annually; re-fit GEV and publish sample size, confidence interval, and any changed recurrence estimate.
- **Flood extent:** after qualifying events, derive observed Sentinel-1 extent and report POD, FAR, and CSI separately from the calibration event.
- **Intervention delivery:** verify each parcel centroid, boundary, measure type, area, and installation date through field sign-off plus dated optical imagery.
- **Carbon:** report planted/restored area and survival first; convert to tCO₂ only with the stated factor and uncertainty. Ground-sample biomass before claiming credits.
- **Risk performance:** compare post-event observed exposure with a pre-registered baseline; do not present the counterfactual simulation as an observed outcome.
- **Livelihoods:** measure participant payments or income directly before making beneficiary, household, job, or wage claims.

## 7. Limitations

- The flood surface is a screening-grade **local-min HAND proxy calibrated on the 27 Sep 2024 event**. Its event-fit CSI is low and is not independent validation.
- Hazard depths, EAL, avoided people-risk, carbon, income, and the optimized ranking are model outputs; field feasibility, tenure, ecological safeguards, and engineering design remain unverified.
- Candidate centroids are screening locations, not surveyed parcel boundaries.
- Literature effect sizes and unit costs may not transfer to local implementation conditions.
- The counterfactual is a simulation, not a prediction or measured causal effect.
- IMERG was not fused, and the HMA-pooled late GEV did not identify the Nepal-adjacent headline shift.
