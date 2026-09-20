import { useEffect, useRef, useState } from 'react';

type Coordinate = { latitude: number; longitude: number };
type Props = {
  selectedFeature?: any;
  isLoading: boolean;
  onSelect: (coordinate: Coordinate) => void;
};

declare global {
  interface Window { google?: any; __rootledgerGoogleMaps?: Promise<void>; }
}

const NEPAL = { lat: 28.35, lng: 84.05 };

function loadGoogleMaps(apiKey: string) {
  if (window.google?.maps) return Promise.resolve();
  if (window.__rootledgerGoogleMaps) return window.__rootledgerGoogleMaps;
  window.__rootledgerGoogleMaps = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google Maps could not load.'));
    document.head.appendChild(script);
  });
  return window.__rootledgerGoogleMaps;
}

/** A real Google satellite map when configured, with an intentional offline fallback. */
export function GoogleMapCanvas({ selectedFeature, isLoading, onSelect }: Props) {
  const elementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const dataRef = useRef<any>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'fallback'>('loading');
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey) { setState('fallback'); return; }
    let cancelled = false;
    loadGoogleMaps(apiKey).then(() => {
      if (cancelled || !elementRef.current) return;
      const map = new window.google.maps.Map(elementRef.current, {
        center: NEPAL,
        zoom: 7,
        mapTypeId: 'satellite',
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: 'greedy',
        backgroundColor: '#211538',
      });
      map.addListener('click', (event: any) => onSelect({ latitude: event.latLng.lat(), longitude: event.latLng.lng() }));
      mapRef.current = map;
      dataRef.current = new window.google.maps.Data({ map });
      setState('ready');
    }).catch(() => { if (!cancelled) setState('fallback'); });
    return () => { cancelled = true; };
  }, [apiKey, onSelect]);

  useEffect(() => {
    if (!dataRef.current) return;
    dataRef.current.forEach((feature: any) => dataRef.current.remove(feature));
    if (!selectedFeature) return;
    dataRef.current.addGeoJson(selectedFeature);
    dataRef.current.setStyle({ fillColor: '#bb8cff', fillOpacity: 0.3, strokeColor: '#fff5db', strokeWeight: 2.5 });
    const ring = (selectedFeature.geometry as any)?.coordinates?.[0] ?? [];
    if (ring.length && mapRef.current) {
      const bounds = new window.google.maps.LatLngBounds();
      ring.forEach(([longitude, latitude]: [number, number]) => bounds.extend({ lat: latitude, lng: longitude }));
      mapRef.current.fitBounds(bounds, 84);
    }
  }, [selectedFeature]);

  const fallbackSelect = (event: React.MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const longitude = 80 + ((event.clientX - bounds.left) / bounds.width) * 8.3;
    const latitude = 30.4 - ((event.clientY - bounds.top) / bounds.height) * 4.1;
    onSelect({ latitude, longitude });
  };

  return <div className={`google-map-canvas ${state === 'fallback' ? 'is-fallback' : ''}`} ref={elementRef} onClick={state === 'fallback' ? fallbackSelect : undefined}>
    {state === 'fallback' && <><img src="/nepal-satellite-map.jpg" alt="NASA Visible Earth satellite image of Nepal" /><div className="fallback-grid" /></>}
    {state === 'loading' && <span className="map-loading">Loading map…</span>}
    {isLoading && <div className="map-analysis-loading"><i />Analyzing selected model coverage…</div>}
    {state === 'fallback' && <small className="map-fallback-note">Offline satellite fallback · add VITE_GOOGLE_MAPS_API_KEY for the interactive Google satellite map</small>}
  </div>;
}
