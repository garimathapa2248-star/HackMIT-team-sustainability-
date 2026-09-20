import { useCallback, useEffect, useMemo, useState } from "react";
import { ask, conceptNote, listCities, loadJson, optimize } from "./api";
import { Dash, DashContext } from "./context";
import { humanize, metric, money, risk, textValue } from "./format";
import MeasureDrawer from "./MeasureDrawer";
import RegionSelect from "./RegionSelect";
import { Footer, Nav } from "./Shell";
import type {
  Backtest,
  CandidateSite,
  CityRow,
  MeasureDetails,
  Noise,
  OptimizationMode,
  OptimizerState,
  OverlayMode,
  Plan,
  Replication,
  Signal,
  View,
} from "./types";
import AskView from "./views/AskView";
import BranchView from "./views/BranchView";
import ExportView from "./views/ExportView";
import NoiseView from "./views/NoiseView";
import OverviewView from "./views/OverviewView";
import PlanView from "./views/PlanView";
import ProofView from "./views/ProofView";
import SignalView from "./views/SignalView";

const VIEWS: View[] = ["overview", "noise", "signal", "plan", "proof", "ask", "export", "branch"];
const BUSINESS_VIEWS: View[] = ["overview", "noise", "signal", "plan", "proof", "ask", "branch"];
// The region dropdown sits in the same top-right spot on every region-specific page (Overview has it in its hero).
const REGION_LABEL: Partial<Record<View, string | undefined>> = {
  signal: undefined,
  plan: "Plan for",
  proof: "Flood proof for",
  ask: "Asking about",
  export: "Export for",
};
const viewFromHash = (): View => {
  const hash = typeof window === "undefined" ? "" : window.location.hash.replace("#", "");
  return (VIEWS as string[]).includes(hash) ? (hash as View) : "overview";
};

