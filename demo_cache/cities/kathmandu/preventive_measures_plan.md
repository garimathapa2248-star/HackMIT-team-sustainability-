# Preventive Measures Plan — kathmandu

**SCREENING-GRADE WATERMARK.** Not an engineering design, not a field-verified parcel survey, not an observed intervention trial.
**Purpose:** screening-grade, funder-oriented preventive action plan (auto-filled from artifacts)
**Portfolio status:** counterfactual simulation — deterministic candidate suitability plus literature-based intervention effects; field verification required
**Evidence labels:** observed data · model output · literature assumption · counterfactual simulation

## 1. Decision context

Late-period GEV did not identify a credible intensification of the early 100-year depth (raw fitted recurrence 2.27e+09 yr discarded as unstable). **[model output from observed NOAA ISD]**

Annual-max trend: **-3.941 mm/decade**. **[model output]**

Lake-area series summary: not available. **[observed/derived inventory data]**

Independent check (ERA5-Land at the same station coordinates): **partially replicates** (16.72-yr vs ISD 7.75-yr; annmax Pearson r=0.179, mean bias 53.4 mm). quasi-independent: reanalysis assimilates some gauges, but it is a different measurement and modeling system from raw ISD station records **[model output on reanalysis]**

## 2. Evidence register

- **Observed data:** 1 NOAA stations / 45 station-years; UNOSAT Sentinel-1 flood extent for None; observed flood area not available km².
- **Model output:** GEV return levels {'2': 96.21, '5': 146.786, '10': 191.699, '25': 265.948, '50': 337.268, '100': 425.539} with bootstrap intervals {'2': [52.466, 113.672], '5': [121.52, 6441.093], '10': [152.166, 295.982], '25': [190.948, 382.68], '50': [217.394, 578.831], '100': [245.491, 881.175]}; landslide rainfall classifier, AUC out-of-sample — not a Caine-style I–D threshold with held-out AUC None on 0 events; modeled flood area 493.46 km².
- **Hazard method:** HAND valley mask only. This is a **local-min HAND proxy calibrated on this event**, not Whitebox HAND or an independently validated hydrodynamic model.
- **Calibration-event metrics:** Calibration-event metrics are unavailable; this plan does not invent a score..
- **Validation table:**
| Event | Role | CSI | POD | FAR |
|---|---|---:|---:|---:|
| calibration | in-sample calibration | not available | not available | not available |

Baselines (same 2024 domain): not computed. Permanent-water rule: permanent water excluded where available.
- **Counterfactual simulation:** Counterfactual exposure 0.0 → 0.0 (0.0% reduction; simulation using observed-flood fraction × population, not observed outcomes or unique lives).
- **Tail cross-check:** POT/GPD return levels {'2': 113.328, '5': 165.574, '10': 216.994, '25': 305.72, '50': 393.044, '100': 502.739} **[model output; different sample from the GEV headline]**.
- **Data gap:** GPM IMERG V07 is on NASA Earthdata (login). Not fused; headline is ISD GEV only.

## 3. Prioritized preventive interventions

Priority follows the optimizer's selected order. Coordinates are candidate centroids in EPSG:4326 and require site verification before procurement.

