type SettlementDetailProps = {
  selected: string | null;
};

const glacierDetails: Record<
  string,
  {
    name: string;
    status: string;
    area: string;
    meltRate: string;
    waterVolume: string;
    risk: string;
    summary: string;
  }
> = {
  'north-glacier': {
    name: 'North Glacier',
    status: 'Rapid retreat',
    area: '12.4 km²',
    meltRate: '1.8 m/yr',
    waterVolume: '2.1 M m³',
    risk: 'High',
    summary: 'High-elevation meltwater is accelerating runoff into the downstream catchment, increasing flood risk during spring melt.',
  },
  'east-glacier': {
    name: 'East Glacier',
    status: 'Stable but warming',
    area: '8.9 km²',
    meltRate: '0.9 m/yr',
    waterVolume: '1.4 M m³',
    risk: 'Medium',
    summary: 'This glacier remains relatively stable, but warming trends are weakening seasonal ice retention and increasing variability in streamflow.',
  },
  'south-glacier': {
    name: 'South Glacier',
    status: 'Critical loss',
    area: '6.3 km²',
    meltRate: '2.6 m/yr',
    waterVolume: '3.4 M m³',
    risk: 'Very high',
    summary: 'The basin is experiencing the fastest melt loss, creating concentrated water surges and elevated hazard exposure for nearby communities.',
  },
};

export function SettlementDetail({ selected }: SettlementDetailProps) {
  const key = selected ?? 'east-glacier';
  const glacier = glacierDetails[key] ?? glacierDetails['east-glacier'];

  return (
    <div className="panel detail-panel">
      <div className="detail-header">
        <p className="label">Selected glacier</p>
        <span className="chip">{glacier.status}</span>
      </div>

      <h3>{glacier.name}</h3>
      <p className="detail-summary">{glacier.summary}</p>

      <div className="detail-grid">
        <div>
          <span>Area</span>
          <strong>{glacier.area}</strong>
        </div>
        <div>
          <span>Melt rate</span>
          <strong>{glacier.meltRate}</strong>
        </div>
        <div>
          <span>Water output</span>
          <strong>{glacier.waterVolume}</strong>
        </div>
        <div>
          <span>Risk</span>
          <strong>{glacier.risk}</strong>
        </div>
      </div>
    </div>
  );
}
