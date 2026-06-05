// ============================================================
// NucleusBridge.tsx
// Escuta os eventos do programa existente e reporta ao
// orquestrador. Também envia comandos do orquestrador
// para o núcleo de 700+ IAs.
//
// Cole <NucleusBridge /> uma única vez no seu App.tsx.
// ============================================================

import { useEffect } from "react";
import { useOrchestratorAdapter } from "./orchestratorAdapterStore";

export function NucleusBridge() {
  const adapter = useOrchestratorAdapter();

  useEffect(() => {
    // ════════════════════════════════════════════════════════
    // EVENTOS QUE VÊM DO SEU NÚCLEO EXISTENTE
    // → reportam ao orquestrador o que está acontecendo
    // ════════════════════════════════════════════════════════

    // Núcleo reporta status geral das IAs
    const onNucleusStatus = (e: CustomEvent) => {
      adapter.updateNucleusStatus(e.detail);
      adapter.log("nucleus", `📡 Status recebido do núcleo: ${e.detail.activeIAs}/${e.detail.totalIAs} IAs ativas`);
    };

    // Núcleo concluiu um ciclo de previsão
    const onCycleComplete = (e: CustomEvent) => {
      adapter.updateNucleusStatus({
        cyclesCompleted: e.detail.cyclesCompleted ?? 0,
        lastCycleAt: new Date().toISOString(),
        predictionConfidence: e.detail.confidence ?? 0,
        currentTask: null,
      });
      adapter.log("nucleus", `✅ Ciclo de IA concluído — confiança: ${e.detail.confidence ?? "?"}%`);
    };

    // Núcleo concluiu treinamento
    const onTrainingDone = (e: CustomEvent) => {
      adapter.updateNucleusStatus({
        trainingIAs: 0,
        currentTask: null,
        ensembleAccuracy: e.detail.accuracy ?? 0,
      });
      adapter.log("success",
        `🎓 Treinamento concluído — precisão do ensemble: ${e.detail.accuracy ?? "?"}% | IAs treinadas: ${e.detail.iasCount ?? "?"}`
      );
      if (adapter.config.autoSyncAfterAction) adapter.triggerSync();
    };

    // Aposta confirmada no programa
    const onBetConfirmed = (e: CustomEvent) => {
      adapter.log("nucleus",
        `🎟️ Aposta confirmada — ${e.detail.lotteryId} | Concurso ${e.detail.contestNumber} | ${e.detail.numbers?.join(", ")}`
      );
    };

    // Resultado de sorteio disponível
    const onDrawResult = (e: CustomEvent) => {
      const { lotteryId, numbers, extras, contestNumber, drawDate } = e.detail;
      adapter.log("schedule",
        `📢 Resultado de sorteio recebido — ${lotteryId} Concurso ${contestNumber} (${drawDate})`
      );
      // Delega conferência ao orquestrador (respeita regras de data)
      adapter.triggerChecking(drawDate);
    };

    // Conferência concluída
    const onCheckComplete = (e: CustomEvent) => {
      const { lotteryId, acertos, tierId, tierDesc, prizeEstimate, drawDate } = e.detail;
      adapter.updateNucleusStatus({ currentTask: null });

      if (tierId) {
        adapter.reportPrize(lotteryId, tierDesc ?? tierId, prizeEstimate ?? 0);
      } else {
        adapter.log("nucleus",
          `🔍 Conferência concluída — ${lotteryId}: ${acertos} acertos — não premiada`
        );
      }

      // Aprender com o resultado
      if (adapter.config.autoLearnFromResults) {
        adapter.triggerLearning();
      }
    };

    // Sincronização concluída
    const onSyncDone = () => {
      adapter.log("nucleus", "🔄 Sincronização entre dispositivos concluída");
    };

    // Erro no núcleo
    const onNucleusError = (e: CustomEvent) => {
      adapter.log("error",
        `🚨 Erro no núcleo: ${e.detail.message ?? "Erro desconhecido"}`,
        e.detail.source ?? "nucleus"
      );
    };

    // ════════════════════════════════════════════════════════
    // EVENTOS DE AGENDAMENTO DO NÚCLEO
    // ════════════════════════════════════════════════════════

    // Núcleo pede ao orquestrador para verificar o horário
    const onScheduleTrigger = (e: CustomEvent) => {
      const action = e.detail.action;
      adapter.log("schedule", `📅 Trigger de agenda recebido: ${action}`);

      if (action === "generate") adapter.triggerGeneration();
      if (action === "train")    adapter.triggerTraining();
      if (action === "check" && e.detail.drawDate) adapter.triggerChecking(e.detail.drawDate);
    };

    // ════════════════════════════════════════════════════════
    // Registra todos os listeners
    // ════════════════════════════════════════════════════════
    window.addEventListener("nucleus:status_update",    onNucleusStatus   as EventListener);
    window.addEventListener("nucleus:ia_cycle_complete",onCycleComplete   as EventListener);
    window.addEventListener("nucleus:training_done",    onTrainingDone    as EventListener);
    window.addEventListener("nucleus:bet_confirmed",    onBetConfirmed    as EventListener);
    window.addEventListener("nucleus:draw_result",      onDrawResult      as EventListener);
    window.addEventListener("nucleus:check_complete",   onCheckComplete   as EventListener);
    window.addEventListener("nucleus:sync_done",        onSyncDone        as EventListener);
    window.addEventListener("nucleus:error",            onNucleusError    as EventListener);
    window.addEventListener("nucleus:schedule_trigger", onScheduleTrigger as EventListener);

    adapter.log("system", "🌉 NucleusBridge ativa — escutando 700+ IAs do núcleo");

    return () => {
      window.removeEventListener("nucleus:status_update",    onNucleusStatus   as EventListener);
      window.removeEventListener("nucleus:ia_cycle_complete",onCycleComplete   as EventListener);
      window.removeEventListener("nucleus:training_done",    onTrainingDone    as EventListener);
      window.removeEventListener("nucleus:bet_confirmed",    onBetConfirmed    as EventListener);
      window.removeEventListener("nucleus:draw_result",      onDrawResult      as EventListener);
      window.removeEventListener("nucleus:check_complete",   onCheckComplete   as EventListener);
      window.removeEventListener("nucleus:sync_done",        onSyncDone        as EventListener);
      window.removeEventListener("nucleus:error",            onNucleusError    as EventListener);
      window.removeEventListener("nucleus:schedule_trigger", onScheduleTrigger as EventListener);
    };
  }, []);

  return null; // sem renderização
}

