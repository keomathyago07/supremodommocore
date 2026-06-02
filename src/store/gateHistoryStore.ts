// ============================================================
// gateHistoryStore.ts — Histórico de Gates do Terror das Loterias v2
// Registra cada gate encontrado/aprovado com horário de Brasília.
// ============================================================
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type GateStatus = "FOUND" | "APPROVED" | "REJECTED" | "SAVED";

export interface GateEntry {
  id: string;
  lotteryId: string;
  lotteryName: string;
  lotteryColor: string;
  concurso: string;
  numbers: number[];
  extras?: number[];
  confidence: number;
  iaLevel: string;
  strategies: string[];
  reasoning: string[];
  status: GateStatus;
  foundAtBRT: string;       // ex: "01/06/2026 20:15:42"
  savedAtBRT?: string;
  foundAtISO: string;
  savedAtISO?: string;
  betId?: string | null;    // FK opcional após confirmação
}

interface State {
  gates: GateEntry[];
  addGate: (g: Omit<GateEntry, "id" | "foundAtBRT" | "foundAtISO">) => string;
  markSaved: (id: string, betId?: string | null) => void;
  markRejected: (id: string) => void;
  clear: () => void;
  byLottery: (lotteryId: string) => GateEntry[];
}

function brt(d: Date = new Date()): string {
  return d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", hour12: false });
}

export const useGateHistoryStore = create<State>()(
  persist(
    (set, get) => ({
      gates: [],
      addGate: (g) => {
        const id = `gate_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const now = new Date();
        set((s) => ({
          gates: [
            { ...g, id, foundAtISO: now.toISOString(), foundAtBRT: brt(now) },
            ...s.gates,
          ].slice(0, 500),
        }));
        return id;
      },
      markSaved: (id, betId) => {
        const now = new Date();
        set((s) => ({
          gates: s.gates.map((x) =>
            x.id !== id ? x : { ...x, status: "SAVED", savedAtBRT: brt(now), savedAtISO: now.toISOString(), betId: betId ?? x.betId }
          ),
        }));
      },
      markRejected: (id) => {
        set((s) => ({
          gates: s.gates.map((x) => (x.id !== id ? x : { ...x, status: "REJECTED" })),
        }));
      },
      clear: () => set({ gates: [] }),
      byLottery: (lotteryId) => get().gates.filter((g) => g.lotteryId === lotteryId),
    }),
    { name: "terror-loterias-gate-history", storage: createJSONStorage(() => localStorage) }
  )
);
