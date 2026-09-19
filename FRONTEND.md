# §9D — Frontend + Demo: full implementation roadmap (Garima)

Your job in one sentence: **every number a judge sees comes from a file in `artifacts/`, and the whole thing still works with the wifi off.**

Two decisions to make in the first ten minutes, because everything else follows from them:

1. **Build against `contracts/fixtures/` from minute one.** You are never blocked. The real artifacts are drop-in replacements with identical shapes. If Jeevith's fixtures aren't committed by H+1, write them yourself from §6 — do not wait.
2. **`demo_cache/` is not a step at H+18. It is the default data source from H+1.** Your app reads fixtures/cache first and the API second, always. Then "offline mode" isn't a feature you bolt on the night before — it's the path you've been testing for 20 hours.

The prototype at `web/index.html` is your **design reference and your ultimate fallback**: a single file, no build, that already implements the five acts, the swipe comparator, the budget slider, the frontier chart and the agent drawer. If Vite ever breaks at H+22, you open that file and present. Keep it working.

---

## The stack

| | Choice | Notes |
|---|---|---|
| Scaffold | `npm create vite@latest web -- --template react-ts` | per §9D |
| Map | **MapLibre GL** + **deck.gl** (`@deck.gl/react`, `MapboxOverlay`) | deck for data layers, MapLibre for basemap/terrain |
| Charts | **Recharts** | return-level curve, frontier |
| State | **Zustand** (~1 KB) | one store; skip Redux |
| Data fetch | plain `fetch` + a 20-line cache-first client | no React Query needed at this size |
| Styling | CSS modules or plain CSS with variables | Tailwind only if you already know it — no learning on the clock |
| Scroll | **scrollama** *(only if you do the scrollytelling layout)* | |
| Basemap | dark raster or vector style, self-hosted in `public/` | **never** a style URL needing a key at demo time |

```bash
npm i maplibre-gl deck.gl @deck.gl/react @deck.gl/layers @deck.gl/aggregation-layers \
      recharts zustand scrollama
```

---

## Layout: pick one

**Option A — Dashboard (safer, what §9D assumes).** Sticky left map ~65%, right control column. Judges scan it like a product. Faster to build, harder to make memorable.

**Option B — Scrollytelling (the prototype).** Sticky map, right rail scrolls through the six loop stages, scroll position drives map state. It *tells the story for you* while you talk, which means you present better under pressure. Slightly more work; it's already built once in `web/index.html`, so you're porting, not inventing.

**Recommendation: B, with A's controls pinned.** The budget slider lives in the header and is always live, regardless of scroll position. That's the hybrid the prototype ships.

```
┌──────────────────────────────────────────────────────────────┐
│ RootLedger · Rolwaling → Tama Koshi   [BUDGET ▮▮▮▮──] $2.0M  │  header, always visible
├───────────────────────────────────────┬──────────────────────┤
│                                       │  01 OBSERVE          │
│                                       │  02 MEASURE          │
│            MAP (sticky)               │  03 PROVE   ← scroll │
│                                       │  04 OPTIMIZE  drives │
│         + legend, scale bar           │  05 FUND      the map│
│         + provenance strip            │  06 VERIFY           │
├───────────────────────────────────────┴──────────────────────┤
│  ← agent drawer slides over the right third when a ? clicked │
└──────────────────────────────────────────────────────────────┘
```

---

## Hour-by-hour

### H+0 → H+1 · Scaffold

```bash
npm create vite@latest web -- --template react-ts && cd web && npm i …
mkdir -p src/{components,layers,lib,store} public/demo_cache
```

Copy `contracts/fixtures/*.json` into `public/demo_cache/`. Get a dark basemap rendering with the bbox from §9B-B0. **Commit.** Ship nothing else this hour.

### H+1 → H+3 · Types + data layer (do this before any UI)

Transcribe §6 into `src/lib/types.ts` by hand. It takes 20 minutes and it is the only thing standing between you and a 2 a.m. `undefined is not an object` while a judge watches.

