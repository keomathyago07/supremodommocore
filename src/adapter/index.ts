// ============================================================
// index.ts — Barrel de exportações do Orquestrador Adaptador
// Importe tudo a partir daqui:
// import { ... } from "./orchestrator";
// ============================================================

// Tipos
export * from "./adapter.types";

// Store principal
export { useOrchestratorAdapter } from "./orchestratorAdapterStore";
export type { OrchestratorAdapterState } from "./orchestratorAdapterStore";

// Bridge com o núcleo
export {
  NucleusBridge,
  reportNucleusStatus,
  reportIACycleComplete,
  reportTrainingDone,
  reportBetConfirmed,
  reportDrawResult,
  reportCheckComplete,
  reportSyncDone,
  reportNucleusError,
  requestScheduleAction,
} from "./NucleusBridge";

// Listener de comandos (cole no núcleo existente)
export {
  initNucleusCommandListener,
  useNucleusCommandListener,
} from "./nucleusCommandListener";

// Hook de automação por horário
export { useAdapterAutoLoop } from "./useAdapterAutoLoop";

// Componentes visuais
export { OrchestratorAdapterDashboard } from "./OrchestratorAdapterDashboard";
export { OrchestratorStatusWidget } from "./OrchestratorStatusWidget";
export { default as OrchestratorAdapterPage } from "./OrchestratorAdapterPage";
