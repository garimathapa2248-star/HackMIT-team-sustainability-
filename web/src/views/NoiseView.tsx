import { Ban, CalendarX2, CloudRain, Copy, Database, Droplets, Layers, ShieldCheck, Sigma, Waves } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltip } from "../charts";
import { useDash } from "../context";
import { longDate, n0 } from "../format";
import { Accordion, Callout, Card, Lines, StatTile } from "../ui";
import StationMap from "../StationMap";

// Chart colours for the light theme (the shared dark-theme palette is too pale on white).
const GREEN = "#1f5c4a";
const GRID = "rgba(23, 33, 43, 0.1)";
const AXIS = "#6b7580";
const axis = { stroke: AXIS, tick: { fill: AXIS, fontSize: 12 }, tickLine: false, axisLine: { stroke: GRID } } as const;

const STEP_ICONS = [Ban, Layers, ShieldCheck, Copy];

const decadeLabel = (decade: string) => (decade.endsWith("s") ? decade : `${decade}s`);

/** Plain one-line summaries for the known cleaning steps; the data's own (technical) text stays under "More detail". */
function plainLine(step: string): string | null {
  if (/sentinel|9999/i.test(step)) return "Missing readings are logged as 9999. We drop them instead of counting them as 0 mm of rain.";
  if (/accumulation|window/i.test(step)) return "Rain is logged over different time windows. We convert them all to daily totals so they can be compared.";
  if (/quality/i.test(step)) return "Readings the archive flags as wrong or suspect are removed before any statistics are calculated.";
  if (/duplicate/i.test(step)) return "If a station reports the same day more than once, we keep a single daily maximum.";
  return null;
}

/** First sentence of a longer explanation, and the rest. */
function splitSentence(text: string) {
  const match = text.match(/^.*?[.!?](\s|$)/);
  const first = match ? match[0].trim() : text;
  return { first, rest: text.slice(first.length).trim() };
}