```ts
// src/lib/types.ts — mirrors contracts/schemas.md §6
export interface Signal {
  region: string; stations_processed: number; station_years: number;
  return_levels_mm: Record<string, number>;
  return_levels_ci95: Record<string, [number, number]>;
  headline: { statement: string; old_return_period_yrs: number;
              new_return_period_yrs: number; threshold_mm: number };
  trend: { metric: string; slope_mm_per_decade: number; p_value: number };
  landslide_trigger: { form: string; a: number; b: number; n_events: number; auc: number };
  lake_growth: { lake_id: string; name: string; area_km2_first: number;
                 area_km2_last: number; first_year: number; last_year: number;
                 pct_growth: number }[];
  provenance: { datasets: string[]; generated_utc: string };
}

export interface HazardProps {
  cell_id: string; flood_depth_m: { rp10: number; rp100: number };
  glof_depth_m: number; landslide_prob: number; population: number;
  critical_assets: string[]; eal_people: number; eal_usd: number;
}

export interface Plan {
  budget_usd: number; mode: "expected" | "cvar";
  selected: { parcel_id: string; cost_usd: number; avoided_eal_people: number;
              co2_t_10yr: number; income_usd_yr: number }[];
  totals: { cost_usd: number; people_protected: number; exposure_reduction_pct: number;
            co2_t_10yr: number; income_usd_yr: number; households_benefiting: number };
  frontier: { budget_usd: number; people_protected: number; co2_t_10yr: number }[];
  cvar: { mode_available: boolean; tail_people_protected: number };
}

export interface Backtest {
  event_date: string; sar_scene: string;
  observed_flood_km2: number; modeled_flood_km2: number;
  hit_rate_pod: number; false_alarm_ratio: number; critical_success_index: number;
  counterfactual: { people_exposed_baseline: number; people_exposed_with_plan: number;
                    reduction_pct: number };
}
```

The cache-first client — **this is your insurance policy, written on hour two, not hour twenty:**

```ts
// src/lib/api.ts
const API   = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const CACHE = import.meta.env.VITE_USE_CACHE === "true";

async function cached<T>(name: string): Promise<T> {
  const r = await fetch(`/demo_cache/${name}`);
  if (!r.ok) throw new Error(`missing cache: ${name}`);
  return r.json();
}

/** Try the API; fall back to the committed cache. Never throws at the caller. */
async function get<T>(path: string, cacheName: string, init?: RequestInit): Promise<T> {
  if (CACHE) return cached<T>(cacheName);
  try {
    const ctl = setTimeout(() => {}, 0);
    const r = await fetch(`${API}${path}`, { ...init, signal: AbortSignal.timeout(2500) });
    clearTimeout(ctl);
    if (!r.ok) throw new Error(String(r.status));
    return await r.json();
  } catch {
    console.warn(`[rootledger] API miss on ${path} → cache`);
    return cached<T>(cacheName);
  }
}

export const getSignal   = () => get<Signal>("/signal", "signal.json");
export const getHazard   = () => get<HazardFC>("/hazard", "hazard.geojson");
export const getBacktest = () => get<Backtest>("/backtest", "backtest.json");

export const optimize = (budget_usd: number, mode = "expected") =>
  get<Plan>("/optimize", planCacheName(budget_usd), {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ budget_usd, mode }),
  });

/** Cache plans on a 250k grid so the slider has an offline answer for every stop. */
const planCacheName = (b: number) =>
  `plans/plan_${Math.round(b / 250_000) * 250_000}.json`;
```

> **Tell Nalani at H+1:** you need `/optimize` responses pre-dumped for every 250k step from 0 to 5M into `demo_cache/plans/`. That's one loop on her side and it's what makes your slider work with no backend. Ask early; it's a five-minute job for her at H+2 and a disaster at H+19.

The store:

```ts
// src/store/index.ts
import { create } from "zustand";

export const useApp = create<{
  act: number; budget: number; mode: "expected" | "cvar";
  hazardLayer: "glof" | "monsoon" | "landslide" | "combined";
  swipe: number;                    // 0..1, backtest divider
  selected: string | null;          // parcel/cell id
  drawer: string | null;            // which metric the agent is explaining
  signal?: Signal; hazard?: HazardFC; plan?: Plan; backtest?: Backtest;
  set: (p: Partial<any>) => void;
}>((set) => ({
  act: 0, budget: 2_000_000, mode: "expected",
  hazardLayer: "combined", swipe: 0.5, selected: null, drawer: null,
  set: (p) => set(p),
}));
```

