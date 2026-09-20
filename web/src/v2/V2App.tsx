import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import LiveBrief from "./LiveBrief";
import RankingsBoard from "./RankingsBoard";
import WorldMap from "./WorldMap";
import {
  cellKey,
  fetchPlace,
  fetchRankings,
  searchPlaces,
  type LivePlaceBrief,
  type RankedPlace,
  type RankingsPayload,
  type SearchHit,
} from "./liveApi";

const HOVER_MS = 420;

type Panel = "brief" | "rankings";

export default function V2App() {
  const [panel, setPanel] = useState<Panel>("brief");
  const [cursor, setCursor] = useState<{ lat: number; lng: number } | null>(null);
  const [pinned, setPinned] = useState<{ lat: number; lng: number } | null>(null);
  const [brief, setBrief] = useState<LivePlaceBrief | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metric, setMetric] = useState("composite");
  const [rankings, setRankings] = useState<RankingsPayload | null>(null);
  const [rankLoading, setRankLoading] = useState(false);
  const [rankError, setRankError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const cache = useRef(new Map<string, LivePlaceBrief>());
  const abortRef = useRef<AbortController | null>(null);
  const selectedId = useMemo(() => {
    if (!pinned || !rankings) return null;
    const hit = rankings.places.find(
      (row) => Math.abs(row.lat - pinned.lat) < 0.15 && Math.abs(row.lng - pinned.lng) < 0.15
    );
    return hit?.id || null;
  }, [pinned, rankings]);

  const loadPlace = useCallback(async (lat: number, lng: number) => {
    const key = cellKey(lat, lng);
    const cached = cache.current.get(key);
    if (cached) {
      setBrief(cached);
      setError(null);
      setLoading(false);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    try {
      const payload = await fetchPlace(lat, lng, controller.signal);
      if (abortRef.current !== controller) return;
      cache.current.set(key, payload);
      setBrief(payload);
      setError(payload.ok === false ? payload.note || "Live briefing degraded." : null);
    } catch (err) {
      if ((err as { name?: string }).name === "AbortError") return;
      if (abortRef.current !== controller) return;
      setError("Live API unreachable. Run python3 -m api.main in rootledger.");
    } finally {
      if (abortRef.current === controller) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const target = pinned || cursor;
    if (!target) return;
    const timer = window.setTimeout(() => {
      void loadPlace(target.lat, target.lng);
    }, pinned ? 0 : HOVER_MS);
    return () => window.clearTimeout(timer);
  }, [cursor, pinned, loadPlace]);

  const loadRanks = useCallback(async (nextMetric: string) => {
    setRankLoading(true);
    setRankError(null);
    try {
      const payload = await fetchRankings(nextMetric);
      setRankings(payload);
    } catch {
      setRankError("Rankings need the live API. Start python3 -m api.main.");
    } finally {
      setRankLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRanks(metric);
  }, [metric, loadRanks]);

  useEffect(() => {
    const q = query.trim();
    setHits([]);
    if (q.length < 3) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      searchPlaces(q, controller.signal)
        .then((payload) => {
          if (!controller.signal.aborted) setHits(payload.results || []);
        })
        .catch(() => {
          if (!controller.signal.aborted) setHits([]);
        });
    }, 400);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function pinAt(lat: number, lng: number) {
    setPinned({ lat, lng });
    setCursor({ lat, lng });
    setPanel("brief");
    setHits([]);
    setQuery("");
  }

  function onCity(city: RankedPlace) {
    pinAt(city.lat, city.lng);
  }

  return (
    <div className="v2-root">
      <WorldMap
        cursor={cursor}
        pinned={pinned}
        cities={rankings?.places || []}
        metric={metric}
        onMove={(lat, lng) => {
          if (pinned) return;
          setCursor((prev) => {
            if (prev && Math.abs(prev.lat - lat) < 0.002 && Math.abs(prev.lng - lng) < 0.002) return prev;
            return { lat, lng };
          });
        }}
        onPin={pinAt}
        onCity={onCity}
      />

      <header className="v2-top">
        <div>
          <p className="v2-brand">RootLedger v2</p>
          <p className="v2-tag">Live world prevention</p>
        </div>
        <form
          className="v2-search"
          onSubmit={(event) => {
            event.preventDefault();
            if (hits[0]) pinAt(hits[0].lat, hits[0].lng);
          }}
        >
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search any place"
            aria-label="Search any place"
          />
          {hits.length > 0 && (
            <ul>
              {hits.map((hit) => (
                <li key={`${hit.lat},${hit.lng}`}>
                  <button type="button" onClick={() => pinAt(hit.lat, hit.lng)}>
                    {hit.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </form>
        <nav className="v2-tabs">
          <button className={panel === "brief" ? "on" : ""} onClick={() => setPanel("brief")}>
            Brief
          </button>
          <button className={panel === "rankings" ? "on" : ""} onClick={() => setPanel("rankings")}>
            Rankings
          </button>
        </nav>
      </header>

      <aside className="v2-dock">
        {panel === "rankings" ? (
          <RankingsBoard
            payload={rankings}
            metric={metric}
            loading={rankLoading}
            error={rankError}
            selectedId={selectedId}
            onMetric={setMetric}
            onSelect={onCity}
            onRefresh={() => void loadRanks(metric)}
          />
        ) : (
          <LiveBrief
            brief={brief}
            loading={loading}
            error={error}
            pinned={Boolean(pinned)}
            onUnpin={() => setPinned(null)}
          />
        )}
      </aside>

      <p className="v2-hint">
        Hover anywhere · tap/click to pin · dots are live-ranked cities · not the Koshi ledger
      </p>
    </div>
  );
}
