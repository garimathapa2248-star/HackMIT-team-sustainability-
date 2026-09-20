export type HazardRecommendation = {
  hazard: string;
  level?: string;
  technical?: string;
  climate_change?: string | null;
  linked_measure_types?: string[];
  source?: string;
};

export type HazardClass = {
  hazard?: string;
  level?: "high" | "medium" | "low" | "data_deficient" | string;
  evidence?: string;
  new_return_period_yrs?: number;
};

export type RankedCountry = {
  id: string;
  name: string;
  rank: number | null;
  is_country?: boolean;
  stations: number;
  new_return_period_yrs?: number | null;
  fit: string;
  note?: string;
  classes: { flood?: string; landslide?: string; glof?: string };
  composite?: number | null;
};

export type Rankings = {
  region?: string;
  places: RankedCountry[];
  control?: RankedCountry;
  provenance?: { data_status?: string; method?: string; not?: string };
};

export type FloodAdaptScenario = {
  name: string;
  event?: string;
  projection?: string;
  strategy?: string;
  people_risk_eal?: number | null;
  people_exposed_event?: number | null;
  reduction_pct?: number | null;
  note?: string;
};

export type FloodAdaptPayload = {
  events?: { name: string; type?: string; date?: string; kind?: string }[];
  projections?: { name: string; description?: string }[];
  strategies?: { name: string; description?: string; n_selected?: number; people_protected?: number }[];
  scenarios?: FloodAdaptScenario[];
  compare?: { strategy: string; projection?: string; people_risk_eal?: number | null }[];
  provenance?: { data_status?: string; method?: string };
};

export type PlanObjective = {
  id: string;
  label: string;
  n_selected: number;
  cost_usd: number;
  people_protected: number;
  tail_people_protected?: number;
  co2_t_10yr: number;
  income_usd_yr: number;
};

export type PlanNpv = {
  horizon?: [number, number];
  discount_rate?: number;
  npv_usd?: number;
  bcr_npv?: number | null;
  irr?: number | null;
  benefits_npv_usd?: number;
  costs_npv_usd?: number;
  annual_maint_cost_usd?: number;
  npv_usd_at_alt?: number;
  alt_discount_rate?: number;
  series?: { year: number; benefits_discounted_usd?: number; costs_discounted_usd?: number; net_usd?: number }[];
  note?: string;
};

export type PlanPathway = {
  trigger?: string;
  transferable_core_n?: number;
  note?: string;
  phases?: {
    id: string;
    year: number;
    budget_usd?: number;
    cost_usd?: number;
    n_selected?: number;
    people_protected?: number;
    residual_people_risk?: number;
    blurb?: string;
  }[];
};

export type PlanWaterfall = {
  present_year?: number;
  future_year?: number;
  present_people_risk?: number;
  future_no_measures?: number;
  climate_increment?: number;
  averted_by_plan?: number;
  residual_future?: number;
  adaptation_closes_pct_of_climate_increment?: number;
  note?: string;
};

export type PlanExceedance = {
  points?: { rp_yr: number; no_measures: number; with_plan: number; averted: number }[];
  eal_no_measures?: number;
  eal_with_plan?: number;
  method?: string;
};

export type PlanRegret = {
  robust_pick?: string | null;
  note?: string;
  table?: {
    strategy: string;
    label?: string;
    current?: number;
    intensified_tail?: number;
    cvar_tail?: number;
    regret_current?: number;
    max_regret_people?: number;
  }[];
};

export type PlanEquity = {
  people_protected_high_equity?: number;
  people_protected_other?: number;
  share_of_benefit_high_equity_pct?: number;
  residual_share_high_equity_pct?: number;
  note?: string;
};

export type PlanEventView = {
  return_periods?: number[];
  depth_threshold_m?: number;
  no_measures?: Record<string, number>;
  with_plan?: Record<string, number>;
  note?: string;
};

export type PlanInfographic = {
  period_yr?: number;
  people_likely_flooded_no_measures?: number;
  people_likely_flooded_with_plan?: number;
  note?: string;
};

export type MeasureCatalogRow = {
  type: string;
  category?: string;
  primary_hazard?: string;
  cost_per_ha?: number;
  eal_reduction_frac?: number;
  lifetime_yr?: number;
  om_frac_of_capex_yr?: number;
  n_selected?: number;
  spend_usd?: number;
  source?: string;
  out_of_catalog?: boolean;
  note?: string;
};

export type Chapter = "noise" | "signal" | "plan" | "backtest" | "ask" | "report";
export type View = "landing" | "console";
export type OptimizationMode = "expected" | "cvar";
export type OptimizerState = "checking" | "live" | "frozen" | "unavailable";
export type Overlay = "none" | "observed" | "modeled" | "both";

