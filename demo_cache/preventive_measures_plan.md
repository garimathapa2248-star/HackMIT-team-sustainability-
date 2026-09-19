# Preventive Measures Plan — hma

**Purpose:** screening-grade, funder-oriented preventive action plan (auto-filled from artifacts)
**Portfolio status:** counterfactual simulation — deterministic candidate suitability plus literature-based intervention effects; field verification required
**Evidence labels:** observed data · model output · literature assumption · counterfactual simulation

## 1. Decision context

Across High Mountain Asia NOAA ISD (498 stations / 12066 station-years). Nepal-adjacent GEV: The early-period 1-in-100-year daily rainfall depth now has a fitted recurrence of 7.75 years in the late-period sample. **[model output from observed NOAA ISD]**

Annual-max trend: **5.229 mm/decade**. **[model output]**

Lake-area series summary: Imja Tsho +113.3%, Thulagi +30.3%, Tsho Rolpa +26.6%. **[observed/derived inventory data]**

## 2. Evidence register

- **Observed data:** 498 NOAA stations / 12066 station-years; UNOSAT Sentinel-1 flood extent for 2024-09-27; observed flood area 134.18 km².
- **Model output:** GEV return levels {'2': 29.359, '5': 41.664, '10': 49.032, '25': 57.54, '50': 63.321, '100': 68.648} with bootstrap intervals {'2': [24.821, 35.525], '5': [34.902, 50.83], '10': [42.208, 57.082], '25': [48.437, 75.369], '50': [51.13, 94.577], '100': [52.984, 120.747]}; landslide rainfall classifier, AUC out-of-sample — not a Caine-style I–D threshold with held-out AUC 0.934 on 138 events; modeled flood area 221.82 km².
- **Hazard method:** Copernicus GLO-30; local-min HAND proxy; CSI maximised on 27 Sep 2024 scene. This is a **local-min HAND proxy calibrated on this event**, not Whitebox HAND or an independently validated hydrodynamic model.
- **Calibration-event metrics:** CSI 0.086, POD 0.211, FAR 0.873 (event 2024-09-27; calibration-event fit, not independent validation).
- **Counterfactual simulation:** Counterfactual exposure 54993.4 → 38912.4 (29.24% reduction; simulation using observed-flood fraction × population, not observed outcomes or unique lives).
- **Tail cross-check:** POT/GPD return levels {'2': 230.253, '5': 282.957, '10': 324.123, '25': 380.314, '50': 424.203, '100': 469.32} **[model output; different sample from the GEV headline]**.
- **Data gap:** Daily IMERG is not on an unauthenticated public URL. Use Google Earth Engine NASA/GPM_L3/IMERG_V07 or Earthdata if credentials exist. RootLedger's headline remains NOAA ISD GEV.

## 3. Prioritized preventive interventions

Priority follows the optimizer's selected order. Coordinates are candidate centroids in EPSG:4326 and require site verification before procurement.

