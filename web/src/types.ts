export type View =
  | "overview" | "noise" | "signal" | "plan" | "proof" | "actors" | "ask" | "export" | "branch";
export type OptimizationMode = "expected" | "cvar";
export type OptimizerState = "checking" | "live" | "frozen" | "unavailable";
export type OverlayMode = "none" | "observed" | "modeled" | "both";

export type Signal = {
  stations_processed: number;
  station_years: number;
  return_levels_mm: Record<string, number>;
  return_levels_ci95: Record<string, [number, number]>;
  region?: string;
  headline: {
    statement: string;
    /** null on Kathmandu: the late-period GEV fit was discarded as unstable. */
    new_return_period_yrs: number | null;
    raw_fitted_return_period_yrs?: number;
    old_return_period_yrs: number;
    early_period?: [number, number];
    late_period?: [number, number];
    headline_region?: string;
  };
  trend: { slope_mm_per_decade: number; p_value: number };
  landslide_trigger: {
    auc: number | null;
    n_events: number;
    presentation?: string;
    kind?: string;
    skipped_far_from_station?: number;
    skipped_data_gap?: number;
  };
  lake_growth: { name: string; pct_growth: number }[];
  /** Koshi only. */
  pot_gpd?: {
    threshold_mm?: number; n_excesses?: number; n_years?: number;
    shape?: number; scale?: number; return_levels_mm?: Record<string, number>;
    method?: string; note?: string;
  };
  imerg?: { available?: boolean; product?: string; reason?: string };
  hazard_classes?: Record<string, unknown> & { source?: string; not?: string };
  recommendations?: {
    hazard: string; level?: string; technical?: string;
    climate_change?: string; linked_measure_types?: string[]; source?: string;
  }[];
  provenance?: {
    data_status?: string;
    headline_note?: string;
    method?: string;
  };
};

export type SelectedMeasure = {
  parcel_id: string;
  type?: string;
  priority_rank?: number;
  selected_in_both_objectives?: boolean;
  cost_usd: number;
  avoided_eal_people: number;
  co2_t_10yr: number;
  income_usd_yr: number;
  low_income_score?: number | null;
  equity_weight?: number | null;
};

export type ScreeningFactor = {
  type: string;
  cost_per_ha?: number;
  eal_reduction_frac?: number;
  co2_t_per_ha_10yr?: number;
  income_usd_per_ha_yr?: number;
  primary_hazard?: string;
  source?: string;
};

export type Plan = {
  budget_usd: number;
  mode: string;
  selected: SelectedMeasure[];
  totals: {
    cost_usd: number;
    people_protected: number;
    co2_t_10yr: number;
    income_usd_yr: number;
    households_benefiting: number | null;
    exposure_reduction_pct?: number;
  };
  frontier: FrontierPoint[];
  /** Koshi only — city packs ship a 9-key plan.json without any of the blocks below. */
  appraisal?: Appraisal;
  objectives?: Objective[];
  pathways?: Pathways;
  exceedance?: Exceedance;
  waterfall?: Waterfall;
  regret?: Regret;
  equity?: Equity;
  event_view?: EventView;
  infographic?: Infographic;
  measure_catalog?: CatalogRow[];
  robustness?: Robustness;
  cvar?: { mode_available?: boolean; tail_people_protected?: number; alpha?: number };
  optimality?: {
    greedy_value_usd?: number | null;
    knapsack_upper_bound_usd?: number | null;
    gap_pct?: number | null;
    note?: string;
  };
  provenance?: {
    data_status?: string;
    candidates_note?: string;
    method?: string;
    factors?: ScreeningFactor[];
    monetisation?: {
      value_per_person_yr_usd?: number;
      price_co2_per_t_usd?: number;
      income_value_years?: number;
    };
  };
};

export type FrontierPoint = {
  budget_usd: number; cost_usd?: number; n_selected?: number;
  people_protected: number; co2_t_10yr: number;
  income_usd_yr?: number; benefit_usd?: number; bcr?: number;
};

export type NpvSeriesRow = {
  year: number; benefits_usd: number; costs_usd: number; net_usd: number;
  benefits_discounted_usd: number; costs_discounted_usd: number;
};

export type Appraisal = {
  benefit_usd?: number; bcr?: number;
  residual_people_risk?: number; residual_pct?: number;
  baseline_people_risk?: number; climate_freq_mult?: number; note?: string;
  npv?: {
    horizon?: [number, number]; discount_rate?: number; alt_discount_rate?: number;
    implementation_cost_usd?: number; annual_maint_cost_usd?: number; om_frac_of_capex_yr?: number;
    benefits_npv_usd?: number; costs_npv_usd?: number;
    npv_usd?: number; npv_usd_at_alt?: number;
    bcr_npv?: number; bcr_npv_at_alt?: number;
    irr?: number | null; series?: NpvSeriesRow[]; note?: string;
  };
};

