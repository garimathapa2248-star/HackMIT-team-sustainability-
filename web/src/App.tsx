import { useEffect, useMemo, useRef, useState } from 'react';
import { AgentDrawer } from './components/AgentDrawer';
import { AfforestationPanel } from './components/AfforestationPanel';
import { LoginPage } from './components/LoginPage';
import { JudgePath } from './components/JudgePath';
import { GovernmentLoginPage } from './components/GovernmentLoginPage';
import { LocationConsentPage } from './components/LocationConsentPage';
import { RiskPointDialog } from './components/RiskPointDialog';
import { RiskTimeline } from './components/RiskTimeline';
import { SearchPage } from './components/SearchPage';
import { loadJson, loadModelArtifact } from './lib/api';
import { loadNearbyHelp, loginCitizen, registerCitizen, requestCommunityConnection, storeLocationConsent, type CommunitySession, type NearbyMatch } from './lib/communityApi';
import { cityPacks, type CityPack } from './lib/judgeStory';
import { useApp } from './store';
import type { Backtest, Candidate, HazardFeature, HazardGeojson, LiveRiskFeed, LiveRiskPoint, Plan, Signal } from './lib/types';
import './App.css';

type HazardLayer = 'combined' | 'glof' | 'monsoon' | 'landslide' | 'vegetation';
const layerNames: Record<HazardLayer, string> = { combined: 'Combined risk', glof: 'GLOF depth', monsoon: '100-year flood', landslide: 'Landslide probability', vegetation: 'Tree cover priority' };

