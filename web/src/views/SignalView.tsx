import { useMemo } from "react";
import {
  Area,
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
import { ArrowRight, Equal, Mountain, TrendingUp, Waves } from "lucide-react";
import { ChartTooltip } from "../charts";
import { useDash } from "../context";
import { everyYears, metric, n0, oldPhrase, plainYears } from "../format";
import { Accordion, Callout, Card, Lines, StatTile, Strip, useCountUp } from "../ui";

// Chart colours for the light theme.
const GREEN = "#1f5c4a";
const SLATE = "#3f5f80";
const GRID = "rgba(23, 33, 43, 0.1)";
const AXIS = "#6b7580";
const axis = { stroke: AXIS, tick: { fill: AXIS, fontSize: 12 }, tickLine: false, axisLine: { stroke: GRID } } as const;

/** Horizontal bars comparing how long the wait is between downpours (shorter = more often). */
function WaitBars({ rows }: { rows: { label: string; years: number; tone: "grey" | "green" | "slate" }[] }) {
  const max = Math.max(...rows.map((r) => r.years), 1);
  return (
    <span className="wait-bars" role="img" aria-label="Wait between downpours by source">
      {rows.map((row) => (
        <span className="wait-row" key={row.label}>
          <em>{row.label}</em>
          <span className="wait-track">
            <i className={row.tone} style={{ width: `${Math.max(3, (row.years / max) * 100)}%` }} />
          </span>
          <b>{plainYears(row.years)} yrs</b>
        </span>
      ))}
    </span>
  );
}

export default function SignalView() {
  const d = useDash();
  const { signal, replication, city, cityName } = d;
  const isKoshi = city === "koshi";

  const oldYrs = signal?.headline.old_return_period_yrs;
  const newYrs = signal?.headline.new_return_period_yrs;
  const shifted = oldYrs != null && newYrs != null && newYrs > 0;
  const animatedNew = useCountUp(shifted ? newYrs : null);

  const levels = useMemo(() => {
    if (!signal) return [];
    return Object.keys(signal.return_levels_mm)
      .map(Number)
      .sort((left, right) => left - right)
      .map((returnPeriod) => {
        const interval = signal.return_levels_ci95[String(returnPeriod)];
        return {
          rp: returnPeriod,
          mm: signal.return_levels_mm[String(returnPeriod)],
          band: interval ? ([interval[0], interval[1]] as [number, number]) : undefined,
        };
      });
  }, [signal]);

  const scatter = replication?.agreement?.scatter || [];
  const scatterMin = scatter.length ? Math.floor(Math.min(...scatter.flatMap((p) => [p.isd_mm, p.era5_mm]))) : 0;
  const scatterMax = scatter.length ? Math.ceil(Math.max(...scatter.flatMap((p) => [p.isd_mm, p.era5_mm]))) : 1;

  if (!signal) {
    return (
      <div className="view">
        <header className="data-hero">
          <span className="eyebrow">The rain</span>
          <h1>Measuring how often heavy rain arrives…</h1>
        </header>
        <div className="skeleton" style={{ height: 320 }} />
      </div>
    );
  }

  const early = signal.headline.early_period;
  const late = signal.headline.late_period;
  const thenLabel = early ? `${early[0]}–${early[1]}` : "earlier records";
  const nowLabel = late ? `${late[0]}–${late[1]}` : "recent records";
  const nThen = shifted ? Math.max(1, Math.round(100 / (oldYrs as number))) : 1;
  const nNow = shifted ? Math.max(1, Math.round(100 / (newYrs as number))) : 1;

  // The ERA5 cross-check only counts as agreement when it also shows heavier rain.
  // (api.ts maps every city's replication file to Koshi's, so it is only used for Koshi.)
  const era5 = isKoshi ? replication?.era5_headline_new_return_yrs : null;
  const era5Agrees = shifted && era5 != null && era5 < (oldYrs as number);

  const p = signal.trend.p_value;
  const slope = signal.trend.slope_mm_per_decade;
  const chance = p < 0.01 ? "Very unlikely to be chance" : p <= 0.05 ? "Unlikely to be chance" : "Could be chance";
  const lakes = [...signal.lake_growth].sort((l, r) => r.pct_growth - l.pct_growth);
  const auc = signal.landslide_trigger.auc;
  const top = levels.length ? levels[levels.length - 1] : null;

  const takeaway = shifted
    ? isKoshi
      ? `Near Nepal, a downpour that used to come ${oldPhrase(oldYrs as number)} now arrives about ${everyYears(newYrs as number)}. ${
          era5Agrees
            ? `A separate dataset agrees on the direction but not the size (about ${everyYears(era5 as number)}). `
            : ""
        }The wider region shows no such shift, so treat this as a regional finding from past records, not a forecast.`
      : `In this region's climate series, a downpour that used to come ${oldPhrase(oldYrs as number)} now arrives about ${everyYears(
          newYrs as number
        )}. It is a screening result from a single series, not a forecast.`
    : "We found no credible rise in heavy rain in this series. That is a real result, not a gap in the analysis.";

  return (
    <div className="view">
      <section className="hero rain-hero">
        <div className="hero-copy">
          <span className="eyebrow">The rain</span>
          <h1>
            {shifted ? (
              <>
                {isKoshi ? "Near Nepal, heavy" : "Heavy"} rain is arriving <em>more often</em>
              </>
            ) : (
              <>
                No clear <em>rise</em> in heavy rain found
              </>
            )}
          </h1>
          <p className="hero-lede">
            {isKoshi
              ? `We compared how often a very heavy downpour struck in ${thenLabel} with ${nowLabel}. Here is the result, how we tested it, and where it may not hold.`
              : `A quick screening of ${cityName} from a single climate series. Here is the result and its limits.`}
          </p>
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
              aria-label={`Expected downpours this heavy per century: about ${nThen} then, about ${nNow} now`}
            >
              <div className="century-row">
                <span className="c-label">Then</span>
                <Strip events={nThen} tone="then" />
                <span className="c-count">{nThen}×</span>
              </div>
              <div className="century-row">
                <span className="c-label">Now</span>
                <Strip events={nNow} tone="now" />
                <span className="c-count now">{nNow}×</span>
              </div>
              <span className="c-cap">Expected downpours this heavy in 100 years</span>
            </div>
          </div>
        )}
      </section>

      <div className="section-title">
        <h2>How we tested it</h2>
        <p>
          {isKoshi
            ? "One result is not enough. We checked it against the wider region and an independent dataset."
            : "This region has one climate series, so there is no separate check to compare against."}
        </p>
      </div>
      <div className={`test-grid ${isKoshi ? "" : "single"}`}>
        <div className="jstep static">
          <span className="jviz">
            {shifted ? (
              <span className="mini-strips">
                <span className="mini-row">
                  <em>Then</em>
                  <Strip events={nThen} tone="then" />
                </span>
                <span className="mini-row">
                  <em>Now</em>
                  <Strip events={nNow} tone="now" />
                </span>
              </span>
            ) : (
              <span className="viz-empty">No clear shift</span>
            )}
          </span>
          <span className="eyebrow">{isKoshi ? "The finding" : "This region"}</span>
          <b>{shifted ? `${oldPhrase(oldYrs as number)} → ${everyYears(newYrs as number)}` : "No credible rise found"}</b>
          <p>
            {isKoshi
              ? `Weather stations near Nepal, ${thenLabel} compared with ${nowLabel}.`
              : `ERA5-Land climate data at the city centre, ${thenLabel} compared with ${nowLabel}.`}
          </p>
        </div>

        {isKoshi && (
          <div className="jstep static">
            <span className="jviz icon" aria-hidden>
              <Equal size={30} strokeWidth={1.6} />
            </span>
            <span className="eyebrow">Wider region</span>
            <b>No shift found</b>
            <p>
              Across all {metric(signal.stations_processed, 0)} stations we did not see the same change, so this is a
              regional finding.
            </p>
          </div>
        )}

        {isKoshi && replication && era5 != null && (
          <div className="jstep static">
            <span className="jviz">
              {shifted && (
                <WaitBars
                  rows={[
                    { label: "Once expected", years: oldYrs as number, tone: "grey" },
                    { label: "Stations", years: newYrs as number, tone: "green" },
                    { label: "ERA5", years: era5, tone: "slate" },
                  ]}
                />
              )}
            </span>
            <span className="eyebrow">Independent check</span>
            <b>{era5Agrees ? "Points the same way, smaller shift" : replication.verdict || "Not comparable"}</b>
            <p>
              A separate dataset (ERA5) puts the wait at about {plainYears(era5)} years
              {shifted ? `, not ${plainYears(newYrs as number)}` : ""}.
            </p>
          </div>
        )}
      </div>

      <div className="section-title">
        <h2>How heavy the rain gets</h2>
        <p>Rain depth for a one-day downpour, by how rare the storm is.</p>
      </div>
      <Card
        title="Rain depth by how rare the storm is"
        subtitle={isKoshi ? "Wider Himalayan region, shown as the control · not the Nepal result" : "This region's climate series"}
        info="Return levels from a fitted extreme-value model, with a 95% range. A '100y' storm is the size of rain with a 1-in-100 chance of happening in any year."
      >
        <div className="chart tall">
          <ResponsiveContainer>
            <ComposedChart data={levels} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="rp" {...axis} tickFormatter={(v) => `${v}y`} />
              <YAxis {...axis} unit=" mm" width={68} />
              <Tooltip content={<ChartTooltip title={(l) => `${l}-year storm`} fmt={(v) => `${metric(v, 0)} mm`} />} />
              <Area dataKey="band" name="95% range" stroke="none" fill={GREEN} fillOpacity={0.14} isAnimationActive={false} />
              <Line
                type="monotone"
                dataKey="mm"
                name="Rain in one day"
                stroke={GREEN}
                strokeWidth={2.5}
                dot={{ r: 4, fill: GREEN, stroke: "#fff", strokeWidth: 2 }}
                activeDot={{ r: 6 }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        {top && (
          <p className="chart-note">
            A 1-in-{top.rp}-year day of rain is about {metric(top.mm, 0)} mm
            {top.band ? ` (range ${metric(top.band[0], 0)}–${metric(top.band[1], 0)} mm)` : ""}.
          </p>
        )}
      </Card>

      {isKoshi && scatter.length > 0 && (
        <>
          <div className="section-title">
            <h2>Do the two sources agree?</h2>
            <p>Each dot is one weather station, compared in two independent datasets.</p>
          </div>
          <Card
            title="Weather stations vs ERA5"
            subtitle={`Typical heaviest yearly rain · ${metric(replication?.agreement?.stations_compared, 0)} stations`}
            info="Points on the dashed line mean the two sources give the same number."
          >
            <div className="chart tall">
              <ResponsiveContainer>
                <ScatterChart margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={GRID} />
                  <XAxis dataKey="isd_mm" name="Station" type="number" unit=" mm" domain={[scatterMin, scatterMax]} {...axis} />
                  <YAxis dataKey="era5_mm" name="ERA5" type="number" unit=" mm" domain={[scatterMin, scatterMax]} width={56} {...axis} />
                  <ZAxis range={[56, 56]} />
                  <ReferenceLine
                    segment={[
                      { x: scatterMin, y: scatterMin },
                      { x: scatterMax, y: scatterMax },
                    ]}
                    stroke={AXIS}
                    strokeDasharray="4 4"
                  />
                  <Tooltip cursor={{ strokeDasharray: "3 3" }} content={<ChartTooltip fmt={(v) => `${v.toFixed(1)} mm`} />} />
                  <Scatter data={scatter} fill={SLATE} fillOpacity={0.85} stroke="#fff" isAnimationActive={false} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <p className="chart-note">
              The dots are scattered (correlation {metric(replication?.agreement?.annmax_pearson_r, 2)}), so the two
              sources don't match closely station by station. Both still show heavier rain in recent decades.
            </p>
          </Card>
        </>
      )}

      <div className="section-title">
        <h2>Other signals</h2>
        <p>Related trends in the same records.</p>
      </div>
      <div className="stat-grid three">
        <StatTile
          label="Heaviest yearly rain"
          icon={<TrendingUp size={16} />}
          value={slope}
          format={(v) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(1)} mm/decade`}
          sub={<Lines items={[chance, "Trend in each year's heaviest day of rain"]} />}
          detail={
            <ul className="pop-list">
              <li>The change per decade in the heaviest one-day rainfall of each year.</li>
              <li>
                The chance this is a fluke is about {p < 0.001 ? "less than 1 in 1,000" : `${(p * 100).toFixed(1)}%`} (p ={" "}
                {p.toLocaleString()}).
              </li>
              <li>
                {isKoshi
                  ? `Pooled across all ${metric(signal.stations_processed, 0)} stations in the wider region.`
                  : "From this region's climate series."}
              </li>
            </ul>
          }
        />
        {lakes.length > 0 && (
          <StatTile
            label="Glacial lake growth"
            tone="blue"
            icon={<Waves size={16} />}
            value={lakes[0].pct_growth}
            format={(v) => `+${v.toFixed(0)}%`}
            sub={
              <Lines
                items={[
                  `${lakes[0].name}, the biggest change`,
                  lakes.length > 1 ? lakes.slice(1).map((l) => `${l.name} +${metric(l.pct_growth, 0)}%`).join(" · ") : null,
                ]}
              />
            }
            detail={
              <ul className="pop-list">
                <li>How much each monitored glacial lake has grown.</li>
                <li>Growing glacial lakes are one route to sudden flood surges (glacial lake outburst floods).</li>
              </ul>
            }
          />
        )}
        {auc != null && (
          <StatTile
            label="Landslide rain model"
            tone="warn"
            icon={<Mountain size={16} />}
            value={auc}
            format={(v) => v.toFixed(2)}
            sub={<Lines items={["Score out of 1 · 0.5 is chance", `Tested on ${signal.landslide_trigger.n_events} past landslides`]} />}
            detail={
              <ul className="pop-list">
                <li>How well rainfall alone tells landslide days from other days, on events the model had not seen.</li>
                <li>{d.aucCopy}</li>
              </ul>
            }
          />
        )}
      </div>

      <section className="why no-date" aria-labelledby="rain-takeaway">
        <div className="why-body">
          <h2 id="rain-takeaway">What this means</h2>
          <p>{takeaway}</p>
        </div>
      </section>

      <Card>
        <Accordion title="Method and caveats">
          <Callout title="Read this as a comparison.">
            {signal.provenance?.headline_note || "The pooled fit is shown separately from the catchment headline."}
          </Callout>
          {signal.provenance?.method && <p className="muted-p">{signal.provenance.method}</p>}
          <p className="muted-p">
            {isKoshi
              ? `Based on ${n0(signal.station_years)} years of station records.`
              : `Based on ${n0(signal.station_years)} years of climate data.`}
          </p>
        </Accordion>
      </Card>
    </div>
  );
}
