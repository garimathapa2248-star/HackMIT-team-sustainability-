import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ask, conceptNote, loadJson, optimize } from "./api";
import HazardMap from "./HazardMap";
import NoisePanel from "./NoisePanel";

type FlowStep = "noise" | "signal" | "plan" | "backtest" | "ask" | "report";
type OptimizationMode = "expected" | "cvar";

type Signal = {
  stations_processed: number;
  station_years: number;
  return_levels_mm: Record<string, number>;
  return_levels_ci95: Record<string, [number, number]>;
  headline: {
    statement: string;
    new_return_period_yrs: number;
    old_return_period_yrs: number;
    early_period?: [number, number];
    late_period?: [number, number];
    headline_region?: string;
  };
  trend: { slope_mm_per_decade: number; p_value: number };
  landslide_trigger: {
    auc: number | null;
    n_events: number;
    presentation?: string;
    kind?: string;
    skipped_far_from_station?: number;
    skipped_data_gap?: number;
  };
  lake_growth: { name: string; pct_growth: number }[];
  provenance?: {
    data_status?: string;
    headline_note?: string;
    method?: string;
  };
};

type SelectedMeasure = {
  parcel_id: string;
  type?: string;
  priority_rank?: number;
  selected_in_both_objectives?: boolean;
  cost_usd: number;
  avoided_eal_people: number;
  co2_t_10yr: number;
  income_usd_yr: number;
};

type ScreeningFactor = {
  type: string;
  cost_per_ha?: number;
  eal_reduction_frac?: number;
  primary_hazard?: string;
  source?: string;
};

type Plan = {
  budget_usd: number;
  mode: string;
  selected: SelectedMeasure[];
  totals: {
    cost_usd: number;
    people_protected: number;
    co2_t_10yr: number;
    income_usd_yr: number;
    households_benefiting: number | null;
    exposure_reduction_pct?: number;
  };
  frontier: { budget_usd: number; people_protected: number; co2_t_10yr: number }[];
  cvar?: { mode_available?: boolean; tail_people_protected?: number; alpha?: number };
  provenance?: {
    data_status?: string;
    candidates_note?: string;
    method?: string;
    factors?: ScreeningFactor[];
  };
};

type CandidateSite = {
  parcel_id: string;
  type: string;
  centroid: [number, number];
  area_ha: number;
  cell_ids: string[];
  slope_deg?: number;
  landcover?: string;
  what?: string;
  description?: string;
  why?: string;
  rationale?: string;
  suitability?: string;
  suitability_reason?: string;
  cost_usd?: number;
  benefit?: string;
  assumption?: string | string[];
  assumptions?: string | string[];
  monitoring?: string;
  evidence?: string;
  source?: string;
  primary_hazard?: string;
  triggering_hazard?: string;
  risk_driver?: string;
  suitability_score?: number;
  suitability_evidence?: Record<string, unknown>;
  data_status?: string;
  required_verification?: string[];
  verification?: string | string[];
};

type Backtest = {
  critical_success_index: number | null;
  hit_rate_pod?: number | null;
  false_alarm_ratio?: number | null;
  observed_flood_km2?: number | null;
  modeled_flood_km2?: number | null;
  sar_scene?: string;
  provenance?: { data_status?: string; method?: string };
  counterfactual?: {
    people_exposed_baseline?: number | null;
    people_exposed_with_plan?: number | null;
    reduction_pct?: number | null;
    note?: string;
  };
};

type OptimizerState = "checking" | "live" | "frozen" | "unavailable";

const CITY = "koshi";

const money = (value: number | null | undefined) => {
  if (value == null || !Number.isFinite(value)) return "—";
  return value >= 1_000_000
    ? `$${(value / 1_000_000).toFixed(2)}M`
    : `$${Math.round(value).toLocaleString()}`;
};

const metric = (value: number | null | undefined, maximumFractionDigits = 1) =>
  value == null || !Number.isFinite(value)
    ? "—"
    : value.toLocaleString(undefined, { maximumFractionDigits });

const risk = (value: number | null | undefined) => metric(value, 1);
const humanize = (value: string | undefined) => (value || "preventive measure").replace(/_/g, " ");
const textValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value.join("; ") : value;

