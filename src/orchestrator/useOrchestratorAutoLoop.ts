// ============================================================
// useOrchestratorAutoLoop.ts
// Hook que gerencia automaticamente o ciclo do orquestrador
// baseado no horário atual — sem intervenção humana.
//
// Coloque este hook no componente raiz do seu app (App.tsx)
// ou no layout principal.
// ============================================================

import { useEffect, useRef } from "react";
import { useMasterOrchestrator } from "./masterOrchestratorStore";

interface AutoLoopOptions {
  /** Intervalo de verificação em ms (padrão: 60.000 = 1 minuto) */
  checkIntervalMs?: number;
  /** Iniciar automaticamente ao montar */
  bootOnMount?: boolean;
}

export function useOrchestratorAutoLoop(options: AutoLoopOptions = {}) {
  const {
    checkIntervalMs = 60_000,
    bootOnMount = true,
  } = options;

  const {
    isRunning,
    phase,
    config,
    boot,
    runTrainingSession,
    runStudySession,
    triggerGeneration,
    addLog,
    isWithinGenerationWindow,
    isWithinCheckingWindow,
    isWithinTrainingWindow,
    getCurrentPhaseByTime,
    ultraSyncTick,
    syncDailyPlan,
  } = useMasterOrchestrator();

  const lastActionRef = useRef<Record<string, string>>({});
  const intervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Boot automático ao montar ────────────────────────────
  useEffect(() => {
    if (bootOnMount && !isRunning) {
      boot();
    }
  }, []);

  // ── Loop principal de automação ──────────────────────────
  useEffect(() => {
    if (!isRunning || !config.autoManageAll) return;

    const tick = async () => {
      const now = new Date();
      const dateKey = now.toISOString().split("T")[0];
      const hourKey = `${dateKey}_${now.getHours()}`;

      // 1. JANELA DE TREINAMENTO (madrugada) ─────────────────
      if (
        config.autoTrain &&
        isWithinTrainingWindow() &&
        lastActionRef.current["train"] !== hourKey
      ) {
        lastActionRef.current["train"] = hourKey;
        addLog("system", "orchestrator", `⏰ Janela de treinamento — iniciando sessão automática`);
        await runStudySession();
        await runTrainingSession();
      }

      // 2. JANELA DE GERAÇÃO (08h–20h) ───────────────────────
      if (
        config.autoGenerateOnSchedule &&
        isWithinGenerationWindow() &&
        lastActionRef.current["generate"] !== dateKey
      ) {
        lastActionRef.current["generate"] = dateKey;
        addLog("system", "orchestrator", `⏰ Janela de geração — iniciando geração automática`);
        await triggerGeneration();
      }

      // 3. JANELA DE CONFERÊNCIA (após 21:05) ────────────────
      // A conferência em si é disparada via OrchestratorBridge
      // quando os resultados reais chegam do programa.
      if (
        config.autoCheckAfterDraw &&
        isWithinCheckingWindow() &&
        lastActionRef.current["check_notif"] !== dateKey
      ) {
        lastActionRef.current["check_notif"] = dateKey;
        addLog(
          "system",
          "orchestrator",
          `⏰ Janela de conferência ativa — aguardando resultados dos sorteios de hoje`
        );
      }
    };

    // Executa imediatamente e depois a cada intervalo
    tick();
    intervalRef.current = setInterval(tick, checkIntervalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, config.autoManageAll, checkIntervalMs]);

  // Retorna estado útil para debug/display
  return {
    isRunning,
    phase,
    isInGenerationWindow: isWithinGenerationWindow(),
    isInCheckingWindow:   isWithinCheckingWindow(),
    isInTrainingWindow:   isWithinTrainingWindow(),
    detectedPhase:        getCurrentPhaseByTime(),
  };
}
