import { useEffect, useRef, useState } from 'react';
import type { HazardFeature } from '../lib/types';

type Props = { feature: HazardFeature; score: number; dataStatus?: string };

/** Reveals one fixed, returned location-analysis result; scroll never changes the result itself. */
export function LocationAnalysisStory({ feature, score, dataStatus }: Props) {
  const graphRef = useRef<HTMLElement>(null);
  const factorsRef = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);
  const [factorProgress, setFactorProgress] = useState(0);
  useEffect(() => {
    const update = () => {
      const graph = graphRef.current;
      const factors = factorsRef.current;
      if (graph) {
        const rect = graph.getBoundingClientRect();
        setProgress(Math.max(0, Math.min(1, (window.innerHeight * 0.78 - rect.top) / (rect.height * 0.72))));
      }
      if (factors) {
        const rect = factors.getBoundingClientRect();
        setFactorProgress(Math.max(0, Math.min(1, (window.innerHeight * 0.8 - rect.top) / Math.max(1, rect.height * 0.75))));
      }
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
  }, []);

  const shown = Math.round(score * progress);
  const width = 760;
  const path = `M 32 208 C 134 203, 182 170, 278 156 S 430 102, 523 91 S 651 44, 728 ${208 - score * 1.68}`;
  const properties = feature.properties;
  const factors = [
    ['100-year flood depth', `${properties.flood_depth_m.rp100.toFixed(1)} m`, 'model output'],
    ['GLOF depth', `${properties.glof_depth_m.toFixed(1)} m`, 'model output'],
    ['Landslide probability', `${Math.round(properties.landslide_prob * 100)}%`, 'model output'],
    ['Population in model cell', properties.population.toLocaleString(), 'exposure input'],
  ];

  return <section className="location-analysis-story">
    <section ref={graphRef} className="vulnerability-reveal">
      <div className="story-intro"><p className="section-kicker">Stored model analysis</p><h2>{feature.properties.region_name ?? feature.properties.cell_id}</h2><p>{dataStatus ?? 'model output'} · Scroll to reveal this fixed location result.</p></div>
      <div className="score-readout"><span>Vulnerability</span><strong>{shown}<small>/100</small></strong><p>Final model-derived display score: {Math.round(score)}/100</p></div>
      <svg viewBox={`0 0 ${width} 240`} className="location-curve" aria-label="Scroll-revealed vulnerability curve">
        <defs><clipPath id="location-curve-reveal"><rect width={width * progress} height="240" /></clipPath><linearGradient id="location-curve-fill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#8f64d4" stopOpacity=".34" /><stop offset="1" stopColor="#8f64d4" stopOpacity="0" /></linearGradient></defs>
        {[48, 98, 148, 198].map((y) => <line key={y} x1="32" x2="728" y1={y} y2={y} className="curve-grid" />)}
        <g clipPath="url(#location-curve-reveal)"><path d={`${path} L 728 208 L 32 208 Z`} fill="url(#location-curve-fill)" /><path d={path} className="curve-line" /></g>
      </svg>
    </section>
    <section ref={factorsRef} className="factor-reveal" aria-label="Model-derived environmental factors">
      {factors.map(([label, value, status], index) => {
        const entered = Math.max(0, Math.min(1, factorProgress * factors.length - index));
        return <article key={label} style={{ '--entered': entered } as React.CSSProperties}><span>{label}</span><strong>{value}</strong><small>{status}</small></article>;
      })}
    </section>
  </section>;
}
