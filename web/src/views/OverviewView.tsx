import {
  ArrowRight,
  ChevronDown,
  Coins,
  Database,
  Leaf,
  CloudRain,
  ShieldCheck,
  Sprout,
  Users,
  Wallet,
} from "lucide-react";
import { useDash } from "../context";
import { everyYears, metric, money, n0, oldPhrase } from "../format";
import MapPanel from "../MapPanel";
import PlanTiles from "../PlanTiles";
import { selectedTypes, siteNoun } from "../plan";
import RegionSelect from "../RegionSelect";
import { DecadeBars, LineMini, MapKey, ProofBars } from "../viz";
import { Accordion, Callout, Card, Strip, useCountUp } from "../ui";

/** "2024-09-27" -> "27 September 2024"; null if it isn't a real date. */
const longDate = (iso: string | undefined) => {
  if (!iso) return null;
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
};

/** "2024-09-27" -> { day: "27", monthYear: "September 2024" }; null if it isn't a real date. */
const dateParts = (iso: string | undefined) => {
  if (!iso) return null;
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return {
    day: String(date.getUTCDate()),
    monthYear: date.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }),
  };
};

function Why() {
  const d = useDash();
  const flood = longDate(d.backtest?.event_date);
  const parts = d.city === "koshi" ? dateParts(d.backtest?.event_date) : null;
  const hasProof = d.backtest?.critical_success_index != null;
  return (
    <section className={`why ${parts ? "" : "no-date"}`} aria-labelledby="why-title">
      {parts && (
        <div className="why-date" role="img" aria-label={`The flood: ${flood}`}>
          <b>{parts.day}</b>
          <span className="why-date-my">{parts.monthYear}</span>
          <span className="why-date-place">Koshi region, Nepal</span>
        </div>
      )}
      <div className="why-body">
        <h2 id="why-title">Why we built this</h2>
        <p>
          {d.city === "koshi"
            ? `The Koshi region of Nepal flooded. Warnings alone don't protect mountain communities, so RootLedger works out what to build, where, and on what budget to reduce the damage next time.`
            : `RootLedger began with the ${flood ? flood.replace(/^\d+ /, "") : "September 2024"} floods in Nepal's Koshi region. The same method now screens ${d.cityName}, working out what to build, where, and on what budget to reduce flood damage.`}
        </p>
        {d.city === "koshi" && hasProof && (
          <button className="why-cta" onClick={() => d.go("proof")}>
            See how our flood map compares <ArrowRight size={16} />
          </button>
        )}
      </div>
    </section>
  );
}

type TickerFact = { value: string; label: string; sub: string };

