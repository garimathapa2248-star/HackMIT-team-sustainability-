import { useEffect, useState } from "react";
import { loadJson } from "../api";
import { EmptyState, LoadingBlock } from "../EmptyState";

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

export default function NoiseChapter() {
  const [n, setN] = useState<Noise | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
    loadJson("noise")
      .then(setN)
      .catch(() => {
        setN(null);
        setFailed(true);
      });
  }, []);
  if (failed) {
    return (
      <EmptyState
        title="Noise card unavailable"
        body="demo_cache/noise.json did not load. The 498-station HMA parse still sits in signal.json on the Tail tab."
      />
    );
  }
  if (!n) return <LoadingBlock label="Loading NOAA ISD parse…" />;

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
        in the archive. Gold dots on the map are those Nepal-adjacent ISD coordinates — not invented gauges.
      </p>

      <div className="mix">
        {Object.entries(dec).map(([d, c]) => (
          <div key={d} className="decade-row">
            <span className="detail decade-label">{d}</span>
            <div className="decade-track">
              <div className="decade-fill" style={{ width: `${(c / maxDec) * 100}%` }} />
            </div>
            <span className="detail decade-count">{n0(c)}</span>
          </div>
        ))}
      </div>
      <p className="detail">
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
      <p className="detail">
        Max day at station <b>{n.distribution.max_daily_at.station}</b> on{" "}
        {n.distribution.max_daily_at.date}.
      </p>
      <p className="detail">{n.punchline}</p>
    </>
  );
}
