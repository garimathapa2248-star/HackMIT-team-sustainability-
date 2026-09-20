import { humanize, money, metric, risk } from "./format";
import type { CandidateSite, Plan, SelectedMeasure } from "./types";

export type MixRow = { type: string; count: number; peopleRisk: number; cost: number };

export function planMix(plan: Plan | null, candidates: CandidateSite[] = []): MixRow[] {
  if (!plan?.selected?.length) return [];
  const tally = plan.selected.reduce<Record<string, MixRow>>((accumulator, selected) => {
    const type =
      candidates.find((candidate) => candidate.parcel_id === selected.parcel_id)?.type ||
      selected.type ||
      "unknown";
    const row = accumulator[type] || { type, count: 0, peopleRisk: 0, cost: 0 };
    row.count += 1;
    row.peopleRisk += selected.avoided_eal_people;
    row.cost += selected.cost_usd;
    accumulator[type] = row;
    return accumulator;
  }, {});
  return Object.values(tally).sort((left, right) => right.peopleRisk - left.peopleRisk);
}

export function planHeadline(plan: Plan | null): string {
  if (!plan?.selected?.length) return "Loading the plan…";
  const mix = planMix(plan);
  if (mix.length === 1) return `${metric(mix[0].count, 0)} ${humanize(mix[0].type)} sites`;
  return `${metric(plan.selected.length, 0)} preventive measures`;
}

export function planLede(plan: Plan | null): string {
  if (!plan) return "Loading the screening portfolio.";
  return `${money(plan.totals.cost_usd)} spend · ${risk(
    plan.totals.people_protected
  )} people-risk / yr avoided · ${metric(plan.totals.co2_t_10yr, 0)} tCO₂ / 10 yr. Not unique lives. Click a map dot.`;
}

export function rankedMeasures(plan: Plan | null): SelectedMeasure[] {
  return [...(plan?.selected || [])].sort(
    (left, right) => (left.priority_rank ?? 999) - (right.priority_rank ?? 999)
  );
}
