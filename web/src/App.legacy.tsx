import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { ask, CACHE_ONLY, checkHealth, listCities, loadJson, loadPlan, optimize } from "./api";
import ChapterDock from "./ChapterDock";
import AskChapter from "./chapters/AskChapter";
import ExportChapter from "./chapters/ExportChapter";
import NoiseChapter from "./chapters/NoiseChapter";
import PlantChapter from "./chapters/PlantChapter";
import ProofChapter from "./chapters/ProofChapter";
import TailChapter from "./chapters/TailChapter";
import HazardMap from "./HazardMap";
import Inspector from "./Inspector";
import Landing from "./Landing";
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
  OptimizationMode,
  OptimizerState,
  Overlay,
  Plan,
  Replication,
  Signal,
  View,
} from "./lib/types";
import TopBar from "./TopBar";

function initialView(): View {
  return new URLSearchParams(window.location.search).get("console") === "1" ? "console" : "landing";
}

function initialCity(): string {
  const params = new URLSearchParams(window.location.search);
  if (params.get("console") === "1") return params.get("city") || "koshi";
  return "koshi";
}

export default function LegacyApp() {
  const [view, setView] = useState<View>(initialView);
  const [city, setCity] = useState(initialCity);
  const [cities, setCities] = useState<CityRow[]>([
    { id: "koshi", name: "Koshi / Madhesh (Nepal)", ready: true },
  ]);
  const [chapter, setChapter] = useState<Chapter>("backtest");
  const [signal, setSignal] = useState<Signal | null>(null);
  const [hazard, setHazard] = useState<GeoJSON.FeatureCollection | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [candidates, setCandidates] = useState<CandidateSite[]>([]);
  const [backtest, setBacktest] = useState<Backtest | null>(null);
  const [mode, setMode] = useState<OptimizationMode>("expected");
  const [optimizerState, setOptimizerState] = useState<OptimizerState>("checking");
  const [overlay, setOverlay] = useState<Overlay>("observed");
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
  const [riskView, setRiskView] = useState<"before" | "with_plan">("before");
  const [budget, setBudget] = useState(2_000_000);
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [q, setQ] = useState("Why is the 100-year storm now a 7.75-year storm?");
  const [a, setA] = useState("");
  const [answerMeta, setAnswerMeta] = useState("");
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    listCities()
      .then((payload: { cities?: CityRow[] }) => {
        const rows = (payload.cities || []).filter((row) => row.ready !== false);
        if (rows.length) setCities(rows);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
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
    setReplication(null);
    setAttribution(null);
    setA("");
    setAnswerMeta("");

    const koshiOnly = city === "koshi";
    Promise.all([
      checkHealth(),
      loadJson("signal", city).then((value: Signal) => {
        if (!cancelled) setSignal(value);
      }),
      loadJson("hazard", city).then((value) => {
        if (!cancelled) setHazard(value);
      }),
      loadPlan<Plan>(city).then((result) => {
        if (cancelled) return;
        setPlan(result.plan);
        setBudget(result.plan.budget_usd);
        setMode(result.plan.mode === "cvar" ? "cvar" : "expected");
        const firstMeasure = result.plan.selected?.[0]?.parcel_id;
        if (firstMeasure) {
          setPicked(firstMeasure);
          setQ(`Why was preventive measure ${firstMeasure} selected?`);
        }
      }),
      loadJson("candidates", city).then((value: CandidateSite[]) => {
        if (!cancelled) setCandidates(Array.isArray(value) ? value : []);
      }),
      loadJson("backtest", city).then((value: Backtest) => {
        if (!cancelled) setBacktest(value);
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
            .then((value) => {
              if (!cancelled) setReplication(value);
            })
            .catch(() => {
              if (!cancelled) setReplication(null);
            })
        : Promise.resolve(),
      koshiOnly
        ? loadJson("stations_nepal")
            .then((value) => {
              if (!cancelled) setStations(value);
            })
            .catch(() => {
              if (!cancelled) setStations(null);
            })
        : Promise.resolve(setStations(null)),
      loadJson("attribution", city)
        .then((value) => {
          if (!cancelled) setAttribution(value);
        })
        .catch(() => {
          if (!cancelled) setAttribution(null);
        }),
      loadJson("risk_before", city)
        .then((value) => {
          if (!cancelled) setRiskBefore(value);
        })
        .catch(() => {
          if (!cancelled) setRiskBefore(null);
        }),
      loadJson("risk_with_plan", city)
        .then((value) => {
          if (!cancelled) setRiskWithPlan(value);
        })
        .catch(() => {
          if (!cancelled) setRiskWithPlan(null);
        }),
    ])
      .then(([health]) => {
        if (cancelled) return;
        setOptimizerState(CACHE_ONLY ? "frozen" : health ? "live" : "frozen");
      })
      .catch(() => {
        if (!cancelled) setOptimizerState("unavailable");
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });

    return () => {
      cancelled = true;
    };
  }, [city]);

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

  const onSelect = useCallback((id: string | null) => {
    setPicked(id);
    if (id) {
      setChapter("plan");
      setQ(`Why was preventive measure ${id} selected before the next-best candidate site?`);
      setA("");
      setAnswerMeta("");
      if (view === "landing") setView("console");
    }
  }, [view]);

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

  async function onAsk(event: FormEvent) {
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

  function enter(nextCity = "koshi") {
    setCity(nextCity);
    setView("console");
    setChapter("plan");
    setOverlay("observed");
  }

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
    : "Loading the rainfall tail…";
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
          : rainfallHeadline;
  const lede =
    chapter === "plan"
      ? planLede(plan)
      : chapter === "report"
        ? "Download the screening plan, government scorecard, or citizen brief a district can take to a funder."
        : chapter === "ask"
          ? "Answers are grounded in plan.json, candidates, and the proof artifacts — never invented."
          : rainfallLede;

  return (
    <div className={`app ${isLanding ? "landing-mode" : "console-mode"}`}>
      <div className="map-wrap">
        <HazardMap
          city={isLanding ? "koshi" : city}
          hazard={mapHazard}
          candidates={
            isLanding ? candidates.filter((row) => selectedIds.has(row.parcel_id)) : candidates
          }
          selectedIds={selectedIds}
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
      </div>

      {isLanding ? (
        <Landing signal={signal} backtest={backtest} plan={plan} cities={cities} onEnter={enter} />
      ) : (
        <>
          <TopBar city={city} cities={cities} onCity={setCity} optimizerState={optimizerState} />
          <ChapterDock
            chapter={chapter}
            onChapter={setChapter}
            headline={headline}
            lede={lede}
            banner={
              chapter === "plan" ? undefined : (
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
            {chapter === "noise" && <NoiseChapter />}
            {chapter === "signal" && signal && (
              <TailChapter
                city={city}
                cityName={cityName}
                signal={signal}
                replication={replication}
                showEra5={showEra5}
              />
            )}
            {chapter === "plan" && plan && (
              <PlantChapter
                plan={plan}
                candidates={candidates}
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
                  setQ(`Why was preventive measure ${id} selected?`);
                  setA("");
                  setAnswerMeta("");
                }}
              />
            )}
            {chapter === "backtest" && (
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
            )}
            {chapter === "ask" && (
              <AskChapter
                q={q}
                a={a}
                answerMeta={answerMeta}
                asking={asking}
                attribution={attribution}
                selected={measureDetails}
                onQ={setQ}
                onAsk={onAsk}
              />
            )}
            {chapter === "report" && (
              <ExportChapter city={city} live={optimizerState === "live"} />
            )}
          </ChapterDock>
          {measureDetails && chapter === "plan" && (
            <Inspector
              details={measureDetails}
              selected={Boolean(pickedRow)}
              onAsk={() => setChapter("ask")}
              onClose={() => setPicked(null)}
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
          </div>
        </>
      )}
    </div>
  );
}
