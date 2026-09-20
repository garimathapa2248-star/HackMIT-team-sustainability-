import { useDash } from "./context";
import { longDate, metric, money, risk, sentence } from "./format";
import { Callout, Card } from "./ui";

const n0 = (v: number | null | undefined) => (v == null ? "—" : Math.round(v).toLocaleString());
const csi = (v: number | null | undefined) => (v == null ? "—" : v.toFixed(3));

/**
 * The confusion table behind CSI. A high false-alarm ratio reads as a failure until you see
 * that the model paints a far larger area than the radar did.
 */
export function Counts() {
  const { backtest } = useDash();
  const c = backtest?.counts;
  if (!c) return null;
  const total = c.tp + c.fp + c.fn + c.tn;
  const rows = [
    { label: "Caught", value: c.tp, tone: "#1f5c4a", hint: "flooded, and we said so" },
    { label: "False alarm", value: c.fp, tone: "#9a6b1a", hint: "we said flooded, radar disagreed" },
    { label: "Missed", value: c.fn, tone: "#8a939c", hint: "flooded, and we missed it" },
  ];
  return (
    <Card
      title="Why the false-alarm number is so high"
      subtitle="Every square in the evaluation area, sorted into four buckets."
    >
      <ul className="bars">
        {rows.map((row) => (
          <li key={row.label}>
            <span>
              {row.label}
              <small> · {row.hint}</small>
            </span>
            <div className="bar-track">
              <i
                style={{
                  width: `${(row.value / Math.max(c.tp, c.fp, c.fn)) * 100}%`,
                  background: row.tone,
                }}
              />
            </div>
            <b>{n0(row.value)}</b>
          </li>
        ))}
      </ul>
      <p className="chart-note">
        {n0(c.tn)} squares were dry and we agreed — {metric((c.tn / total) * 100, 1)}% of the area.
        Our map called about {metric(c.fp / Math.max(1, c.tp), 0)} times more land flooded than the
        radar found, which is what drives the false-alarm ratio. A screening map that over-paints is
        safer than one that under-paints, but it is not precise.
      </p>
    </Card>
  );
}

/**
 * The reverse-direction test: fit on 2017, freeze, predict 2024. This is the honest
 * counterpart to the headline, which was fitted on the flood it scores.
 */
export function CrossValidation() {
  const { backtest } = useDash();
  const cv = backtest?.cross_validation;
  if (cv?.calibrate_2017_test_2024_csi == null) return null;
  const outOf = cv.calibrate_2017_test_2024_csi;
  const inSample = cv.calibrate_2017_insample_csi;
  const drop = inSample != null ? ((inSample - outOf) / inSample) * 100 : null;
  return (
    <Card
      title="The hardest test we ran on ourselves"
      subtitle="Fit the model on the 2017 flood, freeze it, then predict a flood it had never seen."
    >
      <div className="claim-grid">
        <div className="claim control">
          <span className="eyebrow">Scoring the flood it was fitted on</span>
          <b>{csi(inSample)}</b>
          <small>2017, in-sample — flattering by construction.</small>
        </div>
        <div className="claim">
          <span className="eyebrow">Scoring a flood it had never seen</span>
          <b>{csi(outOf)}</b>
          <small>2024, frozen settings — the number that actually counts.</small>
        </div>
      </div>
      <Callout title={drop == null ? "Out-of-sample is worse." : `The score falls by ${metric(drop, 0)}%.`}>
        {sentence(cv.note)}. We publish this because a model only tested on its own calibration flood tells you
        very little. This is a screening layer for ranking places, not a flood forecast.
      </Callout>
    </Card>
  );
}

/** The two real radar scenes and the climate projection the plan is stressed against. */
export function ScenarioLedger() {
  const { scenarios, isKoshi } = useDash();
  if (!isKoshi || !scenarios) return null;
  const events = scenarios.events || [];
  const projections = scenarios.projections || [];
  const compare = scenarios.compare || [];
  if (!events.length && !projections.length) return null;

  return (
    <Card
      title="What was actually tested"
      subtitle="The real satellite scenes and the climate assumptions behind every number on this page."
    >
      <dl className="facts">
        {events.map((event) => (
          <div key={event.name}>
            <dt>
              {event.kind === "transfer" ? "Transfer event" : "Calibration event"}
              {event.date ? ` · ${longDate(event.date)}` : ""}
            </dt>
            <dd>
              {event.source}
              {event.kind === "transfer" && (
                <>
                  {" "}
                  <b>A different river reach</b> — the model was not re-tuned for it.
                </>
              )}
            </dd>
          </div>
        ))}
        {projections.map((projection) => (
          <div key={projection.name}>
            <dt>
              Climate assumption ·{" "}
              {projection.name === "current" ? "as observed" : "harsher tail"}
            </dt>
            <dd>{projection.description}</dd>
          </div>
        ))}
      </dl>

      {compare.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Strategy</th>
                <th>Climate</th>
                <th>Annual people-risk</th>
              </tr>
            </thead>
            <tbody>
              {compare.map((row, i) => (
                <tr key={`${row.strategy}-${row.projection}-${i}`}>
                  <td>{row.strategy === "no_measures" ? "Do nothing" : "With the $2M plan"}</td>
                  <td>{row.projection === "current" ? "As today" : "Harsher tail"}</td>
                  <td className="num">{risk(row.people_risk_eal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {scenarios.kernel === "not_sfincs" && (
        <p className="fine">
          These names follow the FloodAdapt convention, but the numbers are ours: a height-above-
          nearest-drainage screening proxy, not a hydrodynamic flood engine.
          {scenarios.provenance?.method ? ` ${scenarios.provenance.method}` : ""}
        </p>
      )}
    </Card>
  );
}

/** Strategy roster from the scenario pack — how many sites each option buys. */
export function Strategies() {
  const { scenarios, isKoshi } = useDash();
  const rows = scenarios?.strategies?.filter((s) => s.n_selected != null) || [];
  if (!isKoshi || rows.length < 2) return null;
  return (
    <Card title="Options that were compared" subtitle="Each is a real solve, not a label.">
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Option</th>
              <th>Sites</th>
              <th>Cost</th>
              <th>Risk cut / yr</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name}>
                <td>{row.description || row.name}</td>
                <td className="num">{row.n_selected}</td>
                <td className="num">{row.cost_usd == null ? "—" : money(row.cost_usd)}</td>
                <td className="num">
                  {row.people_protected == null ? "—" : risk(row.people_protected)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
