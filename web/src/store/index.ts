import { create } from 'zustand';
import type { Backtest, HazardGeojson, Plan, Signal } from '../lib/types';

type AppState = {
  act: number;
  budget: number;
  mode: 'expected' | 'cvar';
  hazardLayer: 'glof' | 'monsoon' | 'landslide' | 'combined';
  swipe: number;
  selected: string | null;
  drawer: string | null;
  signal?: Signal;
  hazard?: HazardGeojson;
  plan?: Plan;
  backtest?: Backtest;
  set: (patch: Partial<AppState>) => void;
};

export const useApp = create<AppState>((set) => ({
  act: 0,
  budget: 2_000_000,
  mode: 'expected',
  hazardLayer: 'combined',
  swipe: 0.5,
  selected: null,
  drawer: null,
  set: (patch) => set(patch),
}));
