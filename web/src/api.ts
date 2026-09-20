export const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
export const CACHE_ONLY = String(import.meta.env.VITE_USE_CACHE || "").toLowerCase() === "true";
export const ALLOW_OPTIMIZE = String(import.meta.env.VITE_ALLOW_OPTIMIZE || "").toLowerCase() === "true";
const USE_CACHE = CACHE_ONLY;

function cachePath(name: string, city = "koshi"): string {
  const geo = new Set([
    "hazard",
    "flood_observed",
    "flood_modeled",
    "flood_observed_2017",
    "flood_modeled_2017",
    "risk_before",
    "risk_with_plan",
    "stations_nepal",
  ]);
  if (name === "stations_nepal") return "/demo_cache/stations_nepal.geojson";
  if (name === "noise") return "/demo_cache/noise.json";
  if (name === "replication") return "/demo_cache/replication.json";
  if (city !== "koshi") {
    if (geo.has(name)) return `/demo_cache/cities/${city}/${name}.geojson`;
    if (name === "preventive_measures_plan") {
      return `/demo_cache/cities/${city}/preventive_measures_plan.md`;
    }
    if (name === "scorecard") return `/demo_cache/cities/${city}/government_scorecard.md`;
    if (name === "citizenbrief") return `/demo_cache/cities/${city}/citizen_brief.md`;
    return `/demo_cache/cities/${city}/${name}.json`;
  }
  if (geo.has(name)) return `/demo_cache/${name}.geojson`;
  if (name === "preventive_measures_plan") return "/demo_cache/preventive_measures_plan.md";
  if (name === "scorecard") return "/demo_cache/government_scorecard.md";
  if (name === "citizenbrief") return "/demo_cache/citizen_brief.md";
  return `/demo_cache/${name}.json`;
}

async function fromCache(name: string, city = "koshi") {
  const r = await fetch(cachePath(name, city));
  if (!r.ok) throw new Error(`cache miss ${name}`);
  if (
    name === "preventive_measures_plan" ||
    name === "scorecard" ||
    name === "citizenbrief"
  ) {
    return r.text();
  }
  return r.json();
}

async function fromApi(path: string, init?: RequestInit) {
  const r = await fetch(`${API}${path}`, init);
  if (!r.ok) throw new Error(`${path} ${r.status}`);
  const ct = r.headers.get("content-type") || "";
  if (ct.includes("markdown") || ct.includes("text/plain")) return r.text();
  return r.json();
}

export async function loadJson(name: string, city = "koshi") {
  if (name === "stations_nepal") return fromCache(name, city);
  if (USE_CACHE) return fromCache(name, city);
  const q = `?city=${encodeURIComponent(city)}`;
  try {
    return await fromApi(`/${name}${q}`);
  } catch {
    return fromCache(name, city);
  }
}

export async function checkHealth(): Promise<boolean> {
  if (USE_CACHE) return false;
  try {
    const payload = (await fromApi("/health")) as { ok?: boolean };
    return payload?.ok === true;
  } catch {
    return false;
  }
}

function isPlanPayload(value: unknown): value is { selected?: unknown[] } {
  return !!value && typeof value === "object" && Array.isArray((value as { selected?: unknown }).selected);
}

export async function loadPlan<T = unknown>(city = "koshi"): Promise<OptimizationResult<T>> {
  if (USE_CACHE) {
    const plan = (await fromCache("plan", city)) as T;
    return { plan, source: "cache", cacheMatchesRequest: true };
  }
  try {
    const payload = await fromApi(`/plan?city=${encodeURIComponent(city)}`);
    if (isPlanPayload(payload)) {
      return { plan: payload as T, source: "api", cacheMatchesRequest: true };
    }
  } catch {
    /* frozen cache */
  }
  const plan = (await fromCache("plan", city)) as T;
  return { plan, source: "cache", cacheMatchesRequest: true };
}