function scoreFor(feature: HazardFeature, layer: HazardLayer) {
  const { glof_depth_m, flood_depth_m, landslide_prob } = feature.properties;
  if (layer === 'glof') return Math.min(100, glof_depth_m / 3 * 100);
  if (layer === 'monsoon') return Math.min(100, flood_depth_m.rp100 / 3.2 * 100);
  if (layer === 'landslide') return Math.min(100, landslide_prob * 145);
  if (layer === 'vegetation') return Math.min(100, 100 - (feature.properties.vegetation_cover_pct ?? 40));
  return Math.min(100, (glof_depth_m / 3 * 42) + (flood_depth_m.rp100 / 3.2 * 34) + (landslide_prob * 35));
}
function riskLabel(score: number) { return score >= 72 ? 'Critical' : score >= 48 ? 'High' : score >= 28 ? 'Elevated' : 'Moderate'; }
function riskColor(score: number) { return score >= 72 ? '#e76045' : score >= 48 ? '#f2ab4f' : score >= 28 ? '#d8cc61' : '#63b6a4'; }
function currency(value: number) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value); }
function compactCurrency(value: number) { return value >= 1_000_000 ? `$${(value / 1_000_000).toFixed(1)}M` : `$${Math.round(value / 1_000)}k`; }
function distanceMetres(first: { longitude: number; latitude: number }, second: { longitude: number; latitude: number }) {
  const toRadians = (value: number) => value * Math.PI / 180;
  const latitudeDelta = toRadians(second.latitude - first.latitude);
  const longitudeDelta = toRadians(second.longitude - first.longitude);
  const a = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(toRadians(first.latitude)) * Math.cos(toRadians(second.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function App() {
  const { hazard, plan, set } = useApp();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [layer, setLayer] = useState<HazardLayer>('combined');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [budget, setBudget] = useState(2_000_000);
  const [audience, setAudience] = useState<'citizen' | 'government'>('citizen');
  const [city, setCity] = useState<CityPack>(cityPacks[0]);
  const [liveRisk, setLiveRisk] = useState<LiveRiskFeed | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedForecast, setSelectedForecast] = useState<LiveRiskPoint | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [locationConsentOpen, setLocationConsentOpen] = useState(false);
  const [governmentLoginOpen, setGovernmentLoginOpen] = useState(false);
  const [governmentOrganization, setGovernmentOrganization] = useState<string | null>(null);
  const [signedInUser, setSignedInUser] = useState<string | null>(null);
  const [communitySession, setCommunitySession] = useState<CommunitySession | null>(null);
  const [nearbyHelp, setNearbyHelp] = useState<NearbyMatch | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);
  const [liveLocationSharing, setLiveLocationSharing] = useState(false);
  const [locationPreferences, setLocationPreferences] = useState({ shareWithCommunity: true, shareWithResponders: true });
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeScene, setActiveScene] = useState(0);
  const [mapExit, setMapExit] = useState(0);
  const [mapFocused, setMapFocused] = useState(false);
  const [mapCoordinates, setMapCoordinates] = useState('86.23° E  ·  28.10° N');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [displayScore, setDisplayScore] = useState(0);
  const [locationState, setLocationState] = useState<'idle' | 'locating' | 'located' | 'unavailable'>('idle');
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [activeConnection, setActiveConnection] = useState<string | null>(null);
  const workspaceRef = useRef<HTMLElement>(null);
  const lastLiveLocationRef = useRef<{ longitude: number; latitude: number; updatedAt: number } | null>(null);

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
    setGovernmentOrganization(window.localStorage.getItem('rootledger-government-organization'));
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
  const frozenPlan = import.meta.env.VITE_USE_CACHE === 'true' || !import.meta.env.VITE_API_BASE_URL;
  const budgetRatio = budget / (plan?.budget_usd ?? 2_000_000);
  const protectedPeople = Math.round((plan?.totals.people_protected ?? 24_000) * budgetRatio);
  const availableCandidates = useMemo(() => [...candidates]
    .sort((a, b) => (b.suitability_score ?? 0) - (a.suitability_score ?? 0))
    .slice(0, Math.max(1, Math.min(candidates.length, Math.floor(budget / 750_000) + 1))), [budget, candidates]);
  const selectedCandidate = useMemo(() => candidates.find((candidate) => candidate.parcel_id === selectedCandidateId) ?? availableCandidates[0], [availableCandidates, candidates, selectedCandidateId]);
  const candidateCost = selectedCandidate ? Math.round(selectedCandidate.area_ha * 31_500) : 0;
  const allocatedBudget = Math.min(budget, availableCandidates.reduce((total, candidate) => total + Math.round(candidate.area_ha * 31_500), 0));
  const currentVegetation = selected ? (selected.properties.vegetation_cover_pct ?? Math.round(100 - scoreFor(selected, 'vegetation'))) : 0;
  const hasTreeCoverData = selected?.properties.vegetation_cover_pct !== undefined;
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
    navigator.geolocation.getCurrentPosition((position) => {
      const nearest = hazard?.features.reduce((closest, feature) => {
        const ring = feature.geometry.coordinates[0];
        const [lng, lat] = ring.slice(0, -1).reduce(([x, y], [nextLng, nextLat]) => [x + nextLng, y + nextLat], [0, 0]).map((value) => value / Math.max(1, ring.length - 1));
        const distance = Math.hypot(lng - position.coords.longitude, lat - position.coords.latitude);
        return !closest || distance < closest.distance ? { id: feature.properties.cell_id, distance } : closest;
      }, null as { id: string; distance: number } | null);
      if (nearest) selectRegion(nearest.id);
      setLocationState('located');
    }, () => setLocationState('unavailable'), { enableHighAccuracy: true, timeout: 10_000 });
  };
  const signIn = (name: string) => {
    window.localStorage.setItem('rootledger-demo-user', name);
    setSignedInUser(name);
  };
  const register = async (input: { displayName: string; email: string; password: string }) => {
    const session = await registerCitizen(input);
    setCommunitySession(session);
    setSignedInUser(session.citizen.displayName);
    setLocationConsentOpen(true);
  };
  const signInCitizen = async (input: { email: string; password: string }) => {
    const session = await loginCitizen(input);
    setCommunitySession(session);
    setSignedInUser(session.citizen.displayName);
    setLocationConsentOpen(true);
  };
  const saveConsent = async (location: { longitude: number; latitude: number; accuracyM: number }, preferences: { shareWithCommunity: boolean; shareWithResponders: boolean; liveLocationSharing: boolean }) => {
    if (!communitySession) throw new Error('Please create a citizen account before sharing your location.');
    await storeLocationConsent(communitySession.accessToken, { location, ...preferences });
    const matches = await loadNearbyHelp(communitySession.accessToken);
    setNearbyHelp(matches);
    setLocationPreferences(preferences);
    setLiveLocationSharing(preferences.liveLocationSharing);
    lastLiveLocationRef.current = { longitude: location.longitude, latitude: location.latitude, updatedAt: Date.now() };
    setLocationState('located');
  };
  const connectWithMember = async (memberId: string, name: string) => {
    if (!communitySession) return;
    try { await requestCommunityConnection(communitySession.accessToken, memberId); setConnectionStatus(`Connection request sent to ${name}.`); }
    catch (error) { setConnectionStatus(error instanceof Error ? error.message : 'Unable to send the connection request.'); }
  };
  const signOut = () => {
    window.localStorage.removeItem('rootledger-demo-user');
    setSignedInUser(null);
  };
  const openGovernment = () => {
    if (governmentOrganization) { setAudience('government'); return; }
    setGovernmentLoginOpen(true);
  };
  const signInGovernment = (organization: string) => {
    window.localStorage.setItem('rootledger-government-organization', organization);
    setGovernmentOrganization(organization);
    setAudience('government');
  };
  const leaveGovernment = () => {
    window.localStorage.removeItem('rootledger-government-organization');
    setGovernmentOrganization(null);
    setAudience('citizen');
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

  useEffect(() => {
    if (!communitySession || locationState !== 'located' || selectedScore < 48) return;
    loadNearbyHelp(communitySession.accessToken).then(setNearbyHelp).catch((error) => console.error('Nearby help refresh failed:', error));
  }, [communitySession, locationState, selectedScore]);

  useEffect(() => {
    if (!liveLocationSharing || !communitySession || !navigator.geolocation) return;
    const watcher = navigator.geolocation.watchPosition(async (position) => {
      const nextLocation = { longitude: position.coords.longitude, latitude: position.coords.latitude, accuracyM: position.coords.accuracy };
      const previous = lastLiveLocationRef.current;
      const movedEnough = !previous || distanceMetres(previous, nextLocation) >= 250;
      const refreshDue = !previous || Date.now() - previous.updatedAt >= 15 * 60 * 1000;
      if (!movedEnough && !refreshDue) return;
      try {
        await storeLocationConsent(communitySession.accessToken, { location: nextLocation, ...locationPreferences, liveLocationSharing: true });
        lastLiveLocationRef.current = { longitude: nextLocation.longitude, latitude: nextLocation.latitude, updatedAt: Date.now() };
        setNearbyHelp(await loadNearbyHelp(communitySession.accessToken));
        setLocationState('located');
      } catch (error) { console.error('Live location update failed:', error); }
    }, (error) => console.error('Live location unavailable:', error), { enableHighAccuracy: true, maximumAge: 60_000, timeout: 15_000 });
    return () => navigator.geolocation.clearWatch(watcher);
  }, [communitySession, liveLocationSharing, locationPreferences]);

  const sceneLabels = audience === 'government'
    ? ['01 Overview', '02 Analyze', '03 Intervene', '04 Allocate', '05 Project']
    : ['01 Locate', '02 Understand', '03 Connect', '04 Respond', '05 Community'];
  const isGovernment = audience === 'government';

  return <main className="app-shell" data-scene={activeScene} data-experience={audience}>
    <header className="topbar floating-topbar">
      <div className="brand-wrap"><div className="brand-mark" aria-hidden="true">R</div><div><p className="eyebrow">RootLedger</p><h1>{isGovernment ? 'Environmental investment planning.' : 'Climate action, made local.'}</h1></div></div>
      <label className="location-search"><span aria-hidden="true">⌕</span><input type="search" readOnly value={searchQuery} onClick={() => setSearchOpen(true)} onFocus={() => setSearchOpen(true)} placeholder="Search a location in Nepal" aria-label="Search a location in Nepal" /></label>
      <div className="header-actions"><div className="audience-switch" aria-label="Choose experience"><button type="button" className={audience === 'citizen' ? 'active' : ''} onClick={() => setAudience('citizen')}><b>Citizen</b><small>Local risk & help</small></button><button type="button" className={audience === 'government' ? 'active' : ''} onClick={openGovernment}><b>Government</b><small>Plan investment</small></button></div>{isGovernment ? <div className="signed-in"><span>{governmentOrganization}</span><button type="button" onClick={leaveGovernment}>Exit</button></div> : signedInUser ? <div className="signed-in"><span>{signedInUser}</span><button type="button" onClick={signOut}>Sign out</button></div> : <button type="button" className="login-button" onClick={() => setLoginOpen(true)}>Log in</button>}</div>
    </header>
    <nav className="scene-nav" aria-label={`${audience} experience steps`}>{sceneLabels.map((label, index) => <span key={label} className={activeScene === Math.min(index, 2) ? 'active' : ''}>{label}</span>)}</nav>

    <section ref={workspaceRef} className={`workspace explore-canvas scroll-scene ${mapFocused ? 'is-focused' : ''}`} data-scene="0" style={{ '--map-exit': mapExit, '--focus-x': `${focusPoint.x}%`, '--focus-y': `${focusPoint.y}%` } as React.CSSProperties} aria-label="RootLedger nationwide vulnerability map">
      <section className={`map-card ${mapExit > 0.92 ? 'map-released' : ''}`}>
        <div className="map-head"><div><p className="section-kicker">{isGovernment ? '01 / Planning jurisdiction' : '01 / Your local context'}</p><h2>{isGovernment ? 'Where should investment go?' : locationState === 'located' ? 'Your location is connected.' : 'Where are you?'}</h2><p className="experience-caption">{isGovernment ? 'Compare risk and restoration opportunity across the same landscape.' : 'Use your location to understand nearby risk and relevant help.'}</p></div><div className="risk-key" aria-label="Risk severity legend"><span>Low</span><i /><i /><i /><i /><span>Critical</span></div></div>
        <div className="layer-tabs" role="tablist" aria-label="Environmental layer">{(Object.keys(layerNames) as HazardLayer[]).filter((key) => isGovernment || key !== 'vegetation').map((key) => <button key={key} type="button" className={layer === key ? 'active' : ''} onClick={() => setLayer(key)}>{layerNames[key]}</button>)}</div>
        <div className="map-frame">
          <svg className="terrain-map" viewBox="0 0 1000 620" role="img" onPointerMove={updateCoordinates} aria-label="Interactive map of vulnerability conditions across Nepal">
            <image href="/nepal-satellite-map.jpg" width="1000" height="620" preserveAspectRatio="xMidYMid slice" />
            <rect width="1000" height="620" fill="#2d1854" opacity=".18" />
            {hazard?.features.map((feature) => { const points = feature.geometry.coordinates[0].map(([lng, lat]) => `${(lng - 80) * 120.5},${(30.4 - lat) * 151.2}`).join(' '); const score = scoreFor(feature, layer); const isSelected = feature.properties.cell_id === selected?.properties.cell_id; return <polygon key={feature.properties.cell_id} points={points} className={`hazard-cell ${isSelected ? 'selected' : ''}`} style={{ fill: riskColor(score), opacity: 0.38 + score / 250 }} onPointerEnter={() => setHoveredId(feature.properties.cell_id)} onPointerLeave={() => setHoveredId(null)} onClick={() => selectRegion(feature.properties.cell_id)}><title>{`${feature.properties.region_name ?? feature.properties.cell_id}: ${riskLabel(score)} risk`}</title></polygon>; })}
            {mapFocused && <g className="vulnerability-field" transform={`translate(${focusPoint.x * 10} ${focusPoint.y * 6.2})`}><circle r="68" /><circle r="42" /><circle r="18" /></g>}
            {isGovernment && availableCandidates.map((candidate) => { const [lng, lat] = candidate.centroid; const x = (lng - 80) * 120.5; const y = (30.4 - lat) * 151.2; const selectedCandidateMarker = candidate.parcel_id === selectedCandidate?.parcel_id; return <g key={candidate.parcel_id} className={`intervention-site ${selectedCandidateMarker ? 'selected' : ''}`} transform={`translate(${x} ${y})`} onPointerEnter={() => setSelectedCandidateId(candidate.parcel_id)} onClick={() => { setSelectedCandidateId(candidate.parcel_id); selectRegion(candidate.cell_ids[0]); }}><circle r={selectedCandidateMarker ? 16 : 11} /><circle className="intervention-core" r="4" /><text x="15" y="-13">{candidate.parcel_id.replace('AF-', '')}</text><title>{`${candidate.parcel_id}: ${Math.round((candidate.suitability_score ?? 0) * 100)}% suitable`}</title></g>; })}
            <g className="map-label"><circle cx="480" cy="370" r="5" /><text x="495" y="376">Pokhara</text></g><g className="map-label"><circle cx="670" cy="431" r="5" /><text x="685" y="437">Kathmandu</text></g><g className="map-label"><circle cx="850" cy="470" r="5" /><text x="865" y="476">Koshi</text></g><text className="north" x="930" y="70">N ↑</text>
          </svg>
          <div className="map-instruction"><span className="pulse" />{isGovernment ? 'Select a risk field or restoration site to analyze an intervention' : 'Select an area or use your location to understand local risk'}</div><div className="map-scale">0 <b /> 5 km</div>
        </div>
        <p className="map-source">Satellite base: <a href="https://commons.wikimedia.org/wiki/File:Satellite_image_of_Nepal_in_October_2002.jpg" target="_blank" rel="noreferrer">NASA Visible Earth, public domain</a> · risk cells reflect 100-year flood, GLOF depth, and landslide probability.</p>
      </section>
      {hovered && hoveredPoint && !mapFocused && <div className="region-hover" style={{ left: `${hoveredPoint.x}%`, top: `${hoveredPoint.y}%` }}><strong>{hovered.properties.region_name}</strong><span>Vulnerability {Math.round(hoveredScore)}</span><b>{riskLabel(hoveredScore)}</b></div>}
      <div className="map-instrument" aria-live="polite"><span>NEPAL / SATELLITE</span><strong>{mapCoordinates}</strong><small>Move across the map to inspect coordinates</small></div>
      <div className="map-legend"><span>Vulnerability</span><div><i /><i /><i /><i /></div><small>low → critical</small></div>
      {!isGovernment && <button type="button" className="locate-control" onClick={locateUser}>{locationState === 'locating' ? 'Finding your location…' : locationState === 'located' ? 'Your local area' : 'Use my location'}</button>}
      {!isGovernment && liveLocationSharing && <span className="live-location-status"><i /> Live location sharing</span>}
      {!isGovernment && locationState !== 'located' && <p className="location-consent">Location is only used to match you with the relevant risk area and help.</p>}
      {!isGovernment && locationState === 'located' && <div className="local-network" aria-label="Relevant help around your location"><div className="network-center">YOU ARE<br />HERE</div>{['Community', 'Government', 'Emergency', 'Local organizations'].map((connection) => <button key={connection} type="button" className={`node ${connection === 'Local organizations' ? 'organizations' : connection.toLowerCase()}`} onClick={() => setActiveConnection(connection)}>{connection}</button>)}</div>}
      {mapFocused && <button type="button" className="country-reset" onClick={() => setMapFocused(false)}>← Return to country view</button>}
      {mapFocused && <svg className="map-connector" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d={`M ${focusPoint.x} ${focusPoint.y} C ${(focusPoint.x + 78) / 2} ${focusPoint.y}, 72 50, 79 50`} /></svg>}
      <aside className={`detail-panel map-report ${mapFocused || isGovernment || locationState === 'located' ? 'revealed' : ''}`} aria-live="polite">
        <div className="detail-topline"><p className="section-kicker">{isGovernment ? 'Investment analysis' : 'Your local report'}</p><span className="data-status">Shared risk model</span></div>
        {isGovernment && <div className="budget-widget"><div><span>Available budget</span><strong>{compactCurrency(budget)}</strong><small>{frozenPlan ? 'Frozen cached plan · optimizer offline' : `${compactCurrency(Math.max(0, budget - allocatedBudget))} remaining`}</small></div><input type="range" min={500_000} max={4_000_000} step={250_000} value={budget} onChange={(event) => setBudget(Number(event.target.value))} disabled={frozenPlan} aria-label="Available investment budget" /></div>}
        {selected ? <><div className="location-row"><div><h2>{isGovernment && selectedCandidate ? selectedCandidate.parcel_id : selected.properties.region_name ?? selected.properties.cell_id}</h2><p>{isGovernment ? 'Mapped plantation intervention candidate' : locationState === 'located' ? 'Matched to your local risk area' : 'Select a place in Nepal'}</p></div><span className="risk-badge" style={{ '--risk': riskColor(selectedScore) } as React.CSSProperties}>{riskLabel(selectedScore)}</span></div>
        {isGovernment && selectedCandidate ? <><div className="candidate-analysis"><span>Suitability</span><strong>{Math.round((selectedCandidate.suitability_score ?? 0) * 100)}%</strong><p>{selectedCandidate.area_ha.toFixed(1)} ha · {selectedCandidate.landcover} · {selectedCandidate.slope_deg.toFixed(0)}° slope</p></div><div className="metric-grid"><article><span>Projected reduction</span><strong>{selectedCandidate.predicted_eal_reduction_pct ?? 0}%</strong><small>local expected loss</small></article><article><span>Estimated cost</span><strong>{currency(candidateCost)}</strong><small>initial intervention</small></article><article><span>Tree cover</span><strong>{hasTreeCoverData ? `${currentVegetation}%` : 'Pending'}</strong><small>{hasTreeCoverData ? 'modelled coverage' : 'awaiting model layer'}</small></article><article><span>People nearby</span><strong>{selected.properties.population.toLocaleString()}</strong><small>within risk cell</small></article></div><section className="action-note"><p className="section-kicker">Why this area?</p><h3>{hasTreeCoverData ? 'Low vegetation cover meets high local exposure.' : 'High local exposure meets a suitable restoration site.'}</h3><p>{selected.properties.region_name} combines {riskLabel(scoreFor(selected, 'combined')).toLowerCase()} vulnerability with a {Math.round((selectedCandidate.suitability_score ?? 0) * 100)}% suitable restoration site. This allocation stays within the available portfolio.</p></section></> : <><div className="score-block"><div><span>Vulnerability score</span><strong>{displayScore}</strong><small>/ 100</small></div><div className="score-bar"><i style={{ width: `${selectedScore}%`, background: riskColor(selectedScore) }} /></div><p>Flood, GLOF, and slope conditions are combined in this local reading.</p></div><div className="metric-grid"><article><span>Flood depth</span><strong>{selected.properties.flood_depth_m.rp100.toFixed(1)} m</strong><small>100-year return period</small></article><article><span>Landslide likelihood</span><strong>{Math.round(selected.properties.landslide_prob * 100)}%</strong><small>model signal</small></article><article><span>People exposed</span><strong>{selected.properties.population.toLocaleString()}</strong><small>in this area</small></article><article><span>Tree cover</span><strong>{hasTreeCoverData ? `${currentVegetation}%` : 'Pending'}</strong><small>{hasTreeCoverData ? 'modelled coverage' : 'awaiting model layer'}</small></article></div><section className="action-note"><p className="section-kicker">What this means</p><h3>{selectedScore >= 60 ? 'Be ready for river and slope conditions to compound.' : 'Conditions are being monitored for local change.'}</h3><p>{activeConnection ? `${activeConnection} is relevant because this area has ${riskLabel(selectedScore).toLowerCase()} vulnerability.` : 'Use your location to reveal relevant community, government, emergency, and local organization connections.'}</p></section></>}
        </> : <p className="empty-state">Loading the environmental model…</p>}
        <button className="evidence-button" type="button" onClick={() => setDrawerOpen(true)}>{isGovernment ? 'How was this allocation chosen?' : 'See the factors behind this reading'} <span>→</span></button>
      </aside>
    </section>
    <section className="model-workspace scroll-scene" data-scene="1">{isGovernment ? <><RiskTimeline points={liveRisk?.points ?? []} onSelect={setSelectedForecast} /><AfforestationPanel candidates={availableCandidates} /></> : <><RiskTimeline points={liveRisk?.points ?? []} onSelect={setSelectedForecast} /><section className="citizen-action-flow"><p className="section-kicker">04 / Respond nearby</p><h2>{nearbyHelp ? `${nearbyHelp.services.length} services and ${nearbyHelp.community.length} opt-in neighbours matched.` : 'Help matched to your local conditions.'}</h2><p>{nearbyHelp?.services[0] ? `${nearbyHelp.services[0].name}: ${nearbyHelp.services[0].relevance}` : 'Community groups, local government, and emergency contacts become relevant when the selected area’s flood and slope conditions rise.'}</p>{nearbyHelp?.community.length ? <div className="nearby-members">{nearbyHelp.community.map((member) => <div key={member.memberId}><span><b>{member.displayName}</b><small>{member.distanceBand} · exact location hidden</small></span><button type="button" onClick={() => connectWithMember(member.memberId, member.displayName)}>Connect</button></div>)}</div> : null}{connectionStatus && <p className="connection-status">{connectionStatus}</p>}<button type="button" onClick={() => communitySession ? setLocationConsentOpen(true) : setLoginOpen(true)}>{communitySession ? 'Update location sharing' : 'Create an account to match help'}</button></section></>}</section>
    <section className="outcomes scroll-scene" data-scene="2"><div><p className="section-kicker">{isGovernment ? '05 / Project impact' : '05 / Community'}</p><h2>{isGovernment ? 'One allocation, visible across the landscape.' : 'Your area is part of a wider risk network.'}</h2></div><article><span>{isGovernment ? 'Annual people-risk avoided' : 'Similar risk areas'}</span><strong>{isGovernment ? protectedPeople.toLocaleString() : '03'}</strong><small>{isGovernment ? 'modelled annual exposure units' : 'Karnali · Gandaki · Koshi'}</small></article><article><span>{isGovernment ? 'Exposure reduction' : 'Local connections'}</span><strong>{isGovernment ? `${Math.round((plan?.totals.exposure_reduction_pct ?? 41.2) * budgetRatio)}%` : '04'}</strong><small>{isGovernment ? 'counterfactual simulation' : 'community · government · emergency · organizations'}</small></article><article><span>{isGovernment ? 'Area restored' : 'Live outlook'}</span><strong>{isGovernment ? `${availableCandidates.reduce((total, candidate) => total + candidate.area_ha, 0).toFixed(1)} ha` : `${Math.round(liveRisk?.points.at(-1)?.risk_score ?? 0)}/100`}</strong><small>{isGovernment ? `${availableCandidates.length} mapped sites within frozen scenario` : 'your area’s latest model reading'}</small></article><article><span>{isGovernment ? 'CO₂ captured' : 'What to do'}</span><strong>{isGovernment ? `${Math.round((plan?.totals.co2_t_10yr ?? 1_800) * budgetRatio).toLocaleString()} t` : 'Connect'}</strong><small>{isGovernment ? 'literature screening factor · 10 years' : 'use the map nodes to find relevant help'}</small></article></section>
    <JudgePath city={city} onCityChange={setCity} cities={cityPacks} apiBase={import.meta.env.VITE_API_BASE_URL} />
    <RiskPointDialog point={selectedForecast} onClose={() => setSelectedForecast(null)} />
    {loginOpen && <LoginPage onClose={() => setLoginOpen(false)} onLogin={signIn} onRemoteLogin={signInCitizen} onRegister={register} />}
    {locationConsentOpen && <LocationConsentPage onClose={() => setLocationConsentOpen(false)} onApprove={saveConsent} />}
    {governmentLoginOpen && <GovernmentLoginPage onClose={() => setGovernmentLoginOpen(false)} onLogin={signInGovernment} />}
    {searchOpen && <SearchPage query={searchQuery} onQueryChange={setSearchQuery} onSelect={selectRegion} onClose={() => setSearchOpen(false)} />}
    <AgentDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
  </main>;
}
export default App;
