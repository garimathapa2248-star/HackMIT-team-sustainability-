import {
  Area,
  ComposedChart,
  CartesianGrid,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';
import type { Signal } from '../lib/types';

const returnLevels = [
  { rp: 2, level: 82, ci: 90 },
  { rp: 5, level: 126, ci: 142 },
  { rp: 10, level: 181, ci: 210 },
  { rp: 25, level: 235, ci: 270 },
  { rp: 50, level: 304, ci: 352 },
  { rp: 100, level: 392, ci: 466 },
];

type SignalChartProps = {
  signal?: Signal;
};

export function SignalChart({ signal }: SignalChartProps) {
  const chartData = returnLevels.map((item) => ({
    rp: item.rp,
    level: item.level,
    ci: item.ci,
  }));

  const headline = signal?.headline?.statement ?? '100-year storm → 34-year storm';
  const threshold = signal?.headline?.threshold_mm ?? 180;

  return (
    <div className="chart-panel">
      <div className="headline-wrap">
        <p className="label">Headline</p>
        <h3>{headline}</h3>
      </div>

      <div className="chart-box">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData}>
            <CartesianGrid stroke="#1e2a35" strokeDasharray="3 3" />
            <XAxis
              dataKey="rp"
              type="number"
              domain={[2, 100]}
              ticks={[2, 5, 10, 25, 50, 100]}
              tickFormatter={(value) => `${value}yr`}
              stroke="#7d8f9f"
            />
            <YAxis stroke="#7d8f9f" tickFormatter={(value) => `${value}mm`} />
            <Area dataKey="ci" fill="#38bdf8" fillOpacity={0.12} stroke="none" />
            <Line dataKey="level" stroke="#38bdf8" strokeWidth={2.5} dot={false} />
            <ReferenceLine
              x={34}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              label={{ value: `now every 34 yrs`, fill: '#f59e0b', position: 'insideTopRight' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="threshold-row">
        <span>Threshold</span>
        <strong>{threshold} mm</strong>
      </div>
    </div>
  );
}