| Priority | Measure ID | Measure | Coordinates (lat, lon) | Budget USD | Annual expected people-risk avoided | Risk driver | Suitability evidence | Evidence basis |
|---:|---|---|---|---:|---:|---|---|---|
| 1 | p_c_00098_floodplain_restore | floodplain_restore | 26.53000, 87.14000 | 32,000 | 2499.3 | modelled_flood_exposure_and_rp100_depth | score 0.235; modeled_flood_fraction: 0.013; observed_flood_fraction: 0.006; flood_depth_rp100_m: 0.12; glof_depth_m: 0.0; landcover: cropland; +8 more fields | method: deterministic_cell_rules_v1; source_cell_id: c_00098; source_fields: ['cell_population', 'channel_proximity', 'critical_assets', 'eal_people', 'eal_usd', 'flood_depth_data_status', 'flood_depth_rp100_m', 'glof_depth_m', 'landcover', 'landcover_data_status', 'modeled_flood_fraction', 'observed_flood_fraction', 'population_data_status']; geometry_basis: hazard.geojson cell geometry; area_basis: 4.0 ha type-level screening footprint assumption; not measured from raster or cadastral data |
| 2 | p_c_00115_floodplain_restore | floodplain_restore | 26.45000, 87.14000 | 32,000 | 1886.9 | modelled_flood_exposure_and_rp100_depth | score 0.28; modeled_flood_fraction: 0.074; observed_flood_fraction: 0.012; flood_depth_rp100_m: 0.35; glof_depth_m: 0.0; landcover: cropland; +8 more fields | method: deterministic_cell_rules_v1; source_cell_id: c_00115; source_fields: ['cell_population', 'channel_proximity', 'critical_assets', 'eal_people', 'eal_usd', 'flood_depth_data_status', 'flood_depth_rp100_m', 'glof_depth_m', 'landcover', 'landcover_data_status', 'modeled_flood_fraction', 'observed_flood_fraction', 'population_data_status']; geometry_basis: hazard.geojson cell geometry; area_basis: 4.0 ha type-level screening footprint assumption; not measured from raster or cadastral data |
| 3 | p_c_00080_floodplain_restore | floodplain_restore | 26.61000, 87.06000 | 32,000 | 1480.3 | modelled_flood_exposure_and_rp100_depth | score 0.232; modeled_flood_fraction: 0.009; observed_flood_fraction: 0.004; flood_depth_rp100_m: 0.05; glof_depth_m: 0.0; landcover: cropland; +8 more fields | method: deterministic_cell_rules_v1; source_cell_id: c_00080; source_fields: ['cell_population', 'channel_proximity', 'critical_assets', 'eal_people', 'eal_usd', 'flood_depth_data_status', 'flood_depth_rp100_m', 'glof_depth_m', 'landcover', 'landcover_data_status', 'modeled_flood_fraction', 'observed_flood_fraction', 'population_data_status']; geometry_basis: hazard.geojson cell geometry; area_basis: 4.0 ha type-level screening footprint assumption; not measured from raster or cadastral data |
| 4 | p_c_00116_floodplain_restore | floodplain_restore | 26.45000, 87.22000 | 32,000 | 1320.8 | modelled_flood_exposure_and_rp100_depth | score 0.23; modeled_flood_fraction: 0.006; observed_flood_fraction: 0.003; flood_depth_rp100_m: 0.05; glof_depth_m: 0.0; landcover: cropland; +8 more fields | method: deterministic_cell_rules_v1; source_cell_id: c_00116; source_fields: ['cell_population', 'channel_proximity', 'critical_assets', 'eal_people', 'eal_usd', 'flood_depth_data_status', 'flood_depth_rp100_m', 'glof_depth_m', 'landcover', 'landcover_data_status', 'modeled_flood_fraction', 'observed_flood_fraction', 'population_data_status']; geometry_basis: hazard.geojson cell geometry; area_basis: 4.0 ha type-level screening footprint assumption; not measured from raster or cadastral data |
| 5 | p_c_00064_floodplain_restore | floodplain_restore | 26.69000, 87.14000 | 32,000 | 788.2 | modelled_flood_exposure_and_rp100_depth | score 0.228; modeled_flood_fraction: 0.0; observed_flood_fraction: 0.004; flood_depth_rp100_m: 0.05; glof_depth_m: 0.0; landcover: cropland; +8 more fields | method: deterministic_cell_rules_v1; source_cell_id: c_00064; source_fields: ['cell_population', 'channel_proximity', 'critical_assets', 'eal_people', 'eal_usd', 'flood_depth_data_status', 'flood_depth_rp100_m', 'glof_depth_m', 'landcover', 'landcover_data_status', 'modeled_flood_fraction', 'observed_flood_fraction', 'population_data_status']; geometry_basis: hazard.geojson cell geometry; area_basis: 4.0 ha type-level screening footprint assumption; not measured from raster or cadastral data |
| 6 | p_c_00097_floodplain_restore | floodplain_restore | 26.53000, 87.06000 | 32,000 | 769.6 | modelled_flood_exposure_and_rp100_depth | score 0.28; modeled_flood_fraction: 0.074; observed_flood_fraction: 0.033; flood_depth_rp100_m: 0.36; glof_depth_m: 0.0; landcover: cropland; +8 more fields | method: deterministic_cell_rules_v1; source_cell_id: c_00097; source_fields: ['cell_population', 'channel_proximity', 'critical_assets', 'eal_people', 'eal_usd', 'flood_depth_data_status', 'flood_depth_rp100_m', 'glof_depth_m', 'landcover', 'landcover_data_status', 'modeled_flood_fraction', 'observed_flood_fraction', 'population_data_status']; geometry_basis: hazard.geojson cell geometry; area_basis: 4.0 ha type-level screening footprint assumption; not measured from raster or cadastral data |
| 7 | p_c_00047_floodplain_restore | floodplain_restore | 26.77000, 87.14000 | 32,000 | 696.5 | modelled_flood_exposure_and_rp100_depth | score 0.251; modeled_flood_fraction: 0.002; observed_flood_fraction: 0.034; flood_depth_rp100_m: 0.16; glof_depth_m: 0.0; landcover: cropland; +8 more fields | method: deterministic_cell_rules_v1; source_cell_id: c_00047; source_fields: ['cell_population', 'channel_proximity', 'critical_assets', 'eal_people', 'eal_usd', 'flood_depth_data_status', 'flood_depth_rp100_m', 'glof_depth_m', 'landcover', 'landcover_data_status', 'modeled_flood_fraction', 'observed_flood_fraction', 'population_data_status']; geometry_basis: hazard.geojson cell geometry; area_basis: 4.0 ha type-level screening footprint assumption; not measured from raster or cadastral data |
| 8 | p_c_00096_floodplain_restore | floodplain_restore | 26.53000, 86.98000 | 32,000 | 528.7 | modelled_flood_exposure_and_rp100_depth | score 0.257; modeled_flood_fraction: 0.02; observed_flood_fraction: 0.043; flood_depth_rp100_m: 0.07; glof_depth_m: 0.0; landcover: cropland; +8 more fields | method: deterministic_cell_rules_v1; source_cell_id: c_00096; source_fields: ['cell_population', 'channel_proximity', 'critical_assets', 'eal_people', 'eal_usd', 'flood_depth_data_status', 'flood_depth_rp100_m', 'glof_depth_m', 'landcover', 'landcover_data_status', 'modeled_flood_fraction', 'observed_flood_fraction', 'population_data_status']; geometry_basis: hazard.geojson cell geometry; area_basis: 4.0 ha type-level screening footprint assumption; not measured from raster or cadastral data |
| 9 | p_c_00063_floodplain_restore | floodplain_restore | 26.69000, 87.06000 | 32,000 | 453.3 | modelled_flood_exposure_and_rp100_depth | score 0.293; modeled_flood_fraction: 0.004; observed_flood_fraction: 0.091; flood_depth_rp100_m: 0.05; glof_depth_m: 0.0; landcover: cropland; +8 more fields | method: deterministic_cell_rules_v1; source_cell_id: c_00063; source_fields: ['cell_population', 'channel_proximity', 'critical_assets', 'eal_people', 'eal_usd', 'flood_depth_data_status', 'flood_depth_rp100_m', 'glof_depth_m', 'landcover', 'landcover_data_status', 'modeled_flood_fraction', 'observed_flood_fraction', 'population_data_status']; geometry_basis: hazard.geojson cell geometry; area_basis: 4.0 ha type-level screening footprint assumption; not measured from raster or cadastral data |
| 10 | p_c_00069_floodplain_restore | floodplain_restore | 26.61000, 86.18000 | 32,000 | 417.2 | modelled_flood_exposure_and_rp100_depth | score 0.236; modeled_flood_fraction: 0.007; observed_flood_fraction: 0.014; flood_depth_rp100_m: 0.13; glof_depth_m: 0.0; landcover: cropland; +8 more fields | method: deterministic_cell_rules_v1; source_cell_id: c_00069; source_fields: ['cell_population', 'channel_proximity', 'critical_assets', 'eal_people', 'eal_usd', 'flood_depth_data_status', 'flood_depth_rp100_m', 'glof_depth_m', 'landcover', 'landcover_data_status', 'modeled_flood_fraction', 'observed_flood_fraction', 'population_data_status']; geometry_basis: hazard.geojson cell geometry; area_basis: 4.0 ha type-level screening footprint assumption; not measured from raster or cadastral data |
| 11 | p_c_00035_floodplain_restore | floodplain_restore | 26.77000, 86.18000 | 32,000 | 380.1 | modelled_flood_exposure_and_rp100_depth | score 0.24; modeled_flood_fraction: 0.0; observed_flood_fraction: 0.02; flood_depth_rp100_m: 0.15; glof_depth_m: 0.0; landcover: cropland; +8 more fields | method: deterministic_cell_rules_v1; source_cell_id: c_00035; source_fields: ['cell_population', 'channel_proximity', 'critical_assets', 'eal_people', 'eal_usd', 'flood_depth_data_status', 'flood_depth_rp100_m', 'glof_depth_m', 'landcover', 'landcover_data_status', 'modeled_flood_fraction', 'observed_flood_fraction', 'population_data_status']; geometry_basis: hazard.geojson cell geometry; area_basis: 4.0 ha type-level screening footprint assumption; not measured from raster or cadastral data |
| 12 | p_c_00093_floodplain_restore | floodplain_restore | 26.53000, 86.74000 | 32,000 | 376.7 | modelled_flood_exposure_and_rp100_depth | score 0.227; modeled_flood_fraction: 0.0; observed_flood_fraction: 0.003; flood_depth_rp100_m: 0.05; glof_depth_m: 0.0; landcover: cropland; +8 more fields | method: deterministic_cell_rules_v1; source_cell_id: c_00093; source_fields: ['cell_population', 'channel_proximity', 'critical_assets', 'eal_people', 'eal_usd', 'flood_depth_data_status', 'flood_depth_rp100_m', 'glof_depth_m', 'landcover', 'landcover_data_status', 'modeled_flood_fraction', 'observed_flood_fraction', 'population_data_status']; geometry_basis: hazard.geojson cell geometry; area_basis: 4.0 ha type-level screening footprint assumption; not measured from raster or cadastral data |

