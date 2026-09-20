import type { Plan } from '../lib/types';

type PlanPanelProps = {
  plan?: Plan;
};

export function PlanPanel({ plan }: PlanPanelProps) {
  const totals = plan?.totals ?? {
    cost_usd: 2_000_000,
    people_protected: 24000,
    exposure_reduction_pct: 41.2,
    co2_t_10yr: 1800,
    income_usd_yr: 420000,
    households_benefiting: 6200,
  };

  const frontier = plan?.frontier ?? [
    { budget_usd: 0, people_protected: 0, co2_t_10yr: 0 },
    { budget_usd: 1000000, people_protected: 12000, co2_t_10yr: 900 },
    { budget_usd: 2000000, people_protected: 24000, co2_t_10yr: 1800 },
  ];

  return (
    <div className="panel plan-panel">
      <p className="label">Intervention plan</p>
      <div className="plan-head">
        <h3>{totals.people_protected.toLocaleString()} people protected</h3>
        <span className="chip">Expected mode</span>
      </div>

      <div className="plan-metrics">
        <div>
          <span>Cost</span>
          <strong>${(totals.cost_usd / 1_000_000).toFixed(1)}M</strong>
        </div>
        <div>
          <span>Exposure reduction</span>
          <strong>{totals.exposure_reduction_pct.toFixed(1)}%</strong>
        </div>
        <div>
          <span>Income</span>
          <strong>${(totals.income_usd_yr / 1000).toFixed(0)}k/yr</strong>
        </div>
      </div>

      <div className="frontier-box">
        <p className="label">Efficient frontier</p>
        <div className="frontier-curve">
          {frontier.map((point, index) => {
            const next = frontier[index + 1];
            const x1 = (point.budget_usd / 2_000_000) * 100;
            const y1 = 100 - (point.people_protected / 24_000) * 100;
            const x2 = next ? (next.budget_usd / 2_000_000) * 100 : x1;
            const y2 = next ? 100 - (next.people_protected / 24_000) * 100 : y1;

            return (
              <div
                key={`${point.budget_usd}-${index}`}
                className="frontier-segment"
                style={{
                  left: `${x1}%`,
                  top: `${y1}%`,
                  width: `${Math.max(4, Math.abs(x2 - x1))}%`,
                  height: `${Math.max(4, Math.abs(y2 - y1))}%`,
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