export function planPdfUrl(city: string, live: boolean): string {
  if (USE_CACHE || !live) {
    return city === "koshi"
      ? "/demo_cache/preventive_measures_plan.pdf"
      : `/demo_cache/cities/${city}/preventive_measures_plan.pdf`;
  }
  return `${API}/preventive-measures-plan.pdf?city=${encodeURIComponent(city)}`;
}

export async function listCities() {
  const builtin = [
    { id: "koshi", name: "Koshi / Madhesh (Nepal)", ready: true },
    { id: "bangalore", name: "Bengaluru (India)", ready: true },
  ];
  if (!USE_CACHE) {
    try {
      return await fromApi("/cities");
    } catch {
      /* fall through */
    }
  }
  try {
    const payload = await fromCache("cities");
    const extra = Array.isArray(payload?.cities) ? payload.cities : [];
    const byId: Record<string, CityRowLike> = Object.fromEntries(
      builtin.map((row) => [row.id, row])
    );
    for (const row of extra) {
      if (row?.id) byId[String(row.id)] = { ...row, ready: row.ready !== false };
    }
    return { cities: Object.values(byId) };
  } catch {
    return {
      cities: [
        ...builtin,
        { id: "kathmandu", name: "Kathmandu (Nepal)", ready: true },
      ],
    };
  }
}

type CityRowLike = { id: string; name: string; ready?: boolean; [key: string]: unknown };

export type OptimizationResult<T = unknown> = {
  plan: T;
  source: "api" | "cache";
  cacheMatchesRequest: boolean;
};

export async function optimize<T = unknown>(
  budget: number,
  mode: string,
  city = "koshi"
): Promise<OptimizationResult<T>> {
  if (USE_CACHE) {
    const plan = (await fromCache("plan", city)) as T & { budget_usd?: number; mode?: string };
    return {
      plan,
      source: "cache",
      cacheMatchesRequest: plan.budget_usd === budget && plan.mode === mode,
    };
  }
  try {
    const response = (await fromApi("/optimize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ budget, mode, draws: 120, city }),
    })) as T | { plan?: T; error?: string; data_status?: string };
    if (
      response &&
      typeof response === "object" &&
      "plan" in response &&
      response.plan
    ) {
      return {
        plan: response.plan,
        source: "cache",
        cacheMatchesRequest: false,
      };
    }
    const plan = response as T;
    return { plan, source: "api", cacheMatchesRequest: true };
  } catch {
    const plan = (await fromCache("plan", city)) as T & { budget_usd?: number; mode?: string };
    return {
      plan,
      source: "cache",
      cacheMatchesRequest: plan.budget_usd === budget && plan.mode === mode,
    };
  }
}

type GroundedMeasure = {
  id: string;
  what: string;
  why: string;
  cost: string;
  benefit: string;
  assumption: string;
  verification: string;
};

