export const money = (value: number | null | undefined) => {
  if (value == null || !Number.isFinite(value)) return "—";
  return value >= 1_000_000
    ? `$${(value / 1_000_000).toFixed(2)}M`
    : `$${Math.round(value).toLocaleString()}`;
};

export const metric = (value: number | null | undefined, maximumFractionDigits = 1) =>
  value == null || !Number.isFinite(value)
    ? "—"
    : value.toLocaleString(undefined, { maximumFractionDigits });

export const risk = (value: number | null | undefined) => metric(value, 1);
export const humanize = (value: string | undefined) => (value || "preventive measure").replace(/_/g, " ");
export const textValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value.join("; ") : value;
export const n0 = (x: number) => Math.round(x).toLocaleString();

/** "2013-11-10" -> "10 November 2013"; null if it isn't a real date. */
export const longDate = (iso: string | undefined) => {
  if (!iso) return null;
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
};

/** Whole years once a wait is long enough that decimals are noise; one decimal below that. */
export const plainYears = (n: number) => (n >= 2 ? String(Math.round(n)) : n.toFixed(1));
export const everyYears = (n: number) => `every ${plainYears(n)} year${plainYears(n) === "1" ? "" : "s"}`;
export const oldPhrase = (old: number) => (old === 100 ? "once a century" : `once every ${old} years`);
