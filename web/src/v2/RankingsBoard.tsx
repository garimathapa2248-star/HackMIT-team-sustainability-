import type { RankedPlace, RankingsPayload } from "./liveApi";

export const METRICS = [
  { id: "composite", label: "Composite" },
  { id: "air", label: "Air" },
  { id: "heat", label: "Heat" },
  { id: "flood", label: "Flood" },
  { id: "storm", label: "Storm" },
  { id: "seismic", label: "Seismic" },
  { id: "wildfire", label: "Fire" },
  { id: "drought", label: "Drought" },
] as const;

type Props = {
  payload: RankingsPayload | null;
  metric: string;
  loading: boolean;
  error: string | null;
  selectedId?: string | null;
  onMetric: (metric: string) => void;
  onSelect: (place: RankedPlace) => void;
  onRefresh: () => void;
};

export default function RankingsBoard({
  payload,
  metric,
  loading,
  error,
  selectedId,
  onMetric,
  onSelect,
  onRefresh,
}: Props) {
  const rows = payload?.places || [];
  return (
    <div className="v2-ranks">
      <div className="v2-brief-head">
        <div>
          <p className="v2-kicker">Live ranking</p>
          <h2>Worse signals, higher rank</h2>
        </div>
        <button className="v2-ghost" onClick={onRefresh} disabled={loading}>
          {loading ? "Updating…" : "Refresh"}
        </button>
      </div>
      <p className="v2-lede">
        Seed cities are geographic probes only. Every score is fetched now from Open-Meteo, CAMS air quality,
        GloFAS, USGS, and NASA EONET — not a frozen table.
      </p>
      <div className="v2-metrics">
        {METRICS.map((row) => (
          <button key={row.id} className={metric === row.id ? "on" : ""} onClick={() => onMetric(row.id)}>
            {row.label}
          </button>
        ))}
      </div>
      {error && <p className="v2-note warn">{error}</p>}
      {loading && !rows.length && <p className="v2-muted">Fetching live city scores… first load hits public APIs.</p>}
      <div className="v2-table-wrap">
        <table className="v2-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Place</th>
              <th>Score</th>
              <th>Top risk</th>
              <th>AQI</th>
              <th>°C</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className={selectedId === row.id ? "on" : ""}
                onClick={() => onSelect(row)}
              >
                <td>{row.rank}</td>
                <td>
                  <b>{row.name}</b>
                  <small>
                    {row.country}
                    {row.degraded ? " · partial" : ""}
                  </small>
                </td>
                <td>{row.metric_score.toFixed(0)}</td>
                <td>{row.top_hazard?.label || "—"}</td>
                <td>{row.conditions?.us_aqi != null ? Number(row.conditions.us_aqi).toFixed(0) : "—"}</td>
                <td>
                  {row.conditions?.apparent_c != null
                    ? Number(row.conditions.apparent_c).toFixed(0)
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {payload?.updated_at && (
        <p className="v2-stamp">
          Last updated {new Date(payload.updated_at).toLocaleString()} · {payload.count} cities
        </p>
      )}
      {payload?.method && <p className="v2-muted">{payload.method}</p>}
      <ul className="v2-sources">
        {(payload?.sources || []).map((source) => (
          <li key={source.id} className="ok">
            {source.id}
            {source.note ? ` · ${source.note}` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
