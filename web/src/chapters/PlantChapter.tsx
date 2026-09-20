import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { chartGrid, chartTick, chartTooltip, humanize, metric, money, risk } from "../lib/format";
import { planMix, rankedMeasures } from "../lib/planSummary";
import PlanExtras from "./PlanExtras";
import type {
  CandidateSite,
  FloodAdaptPayload,
  OptimizationMode,
  OptimizerState,
  Plan,
} from "../lib/types";

type Props = {
  plan: Plan;
  candidates: CandidateSite[];
  scenarios: FloodAdaptPayload | null;
  budget: number;
  mode: OptimizationMode;
  optimizerState: OptimizerState;
  busy: boolean;
  picked: string | null;
  onBudget: (value: number) => void;
  onMode: (value: OptimizationMode) => void;
  onRecalculate: () => void;
  onPick: (id: string) => void;
};

export default function PlantChapter({
  plan,
  candidates,
  scenarios,
  budget,
  mode,
  optimizerState,
  busy,
  picked,
  onBudget,
  onMode,
  onRecalculate,
  onPick,
}: Props) {
  const knapsackPct =
    plan.optimality?.gap_pct == null ? null : Math.max(0, 100 - plan.optimality.gap_pct);
  const mix = planMix(plan, candidates);
  const ranked = rankedMeasures(plan);
  const featured = ranked.slice(0, 5);
  const objectives = plan.objectives || [];
  const compare = scenarios?.compare || scenarios?.scenarios?.slice(0, 2) || [];
  const scatter = plan.selected
    .filter((row) => row.cost_usd != null && row.benefit_usd != null)
    .map((row) => ({
      id: row.parcel_id,
      cost_usd: row.cost_usd,
      benefit_usd: row.benefit_usd || 0,
    }));
  const maxAxis = Math.max(1, ...scatter.flatMap((row) => [row.cost_usd, row.benefit_usd]));

  return (
    <>
      <div className="kpis kpis-3">
        <div className="kpi">
          <span>Sites</span>
          <b>{metric(plan.selected.length, 0)}</b>
        </div>
        <div className="kpi">
          <span>Spend</span>
          <b>{money(plan.totals.cost_usd)}</b>
        </div>
        <div className="kpi">
          <span>People-risk / yr</span>
          <b>{risk(plan.totals.people_protected)}</b>
        </div>
        <div className="kpi">
          <span>tCO₂ / 10 yr</span>
          <b>{metric(plan.totals.co2_t_10yr, 0)}</b>
        </div>
        <div className="kpi">
          <span>BCR (screening)</span>
          <b>{plan.appraisal?.bcr == null ? "—" : metric(plan.appraisal.bcr, 2)}</b>
        </div>
        <div className="kpi">
          <span>Residual people-risk</span>
          <b>{risk(plan.appraisal?.residual_people_risk)}</b>
        </div>
      </div>
      {plan.appraisal?.note && <p className="detail">{plan.appraisal.note}</p>}

      <div className="mix">
        {mix.map((row) => (
          <div className="mix-row" key={row.type}>
            <b>{humanize(row.type)}</b>
            <span>
              {row.count} sites · {money(row.cost)}
            </span>
          </div>
        ))}
      </div>

      {compare.length > 0 && (
        <>
          <div className="chart-head">
            <b>FloodAdapt scenarios</b>
            <span>event × projection × strategy · not SFINCS</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Scenario</th>
                <th>Event</th>
                <th>Projection</th>
                <th>Strategy</th>
                <th>People-risk</th>
              </tr>
            </thead>
            <tbody>
              {(scenarios?.scenarios || []).map((row) => (
                <tr
                  key={row.name}
                  className={
                    row.strategy === "nbs_blended_2M" || row.strategy === "no_measures" ? "on" : ""
                  }
                >
                  <td>{row.name}</td>
                  <td>{row.event || "—"}</td>
                  <td>{row.projection || "—"}</td>
                  <td>{row.strategy || "—"}</td>
                  <td>{risk(row.people_risk_eal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="detail">
            {scenarios?.provenance?.data_status ||
              "FloodAdapt planning grammar on HAND + literature effects."}
          </p>
        </>
      )}

      {objectives.length > 0 && (
        <>
          <div className="chart-head">
            <b>Same budget, four books</b>
            <span>lives · carbon · income · blend</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Objective</th>
                <th>Sites</th>
                <th>People-risk</th>
                <th>tCO₂</th>
                <th>Income / yr</th>
              </tr>
            </thead>
            <tbody>
              {objectives.map((row) => (
                <tr key={row.id} className={row.id === "blended" ? "on" : ""}>
                  <td>{row.label}</td>
                  <td>{metric(row.n_selected, 0)}</td>
                  <td>{risk(row.people_protected)}</td>
                  <td>{metric(row.co2_t_10yr, 0)}</td>
                  <td>{money(row.income_usd_yr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="chart">
            <ResponsiveContainer>
              <ScatterChart margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={chartGrid} />
                <XAxis dataKey="people_protected" name="people-risk" stroke={chartTick} type="number" />
                <YAxis dataKey="co2_t_10yr" name="tCO2" stroke={chartTick} type="number" />
                <ZAxis range={[60, 60]} />
                <Tooltip
                  contentStyle={chartTooltip}
                  formatter={(value) => [metric(Number(value), 1)]}
                  labelFormatter={(_, payload) =>
                    String((payload?.[0]?.payload as { label?: string } | undefined)?.label || "")
                  }
                />
                <Scatter data={objectives} fill="#3ee0c0" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      <PlanExtras plan={plan} />

      {scatter.length > 0 && (
        <>
          <div className="chart-head">
            <b>Cost vs screening benefit</b>
            <span>1:1 line is BCR = 1</span>
          </div>
          <div className="chart">
            <ResponsiveContainer>
              <ScatterChart margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={chartGrid} />
                <XAxis
                  dataKey="cost_usd"
                  name="cost"
                  stroke={chartTick}
                  type="number"
                  domain={[0, maxAxis]}
                  tickFormatter={(value) => money(Number(value))}
                />
                <YAxis
                  dataKey="benefit_usd"
                  name="benefit"
                  stroke={chartTick}
                  type="number"
                  domain={[0, maxAxis]}
                  tickFormatter={(value) => money(Number(value))}
                />
                <ZAxis range={[28, 28]} />
                <Tooltip
                  contentStyle={chartTooltip}
                  formatter={(value) => [money(Number(value))]}
                  labelFormatter={(_, payload) =>
                    String((payload?.[0]?.payload as { id?: string } | undefined)?.id || "")
                  }
                />
                <ReferenceLine
                  segment={[
                    { x: 0, y: 0 },
                    { x: maxAxis, y: maxAxis },
                  ]}
                  stroke="#f0c14b"
                  strokeDasharray="4 4"
                />
                <Scatter data={scatter} fill="#3ee0c0" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      <p className="detail">
        Top 5 of {metric(plan.selected.length, 0)} — the rest are the coloured dots on the map.
      </p>
      <div className="measure-list compact">
        {featured.map((row) => (
          <button
            key={row.parcel_id}
            className={`measure-list-row ${picked === row.parcel_id ? "on" : ""}`}
            onClick={() => onPick(row.parcel_id)}
          >
            <span className="measure-rank">{row.priority_rank ?? "—"}</span>
            <span className="measure-copy">
              <b>{humanize(row.type)}</b>
              <small>{row.parcel_id}</small>
            </span>
            <span className="measure-nums">
              {money(row.cost_usd)}
              <small>
                {risk(row.avoided_eal_people)}
                {row.bcr != null ? ` · BCR ${metric(row.bcr, 1)}` : ""}
              </small>
            </span>
          </button>
        ))}
      </div>
      <p className="equity-chip">Low-income cells carry up to 1.5× weight in the ranking.</p>

      <details className="optimizer-fold">
        <summary>
          {optimizerState === "frozen"
            ? `Cached ${money(plan.budget_usd)} plan — slider locked`
            : "Budget, CVaR, knapsack"}
        </summary>
        <div className={`optimizer-status ${optimizerState}`}>
          {optimizerState === "live" && (
            <>
              <b>Live optimizer connected.</b> Recalculate posts a new portfolio.
            </>
          )}
          {optimizerState === "checking" && <b>Checking the optimizer…</b>}
          {optimizerState === "frozen" && (
            <>Booth freeze: the slider cannot POST /optimize. Set <code>VITE_ALLOW_OPTIMIZE=true</code> only if you mean to re-solve.</>
          )}
          {optimizerState === "unavailable" && <b>Optimizer unavailable.</b>}
        </div>
        <label className="row">
          <span>
            Budget {money(budget)} {busy ? "· working…" : ""}
          </span>
          <span>{plan.mode}</span>
        </label>
        <input
          className="slider"
          type="range"
          min={250000}
          max={2000000}
          step={50000}
          value={budget}
          disabled={optimizerState !== "live" || busy}
          onChange={(event) => onBudget(Number(event.target.value))}
        />
        <label className="row">
          <span>Portfolio objective</span>
          <select
            value={mode}
            disabled={optimizerState !== "live" || busy}
            onChange={(event) => onMode(event.target.value as OptimizationMode)}
          >
            <option value="expected">Expected people-risk</option>
            <option value="cvar">CVaR · worst 10% tail</option>
          </select>
        </label>
        <button
          className="dl recalc"
          disabled={optimizerState !== "live" || busy}
          onClick={onRecalculate}
        >
          Recalculate
        </button>
        {plan.cvar?.tail_people_protected != null && (
          <p className="detail">
            Worst-tail people-risk avoided: {risk(plan.cvar.tail_people_protected)}.
          </p>
        )}
        <div className="chart">
          <ResponsiveContainer>
            <ComposedChart data={plan.frontier} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={chartGrid} />
              <XAxis dataKey="budget_usd" stroke={chartTick} tickFormatter={(value) => `$${value / 1e6}M`} />
              <YAxis stroke={chartTick} tickFormatter={(value) => metric(value, 0)} />
              <Tooltip
                contentStyle={chartTooltip}
                formatter={(value) => [risk(Number(value)), "Annual people-risk avoided"]}
              />
              <Line type="monotone" dataKey="people_protected" stroke="#3ee0c0" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        {knapsackPct != null && (
          <p className="detail">
            Greedy ≥{metric(knapsackPct, 1)}% of the relaxed knapsack bound
            {plan.optimality?.note ? ` — ${plan.optimality.note}` : "."}
          </p>
        )}
      </details>
    </>
  );
}
