import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chartGrid, chartTick, chartTooltip, humanize, metric, money, risk } from "../lib/format";
import type { Plan } from "../lib/types";

export default function PlanExtras({ plan }: { plan: Plan }) {
  const npv = plan.appraisal?.npv;
  const series = (npv?.series || []).map((row) => ({
    year: row.year,
    benefits: row.benefits_discounted_usd || 0,
    costs: row.costs_discounted_usd || 0,
  }));
  const phases = plan.pathways?.phases || [];
  const waterfall = plan.waterfall;
  const waterfallBars = waterfall
    ? [
        { name: `${waterfall.present_year || 2024}`, value: waterfall.present_people_risk || 0, fill: "#8fa0b8" },
        { name: `${waterfall.future_year || 2050} no NbS`, value: waterfall.future_no_measures || 0, fill: "#f07171" },
        { name: "averted", value: waterfall.averted_by_plan || 0, fill: "#3ee0c0" },
        { name: "residual", value: waterfall.residual_future || 0, fill: "#f0c14b" },
      ]
    : [];
  const exceed = (plan.exceedance?.points || []).map((row) => ({
    rp: row.rp_yr,
    no_measures: row.no_measures,
    with_plan: row.with_plan,
  }));
  const eventRows = (plan.event_view?.return_periods || []).map((rp) => ({
    rp: `${rp} yr`,
    no_measures: plan.event_view?.no_measures?.[String(rp)] || 0,
    with_plan: plan.event_view?.with_plan?.[String(rp)] || 0,
  }));
  const catalog = (plan.measure_catalog || []).filter((row) => !row.out_of_catalog);
  const out = (plan.measure_catalog || []).find((row) => row.out_of_catalog);

  return (
    <>
      {(npv?.npv_usd != null || plan.robustness?.overlap_pct != null) && (
        <div className="kpis kpis-3">
          <div className="kpi">
            <span>NPV @ 3%</span>
            <b>{money(npv?.npv_usd)}</b>
          </div>
          <div className="kpi">
            <span>BCR (NPV)</span>
            <b>{npv?.bcr_npv == null ? "—" : metric(npv.bcr_npv, 2)}</b>
          </div>
          <div className="kpi">
            <span>IRR</span>
            <b>{npv?.irr == null ? "n/a" : `${metric(npv.irr * 100, 1)}%`}</b>
          </div>
          <div className="kpi">
            <span>Expected ∩ CVaR</span>
            <b>{plan.robustness?.overlap_pct == null ? "—" : `${metric(plan.robustness.overlap_pct, 0)}%`}</b>
          </div>
          <div className="kpi">
            <span>High-equity share</span>
            <b>
              {plan.equity?.share_of_benefit_high_equity_pct == null
                ? "—"
                : `${metric(plan.equity.share_of_benefit_high_equity_pct, 0)}%`}
            </b>
          </div>
          <div className="kpi">
            <span>Closes climate increment</span>
            <b>
              {waterfall?.adaptation_closes_pct_of_climate_increment == null
                ? "—"
                : `${metric(waterfall.adaptation_closes_pct_of_climate_increment, 0)}%`}
            </b>
          </div>
        </div>
      )}
      {npv?.note && <p className="detail">{npv.note}</p>}

      {phases.length > 0 && (
        <>
          <div className="chart-head">
            <b>Adaptation pathway</b>
            <span>{plan.pathways?.trigger}</span>
          </div>
          <div className="pathway">
            {phases.map((phase, index) => (
              <div className="pathway-card" key={phase.id}>
                <span>
                  {index + 1}. {phase.id.replace(/_/g, " ")} · {phase.year}
                </span>
                <b>
                  {money(phase.cost_usd || phase.budget_usd)} · {metric(phase.n_selected, 0)} sites
                </b>
                <small>
                  {risk(phase.people_protected)} people-risk / yr · {phase.blurb}
                </small>
              </div>
            ))}
          </div>
          <p className="detail">
            Transferable core: {metric(plan.pathways?.transferable_core_n, 0)} parcels survive every phase
            (and expected vs CVaR). {plan.pathways?.note}
          </p>
        </>
      )}

      {series.length > 0 && (
        <>
          <div className="chart-head">
            <b>Discounted benefits vs costs</b>
            <span>3% primary · {npv?.alt_discount_rate ? `${metric((npv.alt_discount_rate || 0) * 100, 0)}% alt NPV ${money(npv.npv_usd_at_alt)}` : ""}</span>
          </div>
          <div className="chart">
            <ResponsiveContainer>
              <ComposedChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={chartGrid} />
                <XAxis dataKey="year" stroke={chartTick} />
                <YAxis stroke={chartTick} tickFormatter={(value) => money(Number(value))} />
                <Tooltip contentStyle={chartTooltip} formatter={(value) => money(Number(value))} />
                <Area type="monotone" dataKey="benefits" stroke="#3ee0c0" fill="#3ee0c0" fillOpacity={0.2} />
                <Line type="monotone" dataKey="costs" stroke="#f0c14b" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {waterfallBars.length > 0 && (
        <>
          <div className="chart-head">
            <b>Climate waterfall</b>
            <span>zero socioeconomic development</span>
          </div>
          <div className="chart">
            <ResponsiveContainer>
              <BarChart data={waterfallBars} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={chartGrid} />
                <XAxis dataKey="name" stroke={chartTick} />
                <YAxis stroke={chartTick} tickFormatter={(value) => metric(Number(value), 0)} />
                <Tooltip contentStyle={chartTooltip} formatter={(value) => risk(Number(value))} />
                <Bar dataKey="value">
                  {waterfallBars.map((row) => (
                    <Cell key={row.name} fill={row.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="detail">{waterfall?.note}</p>
        </>
      )}

      {exceed.length > 0 && (
        <>
          <div className="chart-head">
            <b>People-risk exceedance</b>
            <span>no_measures vs nbs_blended_2M</span>
          </div>
          <div className="chart">
            <ResponsiveContainer>
              <ComposedChart data={exceed} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={chartGrid} />
                <XAxis dataKey="rp" stroke={chartTick} tickFormatter={(value) => `${value}y`} />
                <YAxis stroke={chartTick} />
                <Tooltip contentStyle={chartTooltip} />
                <Legend />
                <Line type="monotone" dataKey="no_measures" stroke="#f07171" strokeWidth={2} />
                <Line type="monotone" dataKey="with_plan" stroke="#3ee0c0" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="detail">{plan.exceedance?.method}</p>
        </>
      )}

      {plan.regret?.table?.length ? (
        <>
          <div className="chart-head">
            <b>Regret under uncertainty</b>
            <span>robust pick · {plan.regret.robust_pick}</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Book</th>
                <th>Current</th>
                <th>Intensified</th>
                <th>CVaR tail</th>
                <th>Max regret</th>
              </tr>
            </thead>
            <tbody>
              {plan.regret.table.map((row) => (
                <tr key={row.strategy} className={row.strategy === plan.regret?.robust_pick ? "on" : ""}>
                  <td>{row.label || row.strategy}</td>
                  <td>{risk(row.current)}</td>
                  <td>{risk(row.intensified_tail)}</td>
                  <td>{risk(row.cvar_tail)}</td>
                  <td>{risk(row.max_regret_people)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="detail">{plan.regret.note}</p>
        </>
      ) : null}

      {eventRows.length > 0 && (
        <>
          <div className="chart-head">
            <b>RP10 / RP100 event view</b>
            <span>HAND-proxy depth ≥ {plan.event_view?.depth_threshold_m} m</span>
          </div>
          <div className="chart">
            <ResponsiveContainer>
              <BarChart data={eventRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={chartGrid} />
                <XAxis dataKey="rp" stroke={chartTick} />
                <YAxis stroke={chartTick} tickFormatter={(value) => metric(Number(value), 0)} />
                <Tooltip contentStyle={chartTooltip} />
                <Legend />
                <Bar dataKey="no_measures" fill="#f07171" />
                <Bar dataKey="with_plan" fill="#3ee0c0" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="detail">{plan.event_view?.note}</p>
        </>
      )}

      {catalog.length > 0 && (
        <>
          <div className="chart-head">
            <b>Measure catalog</b>
            <span>literature factors · O&amp;M on the card</span>
          </div>
          <div className="catalog">
            {catalog.map((row) => (
              <div className="catalog-card" key={row.type}>
                <span>{humanize(row.type)}</span>
                <b>
                  {metric(row.n_selected, 0)} selected · {money(row.spend_usd)}
                </b>
                <small>
                  {money(row.cost_per_ha)}/ha · {metric((row.eal_reduction_frac || 0) * 100, 0)}% EAL ·{" "}
                  {metric(row.lifetime_yr, 0)} yr · {metric((row.om_frac_of_capex_yr || 0) * 100, 0)}% O&amp;M
                </small>
              </div>
            ))}
          </div>
          {out?.note && <p className="detail">{out.note}</p>}
        </>
      )}
    </>
  );
}
