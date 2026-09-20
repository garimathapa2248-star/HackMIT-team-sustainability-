type BudgetSliderProps = {
  value: number;
  onChange: (value: number) => void;
};

export function BudgetSlider({ value, onChange }: BudgetSliderProps) {
  const budgetM = (value / 1_000_000).toFixed(1);

  return (
    <div className="panel slider-panel">
      <div className="slider-row">
        <p className="label">Budget</p>
        <strong>${budgetM}M</strong>
      </div>

      <input
        className="budget-range"
        type="range"
        min={0}
        max={5000000}
        step={250000}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label="Budget selection"
      />

      <div className="budget-scale">
        <span>$0</span>
        <span>$5M</span>
      </div>
    </div>
  );
}
