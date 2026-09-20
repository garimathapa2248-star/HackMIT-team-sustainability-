type Location = { id: string; name: string; detail: string };

type Props = { query: string; onQueryChange: (query: string) => void; onSelect: (id: string) => void; onClose: () => void };

const locations: Location[] = [
  { id: 'np-karnali-01', name: 'Karnali highlands', detail: 'Karnali Province · mountain hazards' },
  { id: 'np-gandaki-01', name: 'Gandaki mountain corridor', detail: 'Gandaki Province · slope and flood risk' },
  { id: 'np-koshi-01', name: 'Koshi foothills', detail: 'Koshi Province · river and landslide risk' },
];

export function SearchPage({ query, onQueryChange, onSelect, onClose }: Props) {
  const matches = locations.filter((location) => `${location.name} ${location.detail}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="page-overlay search-overlay">
    <main className="search-page" aria-labelledby="search-title">
      <div className="search-page-head"><div><p className="section-kicker">Find a place</p><h2 id="search-title">Search Nepal</h2></div><button className="page-close" type="button" onClick={onClose} aria-label="Close search">×</button></div>
      <label className="search-page-input"><span aria-hidden="true">⌕</span><input autoFocus type="search" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="District, city, ward, or watershed" /></label>
      <p className="search-caption">Choose a location to open its place report and map area.</p>
      <div className="search-results">{matches.map((location) => <button key={location.id} type="button" onClick={() => { onSelect(location.id); onClose(); }}><span className="result-pin" aria-hidden="true">●</span><span><strong>{location.name}</strong><small>{location.detail}</small></span><b>View report →</b></button>)}</div>
      {!matches.length && <p className="empty-state">No matching place yet. Try a province or watershed name.</p>}
    </main>
  </div>;
}
