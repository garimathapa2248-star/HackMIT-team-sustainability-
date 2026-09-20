export const LIVE_API = import.meta.env.VITE_API_URL || "";

export type LiveCitation = {
  agency: string;
  title: string;
  url: string;
  guidance: string;
};

export type LiveMeasure = {
  id: string;
  hazard: string;
  severity: string;
  score: number;
  priority: number;
  action: string;
  why_here_now: string;
  citation: LiveCitation;
};

export type LiveRisk = {
  id: string;
  label: string;
  score: number;
  level: string;
  summary: string;
};

export type LivePlaceBrief = {
  ok: boolean;
  degraded?: boolean;
  note?: string | null;
  cell?: string;
  lat: number;
  lng: number;
  queried_at?: string;
  place?: {
    ok?: boolean;
    name?: string | null;
    display?: string;
    country?: string | null;
    country_code?: string | null;
    admin?: string | null;
    kind?: string;
  };
  conditions?: Record<string, number | string | null | undefined>;
  risks?: LiveRisk[];
  composite?: number;
  measures?: LiveMeasure[];
  events?: {
    quakes?: { mag?: number; place?: string; distance_km?: number; age_hours?: number }[];
    eonet?: { title?: string; category?: string; distance_km?: number }[];
    reliefweb?: { title?: string; type?: string; url?: string }[];
  };
  sources?: { id: string; ok?: boolean; error?: string | null; fetched_at?: string; note?: string }[];
};

export type RankedPlace = {
  id: string;
  rank: number;
  name: string;
  country: string;
  lat: number;
  lng: number;
  composite: number;
  metric_score: number;
  scores: Record<string, number>;
  top_hazard?: LiveRisk | null;
  conditions?: Record<string, number | string | null | undefined>;
  queried_at?: string;
  degraded?: boolean;
  error?: string;
};

export type RankingsPayload = {
  ok: boolean;
  metric: string;
  updated_at: string;
  count: number;
  places: RankedPlace[];
  sources?: { id: string; note?: string }[];
  method?: string;
  error?: string;
};

export type SearchHit = { name: string; lat: number; lng: number; kind?: string };

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${LIVE_API}${path}`, { signal });
  if (!response.ok) throw new Error(`${path} ${response.status}`);
  return (await response.json()) as T;
}

export function fetchPlace(lat: number, lng: number, signal?: AbortSignal) {
  return getJson<LivePlaceBrief>(`/live/place?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`, signal);
}

export function fetchRankings(metric: string, signal?: AbortSignal) {
  return getJson<RankingsPayload>(`/live/rankings?metric=${encodeURIComponent(metric)}`, signal);
}

export function searchPlaces(q: string, signal?: AbortSignal) {
  return getJson<{ ok: boolean; results: SearchHit[]; error?: string }>(
    `/live/search?q=${encodeURIComponent(q)}`,
    signal
  );
}

export function cellKey(lat: number, lng: number, size = 0.05) {
  return `${(Math.round(lat / size) * size).toFixed(2)},${(Math.round(lng / size) * size).toFixed(2)}`;
}
