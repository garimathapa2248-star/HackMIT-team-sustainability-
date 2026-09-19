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
import { ask, conceptNote, listCities, loadJson, markdownDoc, optimize } from "./api";
import HazardMap from "./HazardMap";

type Signal = {
  stations_processed: number;
  station_years: number;
  return_levels_mm: Record<string, number>;
  return_levels_ci95: Record<string, [number, number]>;
  headline: { statement: string; new_return_period_yrs: number; old_return_period_yrs: number };
  trend: { slope_mm_per_decade: number; p_value: number };
  landslide_trigger: { auc: number; n_events: number; presentation?: string; kind?: string };
  lake_growth: { name: string; pct_growth: number }[];
};

type Plan = {
  budget_usd: number;
  mode: string;
  selected: { parcel_id: string; cost_usd: number; avoided_eal_people: number; co2_t_10yr: number; income_usd_yr: number }[];
  totals: {
    cost_usd: number;
    people_protected: number;
    co2_t_10yr: number;
    income_usd_yr: number;
    households_benefiting: number;
  };
  frontier: { budget_usd: number; people_protected: number; co2_t_10yr: number }[];
  provenance?: { data_status?: string; candidates_note?: string };
};

type Parcel = {
  parcel_id: string;
  type: string;
  centroid: [number, number];
  area_ha: number;
  cell_ids: string[];
};