### H+3 → H+6 · The six views, on fixtures

Build them in this order — it is also the order of importance to the demo (§11).

**1 · Map + hazard choropleth.**

```tsx
// src/components/Map.tsx
import Map from "react-map-gl/maplibre";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { GeoJsonLayer, ScatterplotLayer } from "@deck.gl/layers";

const HAZARD_RAMP: [number, number, number][] = [   // amber → red, colorblind-safe
  [ 34, 52, 66], [120, 90, 40], [190,120, 40], [225, 90, 45], [200, 35, 45],
];
const ramp = (t: number) => HAZARD_RAMP[Math.min(4, Math.floor(t * 5))];

const hazardLayer = new GeoJsonLayer<HazardProps>({
  id: "hazard", data: hazard, pickable: true, stroked: false, filled: true,
  getFillColor: (f) => [...ramp(norm(f.properties.eal_people)), 170],
  updateTriggers: { getFillColor: [hazardMetric] },
  transitions: { getFillColor: 300 },          // repaint animates — reads as "computed"
  onClick: ({ object }) => set({ selected: object?.properties.cell_id ?? null }),
});

const plannedLayer = new ScatterplotLayer({
  id: "planned", data: plan.selected, pickable: true,
  getPosition: (d) => centroidOf(d.parcel_id),
  getRadius: (d) => 40 + Math.sqrt(d.avoided_eal_people) * 25,
  getFillColor: [52, 211, 153, 220],           // the one growth accent
  transitions: { getRadius: 400, getFillColor: 400 },
});
```

Hover tooltip = households, GLOF arrival, modelled depth, EAL. Keep it to four rows.

**2 · Signal panel.** The return-level curve with the CI band is the Voloridge judge's exhibit — give it room.

```tsx
<ComposedChart data={curve}>
  <XAxis dataKey="rp" scale="log" domain={[2, 100]} ticks={[2,5,10,25,50,100]}
         tickFormatter={(v) => `${v}yr`} />
  <YAxis tickFormatter={(v) => `${v}mm`} />
  <Area dataKey="ci" fill="#38bdf8" fillOpacity={0.15} stroke="none" />   {/* 95% band */}
  <Line dataKey="level" stroke="#38bdf8" strokeWidth={2} dot={false} />
  <ReferenceLine x={signal.headline.new_return_period_yrs} stroke="#f59e0b"
                 strokeDasharray="4 4"
                 label={{ value: `now every ${n} yrs`, fill: "#f59e0b" }} />
</ComposedChart>
```

Above it, the headline as one enormous line: **100-year storm → 34-year storm.** Don't bury `headline.statement` in a paragraph; it is the single most important sentence in the project.

**3 · Backtest swipe.** Two layers, one clipped to the divider. CSI/POD/FAR shown as three honest numbers, never one flattering one.

```tsx
// clip the modelled layer at the divider — CSS, works on canvas overlays
<div className="swipe-wrap">
  <div className="layer observed" />
  <div className="layer modelled" style={{ clipPath: `inset(0 0 0 ${swipe * 100}%)` }} />
  <div className="divider" style={{ left: `${swipe * 100}%` }} onPointerDown={startDrag} />
</div>
```

Label the two sides permanently: `OBSERVED · Sentinel-1 SAR, 2024-09-28` and `MODEL OUTPUT · frozen 2024-09-20`. Those labels do the credibility work while you talk.

**4 · Plan view.** Budget slider → debounce 120 ms → `optimize()` → map repaints, three counters animate.

```tsx
const onBudget = useDebouncedCallback(async (b: number) => {
  set({ budget: b, loading: true });
  set({ plan: await optimize(b, mode), loading: false });
}, 120);
```

Counters must **tick**, not jump — `requestAnimationFrame` interpolation over ~450 ms. This is the single highest-value piece of animation polish in the whole app: it makes the optimizer look like it is thinking.

```ts
export function useTicker(value: number, ms = 450) {
  const [shown, setShown] = useState(value);
  useEffect(() => {
    const from = shown, t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      setShown(from + (value - from) * (1 - Math.pow(1 - k, 3)));   // ease-out cubic
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return shown;
}
```

