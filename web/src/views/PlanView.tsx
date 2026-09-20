import { useMemo, useState } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowUpDown } from "lucide-react";
import { ChartTooltip } from "../charts";
import { typeColor, typeLabel } from "../colors";
import { useDash } from "../context";
import { metric, money, risk } from "../format";
import ExportPlanForm from "../ExportPlanForm";
import MapPanel from "../MapPanel";
import PlanTiles from "../PlanTiles";
import { earlyBenefitOf, selectedTypes, siteNoun } from "../plan";
import type { OptimizationMode } from "../types";
import { Accordion, Card, InfoPopover, Segmented } from "../ui";
import { MapKey } from "../viz";

// Chart colours for the light theme.
const GREEN = "#1f5c4a";
const GRID = "rgba(23, 33, 43, 0.1)";
const AXIS = "#6b7580";
const axis = { stroke: AXIS, tick: { fill: AXIS, fontSize: 12 }, tickLine: false, axisLine: { stroke: GRID } } as const;

type SortKey = "cost" | "people" | "co2" | "income";

function OptimizerStatus() {
  const { optimizerState, plan } = useDash();
  const text = {
    live: {
      label: "Live optimizer",
      body: "Budget and objective changes recalculate the preventive portfolio through the API.",
    },
    checking: {
      label: "Checking optimizer…",
      body: "Controls stay locked until a live response arrives.",
    },
    frozen: {
      label: "Frozen offline plan",
      body: `The API is unavailable, so this cached ${plan ? money(plan.budget_usd) : ""} ${
        plan?.mode || ""
      } result is shown unchanged. Budget and objective are locked rather than pretending to recalculate.`,
    },
    unavailable: {
      label: "Optimizer unavailable",
      body: "No control can imply a result that was not computed.",
    },
  }[optimizerState];
  return (
    <span className={`status-pill ${optimizerState}`}>
      <i />
      {text.label}
      <InfoPopover title={text.label}>{text.body}</InfoPopover>
    </span>
  );
}

/** The budget card in the hero: dragging the slider re-plans everything below. */
function BudgetCard() {
  const d = useDash();
  const { plan, budget, mode, optimizerState, loading } = d;
  const locked = optimizerState !== "live" || loading;
  const min = 250_000;
  const max = 2_000_000;
  const pct = ((budget - min) / (max - min)) * 100;
  const sites = siteNoun(plan, d.candidates);

  return (
    <div className="hero-stat plan-card">
      <div className="plan-card-head">
        <span className="eyebrow">Your budget</span>
        <OptimizerStatus />
      </div>
      <div className="plan-budget">{money(budget)}</div>
      <small className="plan-sub">
        {plan ? `${plan.selected.length} ${sites}` : "—"}
        {loading ? " · optimizing…" : ""}
      </small>

      <div>
        <input
          className="slider"
          type="range"
          aria-label="Budget"
          min={min}
          max={max}
          step={50_000}
          value={budget}
          style={{ ["--pct" as string]: `${pct}%` }}
          disabled={locked}
          onChange={(event) => d.setBudget(Number(event.target.value))}
          onPointerUp={(event) => d.rerun(Number((event.target as HTMLInputElement).value), mode)}
          onKeyUp={(event) => {
            if (["ArrowLeft", "ArrowRight", "Home", "End", "PageUp", "PageDown"].includes(event.key)) {
              d.rerun(Number((event.target as HTMLInputElement).value), mode);
            }
          }}
        />
        <div className="slider-scale">
          <span>{money(min)}</span>
          <span>{money(max)}</span>
        </div>
      </div>

      <div className="field">
        <span className="field-label">
          What to optimize for
          <InfoPopover title="Worst-case years">
            The worst-case option picks sites that still work in the worst 10% of modeled climate years, the way a
            cautious investor guards against a bad year.
            {plan?.cvar?.tail_people_protected != null
              ? ` Cached worst-case risk cut: ${risk(plan.cvar.tail_people_protected)} points a year.`
              : ""}
          </InfoPopover>
        </span>
        <Segmented<OptimizationMode>
          label="What to optimize for"
          value={mode}
          disabled={locked}
          onChange={(value) => d.rerun(budget, value)}
          options={[
            { value: "expected", label: "Best on average" },
            { value: "cvar", label: "Worst-case years" },
          ]}
        />
      </div>
    </div>
  );
}

