import { useEffect, useMemo, useRef, useState } from 'react';
import { AgentDrawer } from './components/AgentDrawer';
import { AfforestationPanel } from './components/AfforestationPanel';
import { LoginPage } from './components/LoginPage';
import { RiskPointDialog } from './components/RiskPointDialog';
import { RiskTimeline } from './components/RiskTimeline';
import { SearchPage } from './components/SearchPage';
import { loadJson, loadModelArtifact } from './lib/api';
import { useApp } from './store';
import type { Backtest, Candidate, HazardFeature, HazardGeojson, LiveRiskFeed, LiveRiskPoint, Plan, Signal } from './lib/types';
import './App.css';

type HazardLayer = 'combined' | 'glof' | 'monsoon' | 'landslide';
const layerNames: Record<HazardLayer, string> = { combined: 'Combined risk', glof: 'GLOF depth', monsoon: '100-year flood', landslide: 'Landslide probability' };

function scoreFor(feature: HazardFeature, layer: HazardLayer) {
  const { glof_depth_m, flood_depth_m, landslide_prob } = feature.properties;
  if (layer === 'glof') return Math.min(100, glof_depth_m / 3 * 100);
  if (layer === 'monsoon') return Math.min(100, flood_depth_m.rp100 / 3.2 * 100);
  if (layer === 'landslide') return Math.min(100, landslide_prob * 145);
  return Math.min(100, (glof_depth_m / 3 * 42) + (flood_depth_m.rp100 / 3.2 * 34) + (landslide_prob * 35));
}
function riskLabel(score: number) { return score >= 72 ? 'Critical' : score >= 48 ? 'High' : score >= 28 ? 'Elevated' : 'Moderate'; }
function riskColor(score: number) { return score >= 72 ? '#e76045' : score >= 48 ? '#f2ab4f' : score >= 28 ? '#d8cc61' : '#63b6a4'; }
function currency(value: number) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value); }
function compactCurrency(value: number) { return value >= 1_000_000 ? `$${(value / 1_000_000).toFixed(1)}M` : `$${Math.round(value / 1_000)}k`; }

