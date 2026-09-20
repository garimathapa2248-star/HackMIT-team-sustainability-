// One colour per nature-based intervention type (shared by the map, plan mix and table).
export const TYPE_COLOR: Record<string, string> = {
  vetiver_slope: "#3ee0c0",
  bamboo_slope: "#7bd88f",
  afforestation: "#4ade80",
  floodplain_restore: "#4aa3ff",
  wetland_restore: "#22d3ee",
  riverbank_bio: "#f0c14b",
};

export const TYPE_LABEL: Record<string, string> = {
  vetiver_slope: "Vetiver slope",
  bamboo_slope: "Bamboo slope",
  afforestation: "Afforestation",
  floodplain_restore: "Floodplain",
  wetland_restore: "Wetland",
  riverbank_bio: "Riverbank bio",
};

export const typeColor = (type: string) => TYPE_COLOR[type] || "#9fb2cc";
export const typeLabel = (type: string) =>
  TYPE_LABEL[type] || type.replace(/_/g, " ");

// Semantic chart colours: one job each, so a colour always means the same thing.
export const C = {
  accent: "#3ee0c0", // primary series / calibration
  blue: "#38bdf8", // validation / observed
  warn: "#f0c14b", // caution / modeled outline
  axis: "#8fa0b8",
  grid: "rgba(143,160,184,0.14)",
};