export type Signal = {
  stations_processed: number;
  station_years: number;
  return_levels_mm: Record<string, number>;
  return_levels_ci95: Record<string, [number, number]>;
  headline: {
    statement: string;
    new_return_period_yrs: number | null;
    old_return_period_yrs: number;
    early_period?: [number, number];
    late_period?: [number, number];
    headline_region?: string;
    threshold_mm?: number;
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
  hazard_classes?: {
    flood?: HazardClass;
    landslide?: HazardClass;
    glof?: HazardClass;
    source?: string;
    not?: string;
    recommendations?: HazardRecommendation[];
  };
  recommendations?: HazardRecommendation[];
  provenance?: {
    data_status?: string;
    headline_note?: string;
    method?: string;
  };
  pot_gpd?: {
    threshold_mm?: number;
    n_excesses?: number;
    n_years?: number;
    shape?: number;
    scale?: number;
    return_levels_mm?: Record<string, number>;
    method?: string;
    note?: string;
  };
  imerg?: { available?: boolean; product?: string; reason?: string };
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
  benefit_usd?: number;
  bcr?: number | null;
  low_income_score?: number | null;
  equity_weight?: number | null;
};

export type ScreeningFactor = {
  type: string;
  cost_per_ha?: number;
  eal_reduction_frac?: number;
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
  appraisal?: {
    benefit_usd?: number;
    bcr?: number | null;
    residual_people_risk?: number;
    residual_pct?: number;
    baseline_people_risk?: number;
    climate_freq_mult?: number;
    npv?: PlanNpv;
    note?: string;
  };
  objectives?: PlanObjective[];
  pathways?: PlanPathway;
  exceedance?: PlanExceedance;
  waterfall?: PlanWaterfall;
  regret?: PlanRegret;
  equity?: PlanEquity;
  event_view?: PlanEventView;
  infographic?: PlanInfographic;
  measure_catalog?: MeasureCatalogRow[];
  robustness?: {
    overlap_pct?: number;
    selected_in_both_count?: number;
    selected_count?: number;
    interpretation?: string;
  };
  frontier: { budget_usd: number; people_protected: number; co2_t_10yr: number; benefit_usd?: number; bcr?: number | null; income_usd_yr?: number }[];
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
  };
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
  suitability_evidence?: Record<string, unknown>;
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

export type BaselineRow = { csi?: number | null; pod?: number | null; far?: number | null; definition?: string };

export type SkillEvent = {
  event_date?: string;
  source?: string;
  hit_rate_pod?: number | null;
  false_alarm_ratio?: number | null;
  critical_success_index?: number | null;
  observed_flood_km2?: number | null;
  modeled_flood_km2?: number | null;
  note?: string;
  skill_vs_scale?: SkillRow[];
  counts?: { tp?: number; fp?: number; fn?: number; tn?: number };
  baselines?: {
    jrc_seasonal_water?: BaselineRow;
    area_matched_elevation?: BaselineRow;
  };
};

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
  counts?: { tp?: number; fp?: number; fn?: number; tn?: number };
  baselines?: SkillEvent["baselines"];
  validation?: SkillEvent;
  spatial_holdout?: SkillEvent & { kind?: string; split?: string };
  provenance?: { data_status?: string; method?: string };
  counterfactual?: {
    people_exposed_baseline?: number | null;
    people_exposed_with_plan?: number | null;
    reduction_pct?: number | null;
    note?: string;
    flood_exceedance?: PlanInfographic;
  };
};

export type Replication = {
  verdict?: string;
  verdict_note?: string;
  isd_headline_new_return_yrs?: number;
  era5_headline_new_return_yrs?: number | null;
  era5_headline_statement?: string;
  independence?: string;
  era5_signal?: {
    stations_processed?: number;
    station_years?: number;
  };
  agreement?: {
    stations_compared?: number;
    annmax_pearson_r?: number | null;
    mean_bias_mm?: number | null;
    scatter?: { station: string; isd_mm: number; era5_mm: number }[];
  };
  fetch_failures?: string[];
  imerg?: { available?: boolean };
};

export type AttributionLever = {
  lever?: string;
  implementation_lead?: string;
  owner?: string;
  risk_share_pct?: number | null;
  plan_spend_usd?: number | null;
  annual_expected_people_risk_avoided?: number | null;
  risk_driver?: string;
  source?: string;
};

export type Attribution = {
  government_pct?: number | null;
  community_pct?: number | null;
  household_pct?: number | null;
  quantified_responsibility_split_available?: boolean;
  government_levers?: AttributionLever[];
  community_levers?: AttributionLever[];
  household_levers?: AttributionLever[];
  provenance?: { data_status?: string; method?: string };
};

export type CityRow = { id: string; name: string; ready?: boolean };

export type MeasureDetails = {
  id: string;
  title?: string;
  what: string;
  why: string;
  cost: string;
  benefit: string;
  assumption: string;
  verification: string;
  equity?: string | null;
};
