// ============================================================
// orchestratorStore.ts — Orquestrador Central do Sistema
// Gerencia e administra o programa de ponta a ponta
// Sincroniza: geração de jogos → confirmação → conferência → resultado
// ============================================================

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { getTodayLotteries, LotteryMeta } from "../data/dailyScheduler";
import { generateDailyGame, PredictionMeta } from "../data/aiPredictionEngine";
import { useBetStore, SavedBet } from "./betStore";
import { useIAControlStore } from "./iaControlStore";
import { useSyncStore } from "./syncStore";
import { useGateHistoryStore } from "./gateHistoryStore";
import { persistConfirmedBet, fetchLatestResult, saveResultCheck } from "@/lib/betsCloud";

export type OrchestratorPhase =
  | "idle"
  | "analyzing"      // analisando loterias do dia
  | "generating"     // gerando jogos
  | "awaiting_confirmation" // aguardando confirmação do usuário
  | "confirmed"      // jogos confirmados
  | "awaiting_draw"  // aguardando sorteio
  | "checking"       // conferindo automaticamente
  | "done";          // ciclo completo

export interface OrchestratorTask {
  id: string;
  lotteryId: string;
  lotteryName: string;
  phase: OrchestratorPhase;
  prediction?: PredictionMeta;
  betId?: string;
  drawResult?: number[];
  drawExtras?: number[];
  completedAt?: string;
  error?: string;
}

export interface OrchestratorLog {
  ts: string;
  level: "info" | "success" | "warn" | "error" | "ia";
  message: string;
}

export interface OrchestratorStats {
  totalCycles: number;
  totalBets: number;
  totalPrizes: number;
  totalEarnings: number;
  winRate: number;
  lastCycleDate: string | null;
}

export interface OrchestratorState {
  phase: OrchestratorPhase;
  tasks: OrchestratorTask[];
  logs: OrchestratorLog[];
  stats: OrchestratorStats;
  autoCheckEnabled: boolean;
  lastRun: string | null;
  checkInterval: number; // ms

  // Actions
  runDailyCycle: () => Promise<void>;
  confirmAllGames: () => void;
  confirmGame: (lotteryId: string) => void;
  submitResult: (lotteryId: string, numbers: number[], extras?: number[]) => void;
  toggleAutoCheck: (v: boolean) => void;
  addLog: (level: OrchestratorLog["level"], message: string) => void;
  reset: () => void;
  getTask: (lotteryId: string) => OrchestratorTask | undefined;
}

