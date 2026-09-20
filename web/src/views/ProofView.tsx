import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowRight, Crosshair, ShieldAlert, Target } from "lucide-react";
import { ChartTooltip, Legend } from "../charts";
import { useDash } from "../context";
import { metric, n0, risk } from "../format";
import MapPanel from "../MapPanel";
import type { OverlayMode } from "../types";
import { Accordion, Badge, Callout, Card, InfoPopover, Lines, Segmented, StatTile } from "../ui";

// Chart colours for the light theme.
const GREEN = "#1f5c4a";
const SLATE = "#3f5f80";
const BRONZE = "#9a6b1a";
const GRID = "rgba(23, 33, 43, 0.1)";
const AXIS = "#6b7580";
const axis = { stroke: AXIS, tick: { fill: AXIS, fontSize: 12 }, tickLine: false, axisLine: { stroke: GRID } } as const;

type EventRow = { year: string; tag: string; model: number; jrc: number | null };

/** Scorecard bars: our flood map next to a simple published water map, for each flood. */
function ScoreRows({ events }: { events: EventRow[] }) {
  const max = Math.max(0.001, ...events.flatMap((e) => [e.model, e.jrc ?? 0]));
  return (
    <div className="score-rows">
      {events.map((e) => (
        <div className="score-event" key={e.year}>
          <div className="score-event-head">
            <b>{e.year} flood</b>
            <span>{e.tag}</span>
          </div>
          <div className="wait-row">
            <em>Our flood map</em>
            <span className="wait-track">
              <i className="green" style={{ width: `${Math.max(3, (e.model / max) * 100)}%` }} />
            </span>
            <b>{e.model.toFixed(2)}</b>
          </div>
          {e.jrc != null && (
            <div className="wait-row">
              <em>Simple water map</em>
              <span className="wait-track">
                <i className="grey" style={{ width: `${Math.max(3, (e.jrc / max) * 100)}%` }} />
              </span>
              <b>{e.jrc.toFixed(2)}</b>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/** Controls for the map, in one bar above it. */
function ProofControls({ hasFlood }: { hasFlood: boolean }) {
  const d = useDash();
  return (
    <div className="map-key controls-bar">
      {hasFlood && (
        <>
          <div className="key-item">
            <span className="key-title">Flood</span>
            <Segmented<"2024" | "2017">
              label="Proof event"
              value={d.proofEvent}
              onChange={d.setProofEvent}
              options={[
                { value: "2024", label: "2024" },
                { value: "2017", label: "2017", disabled: !d.backtest?.validation },
              ]}
            />
          </div>
          <div className="key-item">
            <span className="key-title">Show</span>
            <Segmented<OverlayMode>
              label="Flood overlay"
              value={d.overlay}
              onChange={d.setOverlay}
              options={[
                { value: "none", label: "None" },
                { value: "observed", label: "Observed" },
                { value: "modeled", label: "Modeled" },
                { value: "both", label: "Both" },
              ]}
            />
          </div>
        </>
      )}
      <div className="key-item">
        <span className="key-title">Risk map</span>
        <Segmented<"before" | "with_plan">
          label="Risk scenario"
          value={d.riskView}
          onChange={d.setRiskView}
          options={[
            { value: "before", label: "Now" },
            { value: "with_plan", label: "With plan (simulated)" },
          ]}
        />
      </div>
    </div>
  );
}

function ProofKey({ hasFlood }: { hasFlood: boolean }) {
  return (
    <div className="map-key" role="group" aria-label="Map key">
      <div className="key-item">
        <span className="key-title">Risk to people</span>
        <span className="key-end">Lower</span>
        <span className="key-ramp" aria-hidden />
        <span className="key-end">Higher</span>
      </div>
      {hasFlood && (
        <>
          <span className="key-dot">
            <i className="obs" />
            Where it really flooded
          </span>
          <span className="key-dot">
            <i className="mod" />
            Where our map says it floods
          </span>
        </>
      )}
    </div>
  );
}

export default function ProofView() {
  const d = useDash();
  const { backtest, proofEvent, city } = d;

  if (!backtest) {
    return (
      <div className="view">
        <header className="data-hero">
          <span className="eyebrow">The proof</span>
          <h1>Checking the flood map…</h1>
        </header>
        <div className="skeleton" style={{ height: 320 }} />
      </div>
    );
  }

  const cal = backtest;
  const val = backtest.validation;
  const hasFlood = cal.critical_success_index != null;
  const y1 = cal.event_date?.slice(0, 4) || "first";
  const y2 = val?.event_date?.slice(0, 4) || "second";

  const scored: EventRow[] = [];
  if (cal.critical_success_index != null)
    scored.push({
      year: y1,
      tag: "Tuned on this flood",
      model: cal.critical_success_index,
      jrc: cal.baselines?.jrc_seasonal_water?.csi ?? null,
    });
  if (val?.critical_success_index != null)
    scored.push({
      year: y2,
      tag: "A flood it had never seen",
      model: val.critical_success_index,
      jrc: val.baselines?.jrc_seasonal_water?.csi ?? null,
    });
  const compared = scored.filter((e) => e.jrc != null);
  const allLower = compared.length > 0 && compared.every((e) => e.model < (e.jrc as number));
  const allBeat = compared.length > 0 && compared.every((e) => e.model > (e.jrc as number));

  // The selected flood drives the tiles, the baselines and the skill chart.
  const ev = proofEvent === "2017" && val ? val : cal;
  const evYear = ev.event_date?.slice(0, 4) || (proofEvent === "2017" ? y2 : y1);
  const modelCsi = ev.critical_success_index;
  const jrcCsi = ev.baselines?.jrc_seasonal_water?.csi;
  const elevCsi = ev.baselines?.area_matched_elevation?.csi;
  const beats = modelCsi != null && jrcCsi != null && modelCsi > jrcCsi;
  const skillRows = ev.skill_vs_scale || [];
  const firstCsi = skillRows.length ? skillRows[0].csi : undefined;
  const lastCsi = skillRows.length ? skillRows[skillRows.length - 1].csi : undefined;
  const cf = cal.counterfactual;
  const hasCf = cf?.people_exposed_baseline != null && cf.people_exposed_with_plan != null && cf.people_exposed_baseline > 0;

  const bars = [
    { label: "Our flood map", value: modelCsi, color: "var(--accent)" },
    { label: "Simple published water map", value: jrcCsi, color: "#b5bec8" },
    { label: "Ground height alone", value: elevCsi, color: "#b5bec8" },
  ].filter((bar): bar is { label: string; value: number; color: string } => bar.value != null);

  const csiDetail = (e: typeof cal | NonNullable<typeof val>) => (
    <ul className="pop-list">
      <li>
        The match score compares the flooded area our map flagged with the flooded area satellites saw, from 0 (no
        overlap) to 1 (perfect).
      </li>
      {e.observed_flood_km2 != null && e.modeled_flood_km2 != null && (
        <li>
          Satellites saw about {n0(e.observed_flood_km2)} km² flooded. Our map flagged about {n0(e.modeled_flood_km2)} km².
        </li>
      )}
      {e.hit_rate_pod != null && e.false_alarm_ratio != null && (
        <li>
          It caught {Math.round(e.hit_rate_pod * 100)}% of the flooded area, and {Math.round(e.false_alarm_ratio * 100)}%
          of what it flagged stayed dry.
        </li>
      )}
    </ul>
  );

  const takeaway = !hasFlood
    ? "There is no flood score for this region, and we don't invent one. The map here is a screening tool for where water tends to collect, not a validated flood model."
    : `The flood map is a rough guide to where flooding is likely, not a street-level prediction. It scored ${cal.critical_success_index?.toFixed(
        2
      )} out of 1 on the ${y1} flood it was tuned on${
        val?.critical_success_index != null
          ? `, and ${val.critical_success_index.toFixed(2)} on the ${y2} flood it had never seen`
          : ""
      }. ${
        allLower
          ? "A simple published water map scores higher on both, and we say so. "
          : allBeat
            ? "It beats a simple published water map on both. "
            : compared.length
              ? "It is ahead of a simple water map on some floods and behind on others. "
              : ""
      }Every site still needs a field check before anything is built.`;

  return (
    <div className="view">
      <section className="hero rain-hero">
        <div className="hero-copy">
          <span className="eyebrow">The proof</span>
          <h1>
            Does the flood map match what <em>actually flooded</em>?
          </h1>
          <p className="hero-lede">
            {hasFlood
              ? "We score our modeled flood area against satellite images of two real floods, and we say plainly which one the model was tuned on."
              : `There is no real flood to check ${city === "koshi" ? "" : "this region "}against yet, so no flood score is shown.`}
          </p>
        </div>

        {scored.length > 0 && (
          <div className="hero-stat" aria-label="How the flood map scored">
            <span className="eyebrow">How the flood map scored</span>
            <ScoreRows events={scored} />
            <small className="shift-note">
              Match score out of 1, higher is better.{" "}
              {allLower
                ? "A simple published water map scores higher on both floods, and we say so."
                : allBeat
                  ? "Ahead of a simple published water map on both floods."
                  : compared.length
                    ? "Ahead of a simple water map on some floods, behind on others."
                    : ""}
            </small>
          </div>
        )}
      </section>

      {hasFlood ? (
        <div className={`stat-grid ${val?.critical_success_index != null ? "" : "three"}`}>
          <StatTile
            label={`${y1} flood score`}
            icon={<Target size={16} />}
            value={cal.critical_success_index}
            format={(v) => v.toFixed(2)}
            sub={<Lines items={["Out of 1", "Tuned on this flood"]} />}
            detail={csiDetail(cal)}
          />
          {val?.critical_success_index != null && (
            <StatTile
              label={`${y2} flood score`}
              tone="blue"
              icon={<Target size={16} />}
              value={val.critical_success_index}
              format={(v) => v.toFixed(2)}
              sub={<Lines items={["Out of 1", "A flood the model had never seen"]} />}
              detail={
                <>
                  {csiDetail(val)}
                  {val.note && <p className="pop-note">{val.note}</p>}
                </>
              }
            />
          )}
          <StatTile
            label="Flooded area caught"
            icon={<Crosshair size={16} />}
            value={ev.hit_rate_pod != null ? ev.hit_rate_pod * 100 : null}
            format={(v) => `${v.toFixed(0)}%`}
            sub={<Lines items={["Of the area that really flooded", `${evYear} flood`]} />}
            detail={
              <ul className="pop-list">
                <li>Of all the area satellites saw underwater, the share our map also flagged.</li>
                <li>Use the flood switch above the map to see the other flood.</li>
              </ul>
            }
          />
          <StatTile
            label="False alarms"
            tone="warn"
            icon={<ShieldAlert size={16} />}
            value={ev.false_alarm_ratio != null ? ev.false_alarm_ratio * 100 : null}
            format={(v) => `${v.toFixed(0)}%`}
            sub={<Lines items={["Of the area we flagged that stayed dry", `${evYear} flood`]} />}
            detail={
              <ul className="pop-list">
                <li>Of all the area our map flagged as flooded, the share that satellites saw stay dry.</li>
                <li>A high number means the map over-warns. It is a rough guide, not a precise one.</li>
              </ul>
            }
          />
        </div>
      ) : (
        <Callout title="No flood score here.">
          The interface will not substitute a zero or invent a result. The map below shows modeled risk only.
        </Callout>
      )}

      <section className="map-section" aria-labelledby="proof-map-title">
        <header className="map-head">
          <h2 id="proof-map-title">{hasFlood ? "Compare the map with what flooded" : "The risk map"}</h2>
          <ProofControls hasFlood={hasFlood} />
          <ProofKey hasFlood={hasFlood} />
        </header>
        <div className="map-frame">
          <MapPanel proof height={560} plain />
        </div>
      </section>

      {hasFlood && (
        <>
          <div className="section-title">
            <h2>How it stacks up</h2>
            <p>
              Scores for the {evYear} flood
              {ev === cal ? ", which the model was tuned on" : ", which the model had never seen"}.
            </p>
          </div>
          <div className="grid-2">
            {bars.length > 1 && (
              <Card title="Against simple baselines" subtitle="Match score out of 1 · higher is better">
                <ul className="bars">
                  {bars.map((bar) => (
                    <li key={bar.label}>
                      <span>{bar.label}</span>
                      <div className="bar-track">
                        <i style={{ width: `${Math.max(1, bar.value * 100)}%`, background: bar.color }} />
                      </div>
                      <b>{bar.value.toFixed(2)}</b>
                    </li>
                  ))}
                </ul>
                {jrcCsi != null && (
                  <Callout tone={beats ? "accent" : "warn"}>
                    {beats
                      ? `Beats a simple published water map: ${metric(modelCsi, 2)} against ${metric(jrcCsi, 2)}.`
                      : `A simple published water map scores higher on this flood (${metric(jrcCsi, 2)} against our ${metric(
                          modelCsi,
                          2
                        )}). We report the miss.`}
                  </Callout>
                )}
              </Card>
            )}

            {skillRows.length > 0 && (
              <Card
                title="Score by square size"
                subtitle={`${evYear} flood`}
                info="How the match score, the share of flooded area caught and the false alarms change as our map is averaged into bigger squares."
              >
                <Legend
                  items={[
                    { color: GREEN, label: "Match score" },
                    { color: SLATE, label: "Flooded area caught" },
                    { color: BRONZE, label: "False alarms" },
                  ]}
                />
                <div className="chart">
                  <ResponsiveContainer>
                    <ComposedChart data={skillRows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke={GRID} />
                      <XAxis dataKey="approx_km" {...axis} tickFormatter={(v) => `${v} km`} />
                      <YAxis {...axis} domain={[0, 1]} width={36} />
                      <Tooltip content={<ChartTooltip title={(l) => `${l} km squares`} fmt={(v) => v.toFixed(2)} />} />
                      <Line type="monotone" dataKey="csi" name="Match score" stroke={GREEN} strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />
                      <Line type="monotone" dataKey="pod" name="Flooded area caught" stroke={SLATE} strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />
                      <Line type="monotone" dataKey="far" name="False alarms" stroke={BRONZE} strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                {firstCsi != null && lastCsi != null && (
                  <p className="chart-note">
                    The match score {lastCsi < firstCsi ? "falls" : "rises"} as the squares get bigger ({firstCsi.toFixed(2)} →{" "}
                    {lastCsi.toFixed(2)}).
                  </p>
                )}
              </Card>
            )}
          </div>
        </>
      )}

      {hasCf && (
        <>
          <div className="section-title">
            <h2>With and without the plan</h2>
            <p>What the recommended sites would change in a repeat of the {y1} flood.</p>
          </div>
          <Card
            title="Modeled exposure in a repeat flood"
            subtitle="Exposure units, not people counted one by one"
            action={<Badge tone="warn">Simulated counterfactual</Badge>}
          >
            <div className="counterfactual">
              <div>
                <span className="eyebrow">Without the plan</span>
                <b>{risk(cf?.people_exposed_baseline)}</b>
                <div className="bar-track">
                  <i style={{ width: "100%", background: "#b5bec8" }} />
                </div>
              </div>
              <ArrowRight size={22} className="cf-arrow" />
              <div>
                <span className="eyebrow">With the plan</span>
                <b>{risk(cf?.people_exposed_with_plan)}</b>
                <div className="bar-track">
                  <i
                    style={{
                      width: `${Math.max(
                        1,
                        ((cf?.people_exposed_with_plan as number) / ((cf?.people_exposed_baseline as number) || 1)) * 100
                      )}%`,
                      background: "var(--accent)",
                    }}
                  />
                </div>
              </div>
              <div className="cf-delta">
                <b>−{metric(cf?.reduction_pct)}%</b>
                <span>modeled</span>
              </div>
            </div>
            <p className="fine">
              A counterfactual, not an observed outcome and not unique lives saved. {cf?.note}
            </p>
          </Card>
        </>
      )}

      <section className="why no-date" aria-labelledby="proof-takeaway">
        <div className="why-body">
          <h2 id="proof-takeaway">What this means</h2>
          <p>{takeaway}</p>
        </div>
      </section>

      <Card>
        <Accordion title="Fine print on the proof">
          {cal.permanent_water_mask && <p className="muted-p">{cal.permanent_water_mask}</p>}
          {cal.spatial_holdout?.critical_success_index != null && (
            <p className="muted-p">
              {y1} spatial holdout (fit on the west, tested on the east): match score{" "}
              {metric(cal.spatial_holdout.critical_success_index, 2)}. The same storm split spatially, not a second event.
            </p>
          )}
          {cal.evaluation_domain && <p className="muted-p">{cal.evaluation_domain}</p>}
          <p className="muted-p">
            <InfoPopover title="Terms">
              Match score is CSI (critical success index). Flooded area caught is POD (probability of detection). False
              alarms is FAR (false alarm ratio).
            </InfoPopover>{" "}
            Technical names: CSI, POD and FAR.
          </p>
        </Accordion>
      </Card>
    </div>
  );
}
