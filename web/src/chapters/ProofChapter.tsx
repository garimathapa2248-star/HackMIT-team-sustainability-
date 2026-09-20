import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chartGrid, chartTick, chartTooltip, metric, risk } from "../lib/format";
import type { Backtest, Overlay } from "../lib/types";

type Props = {
  backtest: Backtest | null;
  overlay: Overlay;
  proofEvent: "2024" | "2017";
  riskView: "before" | "with_plan";
  hasValidation: boolean;
  hasCsi: boolean;
  onOverlay: (value: Overlay) => void;
  onProofEvent: (value: "2024" | "2017") => void;
  onRiskView: (value: "before" | "with_plan") => void;
};

function BaselineTable({
  title,
  modelCsi,
  modelPod,
  modelFar,
  baselines,
}: {
  title: string;
  modelCsi?: number | null;
  modelPod?: number | null;
  modelFar?: number | null;
  baselines?: Backtest["baselines"];
}) {
  if (modelCsi == null && !baselines) {
    return (
      <p className="detail">
        {title}: not in this pack.
      </p>
    );
  }
  const jrc = baselines?.jrc_seasonal_water;
  const elev = baselines?.area_matched_elevation;
  return (
    <>
      <div className="chart-head">
        <b>{title}</b>
        <span>model does not beat JRC if the CSI is lower</span>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Layer</th>
            <th>CSI</th>
            <th>POD</th>
            <th>FAR</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>HAND model</td>
            <td>{metric(modelCsi, 3)}</td>
            <td>{metric(modelPod, 3)}</td>
            <td>{metric(modelFar, 3)}</td>
          </tr>
          <tr>
            <td>JRC seasonal water</td>
            <td>{metric(jrc?.csi, 3)}</td>
            <td>{metric(jrc?.pod, 3)}</td>
            <td>{metric(jrc?.far, 3)}</td>
          </tr>
          <tr>
            <td>Area-matched elevation</td>
            <td>{metric(elev?.csi, 3)}</td>
            <td>{metric(elev?.pod, 3)}</td>
            <td>{metric(elev?.far, 3)}</td>
          </tr>
        </tbody>
      </table>
    </>
  );
}

