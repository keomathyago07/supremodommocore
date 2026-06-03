// ============================================================
// OrchestratorBridge.tsx — Conectado aos módulos JÁ EXISTENTES
// ============================================================
import { useEffect } from "react";
import { useMasterOrchestrator } from "./masterOrchestratorStore";
import { useOrchestratorStore } from "@/store/orchestratorStore";
import { useBetStore } from "@/store/betStore";
import { useSyncStore } from "@/store/syncStore";

export function OrchestratorBridge() {
  const masterOrch = useMasterOrchestrator();

  useEffect(() => {
    const onGenerate = () => {
      masterOrch.addLog("ia", "prediction_pipeline", "🔮 Geração disparada — runDailyCycle()");
      try { useOrchestratorStore.getState().runDailyCycle(); } catch (e) { masterOrch.addLog("error","prediction_pipeline",String(e)); }
    };

    const onCheck = (e: CustomEvent) => {
      const { lotteryId, numbers, extras, contestNumber, drawDate } = e.detail ?? {};
      masterOrch.addLog("check","checker",`🔍 Conferência ${lotteryId} #${contestNumber} (${drawDate})`);
      try {
        useBetStore.getState().submitDrawResult(lotteryId, numbers, extras);
        useOrchestratorStore.getState().submitResult?.(lotteryId, numbers, extras);
      } catch (err) { masterOrch.addLog("error","checker",String(err)); }
    };

    const onSyncAll = () => {
      masterOrch.addLog("system","sync","🔄 Sync global solicitado");
      try { useSyncStore.getState().addLog?.("Sync global via orquestrador","info"); } catch {}
    };

    const onAutoConfirm = (e: CustomEvent) => {
      const lotteries: string[] = e.detail?.lotteries ?? [];
      masterOrch.addLog("system","bet_manager",`🤖 Auto-confirmação: ${lotteries.length} loteria(s)`);
      try { useOrchestratorStore.getState().confirmAllGames(); } catch (err) {
        masterOrch.addLog("error","bet_manager",String(err));
      }
    };

    const onUpdateRules = () => masterOrch.addLog("system","rules_engine","📋 Regras atualizadas");

    const onBetsUpdated = (e: CustomEvent) => {
      const { count, prizes } = e.detail ?? {};
      masterOrch.addLog("success","bet_manager",`🎟️ Apostas: ${count ?? "?"} | premiadas: ${prizes ?? "?"}`);
    };

    const onCheckResult = (e: CustomEvent) => {
      const { lotteryId, acertos, tierId, prizeEstimate } = e.detail ?? {};
      if (tierId) masterOrch.addLog("success","prize_tracker",`🏆 PREMIADA! ${lotteryId} — ${acertos} acertos — R$ ${prizeEstimate?.toLocaleString("pt-BR") ?? "?"}`);
      else masterOrch.addLog("check","checker",`${lotteryId} — ${acertos} acertos — não premiada`);
    };

    window.addEventListener("orchestrator:generate", onGenerate as EventListener);
    window.addEventListener("orchestrator:check", onCheck as EventListener);
    window.addEventListener("orchestrator:sync_all", onSyncAll as EventListener);
    window.addEventListener("orchestrator:auto_confirm_all", onAutoConfirm as EventListener);
    window.addEventListener("orchestrator:update_rules", onUpdateRules as EventListener);
    window.addEventListener("program:bets_updated", onBetsUpdated as EventListener);
    window.addEventListener("program:check_result", onCheckResult as EventListener);

    masterOrch.addLog("system","orchestrator","🌉 Bridge conectada aos módulos do programa");

    return () => {
      window.removeEventListener("orchestrator:generate", onGenerate as EventListener);
      window.removeEventListener("orchestrator:check", onCheck as EventListener);
      window.removeEventListener("orchestrator:sync_all", onSyncAll as EventListener);
      window.removeEventListener("orchestrator:update_rules", onUpdateRules as EventListener);
      window.removeEventListener("program:bets_updated", onBetsUpdated as EventListener);
      window.removeEventListener("program:check_result", onCheckResult as EventListener);
    };
  }, []);

  return null;
}

export function notifyBetsUpdated(count: number, prizes: number) {
  window.dispatchEvent(new CustomEvent("program:bets_updated", { detail: { count, prizes, ts: new Date().toISOString() } }));
}
export function notifyCheckResult(payload: { lotteryId: string; acertos: number; tierId: string | null; tierDesc: string | null; prizeEstimate: number; drawDate: string; }) {
  window.dispatchEvent(new CustomEvent("program:check_result", { detail: { ...payload, ts: new Date().toISOString() } }));
}
export function notifyGameConfirmed(lotteryId: string, betId: string) {
  window.dispatchEvent(new CustomEvent("program:game_confirmed", { detail: { lotteryId, betId, ts: new Date().toISOString() } }));
}
export function notifyDrawPublished(lotteryId: string, contestNumber: string, numbers: number[], extras?: number[]) {
  window.dispatchEvent(new CustomEvent("program:draw_published", {
    detail: { lotteryId, contestNumber, numbers, extras, drawDate: new Date().toISOString().split("T")[0], ts: new Date().toISOString() }
  }));
}
