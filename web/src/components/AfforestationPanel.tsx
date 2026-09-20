import type { Candidate } from '../lib/types';

type Props = { candidates: Candidate[] };

export function AfforestationPanel({ candidates }: Props) {
  const sites = [...candidates].sort((a, b) => (b.suitability_score ?? 0) - (a.suitability_score ?? 0));
  return <section className="afforestation-panel">
    <div><p className="section-kicker">Intervention universe</p><h2>Preventive measures on this landscape</h2><p className="afforestation-copy">Candidate parcels are ranked for slope, land cover, suitability, and modelled local people-risk reduction.</p></div>
    <div className="site-list">{sites.map((site) => <article key={site.parcel_id}><div><span>{site.parcel_id} · {site.type.replaceAll('_', ' ')}</span><strong>{Math.round((site.suitability_score ?? 0) * 100)}% suitable</strong></div><p>{site.area_ha.toFixed(1)} ha · {site.slope_deg.toFixed(0)}° slope · modelled annual people-risk reduction {site.predicted_eal_reduction_pct ?? 0}%</p><div className="site-meter"><i style={{ width: `${(site.suitability_score ?? 0) * 100}%` }} /></div></article>)}{!sites.length && <p className="empty-state">No intervention candidates have been returned by the model yet.</p>}</div>
  </section>;
}
