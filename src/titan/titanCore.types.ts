// ============================================================
// titanCore.types.ts
// TitanDommoCore 9.0 — Motor Quantitativo V9 ULTRA
// Sistema Auto-Evolutivo · 38 Módulos · 22 Engines IA
// PatchTST + STL-ETS + Mamba + QAOA · Pipeline 24 Fases
// ============================================================

export const TITAN_VERSION = "9.0.0";
export const TITAN_CODENAME = "TitanDommoCore";
export const TITAN_BUILD = `${TITAN_CODENAME} ${TITAN_VERSION} ULTRA`;
export const TITAN_MODULES_COUNT = 38;
export const TITAN_ENGINES_COUNT = 22;
export const TITAN_PIPELINE_PHASES = 24;

export type PipelinePhase =
  | "P01_DATA_INGESTION" | "P02_TEMPORAL_DECOMPOSITION" | "P03_STL_ETS_ANALYSIS"
  | "P04_PATCHTST_ENCODING" | "P05_MAMBA_STATE_SPACE" | "P06_QAOA_QUANTUM_OPT"
  | "P07_FREQUENCY_MATRIX" | "P08_DELAY_PROBABILITY" | "P09_COMBINATORIAL_SCAN"
  | "P10_PATTERN_DETECTION" | "P11_ENSEMBLE_FUSION" | "P12_CONFIDENCE_SCORING"
  | "P13_PRIZE_TIER_FOCUS" | "P14_CANDIDATE_GENERATION" | "P15_CROSS_VALIDATION"
  | "P16_RISK_ASSESSMENT" | "P17_OPTIMIZATION_LOOP" | "P18_FINAL_SELECTION"
  | "P19_CONSENSUS_CHECK" | "P20_OUTPUT_FORMATTING" | "P21_PERSISTENCE"
  | "P22_SYNC_BROADCAST" | "P23_LEARNING_UPDATE" | "P24_SELF_EVOLUTION";

export type EngineId =
  | "E01_PATCHTST" | "E02_STL_ETS" | "E03_MAMBA_SSM" | "E04_QAOA"
  | "E05_FREQUENCY_NET" | "E06_DELAY_TRACKER" | "E07_COMBINATORIAL"
  | "E08_PATTERN_CNN" | "E09_TRANSFORMER_XL" | "E10_LSTM_DEEP"
  | "E11_GRU_TEMPORAL" | "E12_ATTENTION_MULTI" | "E13_BAYESIAN_OPT"
  | "E14_GENETIC_ALGO" | "E15_REINFORCEMENT" | "E16_MONTE_CARLO"
  | "E17_SPECTRAL_ANALYSIS" | "E18_GRAPH_NEURAL" | "E19_DIFFUSION_MODEL"
  | "E20_META_LEARNER" | "E21_ENSEMBLE_MASTER" | "E22_SELF_EVOLUTION";

export type ModuleId =
  | "M01_SCHEDULER" | "M02_DATA_PIPELINE" | "M03_PREPROCESSING"
  | "M04_FEATURE_ENG" | "M05_MODEL_REGISTRY" | "M06_TRAINING_LOOP"
  | "M07_INFERENCE_ENGINE" | "M08_ENSEMBLE_FUSION" | "M09_CONFIDENCE"
  | "M10_PRIZE_OPT" | "M11_BET_GEN" | "M12_BET_VALIDATOR"
  | "M13_BET_PERSIST" | "M14_DRAW_MONITOR" | "M15_RESULT_FETCHER"
  | "M16_AUTO_CHECKER" | "M17_PRIZE_TRACKER" | "M18_EARNINGS"
  | "M19_SYNC_ENGINE" | "M20_BROADCAST_BUS" | "M21_DEVICE_REG"
  | "M22_HEALTH_MON" | "M23_WATCHDOG" | "M24_AUTO_RECOVERY"
  | "M25_SELF_REBUILD" | "M26_EVOLUTION_ENG" | "M27_PATCH_MGR"
  | "M28_ROLLBACK" | "M29_PROFILER" | "M30_ALERTS"
  | "M31_LOG_AGG" | "M32_METRICS" | "M33_STRATEGY_BANK"
  | "M34_HISTORICAL_DB" | "M35_PATTERN_LIB" | "M36_CONFIG_MGR"
  | "M37_API_GATEWAY" | "M38_ORCHESTRATOR";

export type ComponentStatus =
  | "online" | "processing" | "training" | "evolving"
  | "recovering" | "rebuilding" | "idle" | "error" | "patching" | "active";

export type SystemState =
  | "BOOT" | "SELF_CHECK" | "TRAINING" | "GENERATING"
  | "AWAITING_DRAW" | "CHECKING" | "LEARNING" | "EVOLVING"
  | "SELF_REBUILDING" | "PATCHING" | "OPERATIONAL" | "STANDBY";

export interface PipelineHealth {
  overall: number;
  activePhase: PipelinePhase | null;
  completedPhases: number;
  failedPhases: number;
  throughput: number;
  lastFullRun: string | null;
}

export interface IAEngine {
  id: EngineId;
  name: string;
  shortName: string;
  description: string;
  accuracy: number;
  confidence: number;
  weight: number;
  status: ComponentStatus;
  trainingCycles: number;
  evolutionGen: number;
  lastOutput: string | null;
  specialization: string;
  processingMs: number;
}

export interface SystemModule {
  id: ModuleId;
  name: string;
  icon: string;
  status: ComponentStatus;
  health: number;
  tasksCompleted: number;
  lastActivity: string | null;
  description: string;
  layer: "core" | "ia" | "bet" | "check" | "sync" | "evolution";
  autoRecover: boolean;
}

export interface EvolutionEvent {
  id: string;
  ts: string;
  type: "patch" | "rebuild" | "weight_update" | "arch_change" | "strategy_refine";
  description: string;
  impactScore: number;
  engineId?: EngineId;
  moduleId?: ModuleId;
  beforeAccuracy?: number;
  afterAccuracy?: number;
  success: boolean;
}

export interface TitanMetrics {
  totalEvolutionEvents: number;
  totalSelfRebuilds: number;
  totalPatches: number;
  ensembleAccuracy: number;
  peakAccuracy: number;
  totalPredictions: number;
  totalPrizesWon: number;
  totalEarnings: number;
  winRate: number;
  uptimePercent: number;
  lastEvolutionAt: string | null;
  generationNumber: number;
}

export interface TitanConfig {
  autoEvolution: boolean;
  autoSelfRebuild: boolean;
  autoPatching: boolean;
  keepAlive: boolean;
  zeroDowntimeUpdates: boolean;
  enforceGenerationWindow: boolean;
  enforceDrawDate: boolean;
  generationStart: string;
  generationEnd: string;
  drawTime: string;
  checkingStart: string;
  trainingStart: string;
  trainingEnd: string;
  minConfidence: number;
  targetTiers: string[];
  evolutionThreshold: number;
  rebuildThreshold: number;
  pipelineMode: "sequential" | "parallel" | "quantum_parallel";
  ensembleStrategy: "weighted" | "stacking" | "boosting" | "quantum_vote";
}

export interface TitanLog {
  id: string;
  ts: string;
  level: "system" | "engine" | "module" | "evolution" | "success" | "warn" | "error" | "quantum" | "pipeline";
  phase?: PipelinePhase;
  engineId?: EngineId;
  moduleId?: ModuleId;
  message: string;
}