| Priority | Measure ID | Measure | Coordinates (lat, lon) | Budget USD | Annual expected people-risk avoided | Risk driver | Suitability evidence | Evidence basis |
|---:|---|---|---|---:|---:|---|---|---|
| 1 | kat_p_0230 | wetland_restore | 27.73669, 85.34060 | 36,000 | 3794.4 | flood | candidate inputs: slope 1.7°, land cover wetland | Wetland attenuation of peak flows; high soil-carbon uptake (Ramsar / IPCC wetlands supplement). |
| 2 | kat_p_0253 | wetland_restore | 27.71669, 85.32060 | 36,000 | 3578.7 | flood | candidate inputs: slope 0.9°, land cover wetland | Wetland attenuation of peak flows; high soil-carbon uptake (Ramsar / IPCC wetlands supplement). |
| 3 | kat_p_0278 | wetland_restore | 27.69669, 85.34060 | 36,000 | 3463.0 | flood | candidate inputs: slope 1.1°, land cover wetland | Wetland attenuation of peak flows; high soil-carbon uptake (Ramsar / IPCC wetlands supplement). |
| 4 | kat_p_0254 | wetland_restore | 27.71669, 85.34060 | 36,000 | 3381.5 | flood | candidate inputs: slope 1.8°, land cover wetland | Wetland attenuation of peak flows; high soil-carbon uptake (Ramsar / IPCC wetlands supplement). |
| 5 | kat_p_0252 | wetland_restore | 27.71669, 85.30060 | 36,000 | 2916.4 | flood | candidate inputs: slope 1.4°, land cover wetland | Wetland attenuation of peak flows; high soil-carbon uptake (Ramsar / IPCC wetlands supplement). |
| 6 | kat_p_0255 | wetland_restore | 27.71669, 85.36060 | 36,000 | 2737.3 | flood | candidate inputs: slope 1.9°, land cover wetland | Wetland attenuation of peak flows; high soil-carbon uptake (Ramsar / IPCC wetlands supplement). |
| 7 | kat_p_0276 | wetland_restore | 27.69669, 85.30060 | 36,000 | 2658.1 | flood | candidate inputs: slope 1.4°, land cover wetland | Wetland attenuation of peak flows; high soil-carbon uptake (Ramsar / IPCC wetlands supplement). |
| 8 | kat_p_0228 | afforestation | 27.73669, 85.30060 | 9,000 | 618.7 | landslide | candidate inputs: slope 5.7°, land cover shrub | Catchment afforestation for slope stability and infiltration; sequestration from IPCC AFOLU defaults. |
| 9 | kat_p_0277 | wetland_restore | 27.69669, 85.32060 | 36,000 | 2195.6 | flood | candidate inputs: slope 0.9°, land cover wetland | Wetland attenuation of peak flows; high soil-carbon uptake (Ramsar / IPCC wetlands supplement). |
| 10 | kat_p_0302 | wetland_restore | 27.67669, 85.34060 | 36,000 | 1634.8 | flood | candidate inputs: slope 1.3°, land cover wetland | Wetland attenuation of peak flows; high soil-carbon uptake (Ramsar / IPCC wetlands supplement). |
| 11 | kat_p_0232 | wetland_restore | 27.73669, 85.38060 | 36,000 | 1518.9 | flood | candidate inputs: slope 4.2°, land cover wetland | Wetland attenuation of peak flows; high soil-carbon uptake (Ramsar / IPCC wetlands supplement). |
| 12 | kat_p_0229 | wetland_restore | 27.73669, 85.32060 | 36,000 | 1494.2 | flood | candidate inputs: slope 1.5°, land cover urban | Wetland attenuation of peak flows; high soil-carbon uptake (Ramsar / IPCC wetlands supplement). |

## 4. Budget and modeled outputs

| Measure | Sites | Modeled spend USD | Annual expected people-risk avoided |
|---|---:|---:|---:|
| wetland_restore | 52 | 1,872,000 | 49642.5 |
| afforestation | 14 | 126,000 | 1462.2 |

- Budget ceiling: **$2,000,000**; modeled spend: **$1,998,000**; mode: **expected**.
- Annual expected people-risk avoided: **51104.8** **[model output; not unique people or observed lives saved]**.
- Ten-year carbon: **12,720 tCO₂** **[model output from literature factors]**.
- Annual livelihood-income potential: **$72,900** **[model output from per-hectare literature assumptions; not measured income, jobs, wages, or households reached]**.
- Optimality: Greedy gap vs relaxed knapsack upper bound: -0.00% (bound $256,888,875). Upper bound ignores per-cell overlap capping, so the true gap is smaller.

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
