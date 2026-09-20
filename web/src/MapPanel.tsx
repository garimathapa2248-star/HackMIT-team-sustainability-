import { Component, ReactNode } from "react";
import HazardMap from "./HazardMap";
import MapSearch from "./MapSearch";
import { useDash } from "./context";

/** A map failure (e.g. WebGL unavailable) must not take the whole dashboard down with it. */
class MapBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="map-fallback" role="status">
        <b>Map unavailable</b>
        <p>
          This browser could not start WebGL, so the interactive map is switched off. All figures,
          charts and the measure table on this page still work.
        </p>
      </div>
    );
  }
}

/**
 * The shared map, wired to dashboard state. `proof` switches on the flood overlays and the
 * before / with-plan risk surface; on other views the plain hazard layer is shown.
 */
export default function MapPanel({
  proof,
  plain,
  search,
  height = 520,
  children,
}: {
  proof?: boolean;
  plain?: boolean;
  search?: boolean;
  height?: number;
  children?: ReactNode;
}) {
  const d = useDash();
  const hazard = proof
    ? d.riskView === "with_plan"
      ? d.riskWithPlan || d.hazard
      : d.riskBefore || d.hazard
    : d.hazard;

  return (
    <div className={`map-wrap ${search ? "has-search" : ""}`} style={{ height }}>
      <MapBoundary>
        <HazardMap
          hazard={hazard}
          candidates={d.candidates}
          selectedIds={d.selectedIds}
          onSelect={d.openMeasure}
          observed={d.observed}
          modeled={d.modeled}
          overlay={proof ? d.overlay : "none"}
        />
      </MapBoundary>
      {search && <MapSearch />}
      <details className="map-legend">
        <summary>Legend</summary>
        <p>
          {plain
            ? "Squares show the yearly risk to people (redder = higher). Coloured dots are the sites we recommend; pale dots are other possible sites. Click a dot for details."
            : "Risk cells: annual expected people-risk (darker = higher). Coloured dots are selected preventive measures; pale dots are candidate intervention sites. Click a dot for details."}
        </p>
        {proof && (
          <p>
            Risk surface = {d.riskView === "with_plan" ? "with-plan counterfactual" : "current model"}.
            Blue fill = observed water · gold outline = modeled flood
            {d.proofEvent === "2017" ? " (2017 transfer event)." : " (2024 calibration event)."}
          </p>
        )}
      </details>
      {children}
    </div>
  );
}
