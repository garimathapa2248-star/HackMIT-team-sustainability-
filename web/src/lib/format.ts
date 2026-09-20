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

const TYPE_NAMES: Record<string, string> = {
  floodplain_restore: "floodplain restoration",
  wetland_restore: "wetland restoration",
  riverbank_bio: "riverbank bioengineering",
  vetiver_slope: "vetiver slope",
  bamboo_slope: "bamboo slope",
  afforestation: "afforestation",
};

export const humanize = (value: string | undefined) =>
  TYPE_NAMES[value || ""] || (value || "preventive measure").replace(/_/g, " ");

export const textValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value.join("; ") : value;

export const unavailable = "unavailable";

export const chartGrid = "rgba(143,160,184,0.15)";
export const chartTick = "#8fa0b8";
export const chartTooltip = { background: "#10182a", border: "1px solid #2a3a55" };