Efficient frontier from `plan.frontier`, with a dot marking where the current budget sits. When the slider moves, the dot slides along the curve — that's what proves it's an optimizer and not a lookup table.

**5 · Ask panel.** A drawer, not a page. Every headline number gets a small `?`; clicking opens the drawer pre-seeded with that number's explanation. Free-text box at the bottom posts to `/ask`.

```tsx
<span className="metric">
  {fmt.people(plan.totals.people_protected)}
  <button className="why" onClick={() => set({ drawer: "people_protected" })}>?</button>
</span>
```

**Hard rule from §12's risk register:** the big number is rendered from the artifact; the agent's prose goes *underneath* it. Never let the number itself come out of the model's text. If the API is down, show the prebaked card from `demo_cache/agent_index.json`.

**6 · Report.** Rendered concept note in a modal with a download button. Make it look like a document — serif body, page margins, a header block, a budget table. A markdown blob in a `<pre>` reads as unfinished; the same content in document styling reads as fundable.

### H+6 → H+14 · Wire to the real API

Flip `VITE_USE_CACHE=false` and point at Nalani's service. Handle each artifact landing independently — a real `signal.json` should not need `plan.json` to exist.

**Never a white screen.** Three states per panel:

```tsx
{!data   && <Skeleton rows={3} />}                               {/* shimmer, not spinner */}
{ stale  && <Badge tone="amber">cached · {ago(ts)}</Badge>}
{ data   && <Panel {...data} />}
```

Wrap the map in an error boundary that falls back to the cached GeoJSON. A panel that quietly says "cached" is invisible to judges; a stack trace is not.

### H+14 → H+18 · Make it beautiful

This is not optional polish — §9D is right that a clean UI reads as "finished product" more than any feature.

**Palette.** Dark slate base so the data carries the color. Exactly two accents: hazard amber→red, restoration green. Nothing else gets a color.

```css
:root {
  --bg:      #0b1015;   /* page */
  --panel:   #121a22;   /* cards */
  --line:    #1e2a35;   /* hairlines */
  --text:    #e6edf3;
  --muted:   #7d8f9f;   /* labels, provenance */
  --hazard:  #e0503a;   /* risk, observed flood */
  --hazard-2:#f59e0b;   /* secondary risk / highlights */
  --grow:    #34d399;   /* interventions, carbon, income */
  --water:   #38bdf8;   /* SAR observed water, signal curve */
}
```

**Type.** One condensed/display face for numbers at 44–72 px (Archivo, Barlow Condensed, Inter Tight), one grotesk for body at 14–15 px, one mono at 10–11 px for provenance. The numbers should be *uncomfortably large* — a judge reads three numbers across the room, not your paragraphs.

**Number formatting** (§9D calls this out and it is genuinely a scoring difference):

```ts
export const fmt = {
  people:  (n: number) => `${Math.round(n).toLocaleString()} people`,
  usd:     (n: number) => n >= 1e6 ? `$${(n/1e6).toFixed(1)}M`
                        : n >= 1e3 ? `$${Math.round(n/1e3)}k` : `$${Math.round(n)}`,
  co2:     (n: number) => `${Math.round(n).toLocaleString()} tCO₂e`,
  pct:     (n: number) => `${n.toFixed(1)}%`,
  skill:   (n: number) => n.toFixed(2),        // CSI/POD/FAR — always 2 dp, never %
};
```

`28,400 people`, `$186k/yr`, `CSI 0.66`. Never `28400.0`, never `0.66000001`.

**Honesty labels (§14) — build them into the components, not as an afterthought.** Every panel carries one chip:

```tsx
<Tag kind="observed" />    // Sentinel-1 SAR, NOAA ISD
<Tag kind="model" />       // HAND depths, GLOF routing
<Tag kind="assumption" />  // cost per ha, sequestration factors
<Tag kind="simulation" />  // counterfactual with plan
```

Say "screening-grade" and "counterfactual simulation" in the UI copy. Never "prediction". Judges trust a tool that marks its own uncertainty far more than one that doesn't, and this costs you 30 minutes.

**Provenance strip.** 10 px mono under the map: `Copernicus DEM GLO-30 · S1A_IW_GRDH 2024-09-28 · NOAA ISD 9,840 station-years · WorldPop 2020`. Cheap, and it raises perceived rigor more than anything else per minute spent.

