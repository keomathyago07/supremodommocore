// ============================================================
// orchestrator.types.ts
// Tipos centrais do Orquestrador Master
// ============================================================

// ── Estado global do programa ────────────────────────────────
export type SystemPhase =
  | "boot"            // inicializando
  | "monitoring"      // monitorando o programa
  | "training"        // IAs treinando
  | "generating"      // gerando previsões no horário definido
  | "awaiting_draw"   // aguardando sorteio (após horário de geração, antes das 21h)
  | "checking"        // conferindo resultados (após 21h com dados reais do dia)
  | "learning"        // IAs aprendendo com resultado do dia
  | "idle";           // ciclo concluído, aguardando próximo dia

// ── Módulos internos monitorados ────────────────────────────
export type SystemModule =
  | "ia_engine"
  | "bet_manager"
  | "prediction_pipeline"
  | "checker"
  | "sync"
  | "rules_engine"
  | "scheduler"
  | "training_loop"
  | "prize_tracker";

export interface ModuleStatus {
  id: SystemModule;
  label: string;
  icon: string;
  status: "online" | "processing" | "idle" | "error";
  lastActivity: string;
  healthScore: number; // 0–100
  tasksCompleted: number;
  description: string;
}

// ── IA Agents ────────────────────────────────────────────────
export type IAAgentId =
  | "frequency_analyzer"
  | "delay_tracker"
  | "combinatorial_engine"
  | "neural_ensemble"
  | "pattern_detector"
  | "prize_optimizer"
  | "training_agent"
  | "meta_learner";

export interface IAAgent {
  id: IAAgentId;
  name: string;
  specialty: string;
  icon: string;
  accuracy: number;       // % atual
  trainingCycles: number; // ciclos de treino concluídos
  studyCycles: number;    // ciclos de estudo concluídos
  improvementRate: number;// % de melhora acumulada
  status: "active" | "training" | "studying" | "idle";
  lastOutput: string;
  weight: number;         // peso no ensemble (0–1)
}

// ── Horários de operação ─────────────────────────────────────
export interface OperationSchedule {
  generationWindowStart: string; // "08:00"
  generationWindowEnd: string;   // "20:00"
  drawTime: string;              // "21:00" — quando os sorteios acontecem
  checkingWindowStart: string;   // "21:05" — quando começa a conferência
  checkingWindowEnd: string;     // "23:59"
  trainingWindowStart: string;   // "00:00"
  trainingWindowEnd: string;     // "07:59"
}

// ── Ciclo diário ─────────────────────────────────────────────
export interface DailyCycle {
  date: string;
  phase: SystemPhase;
  lotteriesMonitored: string[];
  gamesGenerated: number;
  gamesConfirmed: number;
  drawsChecked: number;
  prizesWon: number;
  totalEarnings: number;
  iaImprovements: number;
  startedAt: string;
  completedAt?: string;
}

// ── Métricas de treinamento ──────────────────────────────────
export interface TrainingMetrics {
  totalCycles: number;
  totalStudySessions: number;
  averageAccuracy: number;
  peakAccuracy: number;
  improvementTrend: number[]; // últimas 10 sessões
  methodsRefined: number;
  patternsLearned: number;
  lastTrainingAt: string;
}

// ── Log do orquestrador ──────────────────────────────────────
export interface OrchestratorLog {
  id: string;
  ts: string;
  level: "system" | "ia" | "success" | "warn" | "error" | "training" | "check";
  module: SystemModule | "orchestrator";
  message: string;
  detail?: string;
}

// ── Configurações do orquestrador ────────────────────────────
export interface OrchestratorConfig {
  autoManageAll: boolean;           // gerencia tudo automaticamente
  autoTrain: boolean;               // IAs treinam automaticamente
  autoStudy: boolean;               // IAs estudam automaticamente
  autoGenerateOnSchedule: boolean;  // gera jogos no horário definido
  autoCheckAfterDraw: boolean;      // confere automaticamente após 21h
  autoLearnFromResults: boolean;    // aprende com resultados do dia
  syncAllModules: boolean;          // sincroniza todos os módulos
  enforceDrawTime: boolean;         // só confere com sorteios do dia atual
  schedule: OperationSchedule;
  iaEnsembleMode: "parallel" | "sequential" | "hierarchical";
  minConfidenceThreshold: number;   // 0–100
  targetPrizeTiers: string[];       // faixas alvo
}
