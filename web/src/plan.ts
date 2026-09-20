import type { CandidateSite, Plan } from "./types";

export const SITE_NAME: Record<string, string> = {
  floodplain_restore: "floodplain",
  wetland_restore: "wetland",
  riverbank_bio: "riverbank",
  vetiver_slope: "vetiver slope",
  bamboo_slope: "bamboo slope",
  afforestation: "afforestation",
};

/** Selected site types, most common first. */
export function selectedTypes(plan: Plan | null, candidates: CandidateSite[]) {
  const counts = new Map<string, number>();
  for (const sel of plan?.selected || []) {
    const type = candidates.find((c) => c.parcel_id === sel.parcel_id)?.type;
    if (type) counts.set(type, (counts.get(type) || 0) + 1);
  }
  return [...counts.entries()].sort((l, r) => r[1] - l[1]).map(([type]) => type);
}


/** e.g. "floodplain sites", "wetland and riverbank sites"; generic when there are many types. */
export function siteNoun(plan: Plan | null, candidates: CandidateSite[]) {
  if (!plan) return "sites";
  const counts = new Map<string, number>();
  for (const sel of plan.selected) {
    const type = candidates.find((c) => c.parcel_id === sel.parcel_id)?.type;
    if (type) counts.set(type, (counts.get(type) || 0) + 1);
  }
  const names = [...counts.entries()]
    .sort((l, r) => r[1] - l[1])
    .map(([type]) => SITE_NAME[type] || type.replace(/_/g, " "));
  if (names.length === 0 || names.length > 2) return "nature-based sites";
  return `${names.join(" and ")} sites`;
}


/** Where the risk-reduction curve reaches 90% of its maximum, if that happens before the full budget. */
export function earlyBenefitOf(plan: Plan | null): { pct: number; budget: number } | null {
  const frontier = plan?.frontier || [];
  const max = frontier.length ? Math.max(...frontier.map((f) => f.people_protected)) : 0;
  const point = max > 0 ? frontier.find((f) => f.people_protected >= 0.9 * max) : undefined;
  return point && plan && point.budget_usd < plan.budget_usd
    ? { pct: Math.round((100 * point.people_protected) / max), budget: point.budget_usd }
    : null;
}

/** The budget of the plan saved for offline use (the cached PDF and note were generated for it). */
export const SAVED_BUDGET = 2_000_000;
export const cachedPdfUrl = (city: string) =>
  city === "koshi" ? "/demo_cache/preventive_measures_plan.pdf" : `/demo_cache/cities/${city}/preventive_measures_plan.pdf`;