// ════════════════════════════════════════════════════════════
// FUNÇÕES QUE VOCÊ CHAMA NOS MÓDULOS EXISTENTES DO PROGRAMA
// para reportar eventos ao orquestrador
// ════════════════════════════════════════════════════════════

/** Reporte status das IAs do núcleo ao orquestrador */
export function reportNucleusStatus(status: {
  totalIAs?: number;
  activeIAs?: number;
  trainingIAs?: number;
  ensembleAccuracy?: number;
  cyclesCompleted?: number;
  predictionConfidence?: number;
  currentTask?: string | null;
  pipelineHealth?: number;
}) {
  window.dispatchEvent(new CustomEvent("nucleus:status_update", { detail: status }));
}

/** Reporte que um ciclo de IA foi concluído */
export function reportIACycleComplete(cyclesCompleted: number, confidence: number) {
  window.dispatchEvent(new CustomEvent("nucleus:ia_cycle_complete", {
    detail: { cyclesCompleted, confidence, ts: new Date().toISOString() }
  }));
}

/** Reporte que o treinamento foi concluído */
export function reportTrainingDone(accuracy: number, iasCount: number) {
  window.dispatchEvent(new CustomEvent("nucleus:training_done", {
    detail: { accuracy, iasCount, ts: new Date().toISOString() }
  }));
}

/** Reporte que uma aposta foi confirmada */
export function reportBetConfirmed(lotteryId: string, contestNumber: string, numbers: number[]) {
  window.dispatchEvent(new CustomEvent("nucleus:bet_confirmed", {
    detail: { lotteryId, contestNumber, numbers, ts: new Date().toISOString() }
  }));
}

/** Reporte o resultado de um sorteio (só use com dados do dia atual!) */
export function reportDrawResult(
  lotteryId: string,
  contestNumber: string,
  numbers: number[],
  drawDate: string,  // DEVE ser a data de hoje
  extras?: number[]
) {
  window.dispatchEvent(new CustomEvent("nucleus:draw_result", {
    detail: { lotteryId, contestNumber, numbers, extras, drawDate, ts: new Date().toISOString() }
  }));
}

/** Reporte o resultado da conferência */
export function reportCheckComplete(payload: {
  lotteryId: string;
  acertos: number;
  tierId: string | null;
  tierDesc: string | null;
  prizeEstimate: number;
  drawDate: string;
}) {
  window.dispatchEvent(new CustomEvent("nucleus:check_complete", {
    detail: { ...payload, ts: new Date().toISOString() }
  }));
}

/** Reporte que a sincronização foi concluída */
export function reportSyncDone() {
  window.dispatchEvent(new CustomEvent("nucleus:sync_done", {
    detail: { ts: new Date().toISOString() }
  }));
}

/** Reporte um erro do núcleo */
export function reportNucleusError(message: string, source = "nucleus") {
  window.dispatchEvent(new CustomEvent("nucleus:error", {
    detail: { message, source, ts: new Date().toISOString() }
  }));
}

/** Peça ao orquestrador para verificar e executar a ação agendada */
export function requestScheduleAction(
  action: "generate" | "train" | "check",
  extra?: { drawDate?: string }
) {
  window.dispatchEvent(new CustomEvent("nucleus:schedule_trigger", {
    detail: { action, ...extra, ts: new Date().toISOString() }
  }));
}