export type Objective = {
  id: string; label: string; n_selected: number; cost_usd: number;
  people_protected: number; tail_people_protected?: number;
  co2_t_10yr: number; income_usd_yr: number; parcel_ids?: string[];
};

export type Pathways = {
  trigger?: string; note?: string;
  transferable_core_n?: number; transferable_core?: string[];
  phases: {
    id: string; year: number; budget_usd: number; cost_usd: number; n_selected: number;
    people_protected: number; residual_people_risk?: number;
    parcel_ids?: string[]; blurb?: string;
  }[];
};

export type Exceedance = {
  unit?: string; method?: string;
  eal_no_measures?: number; eal_with_plan?: number;
  points: { rp_yr: number; no_measures: number; with_plan: number; averted: number }[];
};

export type Waterfall = {
  present_year?: number; future_year?: number;
  present_people_risk?: number; future_no_measures?: number;
  climate_increment?: number; development_increment?: number;
  averted_by_plan?: number; residual_future?: number;
  adaptation_closes_pct_of_climate_increment?: number; note?: string;
};

export type Regret = {
  climates?: string[]; metric?: string; robust_pick?: string; note?: string;
  table: {
    strategy: string; label: string; current: number;
    intensified_tail: number; cvar_tail: number;
    regret_current: number; regret_intensified: number; max_regret_people: number;
  }[];
};

export type Equity = {
  method?: string; high_equity_threshold?: number;
  people_protected_high_equity?: number; people_protected_other?: number;
  share_of_benefit_high_equity_pct?: number; residual_share_high_equity_pct?: number;
  note?: string;
};

/** Return-period keys arrive as strings ("10", "100"), not numbers. */
export type EventView = {
  return_periods?: number[]; depth_threshold_m?: number;
  no_measures?: Record<string, number>; with_plan?: Record<string, number>; note?: string;
};

export type Infographic = {
  period_yr?: number; depth_threshold_m?: number; p30_rp10?: number; cells?: number;
  people_likely_flooded_no_measures?: number; people_likely_flooded_with_plan?: number;
  p30_formula?: string; note?: string;
};

export type CatalogRow = {
  type: string; category?: string; primary_hazard?: string;
  cost_per_ha?: number; eal_reduction_frac?: number; lifetime_yr?: number;
  om_frac_of_capex_yr?: number; n_selected: number; spend_usd: number;
  source?: string; out_of_catalog?: boolean; note?: string;
};

export type Robustness = {
  comparison_mode?: string; selected_in_both_count?: number;
  selected_count?: number; overlap_pct?: number; interpretation?: string;
};

/** Per-site screening evidence. Koshi candidates only; city packs ship 7 keys. */
export type SuitabilityEvidence = {
  modeled_flood_fraction?: number | null;
  observed_flood_fraction?: number | null;
  flood_depth_rp100_m?: number | null;
  glof_depth_m?: number | null;
  landcover?: string | null;
  channel_proximity?: number | string | null;
  cell_population?: number | null;
  critical_assets?: string[] | null;
  eal_people?: number | null;
  eal_usd?: number | null;
  population_data_status?: string;
  landcover_data_status?: string;
  flood_depth_data_status?: string;
};

export type AttributionLever = {
  lever: string;
  implementation_lead?: string;
  /** Always null by API design — never draw a responsibility pie chart. */
  risk_share_pct: null;
  plan_spend_usd: number | null;
  annual_expected_people_risk_avoided: number | null;
  risk_driver?: string;
  source?: string;
};

export type Attribution = {
  government_pct: null; community_pct: null; household_pct: null;
  quantified_responsibility_split_available: boolean;
  government_levers: AttributionLever[];
  community_levers: AttributionLever[];
  household_levers: AttributionLever[];
  driver_shares: null;
  provenance?: { data_status?: string; method?: string; generated_utc?: string; api_note?: string };
};

export type RankPlace = {
  id: string; name: string; is_country?: boolean; rank: number | null;
  stations?: number; new_return_period_yrs?: number | null; fit?: string; note?: string;
  classes?: { flood?: string; landslide?: string; glof?: string };
  class_evidence?: { flood?: string; landslide?: string; glof?: string };
  composite?: number | null;
};

export type Rankings = {
  region?: string; sort?: string; places: RankPlace[]; control?: RankPlace;
  provenance?: { data_status?: string; stations_source?: string; not?: string; method?: string };
};

