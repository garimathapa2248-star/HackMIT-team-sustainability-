import type { LivePlaceBrief } from "./liveApi";

function fmt(value: unknown, digits = 0, suffix = "") {
  if (value == null || value === "") return "—";
  const n = Number(value);
  if (Number.isFinite(n)) return `${n.toLocaleString(undefined, { maximumFractionDigits: digits })}${suffix}`;
  return String(value);
}

function sevClass(level?: string) {
  const key = (level || "info").toLowerCase();
  if (key === "emergency") return "emergency";
  if (key === "warning") return "warning";
  if (key === "advisory") return "advisory";
  if (key === "watch") return "watch";
  return "info";
}

type Props = {
  brief: LivePlaceBrief | null;
  loading: boolean;
  error: string | null;
  pinned: boolean;
  onUnpin: () => void;
};

export default function LiveBrief({ brief, loading, error, pinned, onUnpin }: Props) {
  if (error && !brief) {
    return (
      <div className="v2-brief">
        <p className="v2-note warn">{error}</p>
        <p className="v2-muted">Start the API with <code>python3 -m api.main</code> then hover again.</p>
      </div>
    );
  }
  if (!brief && loading) {
    return (
      <div className="v2-brief">
        <p className="v2-kicker">Live brief</p>
        <h2>Reading live feeds…</h2>
        <p className="v2-muted">Open-Meteo, air quality, USGS, NASA EONET, OpenStreetMap.</p>
      </div>
    );
  }
  if (!brief) {
    return (
      <div className="v2-brief">
        <p className="v2-kicker">Anywhere on Earth</p>
        <h2>Hover the map.</h2>
        <p className="v2-lede">
          Every cell pulls live weather, air, flood, seismic, and fire signals, then ranks preventive measures
          with WHO, CDC, NOAA, EPA, FEMA, and USGS citations.
        </p>
        <p className="v2-muted">On a phone, tap instead of hover. Click to pin a place.</p>
      </div>
    );
  }

  const cond = brief.conditions || {};
  const place = brief.place?.display || `${brief.lat.toFixed(2)}°, ${brief.lng.toFixed(2)}°`;

  return (
    <div className="v2-brief">
      <div className="v2-brief-head">
        <div>
          <p className="v2-kicker">{pinned ? "Pinned" : "Hover"} · live internet</p>
          <h2>{place}</h2>
          <p className="v2-coords">
            {brief.lat.toFixed(3)}°, {brief.lng.toFixed(3)}°
            {brief.place?.kind ? ` · ${brief.place.kind}` : ""}
          </p>
        </div>
        {pinned && (
          <button className="v2-ghost" onClick={onUnpin}>
            Unpin
          </button>
        )}
      </div>

      {loading && <p className="v2-muted">Refreshing this cell…</p>}
      {brief.degraded && brief.note && <p className="v2-note warn">{brief.note}</p>}
      {error && <p className="v2-note warn">{error}</p>}

      <div className="v2-stats">
        <div>
          <b>{fmt(cond.apparent_c ?? cond.temperature_c, 1, "°C")}</b>
          <span>apparent</span>
        </div>
        <div>
          <b>{fmt(cond.us_aqi, 0)}</b>
          <span>US AQI</span>
        </div>
        <div>
          <b>{fmt(brief.composite, 0)}</b>
          <span>composite</span>
        </div>
        <div>
          <b>{fmt(cond.precip_24h_mm, 1, " mm")}</b>
          <span>24 h rain</span>
        </div>
      </div>

      <p className="v2-wx">
        {String(cond.weather_text || "Conditions")}
        {cond.pm25 != null ? ` · PM2.5 ${fmt(cond.pm25, 1)} µg/m³` : ""}
        {cond.gust_kmh != null ? ` · gusts ${fmt(cond.gust_kmh, 0)} km/h` : ""}
      </p>

      <h3>Live risks</h3>
      <ul className="v2-risks">
        {(brief.risks || []).slice(0, 6).map((risk) => (
          <li key={risk.id}>
            <div className="v2-risk-top">
              <span>{risk.label}</span>
              <em className={sevClass(risk.level)}>{risk.level}</em>
            </div>
            <div className="v2-bar">
              <i style={{ width: `${Math.max(4, Math.min(100, risk.score))}%` }} />
            </div>
            <small>{risk.summary}</small>
          </li>
        ))}
      </ul>

      <h3>Preventive measures</h3>
      <ol className="v2-measures">
        {(brief.measures || []).map((measure) => (
          <li key={measure.id}>
            <div className="v2-measure-top">
              <em className={sevClass(measure.severity)}>{measure.severity}</em>
              <span>{measure.hazard}</span>
            </div>
            <strong>{measure.action}</strong>
            <p>{measure.why_here_now}</p>
            <a href={measure.citation.url} target="_blank" rel="noreferrer">
              {measure.citation.agency} — {measure.citation.title}
            </a>
            <small>{measure.citation.guidance}</small>
          </li>
        ))}
      </ol>

      {(brief.events?.quakes?.length || brief.events?.eonet?.length) ? (
        <div className="v2-events">
          {(brief.events?.quakes || []).slice(0, 3).map((quake, index) => (
            <span key={`q${index}`}>
              USGS M{fmt(quake.mag, 1)} · {fmt(quake.distance_km, 0)} km
            </span>
          ))}
          {(brief.events?.eonet || []).slice(0, 2).map((event, index) => (
            <span key={`e${index}`}>{event.title}</span>
          ))}
        </div>
      ) : null}

      <p className="v2-stamp">
        Updated {brief.queried_at ? new Date(brief.queried_at).toLocaleString() : "just now"} · cell {brief.cell}
      </p>
      <ul className="v2-sources">
        {(brief.sources || []).map((source) => (
          <li key={source.id} className={source.ok === false ? "bad" : "ok"}>
            {source.id}
            {source.ok === false && source.error ? ` · ${source.error}` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