export default function NoiseView() {
  const { noise: n, city, cityName } = useDash();

  const sub = n?.reproducible_subset;
  const dist = n?.distribution;
  const decades = sub
    ? Object.entries(sub.station_years_by_decade).map(([decade, count]) => ({ decade, count }))
    : [];
  const best = decades.length ? decades.reduce((top, item) => (item.count > top.count ? item : top)) : null;
  const avgYears = n ? n.scale.station_years / Math.max(1, n.scale.stations_processed) : null;
  const heaviestDate = dist ? longDate(dist.max_daily_at.date) : null;

  return (
    <div className="view">
      <header className="data-hero">
        <span className="eyebrow">The data</span>
        <h1>
          Decades of <em>patchy</em> weather records, <em>cleaned</em> before we fit anything
        </h1>
        <p>
          The archive has gaps. We count the missing years instead of filling them in, so every later number rests
          on data that exists.
        </p>
      </header>

      {city !== "koshi" && (
        <Callout tone="accent" title="Heads up.">
          This page shows the Himalayan weather-station archive behind the Koshi finding. {cityName} uses a single
          ERA5-Land climate series instead.
        </Callout>
      )}

      <div className="stat-grid">
        <StatTile
          label="Weather stations"
          icon={<Database size={16} />}
          value={n?.scale.stations_processed}
          format={n0}
          loading={!n}
          sub={
            n && sub ? (
              <Lines items={["Across the Himalayan region", `${sub.stations} used for the Nepal finding`]} />
            ) : undefined
          }
          detail={
            n &&
            sub && (
              <ul className="pop-list">
                <li>We read {n0(n.scale.stations_processed)} weather stations from NOAA's global hourly weather archive.</li>
                <li>The Nepal finding uses the {sub.stations} stations nearest to Nepal.</li>
              </ul>
            )
          }
        />
        <StatTile
          label="Years of records"
          tone="blue"
          icon={<Sigma size={16} />}
          value={n?.scale.station_years}
          format={n0}
          loading={!n}
          sub={
            n && avgYears != null ? (
              <Lines items={["Added up across every station", `About ${Math.round(avgYears)} years per station`]} />
            ) : undefined
          }
          detail={
            n &&
            avgYears != null && (
              <ul className="pop-list">
                <li>A "station-year" is one weather station reporting for one year. We add them all up.</li>
                <li>
                  {n0(n.scale.stations_processed)} stations averaging about {Math.round(avgYears)} years each comes to{" "}
                  {n0(n.scale.station_years)} in total.
                </li>
              </ul>
            )
          }
        />
        <StatTile
          label="Years missing"
          tone="warn"
          icon={<CalendarX2 size={16} />}
          value={sub?.station_years_no_record_pct}
          format={(v) => `${v.toFixed(0)}%`}
          loading={!n}
          sub={<Lines items={["Of the years we asked for near Nepal", "Counted and left out, never filled in"]} />}
          detail={
            sub && (
              <ul className="pop-list">
                <li>
                  {n0(sub.station_years_no_record)} of the {n0(sub.station_years_requested)} years we asked for in the
                  Nepal subset simply don't exist in the archive.
                </li>
                <li>We leave them out and count them. We never fill them in with guesses.</li>
              </ul>
            )
          }
        />
        <StatTile
          label="Clean daily readings"
          icon={<CloudRain size={16} />}
          value={sub?.station_days_clean}
          format={n0}
          loading={!n}
          sub={sub ? <Lines items={["After cleaning, near Nepal", `${sub.year_range[0]}–${sub.year_range[1]}`]} /> : undefined}
          detail={
            sub && (
              <ul className="pop-list">
                <li>One reading is one weather station on one day.</li>
                <li>
                  {n0(sub.station_days_clean)} readings survived cleaning in the Nepal subset, from {sub.year_range[0]} to{" "}
                  {sub.year_range[1]}.
                </li>
              </ul>
            )
          }
        />
      </div>

      <div className="section-title">
        <h2>Where the records come from</h2>
        <p>
          Every dot is a real weather station in the NOAA archive, at its actual coordinates. These
          are the Nepal-adjacent stations the rainfall finding is fitted to.
        </p>
      </div>
      <div className="map-frame">
        <StationMap />
      </div>

      <div className="section-title">
        <h2>What&rsquo;s in the archive</h2>
        <p>Records are uneven across the decades. The gaps are the noise we have to work around.</p>
      </div>
      <Card
        title="Records kept, by decade"
        subtitle={sub ? `Years of station records kept near Nepal, ${sub.year_range[0]}–${sub.year_range[1]}` : undefined}
      >
        <div className="chart tall">
          <ResponsiveContainer>
            <BarChart data={decades} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="decade" {...axis} tickFormatter={(v) => decadeLabel(String(v))} />
              <YAxis {...axis} tickFormatter={(v) => n0(v)} width={44} />
              <Tooltip
                cursor={{ fill: "rgba(31, 92, 74, 0.06)" }}
                content={<ChartTooltip title={(l) => decadeLabel(String(l))} fmt={(v) => `${n0(v)} years of station records`} />}
              />
              <Bar dataKey="count" name="Kept" radius={[6, 6, 0, 0]} maxBarSize={56} isAnimationActive={false}>
                {decades.map((item) => (
                  <Cell key={item.decade} fill={GREEN} fillOpacity={best && item.decade === best.decade ? 1 : 0.55} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {best && (
          <p className="chart-note">
            The {decadeLabel(best.decade)} are the best covered, with {n0(best.count)} years of station records.
          </p>
        )}
      </Card>

      <div className="section-title">
        <h2>How we cleaned it</h2>
        <p>Four checks, applied in this order, before any number on this site was calculated.</p>
      </div>
      <ol className="journey">
        {(n?.cleaning || []).map((c, index) => {
          const Icon = STEP_ICONS[index % STEP_ICONS.length];
          const plain = plainLine(c.step);
          const { first, rest } = plain ? { first: plain, rest: c.detail } : splitSentence(c.detail);
          return (
            <li className="jstep-wrap" key={c.step}>
              <span className="jnode">{index + 1}</span>
              <div className="jstep static">
                <span className="jviz icon" aria-hidden>
                  <Icon size={28} strokeWidth={1.5} />
                </span>
                <b>{c.step}</b>
                <p>{first}</p>
                {rest && (
                  <details className="more">
                    <summary>More detail</summary>
                    <p>{rest}</p>
                  </details>
                )}
              </div>
            </li>
          );
        })}
        {!n && <li className="skeleton" style={{ height: 220, gridColumn: "1 / -1" }} />}
      </ol>

      <div className="section-title">
        <h2>What the rainfall looks like</h2>
        <p>Most days are dry. The days that matter for flood planning are rare.</p>
      </div>
      <div className="stat-grid">
        <StatTile
          label="Dry days"
          tone="blue"
          icon={<Droplets size={16} />}
          value={dist ? dist.dry_day_frac * 100 : null}
          format={(v) => `${v.toFixed(0)}%`}
          loading={!n}
          sub={<Lines items={["Of daily readings", "had no rain at all"]} />}
        />
        <StatTile
          label="Very wet days"
          icon={<CloudRain size={16} />}
          value={dist?.days_ge_50mm}
          format={n0}
          loading={!n}
          sub={<Lines items={["Days with at least 50 mm", "of rain in a single day"]} />}
        />
        <StatTile
          label="Extreme days"
          tone="warn"
          icon={<CloudRain size={16} />}
          value={dist?.days_ge_100mm}
          format={n0}
          loading={!n}
          sub={<Lines items={["Days with at least 100 mm", "of rain in a single day"]} />}
        />
        <StatTile
          label="Heaviest day on record"
          icon={<Waves size={16} />}
          value={dist?.max_daily_mm}
          format={(v) => `${v.toFixed(0)} mm`}
          loading={!n}
          sub={
            heaviestDate ? <Lines items={[`Recorded on ${heaviestDate}`, "At one station in the archive"]} /> : undefined
          }
        />
      </div>

      {n && sub && dist && (
        <section className="why no-date" aria-labelledby="data-takeaway">
          <div className="why-body">
            <h2 id="data-takeaway">What this means</h2>
            <p>
              {Math.round(dist.dry_day_frac * 100)}% of daily readings had no rain, and{" "}
              {Math.round(sub.station_years_no_record_pct)}% of the years we asked for don't exist in the archive. So the
              rainfall model is fitted to the heaviest days that survive cleaning, not to the noise.
            </p>
          </div>
        </section>
      )}

      {n && (
        <Card>
          <Accordion title="About this dataset">
            <p className="muted-p">
              <b>{n.scale.source}</b>, read on {n.scale.compute}. Of {n0(sub?.station_years_requested ?? 0)} station-years
              requested for the reproducible Nepal-adjacent subset, {n0(sub?.station_years_no_record ?? 0)} simply don't
              exist in the archive.
            </p>
            {sub?.note && <p className="muted-p">{sub.note}</p>}
          </Accordion>
        </Card>
      )}
    </div>
  );
}
