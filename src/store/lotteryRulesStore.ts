// ============================================================
// lotteryRulesStore.ts — Store Zustand para regras das loterias
// ============================================================
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { LOTTERY_RULES, LotteryRule, PrizeTier } from "@/data/lotteryRules";

export interface LotteryRulesState {
  rules: LotteryRule[];
  lastSaved: string | null;
  toggleTier: (lotteryId: string, tierId: string) => void;
  enableAll: (lotteryId: string) => void;
  disableAll: (lotteryId: string) => void;
  save: () => void;
  reset: () => void;
  isPrize: (lotteryId: string, tierId: string) => boolean;
  getEnabledTiers: (lotteryId: string) => PrizeTier[];
}

export const useLotteryRulesStore = create<LotteryRulesState>()(
  persist(
    (set, get) => ({
      rules: structuredClone(LOTTERY_RULES),
      lastSaved: null,
      toggleTier: (lotteryId, tierId) =>
        set((state) => ({
          rules: state.rules.map((l) =>
            l.id !== lotteryId ? l : { ...l, prizeTiers: l.prizeTiers.map((t) => (t.id !== tierId ? t : { ...t, enabled: !t.enabled })) }
          ),
        })),
      enableAll: (lotteryId) =>
        set((state) => ({
          rules: state.rules.map((l) =>
            l.id !== lotteryId ? l : { ...l, prizeTiers: l.prizeTiers.map((t) => ({ ...t, enabled: true })) }
          ),
        })),
      disableAll: (lotteryId) =>
        set((state) => ({
          rules: state.rules.map((l) =>
            l.id !== lotteryId ? l : { ...l, prizeTiers: l.prizeTiers.map((t) => ({ ...t, enabled: false })) }
          ),
        })),
      save: () => set({ lastSaved: new Date().toISOString() }),
      reset: () => set({ rules: structuredClone(LOTTERY_RULES), lastSaved: null }),
      isPrize: (lotteryId, tierId) => {
        const lottery = get().rules.find((l) => l.id === lotteryId);
        return lottery?.prizeTiers.find((t) => t.id === tierId)?.enabled ?? false;
      },
      getEnabledTiers: (lotteryId) => {
        const lottery = get().rules.find((l) => l.id === lotteryId);
        return lottery?.prizeTiers.filter((t) => t.enabled) ?? [];
      },
    }),
    { name: "lottery-rules-storage", storage: createJSONStorage(() => localStorage) }
  )
);
