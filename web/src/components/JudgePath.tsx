import { useState } from 'react';
import type { CityPack } from '../lib/judgeStory';
import { koshiEvidence } from '../lib/judgeStory';

type Props = { city: CityPack; onCityChange: (city: CityPack) => void; cities: CityPack[]; apiBase?: string };

export function JudgePath({ city, onCityChange, cities, apiBase }: Props) {
  const [question, setQuestion] = useState('Why is the 100-year storm now a 7.75-year storm?');
  const [answer, setAnswer] = useState('');
  const [asking, setAsking] = useState(false);
  const proof = city.mode === 'proof';
  const ask = async () => {
    if (!apiBase) { setAnswer('Grounded Ask is available when the RootLedger API is running. In frozen judging mode, use the evidence annotations on this page.'); return; }
    setAsking(true);
    try { const response = await fetch(`${apiBase.replace(/\/$/, '')}/ask`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, city: city.id }) }); const data = await response.json(); setAnswer(data.answer ?? data.response ?? 'No grounded answer was returned.'); }
    catch { setAnswer('The grounded Ask service is unavailable.'); }
    finally { setAsking(false); }
  };
  const exportPlan = () => {
    if (apiBase) { window.open(`${apiBase.replace(/\/$/, '')}/preventive-measures-plan.pdf?city=${city.id}`, '_blank', 'noopener,noreferrer'); return; }
    const blob = new Blob([`# Preventive Measures Plan\n\nCity pack: ${city.label}\n\nThis frozen export is a UI fallback. Connect the RootLedger API for the grounded PDF.\n`], { type: 'text/markdown' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'preventive-measures-plan.md'; link.click(); URL.revokeObjectURL(link.href);
  };
  return <section className="judge-path" aria-label="Evidence and decision path">
    <div className="judge-head"><div><p className="section-kicker">Evidence → decision → proof</p><h2>{proof ? 'The Koshi preventive-measures case' : `${city.label} screening pack`}</h2><p>{proof ? 'A judged story built from cleaning, tail-risk evidence, selected measures, and an honest flood comparison.' : 'Same engine, screening inputs. Flood validation metrics are unavailable and are not inferred.'}</p></div><div className="city-switch" aria-label="City pack">{cities.map((item) => <button key={item.id} type="button" className={item.id === city.id ? 'active' : ''} onClick={() => onCityChange(item)}>{item.label}</button>)}</div></div>
    {proof ? <div className="evidence-grid"><article><p className="section-kicker">01 / Noise</p><strong>{koshiEvidence.stations}</strong><span>stations · {koshiEvidence.stationYears.toLocaleString()} station-years</span><p>QC rejects missing and sentinel values before tail fitting. The HMA-pooled fit is the negative control, not the 7.75-year claim.</p></article><article><p className="section-kicker">02 / Tail</p><strong>{koshiEvidence.recurrenceYears} years</strong><span>fitted recurrence of the early-period 100-year daily rain depth</span><div className="return-curve" aria-label="Illustrative return-level confidence curve"><i /><i /><i /><i /><i /></div><p>Trend +{koshiEvidence.trendMmPerDecade} mm/decade · p = {koshiEvidence.trendP}. ERA5 partially replicates at ≈{koshiEvidence.era5Years} years.</p></article><article><p className="section-kicker">03 / Proof</p><strong>CSI {koshiEvidence.csi2024}</strong><span>2024 in-sample calibration</span><p>JRC seasonal-water CSI {koshiEvidence.jrcCsi}; RootLedger does not beat climatology. 2017 frozen transfer: {koshiEvidence.csi2017}. Elevation baseline: {koshiEvidence.elevationCsi}.</p></article><article><p className="section-kicker">04 / Simulation</p><strong>−{koshiEvidence.reduction}%</strong><span>people-exposure units in the counterfactual</span><p>{koshiEvidence.baselineExposure.toLocaleString()} → {koshiEvidence.plannedExposure.toLocaleString()}. This is a simulation, not observed lives saved.</p></article></div> : <div className="screening-note"><p className="section-kicker">Validation status</p><h3>CSI unavailable for this screening pack.</h3><p>Do not reuse Koshi’s flood overlays, 2017 transfer, or ERA5 replication as city-specific evidence.</p></div>}
    <div className="judge-actions"><div><p className="section-kicker">05 / Ask</p><label><input value={question} onChange={(event) => setQuestion(event.target.value)} aria-label="Ask a grounded question" /><button type="button" onClick={ask} disabled={asking}>{asking ? 'Checking…' : 'Ask'}</button></label>{answer && <p className="ask-answer">{answer}</p>}</div><div><p className="section-kicker">06 / Export</p><h3>Preventive Measures Plan</h3><p>Use the grounded API PDF when online; the frozen view downloads a clearly labelled markdown fallback.</p><button type="button" className="export-button" onClick={exportPlan}>Export plan →</button></div></div>
  </section>;
}