export type Scenarios = {
  site?: string; kernel?: string; climate_freq_mult?: number;
  events?: { name: string; type?: string; date?: string; source?: string; kind?: string }[];
  projections?: {
    name: string; description?: string;
    old_return_period_yrs?: number; new_return_period_yrs?: number;
  }[];
  strategies?: {
    name: string; description?: string; n_selected?: number;
    cost_usd?: number; people_protected?: number;
  }[];
  scenarios?: {
    name: string; event?: string; projection?: string; strategy?: string;
    people_risk_eal?: number; people_exposed_event?: number;
  }[];
  compare?: { strategy: string; projection: string; people_risk_eal: number }[];
  waterfall?: Waterfall;
  provenance?: { data_status?: string; method?: string; source?: string };
};

export type CandidateSite = {
  parcel_id: string;
  type: string;
  centroid: [number, number];
  area_ha: number;
  cell_ids: string[];
  slope_deg?: number;
  landcover?: string;
  what?: string;
  description?: string;
  why?: string;
  rationale?: string;
  suitability?: string;
  suitability_reason?: string;
  cost_usd?: number;
  benefit?: string;
  assumption?: string | string[];
  assumptions?: string | string[];
  monitoring?: string;
  evidence?: string;
  source?: string;
  primary_hazard?: string;
  triggering_hazard?: string;
  risk_driver?: string;
  suitability_score?: number;
  suitability_evidence?: SuitabilityEvidence;
  geometry?: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  geometry_scope?: string;
  intervention_type?: string;
  exposed_population?: number | null;
  exposed_assets?: string[] | null;
  exposure_scope?: string;
  provenance?: string;
  data_status?: string;
  required_verification?: string[];
  verification?: string | string[];
};

export type SkillRow = {
  scale_deg: number;
  approx_km?: number;
  pod?: number;
  far?: number;
  csi?: number;
};

export type SkillEvent = {
  event_date?: string;
  source?: string;
  hit_rate_pod?: number | null;
  false_alarm_ratio?: number | null;
  critical_success_index?: number | null;
  observed_flood_km2?: number | null;
  modeled_flood_km2?: number | null;
  note?: string;
  counts?: Counts;
  skill_vs_scale?: SkillRow[];
  baselines?: {
    jrc_seasonal_water?: { csi?: number | null; definition?: string };
    area_matched_elevation?: { csi?: number | null; definition?: string };
  };
};

export type Counts = { tp: number; fp: number; fn: number; tn: number };

export type Backtest = {
  critical_success_index: number | null;
  hit_rate_pod?: number | null;
  false_alarm_ratio?: number | null;
  observed_flood_km2?: number | null;
  modeled_flood_km2?: number | null;
  sar_scene?: string;
  event_date?: string;
  permanent_water_mask?: string;
  evaluation_domain?: string;
  skill_vs_scale?: SkillRow[];
  counts?: Counts;
  baselines?: SkillEvent["baselines"];
  frozen_model?: { method?: string; stage_m?: number; hand_window_px?: number; frozen_on?: string };
  /** Reverse direction: calibrated on 2017, applied frozen to 2024. Koshi only. */
  cross_validation?: {
    calibrate_2017_test_2024_csi?: number | null;
    calibrate_2017_insample_csi?: number | null;
    model_calibrated_on_2017?: { method?: string; stage_m?: number; hand_window_px?: number };
    note?: string;
  };
  validation?: SkillEvent;
  spatial_holdout?: SkillEvent & { kind?: string; split?: string };
  provenance?: { data_status?: string; method?: string };
  counterfactual?: {
    people_exposed_baseline?: number | null;
    people_exposed_with_plan?: number | null;
    reduction_pct?: number | null;
    note?: string;
  };
};

export type Replication = {
  verdict?: string;
  verdict_note?: string;
  isd_headline_new_return_yrs?: number;
  era5_headline_new_return_yrs?: number | null;
  era5_headline_statement?: string;
  independence?: string;
  agreement?: {
    stations_compared?: number;
    annmax_pearson_r?: number | null;
    mean_bias_mm?: number | null;
    scatter?: { station: string; isd_mm: number; era5_mm: number }[];
  };
};

export type Noise = {
  scale: { stations_processed: number; station_years: number; compute: string; source: string };
  reproducible_subset: {
    note: string;
    stations: number;
    station_years_requested: number;
    station_years_no_record: number;
    station_years_no_record_pct: number;
    station_days_clean: number;
    year_range: [number, number];
    station_years_by_decade: Record<string, number>;
  };
  cleaning: { step: string; detail: string }[];
  distribution: {
    dry_day_frac: number;
    wet_day_frac: number;
    days_ge_50mm: number;
    days_ge_100mm: number;
    max_daily_mm: number;
    max_daily_at: { station: string; date: string };
  };
  punchline: string;
};

export type CityRow = { id: string; name: string; ready?: boolean };

export type MeasureDetails = {
  id: string;
  what: string;
  why: string;
  cost: string;
  benefit: string;
  assumption: string;
  verification: string;
};
