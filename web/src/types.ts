export type View = "overview" | "noise" | "signal" | "plan" | "proof" | "ask" | "export" | "branch";
export type OptimizationMode = "expected" | "cvar";
export type OptimizerState = "checking" | "live" | "frozen" | "unavailable";
export type OverlayMode = "none" | "observed" | "modeled" | "both";

export type Signal = {
  stations_processed: number;
  station_years: number;
  return_levels_mm: Record<string, number>;
  return_levels_ci95: Record<string, [number, number]>;
  headline: {
    statement: string;
    new_return_period_yrs: number;
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
  frontier: { budget_usd: number; people_protected: number; co2_t_10yr: number }[];
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
  baselines?: {
    jrc_seasonal_water?: { csi?: number | null; definition?: string };
    area_matched_elevation?: { csi?: number | null; definition?: string };
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
  baselines?: SkillEvent["baselines"];
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
