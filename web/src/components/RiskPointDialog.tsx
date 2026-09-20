import type { LiveRiskPoint } from '../lib/types';

type Props = { point: LiveRiskPoint | null; onClose: () => void };

export function RiskPointDialog({ point, onClose }: Props) {
  if (!point) return null;
  const timestamp = new Date(point.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const band = point.risk_score >= 70 ? 'Critical' : point.risk_score >= 45 ? 'High' : 'Elevated';

  return <div className="dialog-overlay" role="presentation" onClick={onClose}>
    <section className="risk-dialog" role="dialog" aria-modal="true" aria-labelledby="risk-dialog-title" onClick={(event) => event.stopPropagation()}>
      <div className="dialog-head"><div><p className="section-kicker">Forecast details</p><h2 id="risk-dialog-title">{timestamp}</h2></div><button type="button" onClick={onClose} aria-label="Close risk details">×</button></div>
      <div className="dialog-score"><span>Expected vulnerability</span><strong>{Math.round(point.risk_score)}<small>/100</small></strong><b>{band}</b></div>
      <div className="dialog-metrics"><div><span>Rainfall</span><strong>{point.rainfall_mm.toFixed(1)} mm</strong></div><div><span>Soil saturation</span><strong>{Math.round(point.soil_saturation_pct)}%</strong></div><div><span>River discharge</span><strong>{Math.round(point.discharge_m3s)} m³/s</strong></div><div><span>Model confidence</span><strong>{Math.round(point.model_confidence * 100)}%</strong></div></div>
      <p className="dialog-explanation">This outlook combines rainfall intensity, soil moisture, terrain, and river flow. The contributing local conditions are shown above.</p>
    </section>
  </div>;
}