export default function App() {
  const [view, setView] = useState<View>(viewFromHash);
  const [city, setCity] = useState("koshi");
  const [cities, setCities] = useState<CityRow[]>([
    { id: "koshi", name: "Koshi / Madhesh (Nepal)", ready: true },
  ]);
  const [signal, setSignal] = useState<Signal | null>(null);
  const [noise, setNoise] = useState<Noise | null>(null);
  const [hazard, setHazard] = useState<GeoJSON.FeatureCollection | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [candidates, setCandidates] = useState<CandidateSite[]>([]);
  const [backtest, setBacktest] = useState<Backtest | null>(null);
  const [mode, setMode] = useState<OptimizationMode>("expected");
  const [optimizerState, setOptimizerState] = useState<OptimizerState>("checking");
  const [overlay, setOverlay] = useState<OverlayMode>("observed");
  const [observed, setObserved] = useState<GeoJSON.FeatureCollection | null>(null);
  const [modeled, setModeled] = useState<GeoJSON.FeatureCollection | null>(null);
  const [observed2017, setObserved2017] = useState<GeoJSON.FeatureCollection | null>(null);
  const [modeled2017, setModeled2017] = useState<GeoJSON.FeatureCollection | null>(null);
  const [proofEvent, setProofEvent] = useState<"2024" | "2017">("2024");
  const [replication, setReplication] = useState<Replication | null>(null);
  const [riskBefore, setRiskBefore] = useState<GeoJSON.FeatureCollection | null>(null);
  const [riskWithPlan, setRiskWithPlan] = useState<GeoJSON.FeatureCollection | null>(null);
  const [riskView, setRiskView] = useState<"before" | "with_plan">("before");
  const [budget, setBudget] = useState(2_000_000);
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [q, setQ] = useState("Why is the 100-year storm now a 7.75-year storm?");
  const [a, setA] = useState("");
  const [answerMeta, setAnswerMeta] = useState("");
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState("");

  const go = useCallback((next: View) => {
    setView(next);
    setDrawerOpen(false);
    window.history.replaceState(null, "", next === "overview" ? "#" : `#${next}`);
    window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    const onHash = () => setView(viewFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    listCities()
      .then((payload: { cities?: CityRow[] }) => {
        const rows = (payload.cities || []).filter((row) => row.ready !== false);
        if (rows.length) setCities(rows);
      })
      .catch(() => undefined);
    loadJson("noise")
      .then(setNoise)
      .catch(() => setNoise(null));
  }, []);

  useEffect(() => {
    setBusy(true);
    setProofEvent("2024");
    setDrawerOpen(false);
    Promise.all([
      loadJson("signal", city).then((value: Signal) => setSignal(value)),
      loadJson("hazard", city).then(setHazard),
      optimize<Plan>(2_000_000, "expected", city)
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
      loadJson("candidates", city).then((value: CandidateSite[]) => setCandidates(value)),
      loadJson("backtest", city).then((value: Backtest) => setBacktest(value)),
      loadJson("flood_observed", city).then(setObserved).catch(() => setObserved(null)),
      loadJson("flood_modeled", city).then(setModeled).catch(() => setModeled(null)),
      loadJson("flood_observed_2017", city).then(setObserved2017).catch(() => setObserved2017(null)),
      loadJson("flood_modeled_2017", city).then(setModeled2017).catch(() => setModeled2017(null)),
      loadJson("replication", city).then(setReplication).catch(() => setReplication(null)),
      loadJson("risk_before", city).then(setRiskBefore).catch(() => setRiskBefore(null)),
      loadJson("risk_with_plan", city).then(setRiskWithPlan).catch(() => setRiskWithPlan(null)),
      conceptNote(city).then(setNote).catch(() => setNote("")),
    ])
      .catch(() => {
        // Individual artifacts render as unavailable; the judged flow remains usable.
      })
      .finally(() => setBusy(false));
  }, [city]);

  const selectedIds = useMemo(
    () => new Set((plan?.selected || []).map((selected) => selected.parcel_id)),
    [plan]
  );
  const pickedRow = plan?.selected.find((selected) => selected.parcel_id === picked);
  const pickedMeta = candidates.find((candidate) => candidate.parcel_id === picked);
  const pickedFactor = plan?.provenance?.factors?.find((factor) => factor.type === pickedMeta?.type);

  const measureDetails = useMemo<MeasureDetails | null>(() => {
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
        : `This site has not been field-verified. The portfolio hazard layer was checked against the ${
            backtest.event_date || "calibration"
          } scene (CSI ${backtest.critical_success_index.toFixed(
            3
          )}), which is an in-sample calibration fit.`;

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

  const openMeasure = useCallback((id: string | null) => {
    if (id) {
      setPicked(id);
      setDrawerOpen(true);
      setQ(`Why was preventive measure ${id} selected before the next-best candidate site?`);
      setA("");
      setAnswerMeta("");
    } else {
      setDrawerOpen(false);
    }
  }, []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const rerun = useCallback(
    async (nextBudget: number, nextMode: OptimizationMode = mode) => {
      if (optimizerState !== "live") return;
      setBusy(true);
      try {
        const result = await optimize<Plan>(nextBudget, nextMode, city);
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
    },
    [city, mode, optimizerState]
  );

  async function onAsk(event: React.FormEvent) {
    event.preventDefault();
    setAsking(true);
    try {
      const response = await ask(q, city, {
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
  const equityLine =
    pickedRow?.low_income_score != null && pickedRow.low_income_score >= 0.55
      ? `Serves a flagged low-income cell (weight ×${metric(pickedRow.equity_weight, 3)}).`
      : null;
  const cityName = cities.find((row) => row.id === city)?.name || city;

  const dash: Dash = {
    view,
    go,
    city,
    cityName,
    cities,
    setCity,
    loading: busy,
    signal,
    noise,
    hazard,
    riskBefore,
    riskWithPlan,
    plan,
    candidates,
    backtest,
    replication,
    note,
    overlay,
    setOverlay,
    proofEvent,
    setProofEvent,
    riskView,
    setRiskView,
    observed: proofEvent === "2017" ? observed2017 : observed,
    modeled: proofEvent === "2017" ? modeled2017 : modeled,
    budget,
    setBudget,
    mode,
    optimizerState,
    rerun,
    selectedIds,
    picked,
    pickedRow,
    measureDetails,
    equityLine,
    drawerOpen,
    openMeasure,
    closeDrawer,
    q,
    setQ,
    a,
    answerMeta,
    asking,
    onAsk,
    downloadNote,
    aucCopy,
  };

  return (
    <DashContext.Provider value={dash}>
      <div className="site" data-theme={BUSINESS_VIEWS.includes(view) ? "business" : undefined}>
        <Nav />
        <main key={view}>
          {view !== "overview" && view !== "noise" && view !== "branch" && (
            <div className="region-bar">
              <RegionSelect label={REGION_LABEL[view]} />
            </div>
          )}
          {view === "overview" && <OverviewView />}
          {view === "noise" && <NoiseView />}
          {view === "signal" && <SignalView />}
          {view === "plan" && <PlanView />}
          {view === "proof" && <ProofView />}
          {view === "ask" && <AskView />}
          {view === "export" && <ExportView />}
          {view === "branch" && <BranchView />}
        </main>
        <Footer />
        <MeasureDrawer />
      </div>
    </DashContext.Provider>
  );
}
