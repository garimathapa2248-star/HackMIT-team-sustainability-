type AgentDrawerProps = {
  open: boolean;
  onClose: () => void;
};

export function AgentDrawer({ open, onClose }: AgentDrawerProps) {
  if (!open) return null;

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside className="agent-drawer" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-header">
          <p className="label">Agent explanation</p>
          <button type="button" onClick={onClose} aria-label="Close agent drawer">
            ×
          </button>
        </div>

        <h3>People protected</h3>
        <p>
          This figure is the number of residents whose expected exposure is reduced under the selected intervention mix.
          It is driven by hazard exposure, intervention coverage, and the modeled benefit of each funded action.
        </p>

        <div className="drawer-fact">
          <span>Counterfactual</span>
          <strong>24,000 people protected</strong>
        </div>
      </aside>
    </div>
  );
}