**Motion budget.** Numbers tick, layers cross-fade (300 ms), map flies between acts (1.2 s ease). *Nothing else moves.* No entrance animations on panels — they read as a template.

**Empty/edge states to actually check:** budget = $0 (plan is empty — show "no interventions funded", not a broken chart), budget = max (all selected), a cell with zero population, a settlement missed by the model (say so in the backtest panel — admitting the one miss is more persuasive than hiding it).

### H+18 → H+20 · FREEZE

Non-negotiable checklist:

- [ ] Final artifacts copied into `public/demo_cache/`, including `plans/plan_*.json` for every slider stop
- [ ] `agent_index.json` prebaked for the ~10 clickable numbers
- [ ] `.env.production` with `VITE_USE_CACHE=true`
- [ ] Basemap tiles self-hosted in `public/` — **no network style URL, no API key**
- [ ] Fonts self-hosted — no Google Fonts CDN call
- [ ] `npm run build && npx serve dist` — **test with wifi physically off**
- [ ] Committed. Tagged. `git tag demo-freeze`
- [ ] `web/index.html` single-file prototype still opens and runs as the last-resort fallback
- [ ] README done (20-second GIF of the swipe + slider at the top, then the loop, then the metrics table, then setup)

After this: **no new features.** Only bug fixes that you can test in under five minutes.

### H+20 → H+24 · Rehearse 5×, out loud, on the demo laptop

Map the §11 script to exact interactions so your hands know the path:

| Beat | What you do | Pre-check |
|---|---|---|
| 0:00 hook | SAR flood layer already on screen at load | app opens on act 3, not a landing page |
| 0:25 proof | drag the swipe divider once, slowly | CSI number visible without scrolling |
| 0:45 signal | scroll to signal panel | headline renders at 60 px+ |
| 1:15 stakes | click the settlement below Tsho Rolpa | tooltip has population + assets |
| 1:50 plan | drag budget to $2M | counters tick, map lights green |
| 2:20 tail risk | toggle CVaR | works, or is hidden entirely |
| 2:40 agent | click `?` on people protected | answers in <2 s from cache |
| 2:55 note | Generate concept note | PDF opens, looks like a document |

Add `?demo=1` autoplay (already in the prototype) that walks the acts on a timer. It is your recovery path if your hands shake or a click misses — and it doubles as a booth loop while you talk to the Voloridge judge.

Time it. If you're over 3.5 min, cut in §12's order — the cuts are UI-side: hide the tail-risk toggle, skip the agent free-text, skip the stakes zoom.

---

## What to build if you fall behind

Ranked by judge-visible value per hour. Anything below the line gets cut without regret.

1. Map + hazard layer + settlements — **without this there is no demo**
2. Backtest swipe + CSI (beat 2, never cut)
3. Budget slider + three ticking counters (beat 6, never cut)
4. Signal headline + return-level curve (beat 3, the sponsor prize)
5. Concept note modal + download (beat 8, never cut)
6. Efficient frontier chart
7. Agent drawer on prebaked cards
8. — cut line —
9. Agent free-text box
10. CVaR toggle
11. Responsibility-split panel
12. 3D terrain / GLOF flythrough

---

## Things that will bite you

| | Fix |
|---|---|
| `hazard.geojson` arrives at 40 MB and the browser stalls | Ask Subodh at **H+10**, not H+16, to simplify geometry and round coordinates to 5 dp (§9B says <10 MB). If it lands big anyway: `mapshaper -simplify 20% -o precision=0.00001`. |
| Slider fires 60 requests/second | Debounce 120 ms + cache plans by rounded budget. Already in the client above. |
| Agent takes 6 s on stage | Prebake. The `?` cards must render instantly from cache; live API is an upgrade, not the path. |
| deck.gl + MapLibre version mismatch | Pin versions in hour one, `npm ci` before the freeze. Don't upgrade anything after H+18. |
| Fonts/tiles from a CDN | Self-host both. Conference wifi will fail; assume it. |
| Contracts change after H+1 | Parse defensively — optional chaining and `??` defaults everywhere. A missing field should blank one tile, not the app. |
| You get pulled into backend work | §9D is explicit: don't. You are the one presenting, and the demo is judged on what they see. |

