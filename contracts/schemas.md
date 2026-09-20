# RootLedger artifact contracts

These contracts are the integration boundary between the signal, hazard, API, and
web modules.  They intentionally use ordinary JSON so the demo can run from a
local cache.  All amounts are USD, all rainfall depths are millimetres, areas
are hectares unless a key includes another unit, and coordinates are
`[longitude, latitude]` in EPSG:4326.

## Versioning and data-status rules

- Producers must write the keys marked **required**.  Consumers must tolerate
  additional keys.
- `provenance.generated_utc` is an ISO-8601 UTC timestamp and
  `provenance.datasets` names the actual source datasets used.
- A synthetic/demo artifact must say so in `provenance.data_status`; it must
  never be presented as an observed result.
- Numeric `null` means unavailable; never replace an unavailable result with
  zero.  Round display values only at the UI boundary.
- `signal.json` and `plan.json` have exactly one producer: Jeevith's modules.

## `signal.json`

**Required:** `region`, `stations_processed`, `station_years`,
`return_levels_mm`, `return_levels_ci95`, `headline`, `trend`,
`landslide_trigger`, `lake_growth`, `provenance`.

`return_levels_mm` maps return-period years as strings (`"2"`, `"5"`, …) to
GEV daily-rainfall return levels.  `return_levels_ci95[period]` is a two-item
`[lower, upper]` bootstrap 95% interval.  `headline` compares the early and
late climate samples: the old 100-year *depth* is evaluated against the late
distribution; `new_return_period_yrs` is the reciprocal of its late annual
exceedance probability.  The statement must not be emitted when either period
has fewer than 10 annual maxima.

`trend` is a linear trend in annual maxima, with a two-sided p-value.  The
landslide threshold uses hourly intensity `I` (mm/h) and duration `D` (h).
`auc` is from a held-out temporal split, not the training sample.  Each lake
entry is a named observed/derived annual water-area series summary.

## `hazard.geojson`

A GeoJSON `FeatureCollection`.  Each feature is a non-overlapping hazard cell
with required properties `cell_id`, `flood_depth_m`, `glof_depth_m`,
`landslide_prob`, `population`, `critical_assets`, `eal_people`, and
`eal_usd`.  `flood_depth_m` maps `rp10` and `rp100` to modelled depth.  EAL is
annual expected loss, not a count of distinct people.

## `candidates.json`

An array of feasible intervention parcels.  Required fields are `parcel_id`,
`type`, `area_ha`, `centroid`, `cell_ids`, `slope_deg`, and `landcover`.
`type` is one of `vetiver_slope`, `bamboo_slope`, `floodplain_restore`,
`wetland_restore`, `afforestation`, or `riverbank_bio`.

Generated candidates should also include `risk_driver`, `suitability_score`,
`suitability_evidence`, `rationale`, `data_status`, and `verification`. Candidate
type and area must follow deterministic terrain/hazard/land-cover rules; random
assignment is permitted only inside explicitly synthetic test fixtures.

## `plan.json`

**Required:** `budget_usd`, `mode`, `selected`, `totals`, `frontier`, `cvar`.
`mode` is `expected` or `cvar`.  Every selected entry has `parcel_id`,
`cost_usd`, `avoided_eal_people`, `co2_t_10yr`, and `income_usd_yr`.
`totals.people_protected` is the sum of annual expected people-risk avoided;
the UI must label it “annual expected people-risk avoided”, not unique lives.
`cvar.tail_people_protected` is the lower-tail (worst 10%) mean of the same
metric under the optimizer's stated scenario model.

`totals.households_benefiting` is nullable. It must remain `null` unless a
documented intervention-area employment/adoption model exists; exposed hazard
cell population must never be divided by average household size and presented
as livelihood beneficiaries.

## `backtest.json` and `attribution.json`

`backtest.json` contains the event metadata, observed and modelled flood area,
POD, FAR, CSI, and a counterfactual exposure comparison.  `attribution.json`
contains `government_pct`, `community_pct`, `household_pct` (which total 100),
and evidence-linked levers.  Neither is produced by Jeevith's modules, but the
fixtures below allow their consumers to work immediately.

## Fixture policy

`fixtures/` contains synthetic, internally consistent demo payloads.  They are
not observations, validations, citations, or claims about Nepal.  Replace each
fixture with the corresponding generated artifact before a real presentation.
