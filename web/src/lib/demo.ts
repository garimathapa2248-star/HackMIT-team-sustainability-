import type { Chapter, Overlay } from "./types";

export const CHAPTERS: { id: Chapter; n: string; label: string; key: string }[] = [
  { id: "noise", n: "01", label: "Noise", key: "1" },
  { id: "signal", n: "02", label: "Tail", key: "2" },
  { id: "plan", n: "03", label: "Plan", key: "3" },
  { id: "backtest", n: "04", label: "Proof", key: "4" },
  { id: "ask", n: "05", label: "Ask", key: "5" },
  { id: "report", n: "06", label: "Export", key: "6" },
];

const CHAPTER_SET = new Set<Chapter>(CHAPTERS.map((row) => row.id));

export const CHAPTER_ALIASES: Record<string, Chapter> = {
  proof: "backtest",
  tail: "signal",
  export: "report",
  plant: "plan",
  rain: "noise",
};

export function parseChapter(raw: string | null): Chapter | null {
  if (!raw) return null;
  const value = raw.toLowerCase();
  if (CHAPTER_ALIASES[value]) return CHAPTER_ALIASES[value];
  return CHAPTER_SET.has(value as Chapter) ? (value as Chapter) : null;
}

export type DemoBeat = {
  chapter: Chapter;
  overlay?: Overlay;
  proofEvent?: "2024" | "2017";
  riskView?: "before" | "with_plan";
  title: string;
  cue: string;
};

export const DEMO_BEATS: DemoBeat[] = [
  {
    chapter: "backtest",
    overlay: "both",
    proofEvent: "2024",
    riskView: "before",
    title: "Proof · 2024 radar",
    cue: "27 Sep 2024 Koshi flood. Blue fill is UNOSAT Sentinel-1. Gold outline is our model. CSI 0.053 — we lose to JRC 0.067 and we say so.",
  },
  {
    chapter: "backtest",
    overlay: "both",
    proofEvent: "2017",
    riskView: "before",
    title: "Proof · 2017 transfer",
    cue: "Same frozen 2024 model on a flood it never saw: 13 Aug 2017 western Terai. Transfer CSI 0.088. Not the same valley.",
  },
  {
    chapter: "noise",
    title: "Noise · 12,066 station-years",
    cue: "498 NOAA stations parsed on Voloridge compute. Missing years, sentinels, broken accumulation windows — counted, not smoothed away.",
  },
  {
    chapter: "signal",
    title: "Tail · 7.75-year rain",
    cue: "The old 100-year daily rain now fits 7.75 years. Nepal ranks first here. Hazard recs sit under the chips. HMA pool: no shift.",
  },
  {
    chapter: "plan",
    title: "Plan · $2M portfolio",
    cue: "62 floodplain sites. Screening BCR, NPV, a three-phase pathway, and four books under the same $2M. Equity up to 1.5×.",
  },
  {
    chapter: "ask",
    title: "Ask · grounded agent",
    cue: "Ask why a site was selected. Answers come only from artifacts — if a number isn’t in the pack, it says it doesn’t have it.",
  },
  {
    chapter: "report",
    title: "Export · take to a funder",
    cue: "One click: screening plan, government scorecard, citizen brief. Resilience as an auditable portfolio.",
  },
];

export const ASK_PROMPTS = [
  "What is the screening NPV and IRR?",
  "Why is the 100-year storm now a 7.75-year storm?",
  "What is the CSI, and does the model beat JRC?",
  "What does the 29.7% counterfactual reduction mean?",
  "Did ERA5 replicate the rainfall-tail headline?",
];

export function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}
