import { useEffect, useState } from "react";
import { loadJson } from "./api";

type Noise = {
  scale: { stations_processed: number; station_years: number; compute: string; source: string };
  reproducible_subset: {
    note: string;
    stations: number;
    station_years_requested: number;
    station_years_no_record: number;
    station_years_no_record_pct: number;
    station_days_clean: number;
    year_range: [number, number];
    station_years_by_decade: Record<string, number>;
  };
  cleaning: { step: string; detail: string }[];
  distribution: {
    dry_day_frac: number;
    wet_day_frac: number;
    days_ge_50mm: number;
    days_ge_100mm: number;
    max_daily_mm: number;
    max_daily_at: { station: string; date: string };
  };
  punchline: string;
};

const n0 = (x: number) => Math.round(x).toLocaleString();

/**
 * Voloridge "signal in the noise" card. Drop-in:
 *   import NoisePanel from "./NoisePanel";
 *   {tab === "noise" && <NoisePanel />}
 * Reuses existing CSS classes (.kpis/.kpi/.detail/.banner/.mix/.mix-row); no index.css changes required.
 */
export default function NoisePanel() {
  const [n, setN] = useState<Noise | null>(null);
  useEffect(() => {
    loadJson("noise").then(setN).catch(() => setN(null));
  }, []);
  if (!n) return <p className="detail">Loading NOAA ISD parse…</p>;

  const dec = n.reproducible_subset.station_years_by_decade;
  const maxDec = Math.max(1, ...Object.values(dec));

  return (
    <>
      <div className="kpis">
        <div className="kpi">
          <span>Station-years parsed</span>
          <b>{n0(n.scale.station_years)}</b>
        </div>
        <div className="kpi">
          <span>Stations (HMA)</span>
          <b>{n0(n.scale.stations_processed)}</b>
        </div>
        <div className="kpi">
          <span>Requested yrs w/ no record</span>
          <b>{n.reproducible_subset.station_years_no_record_pct}%</b>
        </div>
        <div className="kpi">
          <span>Clean station-days</span>
          <b>{n0(n.reproducible_subset.station_days_clean)}</b>
        </div>
      </div>

      <p className="detail" style={{ marginTop: 0 }}>
        <b>{n.scale.source}</b>, parsed on {n.scale.compute}. Of{" "}
        {n0(n.reproducible_subset.station_years_requested)} station-years requested for the reproducible
        Nepal-adjacent subset, <b>{n0(n.reproducible_subset.station_years_no_record)}</b> simply don't exist
        in the archive.
      </p>

      {/* coverage-by-decade bars */}
      <div className="mix">
        {Object.entries(dec).map(([d, c]) => (
          <div key={d} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="detail" style={{ width: 46 }}>
              {d}
            </span>
            <div style={{ flex: 1, background: "rgba(143,160,184,0.14)", borderRadius: 6, height: 12 }}>
              <div
                style={{
                  width: `${(c / maxDec) * 100}%`,
                  background: "var(--accent)",
                  height: 12,
                  borderRadius: 6,
                }}
              />
            </div>
            <span className="detail" style={{ width: 44, textAlign: "right" }}>
              {n0(c)}
            </span>
          </div>
        ))}
      </div>
      <p className="detail" style={{ marginTop: -4 }}>
        Station-years kept, by decade ({n.reproducible_subset.year_range[0]}–
        {n.reproducible_subset.year_range[1]}). The archive is gappy — that gappiness is the noise.
      </p>

      <div className="banner">
        <strong>What we cleaned.</strong>
        <div className="mix" style={{ marginTop: 8 }}>
          {n.cleaning.map((c) => (
            <div key={c.step} className="mix-row" style={{ display: "block" }}>
              <b style={{ textTransform: "none" }}>{c.step}</b>
              <div className="detail" style={{ marginTop: 2 }}>
                {c.detail}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="kpis">
        <div className="kpi">
          <span>Dry station-days</span>
          <b>{Math.round(n.distribution.dry_day_frac * 100)}%</b>
        </div>
        <div className="kpi">
          <span>Days ≥ 100 mm</span>
          <b>{n0(n.distribution.days_ge_100mm)}</b>
        </div>
        <div className="kpi">
          <span>Max daily</span>
          <b>{n.distribution.max_daily_mm} mm</b>
        </div>
        <div className="kpi">
          <span>Days ≥ 50 mm</span>
          <b>{n0(n.distribution.days_ge_50mm)}</b>
        </div>
      </div>

      <p className="detail">{n.punchline}</p>
    </>
  );
}