function Frontier() {
  const { plan, budget } = useDash();
  if (!plan) return null;
  const nearest = plan.frontier.reduce(
    (best, point) => (Math.abs(point.budget_usd - budget) < Math.abs(best.budget_usd - budget) ? point : best),
    plan.frontier[0]
  );
  const early = earlyBenefitOf(plan);
  const knapsackPct = plan.optimality?.gap_pct == null ? null : Math.max(0, 100 - plan.optimality.gap_pct);
  return (
    <Card
      title="What each extra dollar buys"
      subtitle="Modeled risk cut as the budget grows · the dot is your budget"
      info={
        knapsackPct != null
          ? `The picks reach at least ${metric(knapsackPct, 1)}% of a theoretical upper bound${
              plan.optimality?.note ? `. ${plan.optimality.note}` : "."
            }`
          : undefined
      }
    >
      <div className="chart tall">
        <ResponsiveContainer>
          <ComposedChart data={plan.frontier} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis
              dataKey="budget_usd"
              type="number"
              domain={["dataMin", "dataMax"]}
              {...axis}
              tickFormatter={(value) => `$${(value / 1e6).toFixed(1)}M`}
            />
            <YAxis {...axis} width={48} tickFormatter={(value) => metric(value, 0)} />
            <Tooltip
              content={<ChartTooltip title={(l) => `Budget ${money(Number(l))}`} fmt={(v) => `${risk(v)} risk points`} />}
            />
            <Line
              type="monotone"
              dataKey="people_protected"
              name="Risk cut per year"
              stroke={GREEN}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
            <ReferenceDot
              x={nearest.budget_usd}
              y={nearest.people_protected}
              r={7}
              fill={GREEN}
              stroke="#fff"
              strokeWidth={3}
              ifOverflow="extendDomain"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {early && (
        <p className="chart-note">
          {early.pct}% of the risk reduction arrives by {money(early.budget)}. After that, each extra dollar buys less.
        </p>
      )}
    </Card>
  );
}

