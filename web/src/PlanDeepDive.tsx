import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useDash } from "./context";
import { metric, money, risk } from "./format";
import { Accordion, Callout, Card } from "./ui";
import { ChartTooltip, Legend } from "./charts";

const GREEN = "#1f5c4a";
const SLATE = "#3f5f80";
const CLAY = "#9a6b1a";
const GRID = "rgba(23, 33, 43, 0.1)";
const AXIS = "#6b7580";
const axis = {
  stroke: AXIS,
  tick: { fill: AXIS, fontSize: 12 },
  tickLine: false,
  axisLine: { stroke: GRID },
} as const;

const pct = (v: number | null | undefined) => (v == null ? "—" : `${metric(v, 1)}%`);

/** Screening appraisal: benefit-cost, NPV at two discount rates, and what is left unprotected. */
function Money() {
  const { plan } = useDash();
  const a = plan?.appraisal;
  if (!a) return null;
  const npv = a.npv;
  const mon = plan?.provenance?.monetisation;
  const series = npv?.series || [];
  return (
    <Card
      title="Does it pay for itself?"
      subtitle="Screening-grade appraisal — an order-of-magnitude check, not a funding-ready business case."
    >
      <div className="mini-stats four">
        <div>
          <span>Benefit / cost</span>
          <b>{a.bcr == null ? "—" : `${metric(a.bcr, 1)}×`}</b>
        </div>
        <div>
          <span>Net present value</span>
          <b>{npv?.npv_usd == null ? "—" : money(npv.npv_usd)}</b>
        </div>
        <div>
          <span>Internal rate of return</span>
          <b className={npv?.irr == null ? "unavailable" : ""}>
            {npv?.irr == null ? "not available" : pct(npv.irr * 100)}
          </b>
        </div>
        <div>
          <span>Risk still left</span>
          <b>{pct(a.residual_pct)}</b>
        </div>
      </div>

      {series.length > 0 && (
        <>
          <Legend
            items={[
              { color: GREEN, label: "Benefits (discounted)" },
              { color: CLAY, label: "Costs (discounted)" },
            ]}
          />
          <div className="chart">
            <ResponsiveContainer>
              <ComposedChart data={series} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="year" {...axis} />
                <YAxis
                  {...axis}
                  width={54}
                  tickFormatter={(v) => (v >= 1e6 ? `$${(v / 1e6).toFixed(0)}M` : `$${v / 1e3}k`)}
                />
                <Tooltip
                  content={<ChartTooltip title={(l) => `Year ${l}`} fmt={(v) => money(v)} />}
                />
                <Area
                  type="monotone"
                  dataKey="benefits_discounted_usd"
                  name="Benefits (discounted)"
                  stroke={GREEN}
                  fill="rgba(31, 92, 74, 0.14)"
                  strokeWidth={2.5}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="costs_discounted_usd"
                  name="Costs (discounted)"
                  stroke={CLAY}
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      <dl className="facts tight">
        {npv?.discount_rate != null && (
          <div>
            <dt>Discount rate</dt>
            <dd>
              {pct(npv.discount_rate * 100)} in the headline
              {npv.alt_discount_rate != null && npv.npv_usd_at_alt != null && (
                <>
                  {" "}
                  · at {pct(npv.alt_discount_rate * 100)} the NPV is {money(npv.npv_usd_at_alt)}
                </>
              )}
            </dd>
          </div>
        )}
        {npv?.annual_maint_cost_usd != null && (
          <div>
            <dt>Upkeep</dt>
            <dd>
              {money(npv.annual_maint_cost_usd)} a year
              {npv.om_frac_of_capex_yr != null &&
                ` (${pct(npv.om_frac_of_capex_yr * 100)} of build cost)`}
            </dd>
          </div>
        )}
        {a.residual_people_risk != null && (
          <div>
            <dt>Residual risk</dt>
            <dd>
              {risk(a.residual_people_risk)} of {risk(a.baseline_people_risk)} annual people-risk is
              still there after the plan.
            </dd>
          </div>
        )}
      </dl>

      {mon && (
        <Callout title="Where a ratio that big comes from.">
          The benefit side prices one unit of avoided people-risk at{" "}
          <b>{money(mon.value_per_person_yr_usd)} a year</b>
          {mon.price_co2_per_t_usd != null && <> and carbon at {money(mon.price_co2_per_t_usd)} a tonne</>}
          , then runs it over{" "}
          {npv?.horizon ? `${npv.horizon[1] - npv.horizon[0]} years` : "the appraisal horizon"} with a{" "}
          {a.climate_freq_mult != null ? `${metric(a.climate_freq_mult, 1)}×` : ""} climate multiplier.
          Change that price and the ratio changes with it — which is exactly why this is a screening
          check and not a business case.
        </Callout>
      )}
      <Callout title="Read the ratio with care.">
        {a.note} {npv?.note}
      </Callout>
    </Card>
  );
}

/** Spend it in tranches, with a stated trigger for continuing. */
function Phasing() {
  const { plan } = useDash();
  const p = plan?.pathways;
  if (!p?.phases?.length) return null;
  const peak = Math.max(...p.phases.map((ph) => ph.people_protected));
  return (
    <Card
      title="If $2M is not available this year"
      subtitle="The same portfolio, bought in tranches — each phase is a real solve, not a slice of the final answer."
    >
      <ol className="phases">
        {p.phases.map((phase, index) => (
          <li key={phase.id}>
            <span className="phase-n">{index + 1}</span>
            <div className="phase-body">
              <div className="phase-head">
                <b>{phase.year}</b>
                <span>
                  {phase.n_selected} sites · {money(phase.cost_usd)}
                </span>
              </div>
              {phase.blurb && <p>{phase.blurb}</p>}
              <div className="bar-track">
                <i
                  style={{
                    width: `${(phase.people_protected / peak) * 100}%`,
                    background: GREEN,
                  }}
                />
              </div>
              <small>
                {risk(phase.people_protected)} annual people-risk avoided
                {phase.residual_people_risk != null &&
                  ` · ${risk(phase.residual_people_risk)} still remaining`}
              </small>
            </div>
          </li>
        ))}
      </ol>
      {p.transferable_core_n != null && (
        <Callout tone="accent" title={`${p.transferable_core_n} sites are in every phase.`}>
          Those are the no-regret picks — worth doing whatever happens next.
          {p.trigger && ` The later tranches are conditional: ${p.trigger}.`}
        </Callout>
      )}
    </Card>
  );
}

/** Same budget, four different things to maximise. */
function Objectives() {
  const { plan } = useDash();
  const rows = plan?.objectives;
  if (!rows?.length) return null;
  // Several objectives often land on the identical portfolio; say so rather than implying choice.
  const distinct = new Map<string, string[]>();
  for (const row of rows) {
    const key = `${row.people_protected}|${row.co2_t_10yr}|${row.income_usd_yr}`;
    distinct.set(key, [...(distinct.get(key) || []), row.label]);
  }
  return (
    <Card
      title="Four ways to spend the same money"
      subtitle="Re-run for a different goal — people, carbon, income, or all three."
    >
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Goal</th>
              <th>Sites</th>
              <th>Risk cut / yr</th>
              <th>Worst-case cut</th>
              <th>CO₂ / 10 yr (t)</th>
              <th>Income / yr</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className={row.id === plan?.mode ? "" : ""}>
                <td>{row.label}</td>
                <td className="num">{row.n_selected}</td>
                <td className="num">{risk(row.people_protected)}</td>
                <td className="num">
                  {row.tail_people_protected == null ? "—" : risk(row.tail_people_protected)}
                </td>
                <td className="num">{metric(row.co2_t_10yr, 0)}</td>
                <td className="num">{money(row.income_usd_yr)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {distinct.size < rows.length && (
        <p className="chart-note">
          {[...distinct.values()]
            .filter((labels) => labels.length > 1)
            .map((labels) => `${labels.join(" and ")} pick the identical portfolio here`)
            .join("; ")}
          . With only one measure type affordable in this region, the goals do not pull apart.
        </p>
      )}
    </Card>
  );
}

/** Who captures the avoided risk. */
function Equity() {
  const { plan } = useDash();
  const e = plan?.equity;
  if (!e || e.share_of_benefit_high_equity_pct == null) return null;
  const share = e.share_of_benefit_high_equity_pct;
  return (
    <Card
      title="Who the benefit reaches"
      subtitle="Low-income rural cells carry extra weight when sites are ranked."
    >
      <div className="split-bar" role="img" aria-label="Share of benefit by area type">
        <span style={{ flexGrow: share, background: GREEN }} />
        <span style={{ flexGrow: 100 - share, background: "#b5bec8" }} />
      </div>
      <ul className="legend">
        <li>
          <i style={{ background: GREEN }} />
          Higher-weight areas · {pct(share)}
        </li>
        <li>
          <i style={{ background: "#b5bec8" }} />
          Everywhere else · {pct(100 - share)}
        </li>
      </ul>
      <dl className="facts tight">
        <div>
          <dt>Benefit reaching higher-weight areas</dt>
          <dd>
            {risk(e.people_protected_high_equity)} of{" "}
            {risk((e.people_protected_high_equity || 0) + (e.people_protected_other || 0))} annual
            people-risk avoided.
          </dd>
        </div>
        {e.residual_share_high_equity_pct != null && (
          <div>
            <dt>But the risk left over</dt>
            <dd>
              {pct(e.residual_share_high_equity_pct)} of the remaining risk still sits in those same
              areas. A bigger share of the help lands there, and so does a large share of what is
              still unsolved.
            </dd>
          </div>
        )}
        {e.method && (
          <div>
            <dt>How "higher weight" is decided</dt>
            <dd>{e.method}.</dd>
          </div>
        )}
      </dl>
    </Card>
  );
}

/** Does the pick survive a different climate assumption? */
function Regret() {
  const { plan } = useDash();
  const r = plan?.regret;
  const rob = plan?.robustness;
  if (!r?.table?.length && !rob) return null;
  return (
    <Card
      title="Would a different assumption change the answer?"
      subtitle="Testing the same portfolio against a harsher climate and a worst-case draw."
    >
      {r?.table?.length && (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Goal</th>
                  <th>As today</th>
                  <th>Harsher tail</th>
                  <th>Worst 10%</th>
                  <th>Worst regret</th>
                </tr>
              </thead>
              <tbody>
                {r.table.map((row) => (
                  <tr key={row.strategy} className={row.strategy === r.robust_pick ? "on" : ""}>
                    <td>
                      {row.label}
                      {row.strategy === r.robust_pick && <small>most robust</small>}
                    </td>
                    <td className="num">{risk(row.current)}</td>
                    <td className="num">{risk(row.intensified_tail)}</td>
                    <td className="num">{risk(row.cvar_tail)}</td>
                    <td className="num">{risk(row.max_regret_people)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="chart-note">
            "Worst regret" is how much risk-cut you would give up by choosing that goal and being
            wrong about the climate. Lower is safer.
          </p>
        </>
      )}
      {rob?.overlap_pct != null && (
        <Callout tone="accent" title={`${pct(rob.overlap_pct)} of the sites are the same either way.`}>
          {rob.selected_in_both_count} of {rob.selected_count} sites are chosen whether you optimise
          for the average year or the worst one. {rob.interpretation}
        </Callout>
      )}
    </Card>
  );
}

/** What the plan does NOT fix: residual risk by return period, and the 2050 outlook. */
export function ResidualRisk() {
  const { plan } = useDash();
  const ex = plan?.exceedance;
  const wf = plan?.waterfall;
  const ev = plan?.event_view;
  const ig = plan?.infographic;
  if (!ex && !wf && !ev && !ig) return null;

  const waterfallData = wf
    ? [
        { name: `${wf.present_year} today`, value: wf.present_people_risk, fill: SLATE },
        { name: `${wf.future_year} if nothing changes`, value: wf.future_no_measures, fill: CLAY },
        { name: "Averted by this plan", value: wf.averted_by_plan, fill: GREEN },
        { name: `${wf.future_year} still at risk`, value: wf.residual_future, fill: "#b5bec8" },
      ].filter((d) => d.value != null)
    : [];

  return (
    <>
      <div className="section-title">
        <h2>What the plan does not fix</h2>
        <p>
          A plan that only showed its wins would not be worth trusting. These are the same model's
          numbers for what is left over.
        </p>
      </div>

      <div className="grid-2">
        {ex?.points?.length && (
          <Card
            title="Bigger floods, less help"
            subtitle="Risk to people at each size of flood, with and without the plan."
          >
            <Legend
              items={[
                { color: CLAY, label: "No measures" },
                { color: GREEN, label: "With the plan" },
              ]}
            />
            <div className="chart">
              <ResponsiveContainer>
                <ComposedChart data={ex.points} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={GRID} />
                  <XAxis
                    dataKey="rp_yr"
                    {...axis}
                    tickFormatter={(v) => `1-in-${v}`}
                  />
                  <YAxis {...axis} width={52} tickFormatter={(v) => metric(v, 0)} />
                  <Tooltip
                    content={
                      <ChartTooltip
                        title={(l) => `A 1-in-${l}-year flood`}
                        fmt={(v) => `${risk(v)} risk points`}
                      />
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="no_measures"
                    name="No measures"
                    stroke={CLAY}
                    strokeWidth={2.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="with_plan"
                    name="With the plan"
                    stroke={GREEN}
                    strokeWidth={2.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p className="chart-note">
              The gap between the lines is what the plan buys. It stays roughly proportional, so a
              rarer, bigger flood still does far more harm even with every site planted.
            </p>
          </Card>
        )}

        {waterfallData.length > 0 && (
          <Card
            title={`Today against ${wf?.future_year}`}
            subtitle="Risk grows faster than this budget can hold it back."
          >
            <div className="chart">
              <ResponsiveContainer>
                <BarChart
                  data={waterfallData}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid horizontal={false} stroke={GRID} />
                  <XAxis type="number" {...axis} tickFormatter={(v) => metric(v, 0)} />
                  <YAxis type="category" dataKey="name" {...axis} width={150} />
                  <Tooltip content={<ChartTooltip fmt={(v) => `${risk(v)} risk points`} />} />
                  <Bar dataKey="value" name="Annual people-risk" radius={[0, 4, 4, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {wf?.adaptation_closes_pct_of_climate_increment != null && (
              <p className="chart-note">
                This plan closes {pct(wf.adaptation_closes_pct_of_climate_increment)} of the increase
                that the harsher rainfall brings. The rest needs either more money or different
                measures.
              </p>
            )}
          </Card>
        )}
      </div>

      {(ev || ig) && (
        <Card
          title="In one flood, and over thirty years"
          subtitle="Modelled people in cells deep enough to count as flooded."
        >
          <div className="mini-stats four">
            {ev?.return_periods?.map((rp) => (
              <div key={rp}>
                <span>A 1-in-{rp}-year flood</span>
                <b>{metric(ev.no_measures?.[String(rp)], 0)}</b>
                <small className="delta">
                  → {metric(ev.with_plan?.[String(rp)], 0)} with the plan
                </small>
              </div>
            ))}
            {ig?.people_likely_flooded_no_measures != null && (
              <div>
                <span>Likely flooded in {ig.period_yr} years</span>
                <b>{metric(ig.people_likely_flooded_no_measures, 0)}</b>
                <small className="delta">
                  → {metric(ig.people_likely_flooded_with_plan, 0)} with the plan
                </small>
              </div>
            )}
          </div>
          <Callout title="These are exposure units, not a headcount.">
            {ev?.note} {ig?.note}
          </Callout>
        </Card>
      )}
    </>
  );
}

/** The folded government deep-dive. Every card hides itself when its data is absent. */
export default function PlanDeepDive() {
  const { plan } = useDash();
  if (!plan) return null;
  const has =
    plan.appraisal || plan.pathways || plan.objectives || plan.equity || plan.regret || plan.robustness;
  if (!has) return null;
  return (
    <Card className="deep-dive">
      <Accordion title="The full appraisal — money, phasing, fairness and robustness">
        <div className="deep-stack">
          <Money />
          <Phasing />
          <Objectives />
          <Equity />
          <Regret />
        </div>
      </Accordion>
    </Card>
  );
}