export default function ProofChapter({
  backtest,
  overlay,
  proofEvent,
  riskView,
  hasValidation,
  hasCsi,
  onOverlay,
  onProofEvent,
  onRiskView,
}: Props) {
  const counterfactual = backtest?.counterfactual;
  const hasCounterfactual =
    counterfactual?.people_exposed_baseline != null &&
    counterfactual.people_exposed_with_plan != null;
  const floodEx = counterfactual?.flood_exceedance;
  const jrcCsi = backtest?.baselines?.jrc_seasonal_water?.csi;
  const elevCsi = backtest?.baselines?.area_matched_elevation?.csi;
  const modelBeatsJrc =
    backtest?.critical_success_index != null &&
    jrcCsi != null &&
    backtest.critical_success_index > jrcCsi;
  const skillRows =
    (proofEvent === "2017" ? backtest?.validation?.skill_vs_scale : backtest?.skill_vs_scale) || [];
  const counts = proofEvent === "2017" ? backtest?.validation?.counts : backtest?.counts;
  const activeBaselines =
    proofEvent === "2017" ? backtest?.validation?.baselines : backtest?.baselines;

  return (
    <>
      {!hasCsi && (
        <div className="banner">
          <strong>Flood CSI is not in this pack.</strong> The UI will not substitute a Koshi score or
          paint the 2024 UNOSAT Koshi flood on this city.
        </div>
      )}

      <div className="proof-controls">
        <div>
          <b>Observed / modeled overlay</b>
          <span>Control the map while reviewing proof</span>
        </div>
        <div className="segmented" role="group" aria-label="Flood overlay">
          {(["none", "observed", "modeled", "both"] as const).map((value) => (
            <button
              key={value}
              className={overlay === value ? "on" : ""}
              onClick={() => onOverlay(value)}
            >
              {value}
            </button>
          ))}
        </div>
        {hasValidation && (
          <>
            <div>
              <b>Event</b>
              <span>2024 in-sample vs 2017 frozen transfer</span>
            </div>
            <div className="segmented risk-scenario" role="group" aria-label="Proof event">
              <button
                className={proofEvent === "2024" ? "on" : ""}
                onClick={() => onProofEvent("2024")}
              >
                2024 calibration
              </button>
              <button
                className={proofEvent === "2017" ? "on" : ""}
                onClick={() => onProofEvent("2017")}
              >
                2017 transfer
              </button>
            </div>
          </>
        )}
        <div>
          <b>FloodAdapt scenarios</b>
          <span>no_measures vs nbs_blended_2M · same HAND rasters</span>
        </div>
        <div className="segmented risk-scenario" role="group" aria-label="Risk scenario">
          <button className={riskView === "before" ? "on" : ""} onClick={() => onRiskView("before")}>
            no_measures
          </button>
          <button
            className={riskView === "with_plan" ? "on" : ""}
            onClick={() => onRiskView("with_plan")}
          >
            nbs_blended_2M
          </button>
        </div>
      </div>

      {hasCsi ? (
        <div className="claim-grid">
          <div className="claim-card primary">
            <span>Calibration · {backtest?.event_date || "in-sample"}</span>
            <b>
              CSI {metric(backtest?.critical_success_index, 3)} · POD{" "}
              {metric(backtest?.hit_rate_pod, 3)} · FAR {metric(backtest?.false_alarm_ratio, 3)}
            </b>
            <small>In-sample: stage was fit on this event. Not independent validation.</small>
          </div>
          <div className="claim-card oos">
            <span>Validation · {backtest?.validation?.event_date || "second event"}</span>
            <b>
              {backtest?.validation?.critical_success_index == null
                ? "No second-event CSI"
                : `CSI ${metric(backtest.validation.critical_success_index, 3)} · POD ${metric(
                    backtest.validation.hit_rate_pod,
                    3
                  )} · FAR ${metric(backtest.validation.false_alarm_ratio, 3)}`}
            </b>
            <small>
              {backtest?.validation?.note || "Out-of-sample: frozen 2024 model, zero refit."}
            </small>
          </div>
        </div>
      ) : (
        <div className="claim-grid">
          <div className="claim-card">
            <span>Calibration CSI</span>
            <b>unavailable</b>
            <small>{backtest?.provenance?.data_status || "No SAR scene wired for this pack."}</small>
          </div>
        </div>
      )}

      {floodEx?.people_likely_flooded_no_measures != null && (
        <div className="claim-grid">
          <div className="claim-card">
            <span>Likely flooded in {floodEx.period_yr || 30} years · no_measures</span>
            <b>{risk(floodEx.people_likely_flooded_no_measures)}</b>
            <small>Modeled people, not unique homes. FloodAdapt infographic analog.</small>
          </div>
          <div className="claim-card primary">
            <span>Likely flooded in {floodEx.period_yr || 30} years · nbs_blended_2M</span>
            <b>{risk(floodEx.people_likely_flooded_with_plan)}</b>
            <small>{floodEx.note}</small>
          </div>
        </div>
      )}

      {hasCsi && (
        <p className="detail">
          {modelBeatsJrc
            ? `Beats climatology baseline (JRC seasonal water): model CSI ${metric(
                backtest?.critical_success_index,
                3
              )} vs baseline ${metric(jrcCsi, 3)}.`
            : `Does not beat JRC seasonal-water climatology on the calibration event (model CSI ${metric(
                backtest?.critical_success_index,
                3
              )} vs JRC ${metric(jrcCsi, 3)}; elevation baseline ${metric(elevCsi, 3)}). We report the miss.`}
        </p>
      )}

      {hasCsi && (
        <BaselineTable
          title={proofEvent === "2017" ? "2017 transfer baselines" : "2024 calibration baselines"}
          modelCsi={
            proofEvent === "2017"
              ? backtest?.validation?.critical_success_index
              : backtest?.critical_success_index
          }
          modelPod={proofEvent === "2017" ? backtest?.validation?.hit_rate_pod : backtest?.hit_rate_pod}
          modelFar={
            proofEvent === "2017" ? backtest?.validation?.false_alarm_ratio : backtest?.false_alarm_ratio
          }
          baselines={activeBaselines}
        />
      )}

      {counts && (
        <>
          <div className="chart-head">
            <b>Confusion counts</b>
            <span>why FAR is high</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>TP</th>
                <th>FP</th>
                <th>FN</th>
                <th>TN</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{metric(counts.tp, 0)}</td>
                <td>{metric(counts.fp, 0)}</td>
                <td>{metric(counts.fn, 0)}</td>
                <td>{metric(counts.tn, 0)}</td>
              </tr>
            </tbody>
          </table>
        </>
      )}

      {backtest?.spatial_holdout?.critical_success_index != null && proofEvent === "2024" && (
        <p className="detail">
          2024 spatial holdout (west-fit / east-test on the Koshi grid): CSI{" "}
          {metric(backtest.spatial_holdout.critical_success_index, 3)}. Same storm, spatial split only —
          not a second event.
        </p>
      )}
      {backtest?.permanent_water_mask && hasCsi && (
        <p className="truth-note">{backtest.permanent_water_mask}</p>
      )}
      {skillRows.length > 0 && (
        <>
          <div className="chart-head">
            <b>Skill vs aggregation scale</b>
            <span>{proofEvent === "2017" ? "2017 transfer" : "2024 calibration"}</span>
          </div>
          <div className="chart">
            <ResponsiveContainer>
              <ComposedChart data={skillRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={chartGrid} />
                <XAxis dataKey="approx_km" stroke={chartTick} tickFormatter={(v) => `${v} km`} />
                <YAxis stroke={chartTick} domain={[0, 1]} />
                <Tooltip contentStyle={chartTooltip} />
                <Line type="monotone" dataKey="csi" stroke="#3ee0c0" strokeWidth={2} name="CSI" />
                <Line type="monotone" dataKey="pod" stroke="#38bdf8" strokeWidth={1.5} name="POD" />
                <Line type="monotone" dataKey="far" stroke="#f0c14b" strokeWidth={1.5} name="FAR" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {hasCounterfactual ? (
        <>
          <div className="counterfactual">
            <div>
              <span>Before preventive plan</span>
              <b>{risk(counterfactual?.people_exposed_baseline)}</b>
              <small>modeled event people-exposure units</small>
            </div>
            <div className="arrow">→</div>
            <div>
              <span>With preventive plan</span>
              <b>{risk(counterfactual?.people_exposed_with_plan)}</b>
              <small>modeled · {metric(counterfactual?.reduction_pct)}% lower</small>
            </div>
          </div>
          <p className="truth-note">
            Counterfactual, not an observed outcome and not unique lives saved. {counterfactual?.note}
          </p>
        </>
      ) : (
        <div className="banner">
          <strong>No counterfactual available.</strong> The UI will not substitute the portfolio total
          or invent a before/after result.
        </div>
      )}
    </>
  );
}
