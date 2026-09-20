import { ReactNode } from "react";
import { C } from "./colors";

/** Shared recharts axis props: recessive, no tick lines, tabular numerals. */
export const axisProps = {
  stroke: C.axis,
  tick: { fill: C.axis, fontSize: 11 },
  tickLine: false,
  axisLine: { stroke: C.grid },
} as const;

type Entry = { name?: string; value?: unknown; color?: string; dataKey?: string | number };

/**
 * One tooltip for every chart: label on top, then a row per series with a colour key.
 * Range values (recharts band areas) render as "lo–hi".
 */
export function ChartTooltip({
  active,
  payload,
  label,
  title,
  fmt,
}: {
  active?: boolean;
  payload?: Entry[];
  label?: unknown;
  title?: (label: unknown) => ReactNode;
  fmt?: (value: number, name: string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tip">
      {label != null && <div className="chart-tip-title">{title ? title(label) : String(label)}</div>}
      {payload.map((entry, index) => {
        const name = String(entry.name ?? entry.dataKey ?? "");
        const value = entry.value;
        const text = Array.isArray(value)
          ? value.map((v) => (fmt ? fmt(Number(v), name) : String(v))).join(" – ")
          : typeof value === "number"
            ? fmt
              ? fmt(value, name)
              : String(value)
            : String(value ?? "—");
        return (
          <div className="chart-tip-row" key={`${name}-${index}`}>
            <i style={{ background: entry.color }} />
            <span>{name}</span>
            <b>{text}</b>
          </div>
        );
      })}
    </div>
  );
}

/** Legend for >= 2 series so identity is never colour alone. */
export function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <ul className="legend">
      {items.map((item) => (
        <li key={item.label}>
          <i style={{ background: item.color }} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