function App() {
  const { hazard, plan, backtest, set } = useApp();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [layer, setLayer] = useState<HazardLayer>('combined');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [budget, setBudget] = useState(2_000_000);
  const [audience, setAudience] = useState<'citizen' | 'government'>('citizen');
  const [liveRisk, setLiveRisk] = useState<LiveRiskFeed | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedForecast, setSelectedForecast] = useState<LiveRiskPoint | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [signedInUser, setSignedInUser] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeScene, setActiveScene] = useState(0);
  const [mapExit, setMapExit] = useState(0);
  const [mapFocused, setMapFocused] = useState(false);
  const [mapCoordinates, setMapCoordinates] = useState('86.23° E  ·  28.10° N');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [displayScore, setDisplayScore] = useState(0);
  const [locationState, setLocationState] = useState<'idle' | 'locating' | 'located' | 'unavailable'>('idle');
  const workspaceRef = useRef<HTMLElement>(null);

  useEffect(() => {
    async function loadDemoData() {
      try {
        const [signalData, hazardData, backtestData, planData] = await Promise.all([
          loadJson<Signal>('/demo_cache/signal.json'), loadJson<HazardGeojson>('/demo_cache/hazard.geojson'),
          loadJson<Backtest>('/demo_cache/backtest.json'), loadJson<Plan>('/demo_cache/plans/plan_2000000.json'),
        ]);
        set({ signal: signalData, hazard: hazardData, backtest: backtestData, plan: planData });
        setSelectedId(hazardData.features[0]?.properties.cell_id ?? null);
        setBudget(planData.budget_usd);
      } catch (error) { console.error('Demo cache failed to load:', error); }
    }
    loadDemoData();
  }, [set]);

  useEffect(() => {
    let mounted = true;
    async function refreshModelOutputs() {
      try {
        const [riskFeed, candidateData] = await Promise.all([
          loadModelArtifact<LiveRiskFeed>('/live_risk.json'),
          loadModelArtifact<Candidate[]>('/candidates.json'),
        ]);
        if (mounted) {
          setLiveRisk(riskFeed);
          setCandidates(candidateData);
        }
      } catch (error) {
        console.error('Model output refresh failed:', error);
      }
    }
    refreshModelOutputs();
    const refreshTimer = window.setInterval(refreshModelOutputs, 60_000);
    return () => { mounted = false; window.clearInterval(refreshTimer); };
  }, []);

  useEffect(() => {
    setSignedInUser(window.localStorage.getItem('rootledger-demo-user'));
  }, []);

  useEffect(() => {
    let frame = 0;
    function updateMapExit() {
      frame = 0;
      const scene = workspaceRef.current;
      if (!scene) return;
      const rect = scene.getBoundingClientRect();
      const travelled = window.innerHeight - rect.top;
      const start = window.innerHeight * 0.83;
      const end = window.innerHeight * 1.45;
      const next = Math.min(1, Math.max(0, (travelled - start) / (end - start)));
      setMapExit((current) => Math.abs(current - next) > 0.01 ? next : current);
    }
    function onScroll() {
      if (!frame) frame = window.requestAnimationFrame(updateMapExit);
    }
    updateMapExit();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const scenes = document.querySelectorAll<HTMLElement>('.scroll-scene');
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActiveScene(Number((visible.target as HTMLElement).dataset.scene));
    }, { threshold: [0.3, 0.55, 0.75] });
    scenes.forEach((scene) => observer.observe(scene));
    return () => observer.disconnect();
  }, []);

  const selected = useMemo(() => hazard?.features.find((feature) => feature.properties.cell_id === selectedId) ?? hazard?.features[0], [hazard, selectedId]);
  const selectedScore = selected ? scoreFor(selected, layer) : 0;
  const budgetRatio = budget / (plan?.budget_usd ?? 2_000_000);
  const protectedPeople = Math.round((plan?.totals.people_protected ?? 24_000) * budgetRatio);
  const focusPoint = useMemo(() => {
    const ring = selected?.geometry.coordinates[0];
    if (!ring?.length) return { x: 50, y: 50 };
    const points = ring.slice(0, -1);
    const [lng, lat] = points.reduce(([sumLng, sumLat], [nextLng, nextLat]) => [sumLng + nextLng, sumLat + nextLat], [0, 0]).map((value) => value / points.length);
    return { x: ((lng - 80) / 8.3) * 100, y: ((30.4 - lat) / 4.1) * 100 };
  }, [selected]);
  const selectRegion = (id: string) => { setSelectedId(id); setMapFocused(true); };
  const updateCoordinates = (event: React.PointerEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const lng = 80 + ((event.clientX - bounds.left) / bounds.width) * 8.3;
    const lat = 30.4 - ((event.clientY - bounds.top) / bounds.height) * 4.1;
    setMapCoordinates(`${lng.toFixed(2)}° E  ·  ${lat.toFixed(2)}° N`);
  };
  const hovered = hazard?.features.find((feature) => feature.properties.cell_id === hoveredId);
  const hoveredScore = hovered ? scoreFor(hovered, layer) : 0;
  const hoveredPoint = useMemo(() => {
    const ring = hovered?.geometry.coordinates[0];
    if (!ring?.length) return null;
    const points = ring.slice(0, -1);
    const [lng, lat] = points.reduce(([sumLng, sumLat], [nextLng, nextLat]) => [sumLng + nextLng, sumLat + nextLat], [0, 0]).map((value) => value / points.length);
    return { x: ((lng - 80) / 8.3) * 100, y: ((30.4 - lat) / 4.1) * 100 };
  }, [hovered]);
  const locateUser = () => {
    if (!navigator.geolocation) { setLocationState('unavailable'); return; }
    setLocationState('locating');
    navigator.geolocation.getCurrentPosition(() => setLocationState('located'), () => setLocationState('unavailable'), { enableHighAccuracy: true, timeout: 10_000 });
  };
  const signIn = (name: string) => {
    window.localStorage.setItem('rootledger-demo-user', name);
    setSignedInUser(name);
  };
  const signOut = () => {
    window.localStorage.removeItem('rootledger-demo-user');
    setSignedInUser(null);
  };

  useEffect(() => {
    const target = Math.round(selectedScore);
    const start = performance.now();
    const from = displayScore;
    let frame = 0;
    function tick(now: number) {
      const progress = Math.min(1, (now - start) / 520);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(from + (target - from) * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  // Animate only when the chosen place or visible risk layer changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.properties.cell_id, layer, selectedScore]);

  return <main className="app-shell" data-scene={activeScene}>
    <header className="topbar floating-topbar">
      <div className="brand-wrap"><div className="brand-mark" aria-hidden="true">R</div><div><p className="eyebrow">RootLedger</p><h1>Climate action, made local.</h1></div></div>
      <label className="location-search"><span aria-hidden="true">⌕</span><input type="search" readOnly value={searchQuery} onClick={() => setSearchOpen(true)} onFocus={() => setSearchOpen(true)} placeholder="Search a location in Nepal" aria-label="Search a location in Nepal" /></label>
      <div className="header-actions"><div className="audience-switch" aria-label="View mode"><button type="button" className={audience === 'citizen' ? 'active' : ''} onClick={() => setAudience('citizen')}>Citizen</button><button type="button" className={audience === 'government' ? 'active' : ''} onClick={() => setAudience('government')}>Government</button></div>{signedInUser ? <div className="signed-in"><span>{signedInUser}</span><button type="button" onClick={signOut}>Sign out</button></div> : <button type="button" className="login-button" onClick={() => setLoginOpen(true)}>Log in</button>}</div>
    </header>
    <nav className="scene-nav" aria-label="Page story"><span className={activeScene === 0 ? 'active' : ''}>01 Explore</span><span className={activeScene === 1 ? 'active' : ''}>02 Act locally</span><span className={activeScene === 2 ? 'active' : ''}>03 Fund change</span></nav>

    <section ref={workspaceRef} className={`workspace explore-canvas scroll-scene ${mapFocused ? 'is-focused' : ''}`} data-scene="0" style={{ '--map-exit': mapExit, '--focus-x': `${focusPoint.x}%`, '--focus-y': `${focusPoint.y}%` } as React.CSSProperties} aria-label="RootLedger nationwide vulnerability map">
      <section className={`map-card ${mapExit > 0.92 ? 'map-released' : ''}`}>
        <div className="map-head"><div><p className="section-kicker">01 / Locate risk</p><h2>Nepal vulnerability map</h2></div><div className="risk-key" aria-label="Risk severity legend"><span>Low</span><i /><i /><i /><i /><span>Critical</span></div></div>
        <div className="layer-tabs" role="tablist" aria-label="Hazard layer">{(Object.keys(layerNames) as HazardLayer[]).map((key) => <button key={key} type="button" className={layer === key ? 'active' : ''} onClick={() => setLayer(key)}>{layerNames[key]}</button>)}</div>
        <div className="map-frame">
          <svg className="terrain-map" viewBox="0 0 1000 620" role="img" onPointerMove={updateCoordinates} aria-label="Interactive map of vulnerability conditions across Nepal">
            <image href="/nepal-satellite-map.jpg" width="1000" height="620" preserveAspectRatio="xMidYMid slice" />
            <rect width="1000" height="620" fill="#2d1854" opacity=".18" />
            {hazard?.features.map((feature) => { const points = feature.geometry.coordinates[0].map(([lng, lat]) => `${(lng - 80) * 120.5},${(30.4 - lat) * 151.2}`).join(' '); const score = scoreFor(feature, layer); const isSelected = feature.properties.cell_id === selected?.properties.cell_id; return <polygon key={feature.properties.cell_id} points={points} className={`hazard-cell ${isSelected ? 'selected' : ''}`} style={{ fill: riskColor(score), opacity: 0.38 + score / 250 }} onPointerEnter={() => setHoveredId(feature.properties.cell_id)} onPointerLeave={() => setHoveredId(null)} onClick={() => selectRegion(feature.properties.cell_id)}><title>{`${feature.properties.region_name ?? feature.properties.cell_id}: ${riskLabel(score)} risk`}</title></polygon>; })}
            {mapFocused && <g className="vulnerability-field" transform={`translate(${focusPoint.x * 10} ${focusPoint.y * 6.2})`}><circle r="68" /><circle r="42" /><circle r="18" /></g>}
            <g className="map-label"><circle cx="480" cy="370" r="5" /><text x="495" y="376">Pokhara</text></g><g className="map-label"><circle cx="670" cy="431" r="5" /><text x="685" y="437">Kathmandu</text></g><g className="map-label"><circle cx="850" cy="470" r="5" /><text x="865" y="476">Koshi</text></g><text className="north" x="930" y="70">N ↑</text>
          </svg>
          <div className="map-instruction"><span className="pulse" />Click a colored area to inspect its risk</div><div className="map-scale">0 <b /> 5 km</div>
        </div>
        <p className="map-source">Satellite base: <a href="https://commons.wikimedia.org/wiki/File:Satellite_image_of_Nepal_in_October_2002.jpg" target="_blank" rel="noreferrer">NASA Visible Earth, public domain</a> · risk cells reflect 100-year flood, GLOF depth, and landslide probability.</p>
      </section>
      {hovered && hoveredPoint && !mapFocused && <div className="region-hover" style={{ left: `${hoveredPoint.x}%`, top: `${hoveredPoint.y}%` }}><strong>{hovered.properties.region_name}</strong><span>Vulnerability {Math.round(hoveredScore)}</span><b>{riskLabel(hoveredScore)}</b></div>}
      <div className="map-instrument" aria-live="polite"><span>NEPAL / SATELLITE</span><strong>{mapCoordinates}</strong><small>Move across the map to inspect coordinates</small></div>
      <div className="map-legend"><span>Vulnerability</span><div><i /><i /><i /><i /></div><small>low → critical</small></div>
      <button type="button" className="locate-control" onClick={locateUser}>{locationState === 'locating' ? 'Locating you…' : locationState === 'located' ? 'You are here' : 'I’m in a vulnerable area'}</button>
      {locationState === 'located' && <div className="local-network"><div className="network-center">YOU ARE<br />HERE</div><span className="node community">Community</span><span className="node government">Government</span><span className="node emergency">Emergency</span><span className="node organizations">Local organizations</span></div>}
      {mapFocused && <button type="button" className="country-reset" onClick={() => setMapFocused(false)}>← Return to country view</button>}
      {mapFocused && <svg className="map-connector" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d={`M ${focusPoint.x} ${focusPoint.y} C ${(focusPoint.x + 78) / 2} ${focusPoint.y}, 72 50, 79 50`} /></svg>}
      <aside className={`detail-panel map-report ${mapFocused ? 'revealed' : ''}`} aria-live="polite">
        <div className="detail-topline"><p className="section-kicker">02 / Place report</p><span className="data-status">Live model feed</span></div>
        <div className="budget-widget"><div><span>Your action budget</span><strong>{compactCurrency(budget)}</strong></div><input type="range" min={500_000} max={4_000_000} step={250_000} value={budget} onChange={(event) => setBudget(Number(event.target.value))} aria-label="Your action budget" /></div>
        {selected ? <><div className="location-row"><div><h2>{selected.properties.region_name ?? selected.properties.cell_id}</h2><p>Selected national hazard grid cell</p></div><span className="risk-badge" style={{ '--risk': riskColor(selectedScore) } as React.CSSProperties}>{riskLabel(selectedScore)}</span></div><div className="score-block"><div><span>Vulnerability score</span><strong>{displayScore}</strong><small>/ 100</small></div><div className="score-bar"><i style={{ width: `${selectedScore}%`, background: riskColor(selectedScore) }} /></div><p>Based on the active <b>{layerNames[layer].toLowerCase()}</b> layer.</p></div><div className="metric-grid"><article><span>People exposed</span><strong>{selected.properties.population.toLocaleString()}</strong><small>within this cell</small></article><article><span>Expected annual loss</span><strong>{currency(selected.properties.eal_usd)}</strong><small>{selected.properties.eal_people.toLocaleString()} people / yr</small></article><article><span>GLOF water depth</span><strong>{selected.properties.glof_depth_m.toFixed(1)} m</strong><small>modelled flow</small></article><article><span>100-year flood</span><strong>{selected.properties.flood_depth_m.rp100.toFixed(1)} m</strong><small>return period</small></article></div><section className="assets"><span>Critical assets at risk</span><div>{selected.properties.critical_assets.map((asset) => <b key={asset}>{asset}</b>)}</div></section><section className="action-note"><p className="section-kicker">Recommended response</p><h3>{selectedScore >= 60 ? 'Prioritize this cell for the next intervention package.' : 'Monitor and include in the secondary intervention package.'}</h3><p>{selectedScore >= 60 ? 'Riverbank bioengineering and early-warning coverage would reduce high-consequence exposure.' : 'Nature-based slope stabilization protects against the identified residual risk.'}</p></section></> : <p className="empty-state">Loading the hazard twin…</p>}
        <button className="evidence-button" type="button" onClick={() => setDrawerOpen(true)}>Why this recommendation? <span>→</span></button>
      </aside>
    </section>
    <section className="model-workspace scroll-scene" data-scene="1"><RiskTimeline points={liveRisk?.points ?? []} onSelect={setSelectedForecast} /><AfforestationPanel candidates={candidates} /></section>
    <section className="outcomes scroll-scene" data-scene="2"><div><p className="section-kicker">03 / Fund a response</p><h2>A portfolio with three returns</h2></div><article><span>People protected</span><strong>{protectedPeople.toLocaleString()}</strong><small>estimated at this budget</small></article><article><span>Exposure reduction</span><strong>{Math.round((plan?.totals.exposure_reduction_pct ?? 41.2) * budgetRatio)}%</strong><small>relative to baseline</small></article><article><span>CO₂ captured</span><strong>{Math.round((plan?.totals.co2_t_10yr ?? 1_800) * budgetRatio).toLocaleString()} t</strong><small>over 10 years</small></article><article><span>Backtest CSI</span><strong>{backtest?.critical_success_index.toFixed(2) ?? '—'}</strong><small>September 2024 flood</small></article></section>
    <RiskPointDialog point={selectedForecast} onClose={() => setSelectedForecast(null)} />
    {loginOpen && <LoginPage onClose={() => setLoginOpen(false)} onLogin={signIn} />}
    {searchOpen && <SearchPage query={searchQuery} onQueryChange={setSearchQuery} onSelect={selectRegion} onClose={() => setSearchOpen(false)} />}
    <AgentDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
  </main>;
}
export default App;
