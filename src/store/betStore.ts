// ============================================================
// betStore.ts — Store de apostas com persistência e conferência automática
// Salva todas as apostas confirmadas e confere automaticamente
// ============================================================

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { GeneratedGame } from "../data/aiPredictionEngine";

export type BetStatus =
  | "confirmada"    // aposta salva, aguardando sorteio
  | "aguardando"    // sorteio hoje ainda não ocorreu
  | "conferindo"    // conferência automática em andamento
  | "premiada"      // ganhou pelo menos uma faixa
  | "nao_premiada"; // não ganhou nada

export interface BetResult {
  drawNumbers: number[];
  drawExtras?: number[];
  acertos: number;
  extrasAcertos?: number;
  tierId: string | null;
  tierDesc: string | null;
  prizeEstimate: number; // R$
  checkedAt: string;
}

export interface SavedBet {
  id: string;
  lotteryId: string;
  lotteryName: string;
  lotteryColor: string;
  concurso: string;
  drawDate: string; // YYYY-MM-DD
  numbers: number[];
  extras?: number[];
  status: BetStatus;
  game: GeneratedGame;
  result?: BetResult;
  confirmedAt: string;
  iaLevel: string;
  confidence: number;
}

export interface BetStore {
  bets: SavedBet[];
  todayDrawDate: string;

  // CRUD
  saveBet: (bet: Omit<SavedBet, "id" | "confirmedAt">) => string;
  updateBetStatus: (id: string, status: BetStatus, result?: BetResult) => void;
  getBetById: (id: string) => SavedBet | undefined;
  getTodayBets: () => SavedBet[];
  clearOldBets: (daysToKeep?: number) => void;

  // Conferência automática
  submitDrawResult: (
    lotteryId: string,
    drawNumbers: number[],
    drawExtras?: number[]
  ) => BetResult[];

  // Stats
  getTotalPrizes: () => number;
  getWinRate: () => number;
}

