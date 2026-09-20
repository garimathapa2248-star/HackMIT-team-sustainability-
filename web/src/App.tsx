import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ALLOW_OPTIMIZE, ask, CACHE_ONLY, checkHealth, listCities, loadJson, loadPlan, optimize } from "./api";
import ChapterDock from "./ChapterDock";
import AskChapter from "./chapters/AskChapter";
import ExportChapter from "./chapters/ExportChapter";
import NoiseChapter from "./chapters/NoiseChapter";
import PlantChapter from "./chapters/PlantChapter";
import ProofChapter from "./chapters/ProofChapter";
import TailChapter from "./chapters/TailChapter";
import DemoCue from "./DemoCue";
import { EmptyState, LoadingBlock } from "./EmptyState";
import HazardMap from "./HazardMap";
import Inspector from "./Inspector";
import Landing from "./Landing";
import { ASK_PROMPTS, DEMO_BEATS, isTypingTarget, parseChapter } from "./lib/demo";
import { money, metric, risk } from "./lib/format";
import { cityOwnedFlood, hasProofValidation } from "./lib/geo";
import { describeMeasure } from "./lib/measure";
import { planHeadline, planLede } from "./lib/planSummary";
import type {
  Attribution,
  Backtest,
  CandidateSite,
  Chapter,
  CityRow,
  FloodAdaptPayload,
  OptimizationMode,
  OptimizerState,
  Overlay,
  Plan,
  Rankings,
  Replication,
  Signal,
  View,
} from "./lib/types";
import TopBar from "./TopBar";

function readParams() {
  return new URLSearchParams(window.location.search);
}

function initialView(): View {
  const params = readParams();
  if (params.get("demo") === "1") return "console";
  return params.get("console") === "1" ? "console" : "landing";
}

function initialCity(): string {
  return readParams().get("city") || "koshi";
}

function initialChapter(): Chapter {
  return parseChapter(readParams().get("chapter") || readParams().get("tab")) || "backtest";
}

function initialDemoBeat(): number | null {
  return readParams().get("demo") === "1" ? 0 : null;
}

function writeQuery(next: {
  view: View;
  city: string;
  chapter: Chapter;
  demo: boolean;
}) {
  const params = readParams();
  if (next.view === "console") params.set("console", "1");
  else params.delete("console");
  if (next.city && next.city !== "koshi") params.set("city", next.city);
  else params.delete("city");
  if (next.view === "console") params.set("chapter", next.chapter);
  else params.delete("chapter");
  if (next.demo) params.set("demo", "1");
  else params.delete("demo");
  if (!params.get("v")) params.set("v", "1");
  const search = params.toString();
  const url = `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`;
  window.history.replaceState({}, "", url);
}