/** Slow full-width band of key facts. Pauses on hover; static under reduced motion (see CSS). */
function Ticker() {
  const d = useDash();
  const { noise, plan, backtest, signal, city } = d;
  const facts: TickerFact[] = [];

  if (city === "koshi" && noise) {
    const [y0, y1] = noise.reproducible_subset.year_range;
    facts.push({
      value: String(noise.reproducible_subset.stations),
      label: "weather stations near Nepal",
      sub: `Rainfall records, ${y0}–${y1}`,
    });
    facts.push({
      value: n0(noise.scale.stations_processed),
      label: "stations in the full archive",
      sub: "The wider Himalayan region",
    });
  } else if (signal) {
    facts.push({ value: n0(signal.station_years), label: "years of rainfall", sub: "ERA5-Land climate data" });
  }
  if (plan) {
    facts.push({
      value: String(plan.selected.length),
      label: siteNoun(plan, d.candidates),
      sub: `Recommended within a ${money(plan.budget_usd)} budget`,
    });
  }
  if (backtest?.critical_success_index != null) {
    const both = backtest.validation?.critical_success_index != null;
    const y1 = backtest.event_date?.slice(0, 4);
    const y2 = backtest.validation?.event_date?.slice(0, 4);
    facts.push({
      value: both ? "2" : "1",
      label: both ? "real floods" : "real flood",
      sub:
        both && y1 && y2
          ? `Flood map checked against ${y1} and ${y2}`
          : y1
            ? `Flood map checked against ${y1}`
            : "Flood map checked against real events",
    });
  }
  const weights = (plan?.selected || []).map((sel) => sel.equity_weight ?? 1);
  const topWeight = weights.length ? Math.max(...weights) : 1;
  if (topWeight > 1) {
    facts.push({
      value: `${topWeight.toFixed(1)}×`,
      label: "extra weight for low-income areas",
      sub: "Built into how sites are chosen",
    });
  }
  if (city === "koshi" && noise) {
    facts.push({
      value: `${Math.round(noise.reproducible_subset.station_years_no_record_pct)}%`,
      label: "of requested years had no record",
      sub: "Counted and cleaned, never guessed",
    });
  }
  if (facts.length === 0) return null;

  const group = (hidden: boolean, key: number) => (
    <ul className="ticker-group" key={key} aria-hidden={hidden || undefined}>
      {facts.map((fact) => (
        <li key={fact.label}>
          <b>{fact.value}</b>
          <span>
            <span className="tk-label">{fact.label}</span>
            <span className="tk-sub">{fact.sub}</span>
          </span>
        </li>
      ))}
    </ul>
  );

  return (
    <section
      className="ticker"
      aria-label="Key facts"
      style={{ ["--ticker-secs" as string]: `${facts.length * 12}s` }}
    >
      <div className="ticker-track">
        {Array.from({ length: 8 }, (_, index) => group(index > 0, index))}
      </div>
    </section>
  );
}

function Hero() {
  const d = useDash();
  const { signal, city, cityName, noise } = d;
  const newYrs = signal?.headline.new_return_period_yrs;
  const oldYrs = signal?.headline.old_return_period_yrs;
  const animatedNew = useCountUp(newYrs);

  const early = signal?.headline.early_period;
  const late = signal?.headline.late_period;
  const thenLabel = early ? `${early[0]}–${early[1]}` : "earlier records";
  const nowLabel = late ? `${late[0]}–${late[1]}` : "recent records";
  const shifted = newYrs != null && oldYrs != null;
  const oldPer = oldYrs ? Math.max(1, Math.round(100 / oldYrs)) : 1;
  const nowPer = newYrs ? Math.max(1, Math.round(100 / newYrs)) : 1;

  let headline: React.ReactNode;
  if (!signal) headline = <span className="skeleton hero-skeleton" />;
  else if (shifted)
    headline = (
      <>
        A downpour that used to come <em>{oldPhrase(oldYrs)}</em> now arrives about{" "}
        <em>{everyYears(newYrs)}</em>
      </>
    );
  else
    headline =
      city === "koshi" ? "Rainfall trend unavailable" : `An early screening of ${cityName}`;

  let lede: string;
  if (city === "koshi") {
    lede = shifted
      ? `In Nepal's Koshi / Madhesh region, rain that was a once-in-${oldYrs}-years event in the ${thenLabel} records now arrives about ${everyYears(
          newYrs
        )} (${nowLabel}). A regional finding from past records, not a forecast.`
      : "We could not estimate a rainfall trend for this region from the available records.";
  } else {
    lede =
      "A quick screening built from public terrain, map and climate data. We have not yet checked it against a real flood, so no flood accuracy score is shown.";
  }

  return (
    <section className="hero">
      <RegionSelect />
      <div className="hero-copy">
        <h1>{headline}</h1>
        <p className="hero-lede">{lede}</p>
        <div className="hero-cta">
          <button
            className="btn primary"
            onClick={() => document.getElementById("dashboard")?.scrollIntoView({ behavior: "smooth" })}
          >
            Explore the dashboard <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {shifted && (
        <div className="hero-stat" aria-label="How often a heavy downpour arrives">
          <span className="eyebrow">Typical wait between downpours this heavy</span>
          <div className="shift">
            <div className="col">
              <span className="from">{oldYrs}</span>
              <small>years · {thenLabel}</small>
            </div>
            <ArrowRight size={28} />
            <div className="col">
              <span className="to">{animatedNew == null ? "—" : animatedNew.toFixed(2)}</span>
              <small>years · {nowLabel}</small>
            </div>
          </div>
          <div
            className="century"
            role="img"
            aria-label={`Expected downpours this heavy per century: about ${oldPer} in ${thenLabel}, about ${nowPer} in ${nowLabel}`}
          >
            <div className="century-row">
              <span className="c-label">Then</span>
              <Strip events={oldPer} tone="then" />
              <span className="c-count">{oldPer}×</span>
            </div>
            <div className="century-row">
              <span className="c-label">Now</span>
              <Strip events={nowPer} tone="now" />
              <span className="c-count now">{nowPer}×</span>
            </div>
            <span className="c-cap">Expected downpours this heavy in 100 years</span>
          </div>
          <small className="shift-note">The same amount of rain, arriving far more often.</small>
        </div>
      )}
      <Why />
    </section>
  );
}

