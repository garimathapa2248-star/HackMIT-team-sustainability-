import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { chartGrid, chartTick, chartTooltip, metric } from "../lib/format";
import type { Rankings, Replication, Signal } from "../lib/types";

type Props = {
  city: string;
  cityName: string;
  signal: Signal;
  replication: Replication | null;
  rankings: Rankings | null;
  showEra5: boolean;
};

export default function TailChapter({ city, cityName, signal, replication, rankings, showEra5 }: Props) {
  const rl = Object.keys(signal.return_levels_mm)
    .map(Number)
    .sort((left, right) => left - right)
    .map((returnPeriod) => {
      const interval = signal.return_levels_ci95[String(returnPeriod)];
      return {
        rp: returnPeriod,
        mm: signal.return_levels_mm[String(returnPeriod)],
        lo: interval?.[0],
        hi: interval?.[1],
        pot: signal.pot_gpd?.return_levels_mm?.[String(returnPeriod)],
      };
    });
  const scatter = replication?.agreement?.scatter || [];
  const failures = replication?.fetch_failures || [];
  const isKoshi = city === "koshi";
  const recs = signal.recommendations || signal.hazard_classes?.recommendations || [];

  return (
    <>
      {isKoshi ? (
        <div className="claim-grid three">
          <div className="claim-card primary">
            <span>Nepal-adjacent decision region</span>
            <b>
              {signal.headline.old_return_period_yrs}-yr depth →{" "}
              {metric(signal.headline.new_return_period_yrs, 2)}-yr recurrence
            </b>
            <small>
              {signal.headline.early_period?.join("–") || "early sample"} evaluated in{" "}
              {signal.headline.late_period?.join("–") || "late sample"}
            </small>
          </div>
          <div className="claim-card control">
            <span>HMA pooled negative control</span>
            <b>No recurrence shift identified</b>
            <small>
              We did not force the catchment headline onto all {metric(signal.stations_processed, 0)}{" "}
              stations.
            </small>
          </div>
          {showEra5 && replication ? (
            <div className="claim-card oos">
              <span>Independent check · ERA5-Land</span>
              <b>
                {replication.verdict || "unavailable"} (
                {metric(replication.era5_headline_new_return_yrs, 2)}-yr vs{" "}
                {metric(replication.isd_headline_new_return_yrs, 2)}-yr)
              </b>
              <small>{replication.verdict_note || replication.independence}</small>
            </div>
          ) : (
            <div className="claim-card">
              <span>ERA5-Land</span>
              <b>not in this pack</b>
              <small>Replication is the Nepal-adjacent 73-station check only.</small>
            </div>
          )}
        </div>
      ) : (
        <div className="claim-grid">
          <div className="claim-card primary">
            <span>{cityName} screening GEV</span>
            <b>
              {signal.headline.new_return_period_yrs == null
                ? "No credible intensification identified"
                : `${signal.headline.old_return_period_yrs}-yr depth → ${metric(
                    signal.headline.new_return_period_yrs,
                    2
                  )}-yr recurrence`}
            </b>
            <small>ERA5-Land / public DEM pack. Flood CSI is null and is not invented.</small>
          </div>
        </div>
      )}

      {signal.hazard_classes && (
        <>
          <div className="chart-head">
            <b>Hazard classes</b>
            <span>our fitted products · not GFDRR ThinkHazard</span>
          </div>
          <div className="hazard-chips">
            {(["flood", "landslide", "glof"] as const).map((key) => {
              const row = signal.hazard_classes?.[key];
              const level = row?.level || "data_deficient";
              return (
                <div key={key} className={`hazard-chip ${level}`}>
                  <span>{key.toUpperCase()}</span>
                  <b>{level.replace(/_/g, " ")}</b>
                  <small>{row?.evidence || "Not available in this pack."}</small>
                </div>
              );
            })}
          </div>
        </>
      )}

      {recs.length > 0 && (
        <>
          <div className="chart-head">
            <b>Planner recommendations</b>
            <span>ThinkHazard-style recs on our classes · not GFDRR text</span>
          </div>
          <div className="rec-list">
            {recs.map((row) => (
              <div className={`rec-card ${row.level || ""}`} key={row.hazard}>
                <span>
                  {row.hazard.toUpperCase()} · {(row.level || "").replace(/_/g, " ")}
                </span>
                <b>{row.technical}</b>
                {row.climate_change && <small>{row.climate_change}</small>}
              </div>
            ))}
          </div>
        </>
      )}

      {rankings?.places?.length ? (
        <>
          <div className="chart-head">
            <b>Country ranking · Nepal-adjacent decision region</b>
            <span>worse rainfall-tail intensification ranks higher</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Country</th>
                <th>Stations</th>
                <th>New recurrence</th>
                <th>Flood</th>
                <th>Slide</th>
                <th>GLOF</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {rankings.places.map((row) => (
                <tr key={row.id} className={row.id === "NP" ? "on" : ""}>
                  <td>{row.rank ?? "—"}</td>
                  <td>
                    {row.name}
                    <small className="fit-tag"> {row.fit.replace(/_/g, " ")}</small>
                  </td>
                  <td>{metric(row.stations, 0)}</td>
                  <td>
                    {row.new_return_period_yrs == null ? "—" : `${metric(row.new_return_period_yrs, 2)} yr`}
                  </td>
                  <td>{row.classes.flood || "—"}</td>
                  <td>{row.classes.landslide || "—"}</td>
                  <td>{row.classes.glof || "—"}</td>
                  <td>{row.composite == null ? "—" : metric(row.composite, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rankings.control && (
            <p className="detail">
              Negative control: {rankings.control.name} · {metric(rankings.control.stations, 0)}{" "}
              stations · {rankings.control.note}
            </p>
          )}
        </>
      ) : null}

      <p className="detail">
        {isKoshi
          ? `HMA scale: ${metric(signal.stations_processed, 0)} stations · ${metric(
              signal.station_years,
              0
            )} station-years. HMA-pooled annual-max trend:`
          : `This pack: ${metric(signal.stations_processed, 0)} series · ${metric(
              signal.station_years,
              0
            )} station-years. Annual-max trend:`}{" "}
        <b>
          +{metric(signal.trend.slope_mm_per_decade, 3)} mm/decade (p=
          {signal.trend.p_value.toLocaleString()})
        </b>
        {signal.lake_growth.length
          ? ` · Lakes: ${signal.lake_growth
              .map((lake) => `${lake.name} +${metric(lake.pct_growth)}%`)
              .join(" · ")}`
          : ""}
      </p>

      <div className="chart-head">
        <b>{isKoshi ? "HMA-pooled return-level curve" : "City return-level curve"}</b>
        <span>
          {isKoshi ? "Negative control · not the catchment subset result" : "Screening GEV on this pack"}
        </span>
      </div>
      <div className="chart">
        <ResponsiveContainer>
          <ComposedChart data={rl} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={chartGrid} />
            <XAxis dataKey="rp" stroke={chartTick} tickFormatter={(value) => `${value}y`} />
            <YAxis stroke={chartTick} />
            <Tooltip contentStyle={chartTooltip} />
            <Area type="monotone" dataKey="hi" stroke="none" fill="#3ee0c0" fillOpacity={0.12} />
            <Area type="monotone" dataKey="lo" stroke="none" fill="#070b14" fillOpacity={1} />
            <Line type="monotone" dataKey="mm" stroke="#3ee0c0" strokeWidth={2} dot name="GEV" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="detail">
        Pooled GEV return levels (mm) with bootstrap 95% interval.{" "}
        {signal.provenance?.headline_note ||
          "The pooled fit is shown separately from the catchment headline."}
      </p>

      {isKoshi && signal.pot_gpd?.return_levels_mm && (
        <>
          <div className="chart-head">
            <b>POT / GPD cross-check</b>
            <span>
              threshold {metric(signal.pot_gpd.threshold_mm, 1)} mm · {metric(signal.pot_gpd.n_excesses, 0)}{" "}
              excesses
            </span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Return period</th>
                <th>GEV (mm)</th>
                <th>POT/GPD (mm)</th>
              </tr>
            </thead>
            <tbody>
              {rl.map((row) => (
                <tr key={row.rp}>
                  <td>{row.rp} yr</td>
                  <td>{metric(row.mm, 1)}</td>
                  <td>{metric(row.pot, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="detail">{signal.pot_gpd.note}</p>
        </>
      )}

      {showEra5 && scatter.length > 0 && (
        <>
          <div className="chart-head">
            <b>ISD vs ERA5 mean annual maximum</b>
            <span>
              r={metric(replication?.agreement?.annmax_pearson_r, 3)} · bias{" "}
              {metric(replication?.agreement?.mean_bias_mm, 1)} mm ·{" "}
              {metric(replication?.agreement?.stations_compared, 0)} stations
            </span>
          </div>
          <div className="chart">
            <ResponsiveContainer>
              <ScatterChart margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={chartGrid} />
                <XAxis dataKey="isd_mm" name="ISD" stroke={chartTick} unit=" mm" type="number" />
                <YAxis dataKey="era5_mm" name="ERA5" stroke={chartTick} unit=" mm" type="number" />
                <ZAxis range={[40, 40]} />
                <Tooltip
                  contentStyle={chartTooltip}
                  formatter={(value) => [`${Number(value).toFixed(1)} mm`]}
                  labelFormatter={(_, payload) =>
                    String((payload?.[0]?.payload as { station?: string } | undefined)?.station || "")
                  }
                />
                <Scatter data={scatter} fill="#3ee0c0" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <p className="detail">
            ERA5-Land retrieved at {metric(replication?.era5_signal?.stations_processed, 0)} coordinates
            {failures.length ? ` · ${failures.length} fetch failures (rate-limit / cache-only)` : ""}.
            Hover a point for the ISD station id. IMERG{" "}
            {signal.imerg?.available === false || replication?.imerg?.available === false
              ? "unavailable — not fused"
              : "status in artifact"}.
          </p>
          {failures.length > 0 && (
            <details className="failure-list">
              <summary>
                {failures.length} ERA5 fetch failures (Open-Meteo rate limit)
              </summary>
              <ul>
                {failures.map((row) => (
                  <li key={row}>{row}</li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </>
  );
}