export default function App() {
  const [view, setView] = useState<View>(initialView);
  const [city, setCity] = useState(initialCity);
  const [cities, setCities] = useState<CityRow[]>([
    { id: "koshi", name: "Koshi / Madhesh (Nepal)", ready: true },
  ]);
  const [chapter, setChapter] = useState<Chapter>(initialChapter);
  const [signal, setSignal] = useState<Signal | null>(null);
  const [hazard, setHazard] = useState<GeoJSON.FeatureCollection | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [candidates, setCandidates] = useState<CandidateSite[]>([]);
  const [backtest, setBacktest] = useState<Backtest | null>(null);
  const [mode, setMode] = useState<OptimizationMode>("expected");
  const [optimizerState, setOptimizerState] = useState<OptimizerState>("checking");
  const [overlay, setOverlay] = useState<Overlay>("both");
  const [observed, setObserved] = useState<GeoJSON.FeatureCollection | null>(null);
  const [modeled, setModeled] = useState<GeoJSON.FeatureCollection | null>(null);
  const [observed2017, setObserved2017] = useState<GeoJSON.FeatureCollection | null>(null);
  const [modeled2017, setModeled2017] = useState<GeoJSON.FeatureCollection | null>(null);
  const [proofEvent, setProofEvent] = useState<"2024" | "2017">("2024");
  const [replication, setReplication] = useState<Replication | null>(null);
  const [stations, setStations] = useState<GeoJSON.FeatureCollection | null>(null);
  const [attribution, setAttribution] = useState<Attribution | null>(null);
  const [riskBefore, setRiskBefore] = useState<GeoJSON.FeatureCollection | null>(null);
  const [riskWithPlan, setRiskWithPlan] = useState<GeoJSON.FeatureCollection | null>(null);
  const [rankings, setRankings] = useState<Rankings | null>(null);
  const [scenarios, setScenarios] = useState<FloodAdaptPayload | null>(null);
  const [riskView, setRiskView] = useState<"before" | "with_plan">("before");
  const [budget, setBudget] = useState(2_000_000);
  const [busy, setBusy] = useState(false);
  const [packError, setPackError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [q, setQ] = useState("Why is the 100-year storm now a 7.75-year storm?");
  const [a, setA] = useState("");
  const [answerMeta, setAnswerMeta] = useState("");
  const [asking, setAsking] = useState(false);
  const [demoBeat, setDemoBeat] = useState<number | null>(initialDemoBeat);
  const [demoAuto, setDemoAuto] = useState(() => readParams().get("demo") === "1");
  const demoRef = useRef({ beat: demoBeat, auto: demoAuto, view, chapter });
  const askedDemo = useRef(false);
  demoRef.current = { beat: demoBeat, auto: demoAuto, view, chapter };

  useEffect(() => {
    listCities()
      .then((payload: { cities?: CityRow[] }) => {
        const rows = (payload.cities || []).filter((row) => row.ready !== false);
        if (rows.length) setCities(rows);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    writeQuery({
      view,
      city,
      chapter,
      demo: demoBeat != null,
    });
  }, [view, city, chapter, demoBeat]);

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    setPackError(null);
    setProofEvent("2024");
    setOptimizerState("checking");
    setSignal(null);
    setPlan(null);
    setBacktest(null);
    setHazard(null);
    setObserved(null);
    setModeled(null);
    setObserved2017(null);
    setModeled2017(null);
    setRiskBefore(null);
    setRiskWithPlan(null);
    setRankings(null);
    setScenarios(null);
    setReplication(null);
    setAttribution(null);
    setA("");
    setAnswerMeta("");
    setFocusId(null);

    const koshiOnly = city === "koshi";
    const keep = <T,>(setter: (value: T) => void) => (value: T) => {
      if (!cancelled) setter(value);
    };

    Promise.all([
      checkHealth().catch(() => false),
      loadJson("signal", city)
        .then(keep(setSignal))
        .catch(() => {
          if (!cancelled) setSignal(null);
        }),
      loadJson("hazard", city)
        .then(keep(setHazard))
        .catch(() => {
          if (!cancelled) setHazard(null);
        }),
      loadPlan<Plan>(city)
        .then((result) => {
          if (cancelled) return;
          setPlan(result.plan);
          setBudget(result.plan.budget_usd);
          setMode(result.plan.mode === "cvar" ? "cvar" : "expected");
          const firstMeasure = result.plan.selected?.[0]?.parcel_id;
          if (firstMeasure) {
            setPicked(firstMeasure);
            setQ(`Why was preventive measure ${firstMeasure} selected?`);
          }
        })
        .catch(() => {
          if (!cancelled) setPlan(null);
        }),
      loadJson("candidates", city)
        .then((value: CandidateSite[]) => {
          if (!cancelled) setCandidates(Array.isArray(value) ? value : []);
        })
        .catch(() => {
          if (!cancelled) setCandidates([]);
        }),
      loadJson("backtest", city)
        .then(keep(setBacktest))
        .catch(() => {
          if (!cancelled) setBacktest(null);
        }),
      loadJson("flood_observed", city)
        .then((value) => {
          if (!cancelled) setObserved(cityOwnedFlood(value, city));
        })
        .catch(() => {
          if (!cancelled) setObserved(null);
        }),
      loadJson("flood_modeled", city)
        .then((value) => {
          if (!cancelled) setModeled(cityOwnedFlood(value, city));
        })
        .catch(() => {
          if (!cancelled) setModeled(null);
        }),
      koshiOnly
        ? loadJson("flood_observed_2017", city)
            .then((value) => {
              if (!cancelled) setObserved2017(cityOwnedFlood(value, city));
            })
            .catch(() => {
              if (!cancelled) setObserved2017(null);
            })
        : Promise.resolve(),
      koshiOnly
        ? loadJson("flood_modeled_2017", city)
            .then((value) => {
              if (!cancelled) setModeled2017(cityOwnedFlood(value, city));
            })
            .catch(() => {
              if (!cancelled) setModeled2017(null);
            })
        : Promise.resolve(),
      koshiOnly
        ? loadJson("replication", city)
            .then(keep(setReplication))
            .catch(() => {
              if (!cancelled) setReplication(null);
            })
        : Promise.resolve(),
      koshiOnly
        ? loadJson("stations_nepal")
            .then(keep(setStations))
            .catch(() => {
              if (!cancelled) setStations(null);
            })
        : Promise.resolve().then(() => {
            if (!cancelled) setStations(null);
          }),
      loadJson("attribution", city)
        .then(keep(setAttribution))
        .catch(() => {
          if (!cancelled) setAttribution(null);
        }),
      loadJson("risk_before", city)
        .then(keep(setRiskBefore))
        .catch(() => {
          if (!cancelled) setRiskBefore(null);
        }),
      loadJson("risk_with_plan", city)
        .then(keep(setRiskWithPlan))
        .catch(() => {
          if (!cancelled) setRiskWithPlan(null);
        }),
      loadJson("rankings", city)
        .then(keep(setRankings))
        .catch(() => {
          if (!cancelled) setRankings(null);
        }),
      loadJson("scenarios", city)
        .then(keep(setScenarios))
        .catch(() => {
          if (!cancelled) setScenarios(null);
        }),
    ])
      .then(([health]) => {
        if (cancelled) return;
        setOptimizerState(CACHE_ONLY || !ALLOW_OPTIMIZE ? "frozen" : health ? "live" : "frozen");
      })
      .catch(() => {
        if (!cancelled) {
          setOptimizerState("unavailable");
          setPackError("This city pack did not finish loading. Cached Koshi evidence is still on disk.");
        }
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });

    return () => {
      cancelled = true;
    };
  }, [city, reloadToken]);

  const selectedIds = useMemo(
    () => new Set((plan?.selected || []).map((selected) => selected.parcel_id)),
    [plan]
  );
  const pickedRow = plan?.selected.find((selected) => selected.parcel_id === picked);
  const pickedMeta = candidates.find((candidate) => candidate.parcel_id === picked);
  const measureDetails = useMemo(
    () => describeMeasure({ picked, pickedMeta, pickedRow, plan, backtest }),
    [backtest, picked, pickedMeta, pickedRow, plan]
  );

  const applyBeat = useCallback((index: number) => {
    const beat = DEMO_BEATS[index];
    if (!beat) return;
    setChapter(beat.chapter);
    if (beat.overlay) setOverlay(beat.overlay);
    if (beat.proofEvent) setProofEvent(beat.proofEvent);
    if (beat.riskView) setRiskView(beat.riskView);
  }, []);

  const stopDemo = useCallback(() => {
    setDemoBeat(null);
    setDemoAuto(false);
  }, []);

  const goConsole = useCallback(
    (nextCity = "koshi", nextChapter: Chapter = "plan") => {
      setCity(nextCity);
      setView("console");
      setChapter(nextChapter);
      if (nextChapter === "backtest") setOverlay("both");
      stopDemo();
    },
    [stopDemo]
  );

  const playDemo = useCallback(() => {
    askedDemo.current = false;
    setPicked(null);
    setFocusId(null);
    setCity("koshi");
    setView("console");
    setDemoBeat(0);
    setDemoAuto(true);
    applyBeat(0);
  }, [applyBeat]);

  const stepDemo = useCallback(
    (delta: number, fromAuto = false) => {
      if (!fromAuto) setDemoAuto(false);
      setDemoBeat((current) => {
        const start = current ?? 0;
        const next = start + delta;
        if (next < 0) return current;
        if (next >= DEMO_BEATS.length) {
          setDemoAuto(false);
          return null;
        }
        applyBeat(next);
        return next;
      });
    },
    [applyBeat]
  );

  const onSelect = useCallback(
    (id: string | null) => {
      setPicked(id);
      setFocusId(id);
      if (id) {
        setChapter("plan");
        setQ(`Why was preventive measure ${id} selected before the next-best candidate site?`);
        setA("");
        setAnswerMeta("");
        if (view === "landing") setView("console");
        stopDemo();
      }
    },
    [stopDemo, view]
  );

  async function recalculate() {
    if (optimizerState !== "live") return;
    setBusy(true);
    try {
      const result = await optimize<Plan>(budget, mode, city);
      setPlan(result.plan);
      if (result.source === "cache") {
        setOptimizerState("frozen");
        setBudget(result.plan.budget_usd);
        setMode(result.plan.mode === "cvar" ? "cvar" : "expected");
      }
    } catch {
      setOptimizerState("unavailable");
    } finally {
      setBusy(false);
    }
  }

  async function askQuestion(question: string) {
    const trimmed = question.trim();
    if (!trimmed) return;
    setQ(trimmed);
    setAsking(true);
    try {
      const response = await ask(trimmed, city, {
        signal,
        plan,
        backtest,
        selectedMeasure: measureDetails,
        replication,
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

  async function onAsk(event: FormEvent) {
    event.preventDefault();
    await askQuestion(q);
  }

  useEffect(() => {
    if (demoBeat == null) {
      askedDemo.current = false;
      return;
    }
    if (DEMO_BEATS[demoBeat]?.chapter !== "ask" || askedDemo.current) return;
    askedDemo.current = true;
    const prompt = picked
      ? `Why was preventive measure ${picked} selected before the next-best candidate site?`
      : ASK_PROMPTS[0];
    void askQuestion(prompt);
  }, [demoBeat, picked]);

  useEffect(() => {
    if (demoBeat == null || DEMO_BEATS[demoBeat]?.chapter !== "plan") return;
    const first = plan?.selected?.[0]?.parcel_id;
    if (!first) return;
    setPicked(first);
    setFocusId(first);
  }, [demoBeat, plan]);

  useEffect(() => {
    if (demoBeat == null || !demoAuto) return undefined;
    const timer = window.setTimeout(() => stepDemo(1, true), 12000);
    return () => window.clearTimeout(timer);
  }, [demoAuto, demoBeat, stepDemo]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === "d") {
        event.preventDefault();
        playDemo();
        return;
      }
      if (key === "escape") {
        event.preventDefault();
        stopDemo();
        setView("landing");
        setCity("koshi");
        return;
      }
      if (key === "arrowright" || key === " ") {
        if (demoRef.current.beat != null) {
          event.preventDefault();
          stepDemo(1);
        }
        return;
      }
      if (key === "arrowleft") {
        if (demoRef.current.beat != null) {
          event.preventDefault();
          stepDemo(-1);
        }
        return;
      }
      const index = Number(key) - 1;
      if (index >= 0 && index <= 5) {
        event.preventDefault();
        const next = ["noise", "signal", "plan", "backtest", "ask", "report"][index] as Chapter;
        setView("console");
        setChapter(next);
        stopDemo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playDemo, stepDemo, stopDemo]);

  const cityName = cities.find((row) => row.id === city)?.name || city;
  const hasCsi = backtest?.critical_success_index != null;
  const hasValidation = city === "koshi" && hasProofValidation(backtest);
  const showEra5 = city === "koshi" && replication != null;
  const isLanding = view === "landing";
  const showStations = !isLanding && city === "koshi" && (chapter === "noise" || chapter === "signal");
  const showParcels = isLanding || (chapter !== "noise" && chapter !== "signal");
  const mapOverlay: Overlay = isLanding
    ? "both"
    : chapter === "backtest"
      ? overlay
      : "none";
  const activeObserved =
    isLanding || (chapter === "backtest" && hasCsi)
      ? proofEvent === "2017" && hasValidation
        ? observed2017
        : observed
      : null;
  const activeModeled =
    isLanding || chapter === "backtest"
      ? proofEvent === "2017" && hasValidation
        ? modeled2017
        : modeled
      : null;
  const mapHazard =
    chapter === "backtest"
      ? riskView === "with_plan"
        ? riskWithPlan || hazard
        : riskBefore || hazard
      : hazard;

  const aucCopy =
    signal?.landslide_trigger.auc == null
      ? "Landslide classifier AUC is unavailable; no score is claimed."
      : `Landslide is a held-out rainfall classifier (AUC ${signal.landslide_trigger.auc.toFixed(
          3
        )}, n=${signal.landslide_trigger.n_events}), not a physical Caine threshold.`;

  const rainfallHeadline = signal
    ? signal.headline.new_return_period_yrs == null
      ? city === "koshi"
        ? "Loading the rainfall tail…"
        : "City screening pack — flood CSI not invented"
      : `The old 100-year rain depth now fits a ${metric(
          signal.headline.new_return_period_yrs,
          2
        )}-year recurrence`
    : busy
      ? "Loading the rainfall tail…"
      : "Rainfall tail unavailable in this pack";
  const rainfallLede =
    city === "koshi"
      ? `This headline uses the Nepal-adjacent subset. The ${metric(
          signal?.stations_processed,
          0
        )}-station High Mountain Asia pool is the scale and negative-control story; it did not identify a recurrence shift.`
      : "This pack is a screening run on public DEM / OSM / ERA5-Land. Flood CSI is null unless a SAR scene is wired.";
  const headline =
    chapter === "plan"
      ? planHeadline(plan)
      : chapter === "report"
        ? "Export the preventive plan"
        : chapter === "ask"
          ? "Ask why a preventive measure was selected"
          : chapter === "backtest"
            ? hasCsi
              ? `Proof against radar · CSI ${metric(backtest?.critical_success_index, 3)}`
              : "Proof · CSI not in this pack"
            : chapter === "noise"
              ? "The archive is noisy. We counted the gaps."
              : rainfallHeadline;
  const lede =
    chapter === "plan"
      ? planLede(plan)
      : chapter === "report"
        ? "Download the screening plan, government scorecard, or citizen brief a district can take to a funder."
        : chapter === "ask"
          ? "Answers are grounded in plan.json, candidates, and the proof artifacts — never invented."
          : chapter === "backtest"
            ? hasCsi
              ? "Toggle observed vs modeled. Flip 2017 for the frozen transfer. We report the miss vs JRC."
              : "This city pack has no SAR scene, so CSI stays null instead of borrowing Koshi’s score."
            : chapter === "noise"
              ? "498 stations across High Mountain Asia, parsed on Voloridge compute. Missing years are the point."
              : rainfallLede;

  const askPrompts = useMemo(() => {
    const prompts = [...ASK_PROMPTS];
    if (picked) {
      prompts.unshift(`Why was preventive measure ${picked} selected before the next-best candidate site?`);
    }
    return prompts.slice(0, 4);
  }, [picked]);

  const chapterBody = (() => {
    if (busy && !signal && !plan) {
      return <LoadingBlock label={`Loading the ${cityName} evidence pack…`} />;
    }
    if (packError && !plan && !signal) {
      return (
        <EmptyState
          title="Pack failed to load"
          body={packError}
          action="Retry"
          onAction={() => setReloadToken((value) => value + 1)}
        />
      );
    }
    if (chapter === "noise") return <NoiseChapter />;
    if (chapter === "signal") {
      return signal ? (
        <TailChapter
          city={city}
          cityName={cityName}
          signal={signal}
          replication={replication}
          rankings={rankings}
          showEra5={showEra5}
        />
      ) : (
        <EmptyState
          title="Tail not in this pack"
          body="signal.json did not load. Koshi still has the frozen rainfall-tail headline on disk."
          action="Retry"
          onAction={() => setReloadToken((value) => value + 1)}
        />
      );
    }
    if (chapter === "plan") {
      return plan ? (
        <PlantChapter
          plan={plan}
          candidates={candidates}
          scenarios={scenarios}
          budget={budget}
          mode={mode}
          optimizerState={optimizerState}
          busy={busy}
          picked={picked}
          onBudget={setBudget}
          onMode={setMode}
          onRecalculate={recalculate}
          onPick={(id) => {
            setPicked(id);
            setFocusId(id);
            setQ(`Why was preventive measure ${id} selected?`);
            setA("");
            setAnswerMeta("");
            stopDemo();
          }}
        />
      ) : (
        <EmptyState
          title="Plan not loaded"
          body="The $2M screening portfolio lives in demo_cache/plan.json. Retry, or stay on Koshi."
          action="Retry"
          onAction={() => setReloadToken((value) => value + 1)}
        />
      );
    }
    if (chapter === "backtest") {
      return (
        <ProofChapter
          backtest={backtest}
          overlay={overlay}
          proofEvent={hasValidation ? proofEvent : "2024"}
          riskView={riskView}
          hasValidation={hasValidation}
          hasCsi={hasCsi}
          onOverlay={setOverlay}
          onProofEvent={setProofEvent}
          onRiskView={setRiskView}
        />
      );
    }
    if (chapter === "ask") {
      return (
        <AskChapter
          q={q}
          a={a}
          answerMeta={answerMeta}
          asking={asking}
          attribution={attribution}
          selected={measureDetails}
          prompts={askPrompts}
          onQ={setQ}
          onAsk={onAsk}
          onAskPrompt={askQuestion}
        />
      );
    }
    if (chapter === "report") {
      return (
        <ExportChapter
          city={city}
          live={optimizerState === "live"}
          sites={plan?.selected.length}
          spend={plan?.totals.cost_usd}
          peopleRisk={plan?.totals.people_protected}
          carbon={plan?.totals.co2_t_10yr}
        />
      );
    }
    return null;
  })();

  const activeBeat = demoBeat != null ? DEMO_BEATS[demoBeat] : null;

  return (
    <div className={`app ${isLanding ? "landing-mode" : "console-mode"} ${demoBeat != null ? "demo-mode" : ""}`}>
      <div className="map-wrap">
        <HazardMap
          city={isLanding ? "koshi" : city}
          hazard={mapHazard}
          candidates={
            isLanding ? candidates.filter((row) => selectedIds.has(row.parcel_id)) : candidates
          }
          selectedIds={selectedIds}
          focusId={isLanding ? null : focusId}
          onSelect={onSelect}
          observed={activeObserved}
          modeled={activeModeled}
          stations={stations}
          overlay={mapOverlay}
          showStations={showStations}
          showParcels={showParcels}
          showHazard={!isLanding}
          hazardOpacity={chapter === "noise" || chapter === "signal" ? 0.16 : 0.4}
          emphasis={isLanding}
          chrome={!isLanding}
        />
        {!isLanding && (
          <div className="map-legend">
            {chapter === "backtest"
              ? `Risk surface = ${
                  riskView === "with_plan" ? "with-plan counterfactual" : "current model"
                }. Blue fill = observed water · gold outline = modeled flood${
                  proofEvent === "2017" && hasValidation
                    ? " (2017 transfer event)."
                    : hasCsi
                      ? " (2024 calibration event)."
                      : " (pack modeled extent only)."
                }`
              : showStations
                ? "Gold dots = Nepal-adjacent NOAA ISD stations used for the rainfall-tail headline. Hazard at low opacity."
                : "Coloured dots are selected preventive measures; pale dots are candidate intervention sites."}
          </div>
        )}
        {busy && !isLanding && (
          <div className="map-busy" role="status">
            Loading {cityName}…
          </div>
        )}
      </div>

      {isLanding ? (
        <Landing
          signal={signal}
          backtest={backtest}
          plan={plan}
          cities={cities}
          busy={busy}
          onEnter={(nextCity) => goConsole(nextCity, "plan")}
          onPlayDemo={playDemo}
        />
      ) : (
        <>
          <TopBar
            city={city}
            cities={cities}
            optimizerState={optimizerState}
            onCity={(next) => {
              setCity(next);
              stopDemo();
            }}
            onHome={() => {
              stopDemo();
              setCity("koshi");
              setView("landing");
            }}
            onPlayDemo={playDemo}
          />
          <ChapterDock
            chapter={chapter}
            onChapter={(next) => {
              setChapter(next);
              stopDemo();
            }}
            headline={headline}
            lede={lede}
            banner={
              chapter === "plan" ? (
                <div className={`optimizer-status ${optimizerState === "live" ? "live" : "frozen"}`}>
                  {optimizerState === "live" ? (
                    <>
                      <b>Live optimizer.</b> Recalculate is enabled — this can overwrite the booth plan.
                    </>
                  ) : (
                    <>
                      <b>Frozen pack.</b> Budget slider and Recalculate are locked so a booth click cannot POST /optimize.
                    </>
                  )}
                </div>
              ) : (
                <div className="banner">
                  <strong>Screening-grade and explicit.</strong> {aucCopy}{" "}
                  {!hasCsi
                    ? "Flood CSI is unavailable in this pack; it is not replaced with the Koshi score."
                    : `The HAND proxy scores CSI ${backtest?.critical_success_index?.toFixed(3)} on the ${
                        backtest?.event_date || "calibration"
                      } scene (in-sample). ${
                        hasValidation && backtest?.validation?.critical_success_index != null
                          ? `Frozen out-of-sample / transfer CSI ${backtest.validation.critical_success_index.toFixed(3)}.`
                          : ""
                      }`}
                </div>
              )
            }
          >
            {chapterBody}
          </ChapterDock>
          {measureDetails && chapter === "plan" && demoBeat == null && (
            <Inspector
              details={measureDetails}
              selected={Boolean(pickedRow)}
              onAsk={() => {
                setChapter("ask");
                stopDemo();
              }}
              onClose={() => {
                setPicked(null);
                setFocusId(null);
              }}
            />
          )}
          {activeBeat && (
            <DemoCue
              beat={demoBeat ?? 0}
              total={DEMO_BEATS.length}
              title={activeBeat.title}
              cue={activeBeat.cue}
              auto={demoAuto}
              onPrev={() => stepDemo(-1)}
              onNext={() => stepDemo(1)}
              onStop={stopDemo}
              onToggleAuto={() => setDemoAuto((value) => !value)}
            />
          )}
          <div className="ticker glass">
            <span className="ev model">model output</span>
            <span>
              Plan <b>{plan ? `${metric(plan.selected.length, 0)} measures` : "—"}</b>
            </span>
            <span>
              Spend <b>{plan ? money(plan.totals.cost_usd) : "—"}</b>
            </span>
            <span>
              People-risk <b>{plan ? risk(plan.totals.people_protected) : "—"}</b>
            </span>
            <span>
              tCO₂ / 10 yr <b>{plan ? metric(plan.totals.co2_t_10yr, 0) : "—"}</b>
            </span>
            <span>
              Income / yr <b>{plan ? money(plan.totals.income_usd_yr) : "—"}</b>
            </span>
            <span className="ticker-hint">1–6 chapters · D demo · Esc landing</span>
          </div>
        </>
      )}
    </div>
  );
}