export default function App() {
  const [tab, setTab] = useState<FlowStep>("backtest");
  const [signal, setSignal] = useState<Signal | null>(null);
  const [hazard, setHazard] = useState<GeoJSON.FeatureCollection | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [candidates, setCandidates] = useState<CandidateSite[]>([]);
  const [backtest, setBacktest] = useState<Backtest | null>(null);
  const [mode, setMode] = useState<OptimizationMode>("expected");
  const [optimizerState, setOptimizerState] = useState<OptimizerState>("checking");
  const [overlay, setOverlay] = useState<"none" | "observed" | "modeled" | "both">("observed");
  const [observed, setObserved] = useState<GeoJSON.FeatureCollection | null>(null);
  const [modeled, setModeled] = useState<GeoJSON.FeatureCollection | null>(null);
  const [riskBefore, setRiskBefore] = useState<GeoJSON.FeatureCollection | null>(null);
  const [riskWithPlan, setRiskWithPlan] = useState<GeoJSON.FeatureCollection | null>(null);
  const [riskView, setRiskView] = useState<"before" | "with_plan">("before");
  const [budget, setBudget] = useState(2_000_000);
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [q, setQ] = useState("Why is the 100-year storm now a 7.75-year storm?");
  const [a, setA] = useState("");
  const [answerMeta, setAnswerMeta] = useState("");
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    setBusy(true);
    Promise.all([
      loadJson("signal", CITY).then((value: Signal) => setSignal(value)),
      loadJson("hazard", CITY).then(setHazard),
      optimize<Plan>(2_000_000, "expected", CITY)
        .then((result) => {
          setPlan(result.plan);
          setBudget(result.plan.budget_usd);
          setMode(result.plan.mode === "cvar" ? "cvar" : "expected");
          setOptimizerState(result.source === "api" ? "live" : "frozen");
          const firstMeasure = result.plan.selected?.[0]?.parcel_id;
          if (firstMeasure) {
            setPicked(firstMeasure);
            setQ(`Why was preventive measure ${firstMeasure} selected?`);
          }
        })
        .catch(() => setOptimizerState("unavailable")),
      loadJson("candidates", CITY).then((value: CandidateSite[]) => setCandidates(value)),
      loadJson("backtest", CITY).then((value: Backtest) => setBacktest(value)),
      loadJson("flood_observed", CITY).then(setObserved),
      loadJson("flood_modeled", CITY).then(setModeled),
      loadJson("risk_before", CITY).then(setRiskBefore),
      loadJson("risk_with_plan", CITY).then(setRiskWithPlan),
      conceptNote(CITY).then(setNote),
    ])
      .catch(() => {
        // Individual artifacts render as unavailable; the judged flow remains usable.
      })
      .finally(() => setBusy(false));
  }, []);

  const selectedIds = useMemo(
    () => new Set((plan?.selected || []).map((selected) => selected.parcel_id)),
    [plan]
  );
  const pickedRow = plan?.selected.find((selected) => selected.parcel_id === picked);
  const pickedMeta = candidates.find((candidate) => candidate.parcel_id === picked);
  const pickedFactor = plan?.provenance?.factors?.find((factor) => factor.type === pickedMeta?.type);

  const measureDetails = useMemo(() => {
    if (!picked || !pickedMeta) return null;
    const candidateFacts = [
      pickedMeta.slope_deg == null ? "" : `${metric(pickedMeta.slope_deg)}° slope`,
      pickedMeta.landcover ? `${humanize(pickedMeta.landcover)} land cover` : "",
      pickedMeta.triggering_hazard || pickedMeta.primary_hazard
        ? `${humanize(pickedMeta.triggering_hazard || pickedMeta.primary_hazard)} hazard`
        : "",
      pickedMeta.suitability_score == null
        ? ""
        : `suitability ${metric(pickedMeta.suitability_score, 3)}`,
      pickedMeta.cell_ids.length ? `${pickedMeta.cell_ids.length} linked risk cell(s)` : "",
    ]
      .filter(Boolean)
      .join(" · ");
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
        : `This site has not been field-verified. The portfolio hazard layer was checked against the 27 Sep 2024 UNOSAT flood (CSI ${backtest.critical_success_index.toFixed(
            3
          )}), calibrated on that event; another flood is needed for out-of-sample verification.`;

    return {
      id: picked,
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
    };
  }, [backtest, picked, pickedFactor, pickedMeta, pickedRow, plan?.mode]);

  const rl = useMemo(() => {
    if (!signal) return [];
    return Object.keys(signal.return_levels_mm)
      .map(Number)
      .sort((left, right) => left - right)
      .map((returnPeriod) => {
        const interval = signal.return_levels_ci95[String(returnPeriod)];
        return {
          rp: returnPeriod,
          mm: signal.return_levels_mm[String(returnPeriod)],
          lo: interval?.[0],
          hi: interval?.[1],
        };
      });
  }, [signal]);

  const onSelect = useCallback((id: string | null) => {
    setPicked(id);
    if (id) {
      setTab("plan");
      setQ(`Why was preventive measure ${id} selected before the next-best candidate site?`);
      setA("");
      setAnswerMeta("");
    }
  }, []);

  async function rerun(nextBudget: number, nextMode: OptimizationMode = mode) {
    if (optimizerState !== "live") return;
    setBusy(true);
    try {
      const result = await optimize<Plan>(nextBudget, nextMode, CITY);
      setPlan(result.plan);
      if (result.source === "cache") {
        setOptimizerState("frozen");
        setBudget(result.plan.budget_usd);
        setMode(result.plan.mode === "cvar" ? "cvar" : "expected");
      } else {
        setBudget(nextBudget);
        setMode(nextMode);
      }
    } catch {
      setOptimizerState("unavailable");
    } finally {
      setBusy(false);
    }
  }

  async function onAsk(event: React.FormEvent) {
    event.preventDefault();
    setAsking(true);
    try {
      const response = await ask(q, CITY, {
        signal,
        plan,
        backtest,
        selectedMeasure: measureDetails,
      });
      setA(response.answer);
      setAnswerMeta(
        `${response.offline ? "Cached artifact answer" : "Live grounded answer"} · ${
          response.sources?.join(", ") || "no sources returned"
        }`
      );
    } finally {
      setAsking(false);
    }
  }

  function downloadNote() {
    const blob = new Blob([note], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "rootledger-prevention-plan.md";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const aucCopy =
    signal?.landslide_trigger.auc == null
      ? "Landslide classifier AUC is unavailable; no score is claimed."
      : `Landslide is a held-out rainfall classifier (AUC ${signal.landslide_trigger.auc.toFixed(
          3
        )}, n=${signal.landslide_trigger.n_events}), not a physical Caine threshold.`;
  const counterfactual = backtest?.counterfactual;
  const hasCounterfactual =
    counterfactual?.people_exposed_baseline != null &&
    counterfactual.people_exposed_with_plan != null;

  const steps: { id: FlowStep; label: string }[] = [
    { id: "noise", label: "1 · Noise" },
    { id: "signal", label: "2 · Tail" },
    { id: "plan", label: "3 · Plant" },
    { id: "backtest", label: "4 · Proof" },
    { id: "ask", label: "Ask" },
    { id: "report", label: "Export" },
  ];

  return (
    <div className="app">
      <div className="map-wrap">
        <HazardMap
          hazard={
            tab === "backtest"
              ? riskView === "with_plan"
                ? riskWithPlan || hazard
                : riskBefore || hazard
              : hazard
          }
          candidates={candidates}
          selectedIds={selectedIds}
          onSelect={onSelect}
          observed={observed}
          modeled={modeled}
          overlay={tab === "backtest" ? overlay : "none"}
        />
        <div className="map-legend">
          Risk cells: annual expected people-risk (darker = higher). Coloured dots are selected
          preventive measures; pale dots are candidate intervention sites.
          {tab === "backtest" && (
            <>
              <br />
              Risk surface = {riskView === "with_plan" ? "with-plan counterfactual" : "current model"}.
              Blue fill = UNOSAT observed water · gold outline = modeled flood.
            </>
          )}
        </div>
      </div>

      <aside className="side">
        <p className="brand">RootLedger · Koshi / Madhesh, Nepal</p>
        <p className="result-scope">Nepal-adjacent GEV · fitted comparison, not a forecast</p>
        <h1>
          {signal
            ? `The old 100-year rain depth now fits a ${metric(
                signal.headline.new_return_period_yrs,
                2
              )}-year recurrence`
            : "Loading the Nepal-adjacent rainfall tail…"}
        </h1>
        <p className="lede">
          This headline uses the Nepal-adjacent subset. The 498-station High Mountain Asia pool is
          the scale and negative-control story; it did not identify a recurrence shift.
        </p>

        <div className="banner">
          <strong>Screening-grade and explicit.</strong> {aucCopy}{" "}
          {backtest?.critical_success_index == null
            ? "Flood CSI is unavailable; it is not replaced with zero."
            : `The HAND proxy scores CSI ${backtest.critical_success_index.toFixed(3)} against the 27 Sep 2024 UNOSAT scene; stage was calibrated on this event.`}
        </div>

        <div className="kpis">
          <div className="kpi">
            <span>Spend / budget</span>
            <b>{plan ? `${money(plan.totals.cost_usd)} / ${money(plan.budget_usd)}` : "—"}</b>
          </div>
          <div className="kpi">
            <span>Annual people-risk avoided</span>
            <b>{plan ? risk(plan.totals.people_protected) : "—"}</b>
          </div>
          <div className="kpi">
            <span>tCO₂ / 10 yr</span>
            <b>{plan ? metric(plan.totals.co2_t_10yr, 0) : "—"}</b>
          </div>
          <div className="kpi">
            <span>Income / yr</span>
            <b>{plan ? money(plan.totals.income_usd_yr) : "—"}</b>
          </div>
        </div>

        <div className="tabs" aria-label="Judged demo flow">
          {steps.map((step) => (
            <button
              key={step.id}
              className={tab === step.id ? "on" : ""}
              onClick={() => setTab(step.id)}
            >
              {step.label}
            </button>
          ))}
        </div>

        {tab === "noise" && <NoisePanel />}

        {tab === "signal" && signal && (
          <>
            <div className="claim-grid">
              <div className="claim-card primary">
                <span>Nepal-adjacent decision region</span>
                <b>
                  {signal.headline.old_return_period_yrs}-yr depth →{" "}
                  {metric(signal.headline.new_return_period_yrs, 2)}-yr recurrence
                </b>
                <small>
                  {signal.headline.early_period?.join("–") || "early sample"} evaluated in{" "}
                  {signal.headline.late_period?.join("–") || "late sample"}
                </small>
              </div>
              <div className="claim-card control">
                <span>HMA pooled negative control</span>
                <b>No recurrence shift identified</b>
                <small>We did not force the 7.75-year headline onto all 498 stations.</small>
              </div>
            </div>

            <p className="detail">
              HMA scale: {metric(signal.stations_processed, 0)} stations ·{" "}
              {metric(signal.station_years, 0)} station-years. HMA-pooled annual-max trend:{" "}
              <b>
                +{metric(signal.trend.slope_mm_per_decade, 3)} mm/decade (p=
                {signal.trend.p_value.toLocaleString()})
              </b>
              {signal.lake_growth.length
                ? ` · Lakes: ${signal.lake_growth
                    .map((lake) => `${lake.name} +${metric(lake.pct_growth)}%`)
                    .join(" · ")}`
                : ""}
            </p>

            <div className="chart-head">
              <b>HMA-pooled return-level curve</b>
              <span>Negative control · not the 7.75-year subset result</span>
            </div>
            <div className="chart">
              <ResponsiveContainer>
                <ComposedChart data={rl} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(143,160,184,0.15)" />
                  <XAxis dataKey="rp" stroke="#8fa0b8" tickFormatter={(value) => `${value}y`} />
                  <YAxis stroke="#8fa0b8" />
                  <Tooltip
                    contentStyle={{ background: "#10182a", border: "1px solid #2a3a55" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="hi"
                    stroke="none"
                    fill="#3ee0c0"
                    fillOpacity={0.12}
                  />
                  <Area
                    type="monotone"
                    dataKey="lo"
                    stroke="none"
                    fill="#070b14"
                    fillOpacity={1}
                  />
                  <Line
                    type="monotone"
                    dataKey="mm"
                    stroke="#3ee0c0"
                    strokeWidth={2}
                    dot
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p className="detail">
              Pooled GEV return levels (mm) with bootstrap 95% interval.{" "}
              {signal.provenance?.headline_note ||
                "The pooled fit is shown separately from the catchment headline."}
            </p>
          </>
        )}

        {tab === "plan" && plan && (
          <>
            <div className={`optimizer-status ${optimizerState}`}>
              {optimizerState === "live" && (
                <>
                  <b>Live optimizer connected.</b> Budget and objective changes recalculate the
                  preventive portfolio through the API.
                </>
              )}
              {optimizerState === "checking" && (
                <>
                  <b>Checking the optimizer…</b> Controls stay locked until a live response arrives.
                </>
              )}
              {optimizerState === "frozen" && (
                <>
                  <b>Frozen offline plan.</b> The API is unavailable, so this cached{" "}
                  {money(plan.budget_usd)} {plan.mode} result is shown unchanged. Budget and CVaR are
                  disabled rather than pretending to recalculate.
                </>
              )}
              {optimizerState === "unavailable" && (
                <>
                  <b>Optimizer unavailable.</b> No control can imply a result that was not computed.
                </>
              )}
            </div>

            <label className="row">
              <span>
                Budget {money(budget)} {busy ? "· optimizing…" : ""}
              </span>
              <span>
                {metric(plan.selected.length, 0)} preventive measures · {plan.mode}
              </span>
            </label>
            <input
              className="slider"
              type="range"
              min={250000}
              max={2000000}
              step={50000}
              value={budget}
              disabled={optimizerState !== "live" || busy}
              onChange={(event) => setBudget(Number(event.target.value))}
              onPointerUp={(event) =>
                rerun(Number((event.target as HTMLInputElement).value), mode)
              }
              onKeyUp={(event) => {
                if (
                  ["ArrowLeft", "ArrowRight", "Home", "End", "PageUp", "PageDown"].includes(
                    event.key
                  )
                ) {
                  rerun(Number((event.target as HTMLInputElement).value), mode);
                }
              }}
            />
            <label className="row">
              <span>Portfolio objective</span>
              <select
                value={mode}
                disabled={optimizerState !== "live" || busy}
                onChange={(event) =>
                  rerun(budget, event.target.value as OptimizationMode)
                }
              >
                <option value="expected">Expected people-risk</option>
                <option value="cvar">CVaR · worst 10% tail</option>
              </select>
            </label>
            <p className="detail">
              CVaR uses the same logic as a trading-book tail: prioritize measures that still work
              in the worst 10% of modeled climate draws.
              {plan.cvar?.tail_people_protected != null
                ? ` Cached worst-tail annual people-risk avoided: ${risk(
                    plan.cvar.tail_people_protected
                  )}.`
                : ""}
            </p>

            <div className="mix">
              {Object.entries(
                plan.selected.reduce<
                  Record<string, { count: number; peopleRisk: number; cost: number }>
                >((accumulator, selected) => {
                  const kind =
                    candidates.find(
                      (candidate) => candidate.parcel_id === selected.parcel_id
                    )?.type || "unknown";
                  const row = accumulator[kind] || { count: 0, peopleRisk: 0, cost: 0 };
                  row.count += 1;
                  row.peopleRisk += selected.avoided_eal_people;
                  row.cost += selected.cost_usd;
                  accumulator[kind] = row;
                  return accumulator;
                }, {})
              )
                .sort((left, right) => right[1].peopleRisk - left[1].peopleRisk)
                .map(([kind, row]) => (
                  <div className="mix-row" key={kind}>
                    <b>{humanize(kind)}</b>
                    <span>
                      {row.count} sites · {money(row.cost)} · {risk(row.peopleRisk)} annual
                      people-risk avoided
                    </span>
                  </div>
                ))}
            </div>

            <div className="chart">
              <ResponsiveContainer>
                <ComposedChart
                  data={plan.frontier}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid stroke="rgba(143,160,184,0.15)" />
                  <XAxis
                    dataKey="budget_usd"
                    stroke="#8fa0b8"
                    tickFormatter={(value) => `$${value / 1e6}M`}
                  />
                  <YAxis stroke="#8fa0b8" tickFormatter={(value) => metric(value, 0)} />
                  <Tooltip
                    contentStyle={{ background: "#10182a", border: "1px solid #2a3a55" }}
                    formatter={(value) => [
                      risk(Number(value)),
                      "Annual people-risk avoided",
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="people_protected"
                    stroke="#3ee0c0"
                    strokeWidth={2}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {measureDetails && (
              <section className="measure-card" aria-label={`Details for ${measureDetails.id}`}>
                <div className="measure-title">
                  <div>
                    <span>
                      {pickedRow
                        ? "Selected preventive measure"
                        : "Candidate intervention site"}
                    </span>
                    <h2>{measureDetails.id}</h2>
                  </div>
                  <button onClick={() => setTab("ask")}>Ask about this measure</button>
                </div>
                <dl>
                  <div>
                    <dt>What</dt>
                    <dd>{measureDetails.what}</dd>
                  </div>
                  <div>
                    <dt>Why here</dt>
                    <dd>{measureDetails.why}</dd>
                  </div>
                  <div>
                    <dt>Cost</dt>
                    <dd>{measureDetails.cost}</dd>
                  </div>
                  <div>
                    <dt>Modeled benefit</dt>
                    <dd>{measureDetails.benefit}</dd>
                  </div>
                  <div>
                    <dt>Assumption</dt>
                    <dd>{measureDetails.assumption}</dd>
                  </div>
                  <div>
                    <dt>Verification</dt>
                    <dd>{measureDetails.verification}</dd>
                  </div>
                </dl>
              </section>
            )}
          </>
        )}

        {tab === "backtest" && (
          <>
            <div className="proof-controls">
              <div>
                <b>Observed / modeled overlay</b>
                <span>Control the map while reviewing proof</span>
              </div>
              <div className="segmented" role="group" aria-label="Flood overlay">
                {(["none", "observed", "modeled", "both"] as const).map((value) => (
                  <button
                    key={value}
                    className={overlay === value ? "on" : ""}
                    onClick={() => setOverlay(value)}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <div>
                <b>Preventive impact surface</b>
                <span>Current modeled risk vs literature-effect counterfactual</span>
              </div>
              <div className="segmented risk-scenario" role="group" aria-label="Risk scenario">
                <button
                  className={riskView === "before" ? "on" : ""}
                  onClick={() => setRiskView("before")}
                >
                  current risk
                </button>
                <button
                  className={riskView === "with_plan" ? "on" : ""}
                  onClick={() => setRiskView("with_plan")}
                >
                  with plan · simulated
                </button>
              </div>
            </div>

            <p className="detail">
              <b>UNOSAT Sentinel-1 · 27 Sep 2024</b> ({backtest?.sar_scene || "scene unavailable"}).
              Observed {metric(backtest?.observed_flood_km2)} km² vs modeled{" "}
              {metric(backtest?.modeled_flood_km2)} km². CSI{" "}
              <b>{metric(backtest?.critical_success_index, 3)}</b>, POD{" "}
              {metric(backtest?.hit_rate_pod, 3)}, FAR{" "}
              {metric(backtest?.false_alarm_ratio, 3)}. This event calibrated the stage; another
              flood is required for an out-of-sample test.
            </p>

            {hasCounterfactual ? (
              <>
                <div className="counterfactual">
                  <div>
                    <span>Before preventive plan</span>
                    <b>{risk(counterfactual?.people_exposed_baseline)}</b>
                    <small>modeled event people-exposure units</small>
                  </div>
                  <div className="arrow">→</div>
                  <div>
                    <span>With preventive plan</span>
                    <b>{risk(counterfactual?.people_exposed_with_plan)}</b>
                    <small>
                      modeled · {metric(counterfactual?.reduction_pct)}% lower
                    </small>
                  </div>
                </div>
                <p className="truth-note">
                  Counterfactual, not an observed outcome and not unique lives saved.{" "}
                  {counterfactual?.note}
                </p>
              </>
            ) : (
              <div className="banner">
                <strong>No counterfactual available.</strong> The UI will not substitute the
                portfolio total or invent a before/after result.
              </div>
            )}
          </>
        )}

        {tab === "ask" && (
          <div className="chat">
            <div className="msg">
              {a ||
                "Ask about the rainfall tail, plan, proof/CSI, counterfactual, or click a selected measure. Offline answers are composed only from the cached artifacts."}
            </div>
            {answerMeta && <p className="answer-meta">{answerMeta}</p>}
            <form onSubmit={onAsk}>
              <input value={q} onChange={(event) => setQ(event.target.value)} />
              <button type="submit" disabled={asking || !q.trim()}>
                {asking ? "Grounding…" : "Ask"}
              </button>
            </form>
          </div>
        )}

        {tab === "report" && (
          <>
            <div className="export-actions">
              <button className="dl" onClick={downloadNote}>
                Download prevention plan
              </button>
              <a className="dl" href="/demo_cache/preventive_measures_plan.pdf" download>
                Download cached PDF
              </a>
            </div>
            <p className="detail">
              The PDF is served from the local demo cache, so the hand-off still works without the
              API or network.
            </p>
            <pre className="report">{note}</pre>
          </>
        )}
      </aside>
    </div>
  );
}
