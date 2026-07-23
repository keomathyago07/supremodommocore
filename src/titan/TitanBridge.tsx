// ============================================================
// TitanBridge.tsx
// Conecta o TitanDommoCore 9.0 ao programa já existente.
// ============================================================

import { useEffect } from "react";
import { useTitanCore } from "./titanCoreStore";
import { persistentCore } from "./persistentCore";
import { titanGuardian } from "./titanGuardian";
import { useTitanSync } from "./useTitanSync";

export function TitanBridge() {
  const titan = useTitanCore();
  useTitanSync(); // reconecta em backoff automaticamente

  useEffect(() => {
    const onDrawResult = (e: Event) => {
      const ev = e as CustomEvent;
      const { drawDate, lotteryId } = ev.detail;
      titan.log("engine", `📢 Resultado recebido — ${lotteryId} (${drawDate})`);
      titan.triggerChecking(drawDate);
    };

    const onCheckComplete = (e: Event) => {
      const ev = e as CustomEvent;
      const { lotteryId, acertos, tierId, prizeEstimate } = ev.detail;
      if (tierId) {
        titan.log("success",
          `🏆 PREMIADA — ${lotteryId}: ${acertos} acertos | R$ ${prizeEstimate?.toLocaleString("pt-BR") ?? "?"}`
        );
        useTitanCore.setState(s => ({
          metrics: {
            ...s.metrics,
            totalPrizesWon: s.metrics.totalPrizesWon + 1,
            totalEarnings: s.metrics.totalEarnings + (prizeEstimate ?? 0),
            winRate: Math.round(((s.metrics.totalPrizesWon + 1) / Math.max(1, s.metrics.totalPredictions)) * 100),
          }
        }));
      } else {
        titan.log("engine", `🔍 ${lotteryId}: ${acertos} acertos — não premiada`);
      }
      if (titan.config.autoEvolution) titan.runEvolutionCycle();
    };

    const onBetConfirmed = (e: Event) => {
      const ev = e as CustomEvent;
      titan.log("engine", `🎟️ Aposta confirmada — ${ev.detail.lotteryId} Concurso ${ev.detail.contestNumber}`);
    };

    const onSyncDone = () => titan.log("system", "🔄 Sincronização multi-device concluída");

    const onError = (e: Event) => {
      const ev = e as CustomEvent;
      titan.log("error", `🚨 ${ev.detail.message ?? "Erro"}`, { moduleId: ev.detail.source });
    };

    const onRequestGenerate = () => {
      titan.log("engine", "📨 Geração solicitada");
      titan.triggerGeneration();
    };
    const onRequestTrain = () => titan.trainAllEngines();

    window.addEventListener("nucleus:draw_result", onDrawResult);
    window.addEventListener("nucleus:check_complete", onCheckComplete);
    window.addEventListener("nucleus:bet_confirmed", onBetConfirmed);
    window.addEventListener("nucleus:sync_done", onSyncDone);
    window.addEventListener("nucleus:error", onError);
    window.addEventListener("program:request_generate", onRequestGenerate);
    window.addEventListener("program:request_train", onRequestTrain);

    titan.log("system", "🌉 TitanBridge conectada ao programa");

    // Boot institucional: Persistent Core + Guardian.
    persistentCore.start();
    titanGuardian.start(30_000);
    titan.log("system", "🏛️ Persistent Core + Guardian ativos (modo institucional)");

    return () => {
      window.removeEventListener("nucleus:draw_result", onDrawResult);
      window.removeEventListener("nucleus:check_complete", onCheckComplete);
      window.removeEventListener("nucleus:bet_confirmed", onBetConfirmed);
      window.removeEventListener("nucleus:sync_done", onSyncDone);
      window.removeEventListener("nucleus:error", onError);
      window.removeEventListener("program:request_generate", onRequestGenerate);
      window.removeEventListener("program:request_train", onRequestTrain);
    };
  }, []);

  return null;
}

export const TitanEvents = {
  reportDrawResult: (lotteryId: string, contestNumber: string, numbers: number[], extras?: number[]) => {
    window.dispatchEvent(new CustomEvent("nucleus:draw_result", {
      detail: { lotteryId, contestNumber, numbers, extras, drawDate: new Date().toISOString().split("T")[0] }
    }));
  },
  reportCheckComplete: (payload: { lotteryId: string; acertos: number; tierId: string|null; tierDesc: string|null; prizeEstimate: number }) => {
    window.dispatchEvent(new CustomEvent("nucleus:check_complete", {
      detail: { ...payload, drawDate: new Date().toISOString().split("T")[0] }
    }));
  },
  reportBetConfirmed: (lotteryId: string, contestNumber: string, numbers: number[]) => {
    window.dispatchEvent(new CustomEvent("nucleus:bet_confirmed", { detail: { lotteryId, contestNumber, numbers } }));
  },
  requestGenerate: () => window.dispatchEvent(new CustomEvent("program:request_generate", { detail: {} })),
  requestTrain: () => window.dispatchEvent(new CustomEvent("program:request_train", { detail: {} })),
};
