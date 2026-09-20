import { money, metric, risk, humanize, textValue } from "./format";
import type { Backtest, CandidateSite, MeasureDetails, Plan, SelectedMeasure } from "./types";

export function describeMeasure(args: {
  picked: string | null;
  pickedMeta?: CandidateSite;
  pickedRow?: SelectedMeasure;
  plan?: Plan | null;
  backtest?: Backtest | null;
}): MeasureDetails | null {
  const { picked, pickedMeta, pickedRow, plan, backtest } = args;
  if (!picked || !pickedMeta) return null;

  const candidateFacts = [
    pickedMeta.slope_deg == null ? "" : `${metric(pickedMeta.slope_deg)}° slope`,
    pickedMeta.landcover ? `${humanize(pickedMeta.landcover)} land cover` : "",
    pickedMeta.triggering_hazard || pickedMeta.primary_hazard
      ? `${humanize(pickedMeta.triggering_hazard || pickedMeta.primary_hazard)} hazard`
      : "",
    pickedMeta.suitability_score == null ? "" : `suitability ${metric(pickedMeta.suitability_score, 3)}`,
    pickedMeta.cell_ids.length ? `${pickedMeta.cell_ids.length} linked risk cell(s)` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const pickedFactor = plan?.provenance?.factors?.find((factor) => factor.type === pickedMeta.type);
  const modeledBenefit = pickedRow
    ? `${risk(pickedRow.avoided_eal_people)} annual people-risk avoided; ${metric(
        pickedRow.co2_t_10yr
      )} tCO₂ / 10 yr; ${money(pickedRow.income_usd_yr)} income / yr.`
    : "This candidate intervention site is not selected in the current budgeted plan.";
  const statedBenefit = pickedMeta.benefit ? `${pickedMeta.benefit} ` : "";
  const reduction =
    pickedFactor?.eal_reduction_frac == null
      ? ""
      : ` The screening factor assumes a ${(pickedFactor.eal_reduction_frac * 100).toFixed(
          0
        )}% local EAL reduction.`;
  const proof =
    backtest?.critical_success_index == null
      ? "This site has not been field-verified; no flood CSI is available."
      : `This site has not been field-verified. The portfolio hazard layer was checked against the ${
          backtest.event_date || "calibration"
        } scene (CSI ${backtest.critical_success_index.toFixed(
          3
        )}), which is an in-sample calibration fit.`;
  const equity =
    pickedRow?.low_income_score != null && pickedRow.low_income_score >= 0.55
      ? `Serves a flagged low-income cell (weight ×${metric(pickedRow.equity_weight, 3)}).`
      : null;

  return {
    id: picked,
    title: humanize(pickedMeta.type),
    what:
      pickedMeta.what ||
      pickedMeta.description ||
      `${humanize(pickedMeta.type)} at a ${metric(pickedMeta.area_ha, 2)} ha candidate intervention site.`,
    why:
      pickedMeta.why ||
      pickedMeta.rationale ||
      pickedMeta.suitability_reason ||
      pickedMeta.suitability ||
      (pickedRow
        ? `Selected by the ${
            plan?.mode || "screening"
          } optimizer for modeled people-risk, carbon, and income return under the budget, with cell-level benefit capping.${
            candidateFacts ? ` Candidate data: ${candidateFacts}.` : ""
          }`
        : `Feasible under the screening rules, but not selected in the current budgeted portfolio.${
            candidateFacts ? ` Candidate data: ${candidateFacts}.` : ""
          }`),
    cost: pickedRow ? money(pickedRow.cost_usd) : money(pickedMeta.cost_usd),
    benefit: `${statedBenefit}${modeledBenefit}`.trim(),
    assumption:
      textValue(pickedMeta.assumption) ||
      textValue(pickedMeta.assumptions) ||
      `${pickedFactor?.source || pickedMeta.source || "Literature screening factors; not a field trial."}${reduction}`,
    verification:
      textValue(pickedMeta.verification) ||
      textValue(pickedMeta.required_verification) ||
      pickedMeta.monitoring ||
      pickedMeta.evidence ||
      proof,
    equity,
  };
}
