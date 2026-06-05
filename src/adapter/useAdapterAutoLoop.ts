// ============================================================
// useAdapterAutoLoop.ts
// Loop automático do Orquestrador Adaptador — verifica janelas
// de horário (BRT) e dispara comandos sem intervenção humana.
// ============================================================
import { useEffect, useRef } from "react";
import { useOrchestratorAdapter } from "./orchestratorAdapterStore";

export function useAdapterAutoLoop(intervalMs: number = 60_000) {
  const adapter = useOrchestratorAdapter();
  const lastActionRef = useRef<Record<string, string>>({});
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Conecta automaticamente uma vez
  useEffect(() => {
    if (!adapter.isOnline) {
      try { adapter.connect(); } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!adapter.isOnline || !adapter.config.autoManage) return;

    const tick = () => {
      const now = new Date();
      const dateKey = now.toISOString().split("T")[0];
      const hourKey = `${dateKey}_${now.getHours()}`;

      // Treino (janela madrugada)
      if (
        adapter.config.autoTriggerTraining &&
        adapter.isInTrainingWindow() &&
        lastActionRef.current["train"] !== hourKey
      ) {
        lastActionRef.current["train"] = hourKey;
        adapter.triggerTraining();
      }

      // Geração (uma vez/dia dentro da janela)
      if (
        adapter.config.autoTriggerGeneration &&
        adapter.isInGenerationWindow() &&
        lastActionRef.current["generate"] !== dateKey
      ) {
        lastActionRef.current["generate"] = dateKey;
        adapter.triggerGeneration();
      }

      // Conferência (sempre com data de hoje)
      if (
        adapter.config.autoTriggerChecking &&
        adapter.isInCheckingWindow() &&
        lastActionRef.current["check"] !== dateKey
      ) {
        lastActionRef.current["check"] = dateKey;
        adapter.triggerChecking(dateKey);
      }
    };

    tick();
    timerRef.current = setInterval(tick, intervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [adapter.isOnline, adapter.config.autoManage, intervalMs]);

  return {
    isOnline: adapter.isOnline,
    inGenWindow: adapter.isInGenerationWindow(),
    inCheckWindow: adapter.isInCheckingWindow(),
    inTrainWindow: adapter.isInTrainingWindow(),
  };
}