function genTaskId() {
  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

const DEFAULT_STATS: OrchestratorStats = {
  totalCycles: 0,
  totalBets: 0,
  totalPrizes: 0,
  totalEarnings: 0,
  winRate: 0,
  lastCycleDate: null,
};

export const useOrchestratorStore = create<OrchestratorState>()(
  persist(
    (set, get) => ({
      phase: "idle",
      tasks: [],
      logs: [],
      stats: { ...DEFAULT_STATS },
      autoCheckEnabled: true,
      lastRun: null,
      checkInterval: 30000, // 30s

      addLog: (level, message) =>
        set((state) => ({
          logs: [
            ...state.logs.slice(-199),
            { ts: new Date().toISOString(), level, message },
          ],
        })),

      runDailyCycle: async () => {
        const { addLog } = get();
        const iaLevel = useIAControlStore.getState().activeLevel;

        addLog("ia", `🚀 Ciclo diário iniciado — nível IA: ${iaLevel.toUpperCase()}`);
        set({ phase: "analyzing", tasks: [], lastRun: new Date().toISOString() });

        await delay(600);

        // 1. Descobre loterias do dia
        const todayLotteries = getTodayLotteries();
        addLog("info", `📅 ${todayLotteries.length} loterias encontradas para hoje (${todayStr()})`);

        if (!todayLotteries.length) {
          addLog("warn", "⚠️ Nenhuma loteria sorteada hoje.");
          set({ phase: "idle" });
          return;
        }

        set({ phase: "generating" });
        addLog("ia", `🧠 Gerando 1 jogo otimizado por loteria com ensemble de IAs...`);
        await delay(800);

        // 2. Gera 1 jogo por loteria
        const tasks: OrchestratorTask[] = todayLotteries.map((lottery) => {
          const prediction = generateDailyGame(lottery, iaLevel);
          addLog(
            "ia",
            `✅ ${lottery.name}: ${prediction.game.numbers.join(", ")} — confiança ${prediction.game.confidence}%`
          );
          return {
            id: genTaskId(),
            lotteryId: lottery.id,
            lotteryName: lottery.name,
            phase: "awaiting_confirmation" as OrchestratorPhase,
            prediction,
          };
        });

        set({ phase: "awaiting_confirmation", tasks });
        addLog("success", `🎯 ${tasks.length} jogos gerados. Aguardando sua confirmação.`);

        // Atualiza stats
        set((state) => ({
          stats: {
            ...state.stats,
            totalCycles: state.stats.totalCycles + 1,
            lastCycleDate: todayStr(),
          },
        }));
      },

      confirmGame: (lotteryId) => {
        const { tasks, addLog } = get();
        const task = tasks.find((t) => t.lotteryId === lotteryId);
        if (!task?.prediction) return;

        const lottery = getTodayLotteries().find((l) => l.id === lotteryId);
        if (!lottery) return;

        // Salva a aposta no betStore
        const betId = useBetStore.getState().saveBet({
          lotteryId: lottery.id,
          lotteryName: lottery.name,
          lotteryColor: lottery.color,
          concurso: `${Date.now()}`,
          drawDate: todayStr(),
          numbers: task.prediction.game.numbers,
          extras: task.prediction.game.extras,
          status: "confirmada",
          game: task.prediction.game,
          iaLevel: task.prediction.game.iaLevel,
          confidence: task.prediction.game.confidence,
        });

        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.lotteryId !== lotteryId
              ? t
              : { ...t, phase: "confirmed", betId }
          ),
          stats: {
            ...state.stats,
            totalBets: state.stats.totalBets + 1,
          },
        }));

        addLog("success", `✅ ${lottery.name} confirmada e salva! (ID: ${betId})`);
        useSyncStore.getState().addLog(`Aposta ${lottery.name} confirmada`, "success");

        // Verifica se todos foram confirmados
        const allConfirmed = get().tasks.every(
          (t) => t.phase === "confirmed" || t.phase === "done"
        );
        if (allConfirmed) {
          set({ phase: "awaiting_draw" });
          addLog("info", `⏳ Todas as apostas confirmadas. Aguardando sorteios...`);
          (get() as any).scheduleAutoCheck?.();
        }
      },

      confirmAllGames: () => {
        const { tasks, confirmGame } = get();
        tasks
          .filter((t) => t.phase === "awaiting_confirmation")
          .forEach((t) => confirmGame(t.lotteryId));
      },

      submitResult: (lotteryId, drawNumbers, drawExtras) => {
        const { tasks, addLog } = get();
        const task = tasks.find((t) => t.lotteryId === lotteryId);
        if (!task?.betId) return;

        addLog("ia", `🔍 Conferindo ${task.lotteryName} automaticamente...`);

        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.lotteryId !== lotteryId
              ? t
              : { ...t, phase: "checking", drawResult: drawNumbers, drawExtras }
          ),
        }));

        // Conferência automática
        const results = useBetStore
          .getState()
          .submitDrawResult(lotteryId, drawNumbers, drawExtras);

        results.forEach((r) => {
          if (r.tierId) {
            addLog(
              "success",
              `🏆 PREMIADA! ${task.lotteryName}: ${r.tierDesc} — ${r.acertos} acertos — Estimativa: R$ ${r.prizeEstimate.toLocaleString("pt-BR")}`
            );
            set((state) => ({
              stats: {
                ...state.stats,
                totalPrizes: state.stats.totalPrizes + 1,
                totalEarnings: state.stats.totalEarnings + r.prizeEstimate,
              },
            }));
          } else {
            addLog(
              "info",
              `❌ ${task.lotteryName}: ${r.acertos} acertos — não premiada neste sorteio`
            );
          }
        });

        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.lotteryId !== lotteryId
              ? t
              : { ...t, phase: "done", completedAt: new Date().toISOString() }
          ),
        }));

        // Winrate update
        const wr = useBetStore.getState().getWinRate();
        set((state) => ({
          stats: { ...state.stats, winRate: wr },
        }));

        const allDone = get().tasks.every((t) => t.phase === "done");
        if (allDone) {
          set({ phase: "done" });
          addLog("success", `🎉 Conferência completa! Todos os sorteios do dia processados.`);
        }
      },

      toggleAutoCheck: (v) => {
        set({ autoCheckEnabled: v });
        get().addLog("info", `Auto-conferência ${v ? "ativada" : "desativada"}`);
      },

      reset: () => {
        set({ phase: "idle", tasks: [], logs: [], lastRun: null });
      },

      getTask: (lotteryId) =>
        get().tasks.find((t) => t.lotteryId === lotteryId),
    }),
    {
      name: "terror-loterias-orchestrator",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        stats: state.stats,
        autoCheckEnabled: state.autoCheckEnabled,
        lastRun: state.lastRun,
      }),
    }
  )
);

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
