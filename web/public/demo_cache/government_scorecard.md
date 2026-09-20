# Preventive Measures Delivery Scorecard — hma

**Portfolio status:** counterfactual simulation — deterministic candidate suitability plus literature-based intervention effects; field verification required
**Evidence labels:** observed data · model output · literature assumption · counterfactual simulation

## Governance boundary

No causal responsibility percentages are reported. The implementation-lead mapping is a planning assumption,
not an empirical attribution, legal assignment, or allocation of blame.

## Public-sector delivery levers
- **floodplain_restore** — modeled portfolio spend $1,984,000, annual expected people-risk avoided 26306.08. Evidence: NbS flood-depth reduction ~15-40% (UNEP); floodplain reconnection costs from World Bank NbS catalogue.
- **drainage_and_glof_outlet** — modeled portfolio spend $not available, annual expected people-risk avoided not available. Evidence: Planning role only: zoning, drainage, and outlet works normally require public authority. No causal share or plan benefit is quantified.

## Modeled portfolio output

Spend $1,984,000 · annual expected people-risk avoided
26306.1 (not unique people or observed lives saved) ·
8,680 tCO₂ / 10 yr from literature factors.

## Hazard evidence

Observed UNOSAT Sentinel-1 extent is compared with a **local-min HAND proxy calibrated on this event**:
Copernicus GLO-30; local-min HAND proxy; CSI maximised on 27 Sep 2024 scene. Calibration-event CSI 0.053; this is not independent validation.

Counterfactual exposure is a simulation, not an observed outcome: {'people_exposed_baseline': 77057.1, 'people_exposed_with_plan': 54173.5, 'reduction_pct': 29.7, 'note': 'Counterfactual simulation: observed-flood-fraction × population, reduced by literature-based effects for the selected preventive measures. Not unique lives and not an observed intervention trial.', 'risk_layers': {'before': 'risk_before.geojson', 'with_plan': 'risk_with_plan.geojson'}}.
