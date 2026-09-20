import { createContext, useContext } from "react";
import type {
  Attribution,
  Backtest,
  CandidateSite,
  CityRow,
  MeasureDetails,
  Noise,
  OptimizationMode,
  OptimizerState,
  OverlayMode,
  Plan,
  Rankings,
  Replication,
  Scenarios,
  SelectedMeasure,
  Signal,
  View,
} from "./types";

export type Dash = {
  // navigation
  view: View;
  go: (view: View) => void;
  // city
  city: string;
  cityName: string;
  cities: CityRow[];
  setCity: (id: string) => void;
  loading: boolean;
  /** False when /health did not answer. The whole site renders an offline notice instead. */
  online: boolean;
  /** Koshi is the only pack with 2017 layers, ERA5, rankings, scenarios and the deep-dive blocks.
   *  The API silently serves Koshi data for other cities, so this must be gated client-side. */
  isKoshi: boolean;
  // data
  signal: Signal | null;
  noise: Noise | null;
  hazard: GeoJSON.FeatureCollection | null;
  riskBefore: GeoJSON.FeatureCollection | null;
  riskWithPlan: GeoJSON.FeatureCollection | null;
  plan: Plan | null;
  candidates: CandidateSite[];
  backtest: Backtest | null;
  replication: Replication | null;
  attribution: Attribution | null;
  rankings: Rankings | null;
  scenarios: Scenarios | null;
  note: string;
  scorecard: string;
  citizenBrief: string;
  // proof controls
  overlay: OverlayMode;
  setOverlay: (value: OverlayMode) => void;
  proofEvent: "2024" | "2017";
  setProofEvent: (value: "2024" | "2017") => void;
  riskView: "before" | "with_plan";
  setRiskView: (value: "before" | "with_plan") => void;
  observed: GeoJSON.FeatureCollection | null;
  modeled: GeoJSON.FeatureCollection | null;
  // optimizer
  budget: number;
  setBudget: (value: number) => void;
  mode: OptimizationMode;
  optimizerState: OptimizerState;
  /** Explicit live re-solve. Overwrites plan.json server-side, so it is never called on mount. */
  rerun: (budget: number, mode?: OptimizationMode) => void;
  /** True once the user has opted in to live solving; the slider is read-only until then. */
  liveSolve: boolean;
  setLiveSolve: (on: boolean) => void;
  // measures
  selectedIds: Set<string>;
  picked: string | null;
  pickedRow: SelectedMeasure | undefined;
  measureDetails: MeasureDetails | null;
  equityLine: string | null;
  drawerOpen: boolean;
  openMeasure: (id: string | null) => void;
  closeDrawer: () => void;
  // ask
  q: string;
  setQ: (value: string) => void;
  a: string;
  answerSources: string[];
  answerMeta: string;
  asking: boolean;
  onAsk: (event: React.FormEvent) => void;
  // export
  downloadNote: () => void;
  // derived copy
  aucCopy: string;
};

export const DashContext = createContext<Dash | null>(null);

export function useDash(): Dash {
  const value = useContext(DashContext);
  if (!value) throw new Error("useDash must be used inside <DashContext.Provider>");
  return value;
}
