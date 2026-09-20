import { useEffect, useRef, useState } from 'react';
import type { LiveRiskPoint } from '../lib/types';

type Props = { points: LiveRiskPoint[]; onSelect: (point: LiveRiskPoint) => void };

export function RiskTimeline({ points, onSelect }: Props) {
  const panelRef = useRef<HTMLElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0.15);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  useEffect(() => {
    const update = () => {
      const panel = panelRef.current;
      if (!panel) return;
      const rect = panel.getBoundingClientRect();
      setScrollProgress(Math.min(1, Math.max(0.08, (window.innerHeight - rect.top) / (window.innerHeight + rect.height * 0.28))));
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
  }, []);

  if (!points.length) return null;

  const width = 760;
  const height = 270;
  const pad = { x: 42, top: 28, bottom: 43 };
  const x = (index: number) => pad.x + index * ((width - pad.x * 2) / Math.max(1, points.length - 1));
  const y = (value: number) => height - pad.bottom - (value / 100) * (height - pad.top - pad.bottom);
  const path = points.map((point, index) => `${index ? 'L' : 'M'} ${x(index)} ${y(point.risk_score)}`).join(' ');
  const rainPath = points.map((point, index) => `${index ? 'L' : 'M'} ${x(index)} ${y((point.rainfall_mm / 42) * 80)}`).join(' ');
  const revealWidth = (width - pad.x * 2) * scrollProgress + pad.x;
  const activeIndex = hoveredIndex ?? Math.min(points.length - 1, Math.floor(scrollProgress * points.length));
  const active = points[activeIndex];

  return <section ref={panelRef} className="timeline-panel market-panel">
    <div className="timeline-head"><div><p className="section-kicker">Nepal environmental tape</p><h2>Vulnerability, rainfall, and river load</h2></div><div className="signal-state"><span><i />Live reading</span><strong>{Math.round(active.risk_score)}<small>/100</small></strong></div></div>
    <div className="market-meta"><span>ROLLING 24H WINDOW</span><span>↑ {Math.round(points[points.length - 1].risk_score - points[0].risk_score)} pts since first reading</span><span>Scroll to replay conditions</span></div>
    <svg viewBox={`0 0 ${width} ${height}`} className="risk-timeline market-chart" role="img" aria-label="Scroll-driven vulnerability and rainfall chart">
      <defs><linearGradient id="risk-fill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#7954bc" stopOpacity=".34" /><stop offset="1" stopColor="#7954bc" stopOpacity="0" /></linearGradient><linearGradient id="risk-line" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#48217f" /><stop offset=".55" stopColor="#9b6bd5" /><stop offset="1" stopColor="#e26b69" /></linearGradient><clipPath id="market-reveal"><rect x="0" y="0" width={revealWidth} height={height} /></clipPath></defs>
      {[20, 40, 60, 80].map((line) => <g key={line} className="market-grid"><line x1={pad.x} x2={width - pad.x} y1={y(line)} y2={y(line)} /><text x="8" y={y(line) + 4}>{line}</text></g>)}
      <g clipPath="url(#market-reveal)"><path d={`${path} L ${x(points.length - 1)} ${height - pad.bottom} L ${x(0)} ${height - pad.bottom} Z`} className="timeline-area" /><path d={rainPath} className="rain-line" /><path d={path} className="timeline-line" /></g>
      <line className="now-line" x1={x(activeIndex)} x2={x(activeIndex)} y1={pad.top} y2={height - pad.bottom} /><g className="now-tag" transform={`translate(${x(activeIndex) - 23} ${pad.top - 16})`}><rect width="46" height="16" rx="8" /><text x="23" y="11" textAnchor="middle">NOW</text></g>
      {points.map((point, index) => <g key={point.timestamp} className={`timeline-point ${index === activeIndex ? 'active' : ''}`} onPointerEnter={() => setHoveredIndex(index)} onPointerLeave={() => setHoveredIndex(null)} onClick={() => onSelect(point)} tabIndex={0} role="button" aria-label={`Open conditions for ${new Date(point.timestamp).toLocaleTimeString([], { hour: 'numeric' })}`} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onSelect(point); }}><circle cx={x(index)} cy={y(point.risk_score)} r={index === activeIndex ? 7 : 5} /><text x={x(index)} y={height - 13} textAnchor="middle">{new Date(point.timestamp).toLocaleTimeString([], { hour: 'numeric' })}</text></g>)}
      <g className="chart-callout" transform={`translate(${Math.min(x(activeIndex) + 12, width - 134)} ${Math.max(y(active.risk_score) - 47, 32)})`}><rect width="122" height="35" rx="6" /><text x="9" y="14">{Math.round(active.risk_score)} VULNERABILITY</text><text x="9" y="27">{active.rainfall_mm.toFixed(1)} mm rain · {Math.round(active.discharge_m3s)} m³/s</text></g>
    </svg>
    <div className="market-events"><span><b>08:00</b> Soil saturation crossed 60%</span><span><b>12:00</b> River load peaked</span><span><b>16:00</b> Watch window opens</span></div>
  </section>;
}