const money = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${Math.round(n).toLocaleString()}`;

export default function App() {
  const [tab, setTab] = useState<"signal" | "plan" | "backtest" | "ask" | "report">("signal");
  const [signal, setSignal] = useState<Signal | null>(null);
  const [hazard, setHazard] = useState<GeoJSON.FeatureCollection | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [candidates, setCandidates] = useState<Parcel[]>([]);
  const [backtest, setBacktest] = useState<{
    critical_success_index: number | null;
    hit_rate_pod?: number | null;
    false_alarm_ratio?: number | null;
    observed_flood_km2?: number | null;
    modeled_flood_km2?: number | null;
    sar_scene?: string;
    provenance?: { data_status?: string };
    counterfactual?: {
      people_exposed_baseline?: number | null;
      people_exposed_with_plan?: number | null;
      reduction_pct?: number | null;
    };
  } | null>(null);
  const [mode, setMode] = useState<"expected" | "cvar">("expected");
  const [overlay, setOverlay] = useState<"none" | "observed" | "modeled" | "both">("both");
  const [observed, setObserved] = useState<GeoJSON.FeatureCollection | null>(null);
  const [modeled, setModeled] = useState<GeoJSON.FeatureCollection | null>(null);
  const [budget, setBudget] = useState(2_000_000);
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [q, setQ] = useState("What preventive measures does the $2M plan take?");
  const [a, setA] = useState("");
  const [city, setCity] = useState("koshi");
  const [cities, setCities] = useState<{ id: string; name: string; ready?: boolean }[]>([]);
  const [note, setNote] = useState("");
  const [scorecard, setScorecard] = useState("");
  const [brief, setBrief] = useState("");

  useEffect(() => {
    listCities().then((r) => setCities(r.cities || []));
  }, []);

  useEffect(() => {
    setBusy(true);
    Promise.all([
      loadJson("signal", city).then(setSignal),
      loadJson("hazard", city).then(setHazard),
      loadJson("plan", city).then((p: Plan) => {
        setPlan(p);
        if (p?.budget_usd) setBudget(p.budget_usd);
      }),
      loadJson("candidates", city).then(setCandidates),
      loadJson("backtest", city).then(setBacktest),
      loadJson("flood_observed", city).then(setObserved),
      loadJson("flood_modeled", city).then(setModeled),
      conceptNote(city).then(setNote),
      markdownDoc("scorecard", city).then(setScorecard),
      markdownDoc("citizenbrief", city).then(setBrief),
    ]).finally(() => setBusy(false));
  }, [city]);

  useEffect(() => {
    setOverlay(city === "bangalore" ? "modeled" : "both");
    setQ(
      city === "bangalore"
        ? "What preventive measures can be taken in Bangalore?"
        : "Why is the 100-year storm now a 7.75-year storm?"
    );
    setA("");
    setPicked(null);
  }, [city]);

  const selectedIds = useMemo(() => new Set((plan?.selected || []).map((s) => s.parcel_id)), [plan]);
  const pickedRow = plan?.selected.find((s) => s.parcel_id === picked);
  const pickedMeta = candidates.find((c) => c.parcel_id === picked);

  const rl = useMemo(() => {
    if (!signal) return [];
    return Object.keys(signal.return_levels_mm)
      .map(Number)
      .sort((a, b) => a - b)
      .map((rp) => ({
        rp,
        mm: signal.return_levels_mm[String(rp)],
        lo: signal.return_levels_ci95[String(rp)][0],
        hi: signal.return_levels_ci95[String(rp)][1],
      }));
  }, [signal]);

  const onSelect = useCallback((id: string | null) => setPicked(id), []);

  async function rerun(nextBudget: number) {
    setBusy(true);
    try {
      const next = (await optimize(nextBudget, mode, city)) as Plan;
      setPlan(next);
    } finally {
      setBusy(false);
    }
  }

  async function onAsk(e: React.FormEvent) {
    e.preventDefault();
    const res = await ask(q, city);
    setA(res.answer);
  }

  function downloadNote() {
    const blob = new Blob([note], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const el = document.createElement("a");
    el.href = url;
    el.download = "rootledger-concept-note.md";
    el.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="app">
      <div className="map-wrap">
        <HazardMap
          hazard={hazard}
          candidates={candidates}
          selectedIds={selectedIds}
          onSelect={onSelect}
          observed={observed}
          modeled={modeled}
          overlay={overlay}
        />
        <div className="map-legend">
          Cells: expected people-risk (darker = higher). Coloured dots = selected NbS parcels.
          <br />
          {city === "bangalore"
            ? "Gold outline = HAND valley flood proxy. No SAR observed layer for Bengaluru."
            : "Blue fill = UNOSAT observed. Gold outline = modeled flood."}
        </div>
      </div>
      <aside className="side">
        <p className="brand">RootLedger · {city === "bangalore" ? "Bengaluru" : "Koshi"}</p>
        <label className="row">
          <span>City pack</span>
          <select value={city} onChange={(e) => setCity(e.target.value)}>
            {(cities.length ? cities : [
              { id: "koshi", name: "Koshi / Madhesh (Nepal)" },
              { id: "bangalore", name: "Bengaluru (India)" },
            ]).map((c) => (
              <option key={c.id} value={c.id} disabled={c.ready === false}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <h1>{signal ? `100-yr rain now recurs every ${signal.headline.new_return_period_yrs} yr` : "Loading signal…"}</h1>
        <p className="lede">{signal?.headline.statement}</p>
        <div className="banner">
          <strong>Honesty.</strong> Landslide is a rainfall classifier
          {signal ? ` (AUC ${signal.landslide_trigger.auc}, n=${signal.landslide_trigger.n_events} OOS)` : ""},
          not a Caine threshold. {city === "bangalore"
            ? "Bengaluru flood is a HAND valley proxy — SAR CSI is not available and will not be invented."
            : "Hazard is HAND-calibrated on GLO-30 against UNOSAT S-1."} Backtest CSI is{" "}
          {backtest?.critical_success_index == null
            ? "not available — we will not invent it."
            : `${backtest.critical_success_index} (POD ${backtest.hit_rate_pod}, FAR ${backtest.false_alarm_ratio}).`}
        </div>
        <div className="kpis">
          <div className="kpi">
            <span>Spend / budget</span>
            <b>{plan ? `${money(plan.totals.cost_usd)} / ${money(plan.budget_usd)}` : "—"}</b>
          </div>
          <div className="kpi">
            <span>People-risk avoided / yr</span>
            <b>{plan ? plan.totals.people_protected.toFixed(1) : "—"}</b>
          </div>
          <div className="kpi">
            <span>tCO₂ / 10 yr</span>
            <b>{plan ? Math.round(plan.totals.co2_t_10yr).toLocaleString() : "—"}</b>
          </div>
          <div className="kpi">
            <span>Income / yr</span>
            <b>{plan ? money(plan.totals.income_usd_yr) : "—"}</b>
          </div>
        </div>
        <div className="tabs">
          {(["signal", "plan", "backtest", "ask", "report"] as const).map((id) => (
            <button key={id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}>
              {id}
            </button>
          ))}
        </div>

        {tab === "signal" && signal && (
          <>
            <p className="detail">
              {signal.stations_processed} stations · {signal.station_years.toLocaleString()} station-years · trend{" "}
              <b>+{signal.trend.slope_mm_per_decade} mm/decade</b>. Lakes:{" "}
              {signal.lake_growth.map((l) => `${l.name} +${l.pct_growth}%`).join(" · ")}
            </p>
            <div className="chart">
              <ResponsiveContainer>
                <ComposedChart data={rl} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(143,160,184,0.15)" />
                  <XAxis dataKey="rp" stroke="#8fa0b8" tickFormatter={(v) => `${v}y`} />
                  <YAxis stroke="#8fa0b8" />
                  <Tooltip contentStyle={{ background: "#10182a", border: "1px solid #2a3a55" }} />
                  <Area type="monotone" dataKey="hi" stroke="none" fill="#3ee0c0" fillOpacity={0.12} />
                  <Area type="monotone" dataKey="lo" stroke="none" fill="#070b14" fillOpacity={1} />
                  <Line type="monotone" dataKey="mm" stroke="#3ee0c0" strokeWidth={2} dot />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p className="detail">Return levels (mm) with bootstrap 95% CI band. EVT / GEV annual maxima. POT/GPD is a cross-check on the same tidy daily series; IMERG is not fused (Earthdata login).</p>
          </>
        )}

        {tab === "plan" && plan && (
          <>
            <label className="row">
              <span>Budget {money(budget)} {busy ? "· optimizing…" : ""}</span>
              <span>{plan.selected.length} parcels · {plan.mode}</span>
            </label>
            <label className="row">
              <span>Objective</span>
              <select
                value={mode}
                onChange={(e) => {
                  const next = e.target.value as "expected" | "cvar";
                  setMode(next);
                  setBusy(true);
                  optimize(budget, next, city).then((p) => setPlan(p as Plan)).finally(() => setBusy(false));
                }}
              >
                <option value="expected">Expected people-risk</option>
                <option value="cvar">CVaR (worst 10% tail)</option>
              </select>
            </label>
            <label className="row">
              <span>Flood overlay</span>
              <select value={overlay} onChange={(e) => setOverlay(e.target.value as typeof overlay)}>
                <option value="none">cells only</option>
                <option value="observed">UNOSAT observed</option>
                <option value="modeled">modeled flood</option>
                <option value="both">observed + modeled</option>
              </select>
            </label>
            <input
              className="slider"
              type="range"
              min={250000}
              max={2000000}
              step={50000}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              onMouseUp={(e) => rerun(Number((e.target as HTMLInputElement).value))}
              onTouchEnd={(e) => rerun(Number((e.target as HTMLInputElement).value))}
            />
            <p className="detail">
              Annual expected people-risk avoided, not unique lives. {plan.provenance?.data_status}
            </p>
            <div className="mix">
              {Object.entries(
                (plan.selected || []).reduce<Record<string, { n: number; people: number; cost: number }>>((acc, s) => {
                  const kind = candidates.find((c) => c.parcel_id === s.parcel_id)?.type || "unknown";
                  const row = acc[kind] || { n: 0, people: 0, cost: 0 };
                  row.n += 1;
                  row.people += s.avoided_eal_people;
                  row.cost += s.cost_usd;
                  acc[kind] = row;
                  return acc;
                }, {})
              )
                .sort((a, b) => b[1].people - a[1].people)
                .map(([kind, row]) => (
                  <div className="mix-row" key={kind}>
                    <b>{kind.replace(/_/g, " ")}</b>
                    <span>
                      {row.n} parcels · {money(row.cost)} · {row.people.toFixed(0)} people-risk/yr
                    </span>
                  </div>
                ))}
            </div>
            <div className="chart">
              <ResponsiveContainer>
                <ComposedChart data={plan.frontier} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(143,160,184,0.15)" />
                  <XAxis dataKey="budget_usd" stroke="#8fa0b8" tickFormatter={(v) => `$${v / 1e6}M`} />
                  <YAxis stroke="#8fa0b8" />
                  <Tooltip contentStyle={{ background: "#10182a", border: "1px solid #2a3a55" }} />
                  <Line type="monotone" dataKey="people_protected" stroke="#3ee0c0" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            {picked && (
              <p className="detail">
                Selected on map: <b>{picked}</b> {pickedMeta?.type} · {pickedRow ? money(pickedRow.cost_usd) : "not in plan"} ·
                people-risk {pickedRow?.avoided_eal_people ?? "—"}
              </p>
            )}
          </>
        )}

        {tab === "backtest" && (
          <p className="detail">
            {city === "bangalore" ? (
              <>
                <b>Bengaluru has no SAR/UNOSAT scene in this pack.</b> Modeled flood extent{" "}
                {backtest?.modeled_flood_km2 ?? "—"} km² is a HAND valley proxy. CSI is{" "}
                <b>null</b> and will not be invented. {backtest?.provenance?.data_status}.
              </>
            ) : (
              <>
                <b>UNOSAT S-1 27 Sep 2024</b> Koshi/Madhesh ({backtest?.sar_scene}). Observed{" "}
                {backtest?.observed_flood_km2 ?? "—"} km² vs modeled {backtest?.modeled_flood_km2 ?? "—"} km².
                CSI <b>{backtest?.critical_success_index ?? "null"}</b>, POD {backtest?.hit_rate_pod ?? "—"}, FAR{" "}
                {backtest?.false_alarm_ratio ?? "—"}. {backtest?.provenance?.data_status}.
              </>
            )}
            {backtest?.counterfactual?.people_exposed_baseline != null
              ? ` Counterfactual: ${backtest.counterfactual.people_exposed_baseline} → ${backtest.counterfactual.people_exposed_with_plan} (${backtest.counterfactual.reduction_pct}% reduction).`
              : ""}
          </p>
        )}

        {tab === "ask" && (
          <div className="chat">
            <div className="msg">{a || "Ask only about numbers on the artifacts. The agent will not invent CSI or lives-saved counts."}</div>
            <form onSubmit={onAsk}>
              <input value={q} onChange={(e) => setQ(e.target.value)} />
              <button type="submit">Ask</button>
            </form>
          </div>
        )}

        {tab === "report" && (
          <>
            <button className="dl" onClick={downloadNote}>
              Download concept note
            </button>
            <a className="dl" href={`${import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"}/conceptnote.pdf?city=${city}`}>
              Download PDF
            </a>
            <pre className="report">{note}</pre>
            <pre className="report">{scorecard}</pre>
            <pre className="report">{brief}</pre>
          </>
        )}
      </aside>
    </div>
  );
}