function generateId(): string {
  return `bet_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function today(): string {
  return new Date().toISOString().split("T")[0];
}

// ── Conferência automática ─────────────────────────────────
function checkBet(
  betNumbers: number[],
  betExtras: number[] | undefined,
  drawNumbers: number[],
  drawExtras: number[] | undefined,
  lotteryId: string
): Omit<BetResult, "checkedAt"> {
  const acertos = betNumbers.filter((n) => drawNumbers.includes(n)).length;
  const extrasAcertos = betExtras && drawExtras
    ? betExtras.filter((e) => drawExtras.includes(e)).length
    : undefined;

  let tierId: string | null = null;
  let tierDesc: string | null = null;
  let prizeEstimate = 0;

  // Tabela de premiação com valores estimados
  const tables: Record<string, { id: string; desc: string; min: number; hits: number; extraHits?: number }[]> = {
    mega: [
      { id: "mega_6", desc: "Sena (6 acertos)", min: 2000000, hits: 6 },
      { id: "mega_5", desc: "Quina (5 acertos)", min: 1200, hits: 5 },
      { id: "mega_4", desc: "Quadra (4 acertos)", min: 30, hits: 4 },
    ],
    quina: [
      { id: "quina_5", desc: "Quina (5 acertos)", min: 400000, hits: 5 },
      { id: "quina_4", desc: "Quadra (4 acertos)", min: 1000, hits: 4 },
      { id: "quina_3", desc: "Terno (3 acertos)", min: 40, hits: 3 },
      { id: "quina_2", desc: "Duque (2 acertos)", min: 3, hits: 2 },
    ],
    milionaria: [
      { id: "mil_6_2t", desc: "6 acertos + 2 trevos", min: 10000000, hits: 6, extraHits: 2 },
      { id: "mil_6_1t", desc: "6 acertos + 0-1 trevo", min: 800000, hits: 6, extraHits: 0 },
      { id: "mil_5_2t", desc: "5 acertos + 2 trevos", min: 25000, hits: 5, extraHits: 2 },
      { id: "mil_5_1t", desc: "5 acertos + 0-1 trevo", min: 1500, hits: 5, extraHits: 0 },
      { id: "mil_4_2t", desc: "4 acertos + 2 trevos", min: 100, hits: 4, extraHits: 2 },
    ],
    lotofacil: [
      { id: "lf_15", desc: "15 acertos", min: 1500000, hits: 15 },
      { id: "lf_14", desc: "14 acertos", min: 1800, hits: 14 },
      { id: "lf_13", desc: "13 acertos", min: 30, hits: 13 },
      { id: "lf_12", desc: "12 acertos", min: 12, hits: 12 },
      { id: "lf_11", desc: "11 acertos", min: 6, hits: 11 },
    ],
    timemania: [
      { id: "tm_7t", desc: "7 acertos + time", min: 10000000, hits: 7, extraHits: 1 },
      { id: "tm_7", desc: "7 acertos", min: 3500, hits: 7 },
      { id: "tm_6", desc: "6 acertos", min: 1800, hits: 6 },
      { id: "tm_5", desc: "5 acertos", min: 60, hits: 5 },
      { id: "tm_3", desc: "3 acertos", min: 5, hits: 3 },
    ],
    lotomania: [
      { id: "lm_20", desc: "20 acertos", min: 500000, hits: 20 },
      { id: "lm_19", desc: "19 acertos", min: 1200, hits: 19 },
      { id: "lm_18", desc: "18 acertos", min: 400, hits: 18 },
      { id: "lm_17", desc: "17 acertos", min: 15, hits: 17 },
      { id: "lm_16", desc: "16 acertos", min: 4, hits: 16 },
      { id: "lm_0", desc: "0 acertos (acidente!)", min: 2000, hits: 0 },
    ],
    supersete: [
      { id: "ss_7", desc: "7 acertos", min: 1000000, hits: 7 },
      { id: "ss_6", desc: "6 acertos", min: 10000, hits: 6 },
      { id: "ss_5", desc: "5 acertos", min: 1000, hits: 5 },
      { id: "ss_4", desc: "4 acertos", min: 30, hits: 4 },
      { id: "ss_3", desc: "3 acertos", min: 3, hits: 3 },
    ],
    diasorte: [
      { id: "ds_7m", desc: "7 acertos + mês", min: 500000, hits: 7, extraHits: 1 },
      { id: "ds_7", desc: "7 acertos", min: 45000, hits: 7 },
      { id: "ds_6", desc: "6 acertos", min: 1200, hits: 6 },
      { id: "ds_5", desc: "5 acertos", min: 25, hits: 5 },
      { id: "ds_4", desc: "4 acertos", min: 5, hits: 4 },
      { id: "ds_mes", desc: "Mês da Sorte", min: 3, hits: 0, extraHits: 1 },
    ],
    duplasena: [
      { id: "ds1_6", desc: "1º Sorteio — 6 acertos", min: 1500000, hits: 6 },
      { id: "ds1_5", desc: "1º Sorteio — 5 acertos", min: 1200, hits: 5 },
      { id: "ds1_4", desc: "1º Sorteio — 4 acertos", min: 30, hits: 4 },
      { id: "ds2_6", desc: "2º Sorteio — 6 acertos", min: 1500000, hits: 6 },
      { id: "ds2_5", desc: "2º Sorteio — 5 acertos", min: 1200, hits: 5 },
      { id: "ds2_4", desc: "2º Sorteio — 4 acertos", min: 30, hits: 4 },
    ],
  };

  const table = tables[lotteryId] ?? [];
  for (const tier of table) {
    const hitsMatch = acertos === tier.hits;
    const extrasMatch =
      tier.extraHits === undefined ||
      (extrasAcertos !== undefined && extrasAcertos >= tier.extraHits);

    if (hitsMatch && extrasMatch) {
      tierId = tier.id;
      tierDesc = tier.desc;
      prizeEstimate = tier.min;
      break;
    }
  }

  return {
    drawNumbers,
    drawExtras,
    acertos,
    extrasAcertos,
    tierId,
    tierDesc,
    prizeEstimate,
  };
}

// ── Store ────────────────────────────────────────────────────
export const useBetStore = create<BetStore>()(
  persist(
    (set, get) => ({
      bets: [],
      todayDrawDate: today(),

      saveBet: (bet) => {
        const id = generateId();
        const newBet: SavedBet = {
          ...bet,
          id,
          confirmedAt: new Date().toISOString(),
        };
        set((state) => ({ bets: [...state.bets, newBet] }));
        return id;
      },

      updateBetStatus: (id, status, result) =>
        set((state) => ({
          bets: state.bets.map((b) =>
            b.id !== id ? b : { ...b, status, ...(result ? { result } : {}) }
          ),
        })),

      getBetById: (id) => get().bets.find((b) => b.id === id),

      getTodayBets: () => {
        const d = today();
        return get().bets.filter((b) => b.drawDate === d);
      },

      clearOldBets: (daysToKeep = 30) => {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - daysToKeep);
        set((state) => ({
          bets: state.bets.filter(
            (b) => new Date(b.confirmedAt) >= cutoff
          ),
        }));
      },

      submitDrawResult: (lotteryId, drawNumbers, drawExtras) => {
        const todayBets = get().bets.filter(
          (b) =>
            b.lotteryId === lotteryId &&
            b.drawDate === today() &&
            b.status !== "nao_premiada" &&
            b.status !== "premiada"
        );

        const results: BetResult[] = [];

        set((state) => ({
          bets: state.bets.map((b) => {
            if (!todayBets.find((tb) => tb.id === b.id)) return b;

            const check = checkBet(
              b.numbers,
              b.extras,
              drawNumbers,
              drawExtras,
              lotteryId
            );
            const result: BetResult = {
              ...check,
              checkedAt: new Date().toISOString(),
            };
            results.push(result);

            return {
              ...b,
              status: check.tierId ? "premiada" : "nao_premiada",
              result,
            };
          }),
        }));

        return results;
      },

      getTotalPrizes: () =>
        get()
          .bets.filter((b) => b.status === "premiada")
          .reduce((sum, b) => sum + (b.result?.prizeEstimate ?? 0), 0),

      getWinRate: () => {
        const checked = get().bets.filter(
          (b) => b.status === "premiada" || b.status === "nao_premiada"
        );
        if (!checked.length) return 0;
        const wins = checked.filter((b) => b.status === "premiada").length;
        return Math.round((wins / checked.length) * 100);
      },
    }),
    {
      name: "terror-loterias-bets",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
