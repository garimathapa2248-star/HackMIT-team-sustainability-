import { AlertTriangle, Droplets, Mountain, Waves } from "lucide-react";
import { typeLabel } from "./colors";
import { useDash } from "./context";
import { everyYears, metric, plainYears, sentence } from "./format";
import { Accordion, Badge, Callout, Card } from "./ui";

const HAZARD_ICON: Record<string, React.ReactNode> = {
  flood: <Waves size={15} />,
  landslide: <Mountain size={15} />,
  glof: <Droplets size={15} />,
};
const HAZARD_NAME: Record<string, string> = {
  flood: "River flood",
  landslide: "Landslide",
  glof: "Glacial-lake flood",
};
const LEVEL_TONE: Record<string, "warn" | "blue" | "neutral"> = {
  high: "warn",
  medium: "blue",
  low: "neutral",
  data_deficient: "neutral",
};
const LEVEL_TEXT: Record<string, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
  data_deficient: "Not enough data",
};

/** Which hazards this region actually faces, with the evidence line for each. */
export function HazardClasses() {
  const { signal, rankings, isKoshi } = useDash();
  if (!isKoshi) return null;
  const classes = signal?.hazard_classes as
    | Record<string, { level?: string; evidence?: string } | string | undefined>
    | undefined;
  // rankings carries the cleanest per-hazard evidence strings for this region.
  const home = rankings?.places?.[0];
  const levels = home?.classes;
  const evidence = home?.class_evidence;
  const keys = ["flood", "landslide", "glof"].filter(
    (k) => levels?.[k as keyof typeof levels] || classes?.[k]
  );
  if (!keys.length) return null;

  return (
    <Card
      title="What this region is exposed to"
      subtitle="Three hazards, each graded from a different piece of evidence."
    >
      <div className="hazard-grid">
        {keys.map((key) => {
          const level = String(levels?.[key as keyof typeof levels] || "");
          const why = evidence?.[key as keyof typeof evidence];
          return (
            <div className="hazard-card" key={key}>
              <header>
                <span className="hazard-icon">{HAZARD_ICON[key]}</span>
                <b>{HAZARD_NAME[key] || key}</b>
                {level && <Badge tone={LEVEL_TONE[level] || "neutral"}>{LEVEL_TEXT[level] || level}</Badge>}
              </header>
              {why && <p>{why}</p>}
            </div>
          );
        })}
      </div>
      {(signal?.hazard_classes as { not?: string })?.not && (
        <p className="fine">
          Graded from this project&rsquo;s own fits, not from{" "}
          {(signal?.hazard_classes as { not?: string }).not}.
        </p>
      )}
    </Card>
  );
}

