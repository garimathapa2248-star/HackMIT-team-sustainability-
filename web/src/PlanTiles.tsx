import { Coins, Leaf, Users, Wallet } from "lucide-react";
import { useDash } from "./context";
import { metric, money, n0 } from "./format";
import { SITE_NAME, selectedTypes, siteNoun } from "./plan";
import { Lines, StatTile } from "./ui";

/** The four headline tiles (investment, risk, carbon, income). Everything is derived from the current plan. */
export default function PlanTiles() {
  const d = useDash();
  const { plan, backtest } = d;
  const loading = !plan;
  const sites = siteNoun(plan, d.candidates);

  // context for the four headline tiles (all derived from the plan, never typed in)
  const types = selectedTypes(plan, d.candidates);
  const mainType = types[0];
  const typeName = mainType ? SITE_NAME[mainType] || mainType.replace(/_/g, " ") : "";
  const factors = plan?.provenance?.factors || [];
  const mainFactor = factors.find((f) => f.type === mainType);
  const nSites = plan?.selected.length ?? 0;
  const totalHa = (plan?.selected || []).reduce(
    (sum, sel) => sum + (d.candidates.find((c) => c.parcel_id === sel.parcel_id)?.area_ha ?? 0),
    0
  );
  const totals = plan?.totals;
  const avgCost = totals && nSites ? totals.cost_usd / nSites : null;
  const co2PerYear = totals ? totals.co2_t_10yr / 10 : null;
  const carsPerYear = co2PerYear != null ? Math.round(co2PerYear / 4.6) : null; // US EPA: 4.6 t CO2 per passenger car per year
  const incomePerSite = totals && nSites ? totals.income_usd_yr / nSites : null;
  const centsPerDollar =
    totals && totals.cost_usd > 0 ? Math.round((totals.income_usd_yr / totals.cost_usd) * 100) : null;
  const fracs = types
    .map((type) => factors.find((f) => f.type === type)?.eal_reduction_frac)
    .filter((v): v is number => v != null);
  const effectText = fracs.length
    ? Math.min(...fracs) === Math.max(...fracs)
      ? `${Math.round(fracs[0] * 100)}%`
      : `${Math.round(Math.min(...fracs) * 100)}–${Math.round(Math.max(...fracs) * 100)}%`
    : null;
  // Koshi's risk score includes glacial-lake flooding and landslides; the other city packs are flood-only screening runs.
  const hazardWords = d.city === "koshi" ? "flood and landslide" : "flood";
  // The plan's percentage is measured against squares that have a candidate site (optimize/portfolio.py), which is
  // only part of the grid for Koshi (69 of 136). Say so, and give the region-wide figure too.
  const gridProps = (d.hazard?.features || []).map(
    (f) => (f.properties || {}) as { cell_id?: string; eal_people?: number; people_risk_eal?: number }
  );
  const gridIds = new Set(gridProps.map((p) => p.cell_id).filter((id): id is string => Boolean(id)));
  const candCells = new Set(d.candidates.flatMap((c) => c.cell_ids).filter((id) => gridIds.has(id)));
  const partialScope = gridIds.size > 0 && candCells.size > 0 && candCells.size < gridIds.size;
  const gridRisk = gridProps.reduce((sum, p) => sum + Number(p.eal_people ?? p.people_risk_eal ?? 0), 0);
  const wholeAreaPct = plan && gridRisk > 0 ? (100 * plan.totals.people_protected) / gridRisk : null;
  const riskPct = plan?.totals.exposure_reduction_pct;
  const showPct = riskPct != null && riskPct > 0;
  const riskBaseline = showPct && plan ? plan.totals.people_protected / (riskPct / 100) : null;
  const eqWeights = (plan?.selected || []).map((sel) => sel.equity_weight ?? 1);
  const topWeight = eqWeights.length ? Math.max(...eqWeights) : 1;
  const cf = backtest?.counterfactual;
  const cfYear = backtest?.event_date?.slice(0, 4);

  return (
      <div className="stat-grid">
        <StatTile
          label="Investment needed"
          icon={<Wallet size={16} />}
          value={plan?.totals.cost_usd}
          format={money}
          loading={loading}
          progress={plan ? plan.totals.cost_usd / plan.budget_usd : null}
          sub={
            plan ? (
              <Lines items={[`of a ${money(plan.budget_usd)} budget`, `Pays for ${nSites} ${sites}`]} />
            ) : undefined
          }
          detail={
            plan && (
              <ul className="pop-list">
                {avgCost != null && (
                  <li>
                    {nSites} {sites} at about {money(avgCost)} each
                    {totalHa > 0 ? `, covering ${metric(totalHa, 0)} hectares in total` : ""}.
                  </li>
                )}
                <li>
                  The plan keeps adding the sites that cut the most risk for each dollar, until nothing more fits
                  in the budget ({money(plan.budget_usd - plan.totals.cost_usd)} is left over).
                </li>
                <li>
                  {types.length === 1 && mainFactor?.cost_per_ha != null
                    ? `Each ${typeName} site is costed at published rates: ${money(mainFactor.cost_per_ha)} per hectare.`
                    : "Costs come from published per-hectare restoration figures."}
                </li>
                <li>Try other budgets on the Plan page to see how the picks change.</li>
              </ul>
            )
          }
        />
        <StatTile
          label={showPct ? "Lower risk to people" : "Yearly risk to people reduced"}
          icon={<Users size={16} />}
          value={showPct ? riskPct : plan?.totals.people_protected}
          format={showPct ? (n) => `${metric(n, 0)}%` : (n) => metric(n, 0)}
          loading={loading}
          sub={
            <Lines
              items={
                showPct
                  ? [
                      `Modeled yearly ${hazardWords} risk`,
                      `${partialScope ? "Where sites can be built" : "Across the mapped area"} · not lives saved`,
                    ]
                  : ["Modeled risk score", "Not a headcount · not lives saved"]
              }
            />
          }
          detail={
            plan && (
              <ul className="pop-list">
                <li>
                  {showPct && riskBaseline != null
                    ? `The plan is modeled to cut yearly risk to people by about ${metric(riskPct, 0)}% ${
                        partialScope
                          ? `in the ${candCells.size} of ${gridIds.size} map squares where sites can be built`
                          : "across the mapped area"
                      }: roughly ${n0(riskBaseline)} down to ${n0(riskBaseline - plan.totals.people_protected)} risk points a year.`
                    : `The plan is modeled to cut about ${n0(plan.totals.people_protected)} risk points a year.`}
                </li>
                {showPct && partialScope && wholeAreaPct != null && (
                  <li>Across all {gridIds.size} map squares, that is about {metric(wholeAreaPct, 0)}%.</li>
                )}
                <li>
                  Risk is scored for each map square as its population × a hazard rate (
                  {d.city === "koshi"
                    ? "modeled flooding, glacial-lake flood depth and landslide probability"
                    : "a screening flood model and nearby lakes"}
                  ){topWeight > 1 ? `, scaled up to ${topWeight.toFixed(1)}× for low-income rural areas` : ""}. These
                  are points from a model, not a headcount of people, and the rates are modeling choices, not
                  measured damage.
                </li>
                {effectText && (
                  <li>
                    We assume each site cuts local risk by {effectText}.
                    {mainFactor?.source ? ` Source: ${mainFactor.source}` : ""}
                  </li>
                )}
                {cfYear && cf?.people_exposed_baseline != null && cf.people_exposed_baseline > 0 && cf.people_exposed_with_plan != null && (
                  <li>
                    A repeat of the {cfYear} flood: modeled exposure would fall from{" "}
                    {n0(cf.people_exposed_baseline)} to {n0(cf.people_exposed_with_plan)}. A simulation, not an
                    observed result.
                  </li>
                )}
                <li>Not lives saved. No site has been field-tested yet.</li>
              </ul>
            )
          }
        />
        <StatTile
          label="Carbon stored over 10 years"
          tone="blue"
          icon={<Leaf size={16} />}
          value={plan?.totals.co2_t_10yr}
          format={(n) => `${metric(n, 0)} t`}
          loading={loading}
          sub={
            <Lines
              items={[
                co2PerYear != null ? `About ${n0(co2PerYear)} tonnes of CO₂ a year` : "tonnes of CO₂",
                carsPerYear != null && carsPerYear > 0
                  ? `Roughly what ${n0(carsPerYear)} cars emit in a year`
                  : null,
              ]}
            />
          }
          detail={
            plan && (
              <ul className="pop-list">
                <li>Restored land stores carbon in its soil and plants.</li>
                <li>
                  {types.length === 1 && mainFactor?.co2_t_per_ha_10yr != null
                    ? `${typeName[0].toUpperCase()}${typeName.slice(1)} sites are estimated at ${mainFactor.co2_t_per_ha_10yr} tonnes of CO₂ per hectare over 10 years${
                        totalHa > 0 ? `, across ${metric(totalHa, 0)} hectares` : ""
                      }.`
                    : "Each site type has a published estimate of tonnes of CO₂ stored per hectare over 10 years."}
                </li>
                <li>The car comparison uses the US EPA estimate of 4.6 tonnes of CO₂ per passenger car per year.</li>
              </ul>
            )
          }
        />
        <StatTile
          label="Local income each year"
          tone="warn"
          icon={<Coins size={16} />}
          value={plan?.totals.income_usd_yr}
          format={money}
          loading={loading}
          sub={
            <Lines
              items={[
                incomePerSite != null ? `About ${money(incomePerSite)} per site each year` : "modeled estimate",
                plan?.totals.households_benefiting != null
                  ? `${metric(plan.totals.households_benefiting, 0)} households benefiting`
                  : centsPerDollar != null
                    ? `About ${centsPerDollar}¢ a year for every $1 spent`
                    : null,
              ]}
            />
          }
          detail={
            plan && (
              <ul className="pop-list">
                <li>Modeled yearly local income from putting the restored land to use.</li>
                {types.length === 1 && mainFactor?.income_usd_per_ha_yr != null && (
                  <li>
                    Estimated at {money(mainFactor.income_usd_per_ha_yr)} per hectare per year for {typeName} sites.
                  </li>
                )}
                {plan.totals.households_benefiting == null && (
                  <li>
                    We haven't estimated how many households benefit. That needs a field-tested model of who
                    uses the land and how.
                  </li>
                )}
              </ul>
            )
          }
        />
      </div>
  );
}
