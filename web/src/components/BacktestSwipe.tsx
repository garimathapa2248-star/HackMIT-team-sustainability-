type BacktestSwipeProps = {
  value: number;
  onChange: (value: number) => void;
};

export function BacktestSwipe({ value, onChange }: BacktestSwipeProps) {
  return (
    <div className="panel swipe-panel">
      <div className="swipe-header">
        <p className="label">Backtest swipe</p>
        <span className="chip">CSI 0.66</span>
      </div>

      <div className="swipe-stage">
        <div className="swipe-layer observed-layer" />
        <div
          className="swipe-layer modelled-layer"
          style={{ clipPath: `inset(0 0 0 ${value * 100}%)` }}
        />
        <div className="swipe-divider" style={{ left: `${value * 100}%` }} />

        <div className="swipe-label left">OBSERVED · Sentinel-1 SAR, 2024-09-28</div>
        <div className="swipe-label right">MODEL OUTPUT · frozen 2024-09-20</div>
      </div>

      <input
        className="swipe-range"
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label="Adjust backtest comparison"
      />
    </div>
  );
}