/** The country table: a ranking of the rainfall tail, and nothing else. */
export function Rankings() {
  const { rankings, isKoshi } = useDash();
  if (!isKoshi || !rankings?.places?.length) return null;
  const control = rankings.control;
  return (
    <Card
      title="Where else the same pattern shows up"
      subtitle="Ranked by how much the rainfall tail moved — not by how prepared or how poor a country is."
    >
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Country</th>
              <th>Stations</th>
              <th>A once-a-century downpour now</th>
              <th>Flood</th>
              <th>Landslide</th>
              <th>Glacial lake</th>
            </tr>
          </thead>
          <tbody>
            {rankings.places.map((place) => (
              <tr key={place.id}>
                <td>
                  <b>{place.name}</b>
                  {place.fit === "pooled_nepal_adjacent" && <small>pooled fit</small>}
                </td>
                <td className="num">{place.stations ?? "—"}</td>
                <td className="num">
                  {place.new_return_period_yrs == null
                    ? "—"
                    : `${everyYears(place.new_return_period_yrs)}`}
                </td>
                {(["flood", "landslide", "glof"] as const).map((key) => {
                  const level = place.classes?.[key];
                  return (
                    <td key={key}>
                      {level ? (
                        <Badge tone={LEVEL_TONE[level] || "neutral"}>
                          {LEVEL_TEXT[level] || level}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Callout title="This is a ranking of rainfall, not of countries.">
        Nepal sits at the top because the daily-rainfall tail moved most in this station box.
        {control?.note ? ` ${sentence(control.note)}` : ""}{" "}
        {rankings.places.some((p) => p.fit === "pooled_nepal_adjacent") &&
          "Countries marked “pooled fit” share Nepal's regional curve rather than having their own — their station counts are too small for a separate one."}
      </Callout>
      {rankings.provenance?.not && (
        <p className="fine">This table is not {rankings.provenance.not}.</p>
      )}
    </Card>
  );
}

/** A second statistical method on the same records, reported as a cross-check. */
export function CrossCheck() {
  const { signal, isKoshi } = useDash();
  const pot = signal?.pot_gpd;
  const imerg = signal?.imerg;
  if (!isKoshi || (!pot && !imerg)) return null;
  const headline = signal?.headline?.new_return_period_yrs;
  return (
    <Card
      title="Checking the maths a second way"
      subtitle="A different statistical method on the same rainfall records."
    >
      {pot && (
        <dl className="facts tight">
          <div>
            <dt>Method</dt>
            <dd>
              Instead of taking one wettest day per year, this takes every day above{" "}
              {metric(pot.threshold_mm, 0)} mm — {pot.n_excesses?.toLocaleString()} of them across{" "}
              {pot.n_years} years — and fits the tail to those.
            </dd>
          </div>
          {pot.return_levels_mm && (
            <div>
              <dt>What a rare downpour looks like</dt>
              <dd>
                A 1-in-100-year day comes out at {metric(pot.return_levels_mm["100"], 0)} mm here,
                against {metric(signal?.return_levels_mm?.["100"], 0)} mm from the headline method.
              </dd>
            </div>
          )}
          <div>
            <dt>What it does not do</dt>
            <dd>
              This is a sanity check on the shape of the tail, not a second opinion on the{" "}
              {headline == null ? "headline" : `${plainYears(headline)}-year`} figure. The two use
              different samples and are not interchangeable.
            </dd>
          </div>
        </dl>
      )}
      {imerg?.available === false && (
        <Callout title="Satellite rainfall was not used.">
          {sentence(imerg.reason)}. Everything here comes from ground stations
          {signal?.station_years ? ` — ${signal.station_years.toLocaleString()} station-years of them` : ""}.
        </Callout>
      )}
    </Card>
  );
}

/** What the signal implies for planners, in the engine's own words. */
export function Recommendations() {
  const { signal, isKoshi, go } = useDash();
  const rows = signal?.recommendations;
  if (!isKoshi || !rows?.length) return null;
  return (
    <Card
      title="What this means for what gets built"
      subtitle="Written for planners by the same pipeline that produced the numbers above."
    >
      <div className="rec-list">
        {rows.map((rec) => (
          <div className="rec" key={rec.hazard}>
            <header>
              <span className="hazard-icon">{HAZARD_ICON[rec.hazard] || <AlertTriangle size={15} />}</span>
              <b>{HAZARD_NAME[rec.hazard] || rec.hazard}</b>
              {rec.level && (
                <Badge tone={LEVEL_TONE[rec.level] || "neutral"}>
                  {LEVEL_TEXT[rec.level] || rec.level}
                </Badge>
              )}
            </header>
            {rec.technical && <p>{sentence(rec.technical)}</p>}
            {rec.linked_measure_types?.length && (
              <div className="chips">
                {rec.linked_measure_types.map((type) => (
                  <button key={type} type="button" onClick={() => go("plan")}>
                    {typeLabel(type)}
                  </button>
                ))}
              </div>
            )}
            {rec.climate_change && (
              <Accordion title="How the changing climate factors in">
                <p className="muted-p">{sentence(rec.climate_change)}</p>
                {rec.source && <p className="fine">{rec.source}</p>}
              </Accordion>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