## 4. Budget and modeled outputs

| Measure | Sites | Modeled spend USD | Annual expected people-risk avoided |
|---|---:|---:|---:|
| floodplain_restore | 55 | 1,760,000 | 16058.3 |

- Budget ceiling: **$2,000,000**; modeled spend: **$1,760,000**; mode: **expected**.
- Annual expected people-risk avoided: **16058.3** **[model output; not unique people or observed lives saved]**.
- Ten-year carbon: **7,700 tCO₂** **[model output from literature factors]**.
- Annual livelihood-income potential: **$66,000** **[model output from per-hectare literature assumptions; not measured income, jobs, wages, or households reached]**.

## 5. Assumptions and evidence basis

- **vetiver_slope** — cost 5,000 USD/ha; effect fraction 0.35; carbon 12.0 tCO₂/ha/10yr; income 600 USD/ha/yr. Source: Vetiver hedgerows cut slope erosion >90% (Truong et al.); cost/income from ICIMOD bioengineering field costings. **[literature assumption]**
- **bamboo_slope** — cost 4,000 USD/ha; effect fraction 0.30; carbon 45.0 tCO₂/ha/10yr; income 850 USD/ha/yr. Source: Bamboo root reinforcement for shallow landslides; bamboo is an established Nepali rural cash crop (INBAR). **[literature assumption]**
- **floodplain_restore** — cost 8,000 USD/ha; effect fraction 0.30; carbon 35.0 tCO₂/ha/10yr; income 300 USD/ha/yr. Source: NbS flood-depth reduction ~15-40% (UNEP); floodplain reconnection costs from World Bank NbS catalogue. **[literature assumption]**
- **wetland_restore** — cost 12,000 USD/ha; effect fraction 0.35; carbon 60.0 tCO₂/ha/10yr; income 400 USD/ha/yr. Source: Wetland attenuation of peak flows; high soil-carbon uptake (Ramsar / IPCC wetlands supplement). **[literature assumption]**
- **afforestation** — cost 3,000 USD/ha; effect fraction 0.20; carbon 80.0 tCO₂/ha/10yr; income 250 USD/ha/yr. Source: Catchment afforestation for slope stability and infiltration; sequestration from IPCC AFOLU defaults. **[literature assumption]**
- **riverbank_bio** — cost 6,000 USD/ha; effect fraction 0.25; carbon 20.0 tCO₂/ha/10yr; income 500 USD/ha/yr. Source: Bioengineered riverbank protection (live crib walls, brush layering) per ICIMOD/DSCWM manuals. **[literature assumption]**

The optimizer applies marginal greedy triple-return per dollar, per-cell EAL capping, and Monte-Carlo climate multipliers derived from the GEV 100-year confidence interval. **[model design assumption]**

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
