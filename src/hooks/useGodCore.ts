// IASV60+ GOD CORE hook — ativa o "Olho de Deus" globalmente
import { useEffect, useState } from "react";
import { godCore, type GodSystemState } from "@/lib/godCore";

export function useGodCore(autoStart = true, intervalMs = 5000) {
  const [state, setState] = useState<GodSystemState>(godCore.godEyeDashboard());

  useEffect(() => {
    const unsub = godCore.subscribe(setState);
    if (autoStart) godCore.start(intervalMs);
    return () => {
      unsub();
    };
  }, [autoStart, intervalMs]);

  return {
    state,
    forcePipeline: () => godCore.forcePipeline(),
    fullReset: () => godCore.fullReset(),
    restartIngest: () => godCore.restartIngest(),
    restartModels: () => godCore.restartModels(),
    restartPipeline: () => godCore.restartPipeline(),
    stop: () => godCore.stop(),
    start: () => godCore.start(intervalMs),
  };
}
