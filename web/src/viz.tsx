import { typeColor, typeLabel } from "./colors";

const VW = 220;
const VH = 64;

/** Bars by decade: a gappy archive next to a continuous series. */
export function DecadeBars({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  const gap = 8;
  const bw = (VW - gap * (values.length - 1)) / Math.max(1, values.length);
  return (
    <svg className="viz" viewBox={`0 0 ${VW} ${VH}`} role="img" aria-label="Records kept, by decade">
      {values.map((v, i) => {
        const h = Math.max(3, (v / max) * (VH - 6));
        return <rect key={i} x={i * (bw + gap)} y={VH - h} width={bw} height={h} rx="3" className="v-bar" />;
      })}
    </svg>
  );
}

/** Line (with optional band) through evenly spaced points. */
export function LineMini({
  pts,
  marker,
  label,
}: {
  pts: { x?: number; y: number; lo?: number; hi?: number }[];
  marker?: number;
  label: string;
}) {
  if (pts.length < 2) return null;
  const all = pts.flatMap((p) => [p.y, p.lo ?? p.y, p.hi ?? p.y]);
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const xs = pts.map((p, i) => p.x ?? i);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const X = (i: number) => 8 + (((xs[i] - x0) / (x1 - x0 || 1)) * (VW - 16));
  const Y = (v: number) => VH - 8 - ((v - lo) / (hi - lo || 1)) * (VH - 16);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(p.y).toFixed(1)}`).join(" ");
  const hasBand = pts.every((p) => p.lo != null && p.hi != null);
  const band = hasBand
    ? `${pts.map((p, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(p.hi as number).toFixed(1)}`).join(" ")} ${[...pts]
        .reverse()
        .map((p, k) => `L${X(pts.length - 1 - k).toFixed(1)},${Y(p.lo as number).toFixed(1)}`)
        .join(" ")} Z`
    : null;
  const m = marker ?? pts.length - 1;
  return (
    <svg className="viz" viewBox={`0 0 ${VW} ${VH}`} role="img" aria-label={label}>
      {band && <path d={band} className="v-band" />}
      <path d={line} className="v-line" />
      <circle cx={X(m)} cy={Y(pts[m].y)} r="4.5" className="v-dot" />
    </svg>
  );
}

/** Paired bars per flood: our flood map vs a simple published water map. */
export function ProofBars({ events }: { events: { label: string; model: number; jrc: number }[] }) {
  const max = Math.max(0.001, ...events.flatMap((e) => [e.model, e.jrc]));
  const groupW = VW / events.length;
  const bw = 30;
  return (
    <svg className="viz" viewBox={`0 0 ${VW} ${VH}`} role="img" aria-label="Flood map score against a simple water map">
      {events.map((e, i) => {
        const cx = groupW * i + groupW / 2;
        const hm = Math.max(3, (e.model / max) * (VH - 22));
        const hj = Math.max(3, (e.jrc / max) * (VH - 22));
        return (
          <g key={e.label}>
            <rect x={cx - bw - 3} y={VH - 14 - hm} width={bw} height={hm} rx="3" className="v-bar" />
            <rect x={cx + 3} y={VH - 14 - hj} width={bw} height={hj} rx="3" className="v-bar grey" />
            <text x={cx} y={VH - 2} textAnchor="middle" className="v-text">
              {e.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Key for the overview map: risk ramp, recommended site types (from the plan), and the other candidate sites. */
export function MapKey({ types }: { types: string[] }) {
  return (
    <div className="map-key" role="group" aria-label="Map key">
      <div className="key-item">
        <span className="key-title">Risk to people</span>
        <span className="key-end">Lower</span>
        <span className="key-ramp" aria-hidden />
        <span className="key-end">Higher</span>
      </div>
      {types.length > 0 && (
        <div className="key-item">
          <span className="key-title">Recommended</span>
          {types.map((type) => (
            <span className="key-dot" key={type}>
              <i style={{ background: typeColor(type) }} />
              {typeLabel(type)}
            </span>
          ))}
        </div>
      )}
      <div className="key-item">
        <span className="key-dot">
          <i className="pale" />
          Other possible site
        </span>
      </div>
      <span className="key-hint">Click a dot for details</span>
    </div>
  );
}

