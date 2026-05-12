// ============================================================
// iaControlStore.ts — Store Zustand para Controle de IAs
// ============================================================
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type IALevel = "economico" | "normal" | "turbo" | "maxima" | "infinita";

export interface IALevelConfig {
  id: IALevel;
  label: string;
  icon: string;
  description: string;
  precision: number;
  assertiveness: number;
  cycleSec: number;
  ensembles: number;
}

export const IA_LEVELS: IALevelConfig[] = [
  { id: "economico", label: "Econômico", icon: "⚡", description: "Baixo consumo, ciclos espaçados", precision: 60, assertiveness: 55, cycleSec: 600, ensembles: 2 },
  { id: "normal", label: "Normal", icon: "🧠", description: "Equilíbrio entre precisão e custo", precision: 75, assertiveness: 70, cycleSec: 300, ensembles: 4 },
  { id: "turbo", label: "Turbo", icon: "⚡", description: "Pipeline acelerado, mais ensembles", precision: 85, assertiveness: 82, cycleSec: 120, ensembles: 7 },
  { id: "maxima", label: "Máxima", icon: "🔥", description: "Todas IAs ativas, ciclos curtos", precision: 95, assertiveness: 92, cycleSec: 60, ensembles: 10 },
  { id: "infinita", label: "Infinita", icon: "∞", description: "Sem limites — auto-evolução contínua", precision: 99, assertiveness: 99, cycleSec: 30, ensembles: 12 },
];

export interface IACustomGoals {
  precisionGoal: number;
  assertivenessGoal: number;
  pipelineAggression: number;
  analysisDepth: number;
  evolutionSpeed: number;
}

export interface IAControlState {
  activeLevel: IALevel;
  customGoals: IACustomGoals;
  lastSaved: string | null;
  setLevel: (level: IALevel) => void;
  setCustomGoals: (goals: Partial<IACustomGoals>) => void;
  save: () => void;
  reset: () => void;
  getActiveLevelConfig: () => IALevelConfig;
}

const DEFAULT_GOALS: IACustomGoals = {
  precisionGoal: 99,
  assertivenessGoal: 99,
  pipelineAggression: 100,
  analysisDepth: 95,
  evolutionSpeed: 88,
};

export const useIAControlStore = create<IAControlState>()(
  persist(
    (set, get) => ({
      activeLevel: "infinita",
      customGoals: { ...DEFAULT_GOALS },
      lastSaved: null,
      setLevel: (level) => set({ activeLevel: level }),
      setCustomGoals: (goals) => set((state) => ({ customGoals: { ...state.customGoals, ...goals } })),
      save: () => set({ lastSaved: new Date().toISOString() }),
      reset: () => set({ activeLevel: "infinita", customGoals: { ...DEFAULT_GOALS } }),
      getActiveLevelConfig: () => {
        const { activeLevel } = get();
        return IA_LEVELS.find((l) => l.id === activeLevel) ?? IA_LEVELS[4];
      },
    }),
    { name: "ia-control-storage", storage: createJSONStorage(() => localStorage) }
  )
);