export default function OverviewView() {
  const d = useDash();
  const { plan, signal, backtest, noise } = d;
  const loading = !plan;
  const jrcCsi = backtest?.baselines?.jrc_seasonal_water?.csi;
  const modelBeatsJrc =
    backtest?.critical_success_index != null && jrcCsi != null && backtest.critical_success_index > jrcCsi;
  const validationCsi = backtest?.validation?.critical_success_index;
  const sites = siteNoun(plan, d.candidates);

  const types = selectedTypes(plan, d.candidates);
  // visuals for the journey
  const decadeValues =
    d.city === "koshi" && noise
      ? Object.values(noise.reproducible_subset.station_years_by_decade)
      : [1, 1, 1, 1, 1, 1];
  // Then/Now strips use the Nepal-adjacent headline finding (not the pooled negative-control curve).
  const rainOld = signal?.headline.old_return_period_yrs;
  const rainNew = signal?.headline.new_return_period_yrs;
  const shiftedRain = rainOld != null && rainNew != null && rainNew > 0;
  const rainThen = shiftedRain ? Math.max(1, Math.round(100 / (rainOld as number))) : 1;
  const rainNow = shiftedRain ? Math.max(1, Math.round(100 / (rainNew as number))) : 1;
  const frontier = plan?.frontier || [];
  const frontierPts = frontier.map((f) => ({ x: f.budget_usd, y: f.people_protected }));
  const frontierMax = frontier.length ? Math.max(...frontier.map((f) => f.people_protected)) : 0;
  const frontierMarker = plan
    ? frontier.reduce(
        (best, f, i) => (Math.abs(f.budget_usd - plan.budget_usd) < Math.abs(frontier[best].budget_usd - plan.budget_usd) ? i : best),
        0
      )
    : 0;
  const earlyPoint = frontierMax > 0 ? frontier.find((f) => f.people_protected >= 0.9 * frontierMax) : undefined;
  const earlyBenefit =
    earlyPoint && plan && earlyPoint.budget_usd < plan.budget_usd
      ? { pct: Math.round((100 * earlyPoint.people_protected) / frontierMax), budget: earlyPoint.budget_usd }
      : null;
  const proofEvents = [
    {
      label: backtest?.event_date?.slice(0, 4) || "",
      model: backtest?.critical_success_index,
      jrc: backtest?.baselines?.jrc_seasonal_water?.csi,
    },
    {
      label: backtest?.validation?.event_date?.slice(0, 4) || "",
      model: backtest?.validation?.critical_success_index,
      jrc: backtest?.validation?.baselines?.jrc_seasonal_water?.csi,
    },
  ].filter((e): e is { label: string; model: number; jrc: number } => e.model != null && e.jrc != null && e.label !== "");
  const allLower = proofEvents.length > 0 && proofEvents.every((e) => e.model < e.jrc);
  const allBeat = proofEvents.length > 0 && proofEvents.every((e) => e.model > e.jrc);

  // Only claim agreement when the second dataset actually shows heavier rain (Koshi only: api.ts maps every
  // city's replication file to Koshi's).
  const era5 = d.replication?.era5_headline_new_return_yrs;
  const oldYrs = signal?.headline.old_return_period_yrs;
  const newYrs = signal?.headline.new_return_period_yrs;
  const independentLine =
    d.city === "koshi" && oldYrs != null && newYrs != null && era5 != null && era5 < oldYrs
      ? `A separate, independent dataset (ERA5) also shows heavier rain, though ${
          era5 > newYrs ? "a milder shift" : "an equal or stronger shift"
        }: about ${everyYears(era5)}.`
      : null;

  const floodLine =
    backtest?.critical_success_index == null
      ? "We couldn't score the flood map against a real flood here, and we haven't substituted a made-up number."
      : `On the ${backtest.event_date || "first"} flood it scored ${backtest.critical_success_index.toFixed(
          2
        )} out of 1 (the model was tuned on that event)${
          validationCsi != null
            ? `; on a second flood it had not seen (${backtest.validation?.event_date || "second event"}) it scored ${validationCsi.toFixed(
                2
              )}.`
            : "."
        } That is a modest match: a rough guide to where flooding is likely, not a street-level prediction.`;

  return (
    <div className="view">
      <Hero />
      <Ticker />

      <div id="dashboard" className="anchor" />
      <PlanTiles />

      <section className="map-section" aria-labelledby="map-title">
        <header className="map-head">
          <h2 id="map-title">Where the risk is, and where the plan acts</h2>
          <MapKey types={types} />
        </header>
        <div className="map-frame">
          <MapPanel height={560} plain search />
        </div>
      </section>

      <div className="section-title">
        <h2>How we got here</h2>
        <p>Four steps, from raw weather records to a costed plan you can check.</p>
      </div>
      <ol className="journey">
        <li className="jstep-wrap">
          <span className="jnode">1</span>
          <button className="jstep" onClick={() => d.go("noise")}>
            <span className="jviz">
              <DecadeBars values={decadeValues} />
            </span>
            <span className="eyebrow">The data</span>
            <b>
              {d.city === "koshi"
                ? noise
                  ? `${n0(noise.scale.stations_processed)} weather stations`
                  : "Loading…"
                : signal
                  ? `${n0(signal.station_years)} years of rainfall`
                  : "Loading…"}
            </b>
            <p>
              {d.city === "koshi"
                ? noise
                  ? `${noise.reproducible_subset.stations} near Nepal · gaps counted, never guessed`
                  : "Reading the archive"
                : "One continuous climate series"}
            </p>
            <span className="step-go">
              Explore <ArrowRight size={14} />
            </span>
          </button>
        </li>
        <li className="jstep-wrap">
          <span className="jnode">2</span>
          <button className="jstep" onClick={() => d.go("signal")}>
            <span className="jviz">
              {shiftedRain ? (
                <span className="mini-strips" role="img" aria-label={`Expected downpours this heavy per century: about ${rainThen} then, about ${rainNow} now`}>
                  <span className="mini-row">
                    <em>Then</em>
                    <Strip events={rainThen} tone="then" />
                  </span>
                  <span className="mini-row">
                    <em>Now</em>
                    <Strip events={rainNow} tone="now" />
                  </span>
                </span>
              ) : (
                <span className="viz-empty">No clear shift</span>
              )}
            </span>
            <span className="eyebrow">The rain</span>
            <b>{signal ? (signal.headline.new_return_period_yrs != null ? "Heavier rain, more often" : "No clear shift found") : "Loading…"}</b>
            <p>
              {!signal
                ? "Measuring how often heavy rain arrives"
                : signal.trend.p_value > 0.05
                  ? "No clear trend in each year's heaviest rain"
                  : `Each year's heaviest rain is ${signal.trend.slope_mm_per_decade >= 0 ? "up" : "down"} about ${metric(
                      Math.abs(signal.trend.slope_mm_per_decade),
                      1
                    )} mm per decade`}
            </p>
            <span className="step-go">
              Explore <ArrowRight size={14} />
            </span>
          </button>
        </li>
        <li className="jstep-wrap">
          <span className="jnode">3</span>
          <button className="jstep" onClick={() => d.go("plan")}>
            <span className="jviz">
              <LineMini pts={frontierPts} marker={frontierMarker} label="Risk reduction as the budget grows" />
            </span>
            <span className="eyebrow">The plan</span>
            <b>{plan ? (earlyBenefit ? "Most of the benefit comes first" : "Sites picked for the budget") : "Loading…"}</b>
            <p>
              {earlyBenefit
                ? `${earlyBenefit.pct}% of the risk reduction arrives by ${money(earlyBenefit.budget)}. The plan goes to ${money(plan?.budget_usd)}.`
                : "Chosen to cut risk the most for the money"}
            </p>
            <span className="step-go">
              Explore <ArrowRight size={14} />
            </span>
          </button>
        </li>
        <li className="jstep-wrap">
          <span className="jnode">4</span>
          <button className="jstep" onClick={() => d.go("proof")}>
            <span className="jviz">
              {proofEvents.length > 0 ? (
                <>
                  <ProofBars events={proofEvents} />
                  <span className="viz-legend">
                    <span>
                      <i /> Our flood map
                    </span>
                    <span>
                      <i className="grey" /> Simple water map
                    </span>
                  </span>
                </>
              ) : (
                <span className="viz-empty">No flood score here</span>
              )}
            </span>
            <span className="eyebrow">The proof</span>
            <b>{proofEvents.length === 0 ? "No flood check yet" : allLower ? "We show the misses" : "Tested against real floods"}</b>
            <p>
              {proofEvents.length === 0
                ? "We don't invent a score"
                : allLower
                  ? "A simple published water map still scores higher on both"
                  : allBeat
                    ? "Ahead of a simple published water map on both"
                    : "Ahead of a simple water map on some floods, behind on others"}
            </p>
            <span className="step-go">
              Explore <ArrowRight size={14} />
            </span>
          </button>
        </li>
      </ol>

      <Card className="honesty">
        <Accordion title="What this can — and can't — tell you">
          <ul className="plain-list">
            <li>
              <b>A regional comparison, not a forecast.</b> It compares past rainfall records. It
              doesn't predict next year's storms.
            </li>
            {independentLine && (
              <li>
                <b>An independent check points the same way.</b> {independentLine}
              </li>
            )}
            <li>
              <b>The benefits are estimates.</b> People, carbon and income figures are modeled from
              published rates. None of the sites has been surveyed on the ground yet, and "risk
              avoided" is not the same as lives saved.
            </li>
            <li>
              <b>The flood map is early-stage.</b> {floodLine}
            </li>
          </ul>
          <Accordion title="For technical readers: terms and scores">
            <dl className="glossary">
              <div>
                <dt>Return period</dt>
                <dd>
                  The average wait between events of a given size. A "100-year" rain isn't due once a
                  century; it has a 1-in-100 chance of happening in any given year.
                </dd>
              </div>
              <div>
                <dt>Risk to people</dt>
                <dd>
                  A modeled score for how much {d.city === "koshi" ? "flooding and landslides" : "flooding"} threaten
                  the people in each map square in a year, scaled up for low-income areas. A risk score, not a
                  headcount and not lives saved.
                </dd>
              </div>
              <div>
                <dt>CSI (flood score)</dt>
                <dd>
                  How closely the modeled flooded area overlaps the observed one, from 0 (none) to 1
                  (perfect).
                </dd>
              </div>
              <div>
                <dt>Independent check (ERA5)</dt>
                <dd>A separate climate dataset used to see whether the rainfall trend shows up there too.</dd>
              </div>
            </dl>
            <Callout title="Screening-grade and explicit.">
              {d.aucCopy}{" "}
              {backtest?.critical_success_index == null
                ? "Flood CSI is unavailable; it is not replaced with zero."
                : `The HAND proxy scores CSI ${backtest.critical_success_index.toFixed(3)} on the ${
                    backtest.event_date || "calibration"
                  } scene (in-sample). ${
                    validationCsi != null
                      ? `Frozen out-of-sample / transfer CSI ${validationCsi.toFixed(3)}.`
                      : ""
                  }`}
            </Callout>
          </Accordion>
        </Accordion>
      </Card>
    </div>
  );
}
