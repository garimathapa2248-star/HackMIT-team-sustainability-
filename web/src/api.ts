const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const USE_CACHE = String(import.meta.env.VITE_USE_CACHE || "").toLowerCase() === "true";

function cachePath(name: string, city = "koshi"): string {
  const geo = new Set([
    "hazard",
    "flood_observed",
    "flood_modeled",
    "flood_observed_2017",
    "flood_modeled_2017",
    "risk_before",
    "risk_with_plan",
  ]);
  if (city !== "koshi") {
    if (geo.has(name)) return `/demo_cache/cities/${city}/${name}.geojson`;
    if (name === "preventive_measures_plan") {
      return `/demo_cache/cities/${city}/preventive_measures_plan.md`;
    }
    if (name === "replication") return "/demo_cache/replication.json";
    if (name === "noise") return "/demo_cache/noise.json";
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
  if (USE_CACHE) return fromCache(name, city);
  const q = `?city=${encodeURIComponent(city)}`;
  try {
    return await fromApi(`/${name}${q}`);
  } catch {
    return fromCache(name, city);
  }
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
    headline?: { new_return_period_yrs?: number; old_return_period_yrs?: number };
    landslide_trigger?: { auc?: number | null; n_events?: number };
    provenance?: { headline_note?: string };
  } | null;
  plan?: {
    budget_usd?: number;
    mode?: string;
    selected?: {
      parcel_id?: string;
      type?: string;
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
    cvar?: { tail_people_protected?: number; alpha?: number };
  } | null;
  backtest?: {
    critical_success_index?: number | null;
    hit_rate_pod?: number | null;
    false_alarm_ratio?: number | null;
    observed_flood_km2?: number | null;
    modeled_flood_km2?: number | null;
    counterfactual?: {
      people_exposed_baseline?: number | null;
      people_exposed_with_plan?: number | null;
      reduction_pct?: number | null;
      note?: string;
    };
  } | null;
  selectedMeasure?: GroundedMeasure | null;
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
    query.includes("proof") ||
    query.includes("observed") ||
    query.includes("modeled") ||
    query.includes("flood")
  ) {
    return {
      answer: `The cached proof compares ${risk(backtest?.observed_flood_km2)} km² observed with ${risk(backtest?.modeled_flood_km2)} km² modeled. CSI is ${risk(backtest?.critical_success_index)}, POD ${risk(backtest?.hit_rate_pod)}, and FAR ${risk(backtest?.false_alarm_ratio)}. That CSI is an in-sample calibration fit. A second-event / transfer row is reported separately when present.`,
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

  if (plan?.totals) {
    return {
      answer: `The cached ${amount(plan.budget_usd)} ${plan.mode || "screening"} plan selects ${plan.selected?.length ?? "an unavailable number of"} preventive measures, spending ${amount(plan.totals.cost_usd)}. It models ${risk(plan.totals.people_protected)} annual people-risk avoided, ${risk(plan.totals.co2_t_10yr)} tCO₂ over 10 years, and ${amount(plan.totals.income_usd_yr)} annual income. Ask about the rainfall tail, proof/CSI, counterfactual, landslide AUC, or click a measure for a site-grounded answer.`,
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
  if (USE_CACHE) return cachedAnswer(question, grounding);
  try {
    return await fromApi("/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, city }),
    });
  } catch {
    return cachedAnswer(question, grounding);
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
