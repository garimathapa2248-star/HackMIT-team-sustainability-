import type { MeasureDetails } from "./lib/types";

type Props = {
  details: MeasureDetails;
  selected: boolean;
  onAsk: () => void;
  onClose: () => void;
};

export default function Inspector({ details, selected, onAsk, onClose }: Props) {
  return (
    <aside className="inspector glass" aria-label={`Details for ${details.id}`}>
      <div className="measure-title">
        <div>
          <span>{selected ? "Selected preventive measure" : "Candidate intervention site"}</span>
          <h2>{details.title || details.id}</h2>
          {details.title ? <small className="measure-id">{details.id}</small> : null}
        </div>
        <button className="ghost" onClick={onClose} aria-label="Close inspector">
          Close
        </button>
      </div>
      <dl>
        <div>
          <dt>What</dt>
          <dd>{details.what}</dd>
        </div>
        <div>
          <dt>Why here</dt>
          <dd>{details.why}</dd>
        </div>
        <div>
          <dt>Cost</dt>
          <dd>{details.cost}</dd>
        </div>
        <div>
          <dt>Modeled benefit</dt>
          <dd>{details.benefit}</dd>
        </div>
        <div>
          <dt>Assumption</dt>
          <dd>{details.assumption}</dd>
        </div>
        <div>
          <dt>Verification</dt>
          <dd>{details.verification}</dd>
        </div>
        {details.equity && (
          <div>
            <dt>Equity</dt>
            <dd>{details.equity}</dd>
          </div>
        )}
      </dl>
      <button className="dl" onClick={onAsk}>
        Ask about this measure
      </button>
    </aside>
  );
}