export type AskGrounding = {
  signal?: {
    stations_processed?: number;
    station_years?: number;
    headline?: { new_return_period_yrs?: number | null; old_return_period_yrs?: number };
    landslide_trigger?: { auc?: number | null; n_events?: number };
    provenance?: { headline_note?: string };
  } | null;
  plan?: {
    budget_usd?: number;
    mode?: string;
    selected?: {
      parcel_id?: string;
      type?: string;
      priority_rank?: number;
      centroid?: [number, number];
      area_ha?: number;
      risk_driver?: string;
      suitability_score?: number;
      rationale?: string;
      assumptions?: string | string[];
      verification?: string | string[];
      cost_usd?: number;
      avoided_eal_people?: number;
      co2_t_10yr?: number;
      income_usd_yr?: number;
    }[];
    totals?: {
      cost_usd?: number;
      people_protected?: number;
      co2_t_10yr?: number;
      income_usd_yr?: number;
    };
    appraisal?: {
      bcr?: number | null;
      residual_people_risk?: number;
      benefit_usd?: number;
      npv?: { npv_usd?: number; bcr_npv?: number | null; irr?: number | null };
    };
    pathways?: { phases?: unknown[]; transferable_core_n?: number };
    regret?: { robust_pick?: string | null };
    cvar?: { tail_people_protected?: number; alpha?: number };
  } | null;
  backtest?: {
    critical_success_index?: number | null;
    hit_rate_pod?: number | null;
    false_alarm_ratio?: number | null;
    observed_flood_km2?: number | null;
    modeled_flood_km2?: number | null;
    baselines?: { jrc_seasonal_water?: { csi?: number | null } };
    validation?: { critical_success_index?: number | null };
    counterfactual?: {
      people_exposed_baseline?: number | null;
      people_exposed_with_plan?: number | null;
      reduction_pct?: number | null;
      note?: string;
    };
  } | null;
  selectedMeasure?: GroundedMeasure | null;
  replication?: {
    verdict?: string;
    verdict_note?: string;
    isd_headline_new_return_yrs?: number;
    era5_headline_new_return_yrs?: number | null;
    agreement?: { annmax_pearson_r?: number | null; stations_compared?: number };
  } | null;
};

const amount = (value: number | undefined) =>
  value == null
    ? "not available"
    : value >= 1_000_000
      ? `$${(value / 1_000_000).toFixed(2)}M`
      : `$${Math.round(value).toLocaleString()}`;

const risk = (value: number | null | undefined) =>
  value == null ? "not available" : value.toLocaleString(undefined, { maximumFractionDigits: 1 });