function Mix() {
  const { plan, candidates } = useDash();
  const rows = useMemo(() => {
    if (!plan) return [];
    const acc: Record<string, { count: number; peopleRisk: number; cost: number }> = {};
    for (const sel of plan.selected) {
      const kind = candidates.find((c) => c.parcel_id === sel.parcel_id)?.type || "unknown";
      const row = acc[kind] || { count: 0, peopleRisk: 0, cost: 0 };
      row.count += 1;
      row.peopleRisk += sel.avoided_eal_people;
      row.cost += sel.cost_usd;
      acc[kind] = row;
    }
    return Object.entries(acc).sort((l, r) => r[1].peopleRisk - l[1].peopleRisk);
  }, [plan, candidates]);
  const total = rows.reduce((sum, [, row]) => sum + row.peopleRisk, 0) || 1;

  return (
    <Card title="What the money is spent on" subtitle="Share of the risk reduction, by kind of site">
      <div className="mixbar" role="img" aria-label="Portfolio mix by kind of site">
        {rows.map(([kind, row]) => (
          <span
            key={kind}
            title={`${typeLabel(kind)} · ${risk(row.peopleRisk)}`}
            style={{ flexGrow: row.peopleRisk, background: typeColor(kind) }}
          />
        ))}
      </div>
      <ul className="mixlist">
        {rows.map(([kind, row]) => (
          <li key={kind}>
            <i style={{ background: typeColor(kind) }} />
            <b>{typeLabel(kind)}</b>
            <span>{row.count} sites</span>
            <span>{money(row.cost)}</span>
            <span className="num">
              {risk(row.peopleRisk)} <small>({Math.round((row.peopleRisk / total) * 100)}%)</small>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function MeasureTable() {
  const d = useDash();
  const { plan, candidates, picked } = d;
  const [filter, setFilter] = useState<string>("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "people", dir: -1 });
  const [showAll, setShowAll] = useState(false);

  const rows = useMemo(() => {
    if (!plan) return [];
    return plan.selected.map((sel) => ({
      ...sel,
      kind: candidates.find((c) => c.parcel_id === sel.parcel_id)?.type || "unknown",
    }));
  }, [plan, candidates]);
  const kinds = useMemo(() => Array.from(new Set(rows.map((row) => row.kind))), [rows]);

  const pick: Record<SortKey, (row: (typeof rows)[number]) => number> = {
    cost: (row) => row.cost_usd,
    people: (row) => row.avoided_eal_people,
    co2: (row) => row.co2_t_10yr,
    income: (row) => row.income_usd_yr,
  };
  const visible = rows
    .filter((row) => filter === "all" || row.kind === filter)
    .sort((l, r) => (pick[sort.key](l) - pick[sort.key](r)) * sort.dir);
  const shown = showAll ? visible : visible.slice(0, 8);

  const th = (key: SortKey, label: string) => (
    <th aria-sort={sort.key === key ? (sort.dir === -1 ? "descending" : "ascending") : "none"}>
      <button onClick={() => setSort((s) => ({ key, dir: s.key === key ? ((-s.dir) as 1 | -1) : -1 }))}>
        {label} <ArrowUpDown size={12} />
      </button>
    </th>
  );

  return (
    <Card
      title="Every recommended site"
      subtitle="Click a row to open its details, or click a dot on the map."
      className="wide"
      action={
        <div className="chips" role="group" aria-label="Filter by kind of site">
          <button className={filter === "all" ? "on" : ""} onClick={() => setFilter("all")}>
            All
          </button>
          {kinds.map((kind) => (
            <button key={kind} className={filter === kind ? "on" : ""} onClick={() => setFilter(kind)}>
              <i style={{ background: typeColor(kind) }} />
              {typeLabel(kind)}
            </button>
          ))}
        </div>
      }
    >
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Site</th>
              {th("cost", "Cost")}
              {th("people", "Risk cut / yr")}
              {th("co2", "CO₂ / 10 yr (t)")}
              {th("income", "Income / yr")}
            </tr>
          </thead>
          <tbody>
            {shown.map((row) => (
              <tr
                key={row.parcel_id}
                className={picked === row.parcel_id && d.drawerOpen ? "on" : ""}
                onClick={() => d.openMeasure(row.parcel_id)}
                tabIndex={0}
                onKeyDown={(event) => event.key === "Enter" && d.openMeasure(row.parcel_id)}
              >
                <td>
                  <i className="dot" style={{ background: typeColor(row.kind) }} />
                  <b>{row.parcel_id}</b>
                  <small>{typeLabel(row.kind)}</small>
                </td>
                <td className="num">{money(row.cost_usd)}</td>
                <td className="num">{risk(row.avoided_eal_people)}</td>
                <td className="num">{metric(row.co2_t_10yr, 0)}</td>
                <td className="num">{money(row.income_usd_yr)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {visible.length > 8 && (
        <button className="btn ghost small" onClick={() => setShowAll((v) => !v)}>
          {showAll ? "Show fewer" : `Show all ${visible.length}`}
        </button>
      )}
    </Card>
  );
}

export default function PlanView() {
  const d = useDash();
  const { plan, budget } = d;
  const types = selectedTypes(plan, d.candidates);
  const sites = siteNoun(plan, d.candidates);
  const early = earlyBenefitOf(plan);
  const knapsackPct = plan?.optimality?.gap_pct == null ? null : Math.max(0, 100 - plan.optimality.gap_pct);

  return (
    <div className="view">
      <section className="hero rain-hero">
        <div className="hero-copy">
          <span className="eyebrow">The plan</span>
          <h1>
            {plan ? (
              <>
                The best places to build with <em>{money(budget)}</em>
              </>
            ) : (
              "Working out the best places to build…"
            )}
          </h1>
          <p className="hero-lede">
            Pick a budget and the planner chooses the sites that cut the most modeled risk for the money. Drag the
            slider and everything below updates.
          </p>
        </div>
        <BudgetCard />
      </section>

      <PlanTiles />

      <section className="map-section" aria-labelledby="plan-map-title">
        <header className="map-head">
          <h2 id="plan-map-title">Where the sites go</h2>
          <MapKey types={types} />
        </header>
        <div className="map-frame">
          <MapPanel height={560} plain search />
        </div>
      </section>

      <div className="section-title">
        <h2>Is the money well spent?</h2>
        <p>Bigger budgets help, but with diminishing returns. Here is what the budget buys and where it goes.</p>
      </div>
      <div className="grid-2">
        <Frontier />
        <Mix />
      </div>

      <div className="section-title">
        <h2>The sites</h2>
        <p>Sort by cost, risk cut, carbon or income, or filter by kind of site.</p>
      </div>
      <MeasureTable />

      {plan && (
        <section className="why no-date" aria-labelledby="plan-takeaway">
          <div className="why-body">
            <h2 id="plan-takeaway">What this means</h2>
            <p>
              {money(plan.totals.cost_usd)} goes into {plan.selected.length} {sites}, chosen to cut the most modeled
              risk for each dollar.
              {early ? ` ${early.pct}% of the benefit arrives by ${money(early.budget)}, so the last dollars buy less.` : ""} All
              of it is modeled, and no site has been field-tested yet.
            </p>
          </div>
        </section>
      )}

      {plan && (
        <Card>
          <Accordion title="How the plan is chosen">
            <ul className="plain-list">
              <li>
                <b>Risk per dollar.</b> The planner keeps adding the site that cuts the most risk for its cost, until the
                budget is used.
              </li>
              {knapsackPct != null && (
                <li>
                  <b>A check against the best possible.</b> The picks reach at least {metric(knapsackPct, 1)}% of a
                  theoretical upper bound{plan.optimality?.note ? `. ${plan.optimality.note}` : "."}
                </li>
              )}
              <li>
                <b>Fairness.</b> Low-income areas count for up to 1.5× in the risk score, so they aren't overlooked.
              </li>
            </ul>
            {plan.provenance?.method && <p className="muted-p">{plan.provenance.method}</p>}
          </Accordion>
        </Card>
      )}

      <ExportPlanForm />
    </div>
  );
}
