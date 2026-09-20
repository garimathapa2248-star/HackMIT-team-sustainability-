import type { CityRow, OptimizerState } from "./lib/types";

type Props = {
  city: string;
  cities: CityRow[];
  onCity: (city: string) => void;
  optimizerState: OptimizerState;
  onHome?: () => void;
  onPlayDemo?: () => void;
};

export default function TopBar({
  city,
  cities,
  onCity,
  optimizerState,
  onHome,
  onPlayDemo,
}: Props) {
  const live = optimizerState === "live";
  return (
    <header className="topbar glass">
      <button type="button" className="wordmark-btn" onClick={() => onHome?.()} aria-label="Back to landing">
        <p className="wordmark">RootLedger</p>
      </button>
      <span className="product-line">preventive plan</span>
      <select
        className="city-select"
        value={city}
        onChange={(event) => onCity(event.target.value)}
        aria-label="City pack"
      >
        {cities.map((row) => (
          <option key={row.id} value={row.id}>
            {row.name}
          </option>
        ))}
      </select>
      <span className={`live-pill ${live ? "live" : "frozen"}`}>
        {live ? "Live" : optimizerState === "checking" ? "Checking" : "Frozen"}
      </span>
      {onPlayDemo && (
        <button type="button" className="ghost demo-launch" data-demo="play-bar" onClick={onPlayDemo}>
          90s demo
        </button>
      )}
      <div className="evidence-legend" aria-label="Evidence labels">
        <span className="ev observed">observed</span>
        <span className="ev model">model</span>
        <span className="ev literature">literature</span>
        <span className="ev counterfactual">counterfactual</span>
      </div>
    </header>
  );
}