function cachedAnswer(question: string, grounding: AskGrounding) {
  const query = question.toLowerCase();
  const selected = grounding.selectedMeasure;
  const plan = grounding.plan;
  if (
    selected &&
    !query.includes("selected before") &&
    !query.includes("next-best") &&
    (query.includes(selected.id.toLowerCase()) ||
      query.includes("this measure") ||
      query.includes("this site") ||
      query.includes("why plant"))
  ) {
    return {
      answer: [
        `What: ${selected.what}`,
        `Why: ${selected.why}`,
        `Cost: ${selected.cost}`,
        `Benefit: ${selected.benefit}`,
        `Assumption: ${selected.assumption}`,
        `Verification: ${selected.verification}`,
      ].join("\n"),
      sources: ["candidates.json", "plan.json", "backtest.json"],
      invented: false,
      offline: true,
    };
  }

  const requestedMeasure = plan?.selected?.find(
    (row) => row.parcel_id && query.includes(row.parcel_id.toLowerCase())
  );
  if (requestedMeasure) {
    const assumptions = Array.isArray(requestedMeasure.assumptions)
      ? requestedMeasure.assumptions.join("; ")
      : requestedMeasure.assumptions || "Literature screening factors; field verification required.";
    const verification = Array.isArray(requestedMeasure.verification)
      ? requestedMeasure.verification.join("; ")
      : requestedMeasure.verification || "Field verification required.";
    return {
      answer: [
        `What: ${(requestedMeasure.type || "preventive measure").replace(/_/g, " ")} at ${requestedMeasure.area_ha ?? "an unavailable area"} ha.`,
        `Why: ${requestedMeasure.rationale || requestedMeasure.risk_driver || "Selected by the grounded portfolio."} Suitability ${requestedMeasure.suitability_score ?? "not available"}.`,
        `Cost: ${amount(requestedMeasure.cost_usd)}.`,
        `Benefit: ${risk(requestedMeasure.avoided_eal_people)} annual people-risk avoided; ${risk(requestedMeasure.co2_t_10yr)} tCO₂ / 10 yr; ${amount(requestedMeasure.income_usd_yr)} income / yr.`,
        `Assumption: ${assumptions}`,
        `Verification: ${verification}`,
      ].join("\n"),
      sources: ["plan.json", "candidates.json"],
      invented: false,
      offline: true,
    };
  }

  const signal = grounding.signal;
  if (
    query.includes("voloridge") ||
    query.includes("station-year") ||
    query.includes("498") ||
    query.includes("noise") ||
    query.includes("parsed")
  ) {
    return {
      answer: `NOAA ISD was parsed at ${signal?.stations_processed ?? 498} stations / ${signal?.station_years ?? 12066} station-years on Voloridge compute. Missing years, sentinels, and broken accumulation windows are counted in noise.json — they are not smoothed away. The 7.75-year headline uses the Nepal-adjacent subset, not the full HMA pool.`,
      sources: ["noise.json", "signal.json"],
      invented: false,
      offline: true,
    };
  }

  if (
    query.includes("selected before") ||
    query.includes("next-best") ||
    query.includes("why was preventive")
  ) {
    const ranked = [...(plan?.selected || [])].sort(
      (left, right) => (left.priority_rank ?? 999) - (right.priority_rank ?? 999)
    );
    const currentId = grounding.selectedMeasure?.id;
    const found = currentId ? ranked.findIndex((row) => row.parcel_id === currentId) : 0;
    const index = found >= 0 ? found : 0;
    const current = ranked[index];
    const next = ranked[index + 1];
    if (current) {
      return {
        answer: [
          `${(current.type || "preventive measure").replace(/_/g, " ")} at ${current.parcel_id} is rank ${current.priority_rank ?? index + 1} in the frozen ${amount(plan?.budget_usd)} plan.`,
          `It models ${risk(current.avoided_eal_people)} annual people-risk avoided at ${amount(current.cost_usd)}.`,
          next
            ? `Next-best in the ranking is ${next.parcel_id} (${risk(next.avoided_eal_people)} people-risk / ${amount(next.cost_usd)}). Overlap is capped per cell; equity can lift a lower-income site up to 1.5×.`
            : "No lower-ranked selected site is in this pack.",
          "This is a screening portfolio, not a field survey.",
        ].join(" "),
        sources: ["plan.json", "candidates.json"],
        invented: false,
        offline: true,
      };
    }
  }

  if (
    query.includes("7.75") ||
    query.includes("100-year") ||
    query.includes("rain") ||
    query.includes("tail") ||
    query.includes("shift")
  ) {
    return {
      answer: `The ${signal?.headline?.old_return_period_yrs ?? 100}-year depth from the early Nepal-adjacent sample has a fitted late-sample recurrence of ${signal?.headline?.new_return_period_yrs ?? "not available"} years. This is not a claim about the full HMA pool: ${signal?.provenance?.headline_note || "the pooled control is reported separately."}`,
      sources: ["signal.json"],
      invented: false,
      offline: true,
    };
  }

  const backtest = grounding.backtest;
  if (
    query.includes("csi") ||
    query.includes("jrc") ||
    query.includes("proof") ||
    query.includes("observed") ||
    query.includes("modeled") ||
    query.includes("flood")
  ) {
    const jrc = backtest?.baselines?.jrc_seasonal_water?.csi;
    const transfer = backtest?.validation?.critical_success_index;
    return {
      answer: `In-sample 2024 CSI is ${risk(backtest?.critical_success_index)} (POD ${risk(backtest?.hit_rate_pod)}, FAR ${risk(backtest?.false_alarm_ratio)}) on ${risk(backtest?.observed_flood_km2)} km² observed vs ${risk(backtest?.modeled_flood_km2)} km² modeled. The model does not beat JRC seasonal-water climatology${jrc == null ? "" : ` (JRC CSI ${risk(jrc)})`} — we report the miss. Frozen 2017 transfer CSI is ${risk(transfer)}; that is not the same valley.`,
      sources: ["backtest.json"],
      invented: false,
      offline: true,
    };
  }

  if (
    query.includes("before") ||
    query.includes("with plan") ||
    query.includes("counterfactual") ||
    query.includes("exposure")
  ) {
    const cf = backtest?.counterfactual;
    return {
      answer: `The modelled event counterfactual is ${risk(cf?.people_exposed_baseline)} people-exposure units before the plan and ${risk(cf?.people_exposed_with_plan)} with the plan (${risk(cf?.reduction_pct)}% reduction). These are not unique people or observed lives saved. ${cf?.note || ""}`.trim(),
      sources: ["backtest.json"],
      invented: false,
      offline: true,
    };
  }

  if (
    query.includes("era5") ||
    query.includes("replicat") ||
    query.includes("reanalysis")
  ) {
    const rep = grounding.replication;
    return {
      answer: `ERA5-Land at the same Nepal-adjacent coordinates ${rep?.verdict || "is reported in replication.json"}. Fitted late recurrence is ${risk(rep?.era5_headline_new_return_yrs)} years vs ISD ${risk(rep?.isd_headline_new_return_yrs)} years. Pearson r on mean annual maxima is ${risk(rep?.agreement?.annmax_pearson_r)} on ${risk(rep?.agreement?.stations_compared)} stations. IMERG was not fused. ${rep?.verdict_note || ""}`.trim(),
      sources: ["replication.json", "signal.json"],
      invented: false,
      offline: true,
    };
  }

  if (query.includes("knapsack") || query.includes("greedy") || query.includes("optimal")) {
    const gap = (grounding.plan as { optimality?: { gap_pct?: number | null; note?: string } } | null | undefined)
      ?.optimality;
    return {
      answer: `Greedy matches the relaxed independent-value knapsack bound to a ${risk(gap?.gap_pct)}% gap. That bound ignores per-cell overlap capping, so the true gap is smaller. ${gap?.note || ""}`.trim(),
      sources: ["plan.json"],
      invented: false,
      offline: true,
    };
  }

  if (query.includes("landslide") || query.includes("auc")) {
    const trigger = signal?.landslide_trigger;
    return {
      answer:
        trigger?.auc == null
          ? "A landslide AUC is not available in this artifact, so no score is claimed."
          : `The held-out rainfall-classifier AUC is ${trigger.auc.toFixed(3)} on n=${trigger.n_events ?? "unknown"} events. It is not a physical Caine intensity-duration threshold.`,
      sources: ["signal.json"],
      invented: false,
      offline: true,
    };
  }

  if (query.includes("npv") || query.includes("irr") || query.includes("discount")) {
    const npv = plan?.appraisal?.npv;
    return {
      answer: `Screening NPV at 3% is ${amount(npv?.npv_usd)} with NPV BCR ${risk(npv?.bcr_npv)} and IRR ${npv?.irr == null ? "unavailable" : `${(npv.irr * 100).toFixed(1)}%`}. Capex plus 2%/yr O&M, benefits from monetised people-risk growing under the capped GEV climate multiplier. Not a GCF appraisal.`,
      sources: ["plan.json"],
      invented: false,
      offline: true,
    };
  }

  if (query.includes("pathway") || query.includes("phased") || query.includes("tranche")) {
    const phases = plan?.pathways?.phases || [];
    const core = plan?.pathways?.transferable_core_n;
    return {
      answer: `Adaptation pathway has ${phases.length} phases (now / if the tail holds / full $2M). Transferable core is ${core ?? "unavailable"} parcels. Independent-benefit add on the greedy frontier — not a Deltares pathway solver.`,
      sources: ["plan.json"],
      invented: false,
      offline: true,
    };
  }

  if (query.includes("regret") || query.includes("robust pick") || query.includes("four books")) {
    const pick = plan?.regret?.robust_pick;
    return {
      answer: `Min-regret book across current vs intensified-tail is ${pick || "unavailable"}. Same budget, four books — lives, carbon, income, and the blend. Intensified people-risk uses the screening climate multiplier, not a SWMM file.`,
      sources: ["plan.json"],
      invented: false,
      offline: true,
    };
  }

  if (query.includes("bcr") || query.includes("benefit-cost") || query.includes("appraisal")) {
    const appraisal = plan?.appraisal;
    return {
      answer: `Screening BCR is ${risk(appraisal?.bcr)} on a monetised benefit of ${amount(appraisal?.benefit_usd)} versus spend ${amount(plan?.totals?.cost_usd)}. Residual people-risk is ${risk(appraisal?.residual_people_risk)}. This uses the documented monetisation (people-risk, CO₂, income) — not a field BCR and not a CLIMADA run.`,
      sources: ["plan.json"],
      invented: false,
      offline: true,
    };
  }

  if (query.includes("rank") || query.includes("thinkhazard") || query.includes("leaderboard")) {
    return {
      answer: `Country ranking is the frozen Nepal-adjacent NOAA ISD table, not the live v2 Open-Meteo board. Nepal is highlighted from the 7.75-year GEV headline. The HMA pool is a negative control with no recurrence shift. Hazard chips are our fitted flood/landslide/GLOF classes, not GFDRR ThinkHazard layers.`,
      sources: ["rankings.json", "signal.json"],
      invented: false,
      offline: true,
    };
  }

  if (query.includes("floodadapt") || query.includes("no_measures") || query.includes("nbs_blended")) {
    return {
      answer: `FloodAdapt grammar: a scenario is event × projection × strategy. Koshi 27 Sep 2024 × current climate × no_measures is the baseline; nbs_blended_2M is the $2M nature-based strategy. This is not a SFINCS run.`,
      sources: ["scenarios.json", "plan.json"],
      invented: false,
      offline: true,
    };
  }

  if (plan?.totals) {
    return {
      answer: `The cached ${amount(plan.budget_usd)} ${plan.mode || "screening"} plan selects ${plan.selected?.length ?? "an unavailable number of"} preventive measures, spending ${amount(plan.totals.cost_usd)}. It models ${risk(plan.totals.people_protected)} annual people-risk avoided, ${risk(plan.totals.co2_t_10yr)} tCO₂ over 10 years, and ${amount(plan.totals.income_usd_yr)} annual income. Screening BCR is ${risk(plan.appraisal?.bcr)}. Ask about the rainfall tail, proof/CSI, counterfactual, landslide AUC, or click a measure for a site-grounded answer.`,
      sources: ["plan.json"],
      invented: false,
      offline: true,
    };
  }

  return {
    answer: "The live grounded-answer API is unavailable, and the cached artifacts do not contain enough information to answer that question. Try asking about the rainfall tail, plan, proof/CSI, or counterfactual.",
    sources: ["demo_cache"],
    invented: false,
    offline: true,
  };
}

export async function ask(question: string, city = "koshi", grounding: AskGrounding = {}) {
  const grounded = cachedAnswer(question, grounding);
  if (USE_CACHE || grounded.sources[0] !== "demo_cache") return grounded;
  try {
    return await fromApi("/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, city }),
    });
  } catch {
    return grounded;
  }
}

export async function markdownDoc(name: "conceptnote" | "scorecard" | "citizenbrief", city = "koshi"): Promise<string> {
  const path = name === "conceptnote" ? "/conceptnote" : name === "scorecard" ? "/scorecard" : "/citizenbrief";
  if (!USE_CACHE) {
  try {
    return (await fromApi(`${path}?city=${encodeURIComponent(city)}`)) as string;
  } catch {
    /* cache */
  }
  }
  try {
    return (await fromCache(name, city)) as string;
  } catch {
    return `# ${name} unavailable\n`;
  }
}

export async function conceptNote(city = "koshi"): Promise<string> {
  if (USE_CACHE) {
    return (await fromCache("preventive_measures_plan", city)) as string;
  }
  try {
    return (await fromApi(
      `/preventive-measures-plan?city=${encodeURIComponent(city)}`
    )) as string;
  } catch {
    return (await fromCache("preventive_measures_plan", city)) as string;
  }
}
