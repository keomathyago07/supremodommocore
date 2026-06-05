// ============================================================
// nucleusCommandListener.ts
// Cole este arquivo no seu núcleo existente.
// Ele escuta os comandos do orquestrador e delega
// para as funções já implementadas no seu programa.
//
// INSTRUÇÕES:
// 1. Cole em src/nucleus/nucleusCommandListener.ts
// 2. Importe e chame initNucleusCommandListener() uma vez
//    no seu núcleo (ex: dentro do useEffect principal)
// ============================================================

import {
  reportNucleusStatus,
  reportIACycleComplete,
  reportTrainingDone,
  reportSyncDone,
  reportNucleusError,
} from "./NucleusBridge";

// ── Tipo dos comandos recebidos ──────────────────────────────
type OrchestratorCommand =
  | "CMD_START_TRAINING"
  | "CMD_STOP_TRAINING"
  | "CMD_GENERATE_TODAY"
  | "CMD_TRIGGER_CHECK"
  | "CMD_SYNC_ALL"
  | "CMD_PAUSE_IAS"
  | "CMD_RESUME_IAS"
  | "CMD_SET_IA_LEVEL"
  | "CMD_FOCUS_PRIZE_TIER"
  | "CMD_ENFORCE_SCHEDULE";

interface CommandDetail {
  command: OrchestratorCommand;
  payload?: Record<string, unknown>;
  id: string;
  ts: string;
}

// ── Inicializa o listener ────────────────────────────────────
export function initNucleusCommandListener(hooks: {
  // Conecte cada função à implementação real do seu núcleo:
  onStartTraining?: (mode?: string) => Promise<void> | void;
  onStopTraining?: () => void;
  onGenerateToday?: (date: string, minConfidence: number, targetTiers: string[]) => Promise<void> | void;
  onTriggerCheck?: (drawDate: string) => Promise<void> | void;
  onSyncAll?: () => Promise<void> | void;
  onPauseIAs?: () => void;
  onResumeIAs?: () => void;
  onSetIALevel?: (level: string) => void;
  onFocusPrizeTiers?: (tiers: string[]) => void;
  onEnforceSchedule?: (windows: unknown) => void;
  // Status reporter — chame quando tiver dados atualizados
  getStatus?: () => {
    totalIAs: number;
    activeIAs: number;
    trainingIAs: number;
    ensembleAccuracy: number;
    cyclesCompleted: number;
    predictionConfidence: number;
    pipelineHealth: number;
    currentTask: string | null;
  };
}) {
  const handler = async (e: Event) => {
    const { command, payload, id } = (e as CustomEvent<CommandDetail>).detail;

    console.log(`[NucleusListener] Comando recebido: ${command}`, payload);

    try {
      switch (command) {

        // ── Iniciar treinamento ──────────────────────────
        case "CMD_START_TRAINING": {
          const mode = (payload?.mode as string) ?? "standard";
          if (hooks.onStartTraining) {
            await hooks.onStartTraining(mode);
          }
          // Após terminar, reporte ao orquestrador
          const status = hooks.getStatus?.();
          if (status) {
            reportTrainingDone(status.ensembleAccuracy, status.trainingIAs);
            reportNucleusStatus({
              trainingIAs: 0,
              currentTask: null,
              ensembleAccuracy: status.ensembleAccuracy,
            });
          }
          break;
        }

        // ── Parar treinamento ────────────────────────────
        case "CMD_STOP_TRAINING": {
          hooks.onStopTraining?.();
          break;
        }

        // ── Gerar jogos do dia ───────────────────────────
        case "CMD_GENERATE_TODAY": {
          const date = (payload?.date as string) ?? new Date().toISOString().split("T")[0];
          const minConf = (payload?.minConfidence as number) ?? 75;
          const tiers = (payload?.targetTiers as string[]) ?? [];
          if (hooks.onGenerateToday) {
            reportNucleusStatus({ currentTask: `GERAÇÃO — Jogos de ${date}` });
            await hooks.onGenerateToday(date, minConf, tiers);
            reportNucleusStatus({ currentTask: null });
          }
          const status = hooks.getStatus?.();
          if (status) reportIACycleComplete(status.cyclesCompleted + 1, status.predictionConfidence);
          break;
        }

        // ── Conferir resultados ──────────────────────────
        case "CMD_TRIGGER_CHECK": {
          const drawDate = payload?.drawDate as string;
          if (!drawDate) {
            reportNucleusError("CMD_TRIGGER_CHECK sem drawDate", "nucleus_listener");
            break;
          }
          if (hooks.onTriggerCheck) {
            reportNucleusStatus({ currentTask: `CONFERÊNCIA — ${drawDate}` });
            await hooks.onTriggerCheck(drawDate);
            reportNucleusStatus({ currentTask: null });
          }
          break;
        }

        // ── Sincronizar ──────────────────────────────────
        case "CMD_SYNC_ALL": {
          if (hooks.onSyncAll) {
            await hooks.onSyncAll();
            reportSyncDone();
          }
          break;
        }

        // ── Pausar IAs ───────────────────────────────────
        case "CMD_PAUSE_IAS": {
          hooks.onPauseIAs?.();
          reportNucleusStatus({ activeIAs: 0, currentTask: "PAUSADO" });
          break;
        }

        // ── Retomar IAs ──────────────────────────────────
        case "CMD_RESUME_IAS": {
          hooks.onResumeIAs?.();
          const status = hooks.getStatus?.();
          if (status) reportNucleusStatus({ ...status, currentTask: null });
          break;
        }

        // ── Definir nível de IA ──────────────────────────
        case "CMD_SET_IA_LEVEL": {
          const level = payload?.level as string;
          hooks.onSetIALevel?.(level);
          break;
        }

        // ── Focar faixas-alvo ────────────────────────────
        case "CMD_FOCUS_PRIZE_TIER": {
          const tiers = payload?.tiers as string[];
          hooks.onFocusPrizeTiers?.(tiers);
          break;
        }

        // ── Aplicar janelas de horário ───────────────────
        case "CMD_ENFORCE_SCHEDULE": {
          hooks.onEnforceSchedule?.(payload?.windows);
          break;
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      reportNucleusError(`Erro ao executar ${command}: ${msg}`, "nucleus_listener");
      console.error(`[NucleusListener] Erro em ${command}:`, err);
    }
  };

  window.addEventListener("orchestrator:command", handler);

  // Retorna função de cleanup
  return () => window.removeEventListener("orchestrator:command", handler);
}

// ── Hook React para usar nos componentes do núcleo ───────────
import { useEffect } from "react";

export function useNucleusCommandListener(hooks: Parameters<typeof initNucleusCommandListener>[0]) {
  useEffect(() => {
    const cleanup = initNucleusCommandListener(hooks);
    return cleanup;
  }, []);
}
