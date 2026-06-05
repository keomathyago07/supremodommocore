// ============================================================
// adapter.types.ts
// Tipos do Orquestrador Adaptador — conecta ao núcleo existente
// com 700+ IAs já desenvolvidas no programa
// ============================================================

// ── Referência ao núcleo existente ───────────────────────────
// O orquestrador não cria IAs — apenas se conecta ao núcleo
// e gerencia o que já existe

export type NucleusEventType =
  | "nucleus:ia_status_changed"
  | "nucleus:prediction_ready"
  | "nucleus:bet_confirmed"
  | "nucleus:draw_result"
  | "nucleus:check_complete"
  | "nucleus:training_done"
  | "nucleus:sync_done"
  | "nucleus:error"
  | "nucleus:ia_cycle_complete"
  | "nucleus:schedule_trigger";

export type OrchestratorCommand =
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

// ── Status do núcleo reportado ao orquestrador ───────────────
export interface NucleusStatus {
  totalIAs: number;                 // quantas IAs existem (700+)
  activeIAs: number;                // quantas estão ativas agora
  trainingIAs: number;              // quantas estão treinando
  idleIAs: number;                  // quantas em standby
  ensembleAccuracy: number;         // precisão média do conjunto
  cyclesCompleted: number;          // ciclos completados hoje
  lastCycleAt: string | null;       // timestamp do último ciclo
  currentTask: string | null;       // tarefa atual do núcleo
  pipelineHealth: number;           // 0–100
  predictionConfidence: number;     // confiança atual das previsões
}

// ── Janelas de operação ──────────────────────────────────────
export interface OperationWindows {
  generation: { start: string; end: string };   // jogos só neste período
  drawTime: string;                              // quando sorteios ocorrem
  checking: { start: string; end: string };     // conferência apenas aqui
  training: { start: string; end: string };     // treino automático
}

// ── Log do orquestrador ──────────────────────────────────────
export interface AdapterLog {
  id: string;
  ts: string;
  level: "system" | "nucleus" | "command" | "success" | "warn" | "error" | "schedule";
  message: string;
  source?: string;
}

// ── Estado de um comando enviado ao núcleo ───────────────────
export interface CommandRecord {
  id: string;
  command: OrchestratorCommand;
  payload?: Record<string, unknown>;
  sentAt: string;
  ackAt?: string;
  status: "pending" | "ack" | "done" | "error";
  response?: string;
}

// ── Métricas do orquestrador ─────────────────────────────────
export interface OrchestratorMetrics {
  commandsSent: number;
  commandsAcked: number;
  cyclesManaged: number;
  trainingSessionsTriggered: number;
  checksTriggered: number;
  generationsTriggered: number;
  totalPrizesDetected: number;
  totalEarningsTracked: number;
  uptimeStart: string | null;
}

// ── Configuração do adaptador ────────────────────────────────
export interface AdapterConfig {
  // Controle automático
  autoManage: boolean;
  autoTriggerTraining: boolean;
  autoTriggerGeneration: boolean;
  autoTriggerChecking: boolean;
  autoSyncAfterAction: boolean;
  autoLearnFromResults: boolean;

  // Regras críticas
  enforceGenerationWindow: boolean;  // só gera 08h–20h
  enforceDrawDate: boolean;          // confere APENAS com dados de hoje
  blockPastDateChecks: boolean;      // bloqueia datas anteriores

  // Janelas
  windows: OperationWindows;

  // Nível de intervenção
  interventionLevel: "full_auto" | "supervised" | "manual";

  // Faixas-alvo (informa ao núcleo onde focar)
  targetPrizeTiers: string[];
  minConfidence: number;  // não publica jogo abaixo desse %
}
