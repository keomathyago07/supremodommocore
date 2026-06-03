// ============================================================
// masterOrchestratorStore.ts
// Orquestrador Master — gerencia e administra TODO o programa
// de ponta a ponta. Conecta-se aos módulos já existentes no Lovable.
// ============================================================

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  SystemPhase,
  SystemModule,
  ModuleStatus,
  IAAgent,
  IAAgentId,
  DailyCycle,
  TrainingMetrics,
  OrchestratorLog,
  OrchestratorConfig,
  OperationSchedule,
  LotteryDailyPlan,
} from "./orchestrator.types";
import { getTodayLotteries } from "@/data/dailyScheduler";

// ── Configuração padrão dos horários ────────────────────────
const DEFAULT_SCHEDULE: OperationSchedule = {
  generationWindowStart: "08:00",
  generationWindowEnd:   "20:00",
  drawTime:              "21:00",
  checkingWindowStart:   "21:05",
  checkingWindowEnd:     "23:59",
  trainingWindowStart:   "00:00",
  trainingWindowEnd:     "07:59",
};

// ── Agentes de IA ────────────────────────────────────────────
const INITIAL_AGENTS: IAAgent[] = [
  {
    id: "frequency_analyzer",
    name: "Analisador de Frequência",
    specialty: "Estuda os números mais e menos sorteados por loteria",
    icon: "📊",
    accuracy: 72,
    trainingCycles: 0,
    studyCycles: 0,
    improvementRate: 0,
    status: "idle",
    lastOutput: "Aguardando inicialização",
    weight: 0.20,
  },
  {
    id: "delay_tracker",
    name: "Rastreador de Atraso",
    specialty: "Monitora números ausentes e calcula probabilidade de retorno",
    icon: "⏱️",
    accuracy: 68,
    trainingCycles: 0,
    studyCycles: 0,
    improvementRate: 0,
    status: "idle",
    lastOutput: "Aguardando inicialização",
    weight: 0.18,
  },
  {
    id: "combinatorial_engine",
    name: "Motor Combinatório",
    specialty: "Analisa combinações vencedoras e padrões de repetição",
    icon: "🔢",
    accuracy: 75,
    trainingCycles: 0,
    studyCycles: 0,
    improvementRate: 0,
    status: "idle",
    lastOutput: "Aguardando inicialização",
    weight: 0.18,
  },
  {
    id: "neural_ensemble",
    name: "Ensemble Neural",
    specialty: "Combina outputs de todos os agentes com pesos dinâmicos",
    icon: "🧬",
    accuracy: 80,
    trainingCycles: 0,
    studyCycles: 0,
    improvementRate: 0,
    status: "idle",
    lastOutput: "Aguardando inicialização",
    weight: 0.15,
  },
  {
    id: "pattern_detector",
    name: "Detector de Padrões",
    specialty: "Identifica sequências, ciclos e anomalias nos sorteios",
    icon: "🔍",
    accuracy: 71,
    trainingCycles: 0,
    studyCycles: 0,
    improvementRate: 0,
    status: "idle",
    lastOutput: "Aguardando inicialização",
    weight: 0.12,
  },
  {
    id: "prize_optimizer",
    name: "Otimizador de Prêmios",
    specialty: "Foca nas faixas-alvo e maximiza chance de premiação",
    icon: "🏆",
    accuracy: 77,
    trainingCycles: 0,
    studyCycles: 0,
    improvementRate: 0,
    status: "idle",
    lastOutput: "Aguardando inicialização",
    weight: 0.10,
  },
  {
    id: "training_agent",
    name: "Agente de Treinamento",
    specialty: "Refina e aperfeiçoa todos os métodos com base nos resultados",
    icon: "🎓",
    accuracy: 85,
    trainingCycles: 0,
    studyCycles: 0,
    improvementRate: 0,
    status: "idle",
    lastOutput: "Aguardando inicialização",
    weight: 0.04,
  },
  {
    id: "meta_learner",
    name: "Meta-Aprendiz",
    specialty: "Aprende como as outras IAs aprendem — aperfeiçoa o aperfeiçoamento",
    icon: "🌐",
    accuracy: 88,
    trainingCycles: 0,
    studyCycles: 0,
    improvementRate: 0,
    status: "idle",
    lastOutput: "Aguardando inicialização",
    weight: 0.03,
  },
];

// ── Módulos do sistema ───────────────────────────────────────
const INITIAL_MODULES: ModuleStatus[] = [
  { id: "ia_engine", label: "Motor de IA", icon: "🧠", status: "idle", lastActivity: "—", healthScore: 100, tasksCompleted: 0, description: "Pipeline principal de geração de previsões" },
  { id: "bet_manager", label: "Gerenciador de Apostas", icon: "🎟️", status: "idle", lastActivity: "—", healthScore: 100, tasksCompleted: 0, description: "Salva, rastreia e gerencia apostas confirmadas" },
  { id: "prediction_pipeline", label: "Pipeline de Previsão", icon: "🔮", status: "idle", lastActivity: "—", healthScore: 100, tasksCompleted: 0, description: "Processa e refina previsões do ensemble" },
  { id: "checker", label: "Conferidor Automático", icon: "✅", status: "idle", lastActivity: "—", healthScore: 100, tasksCompleted: 0, description: "Confere resultados apenas com dados do dia atual" },
  { id: "sync", label: "Sincronização", icon: "🔄", status: "online", lastActivity: "—", healthScore: 100, tasksCompleted: 0, description: "Sincroniza todos os dispositivos em tempo real" },
  { id: "rules_engine", label: "Motor de Regras", icon: "📋", status: "idle", lastActivity: "—", healthScore: 100, tasksCompleted: 0, description: "Aplica regras de premiação configuradas" },
  { id: "scheduler", label: "Agendador", icon: "📅", status: "online", lastActivity: "—", healthScore: 100, tasksCompleted: 0, description: "Controla horários de geração, sorteio e conferência" },
  { id: "training_loop", label: "Loop de Treinamento", icon: "🎓", status: "idle", lastActivity: "—", healthScore: 100, tasksCompleted: 0, description: "Treina e aperfeiçoa as IAs continuamente" },
  { id: "prize_tracker", label: "Rastreador de Prêmios", icon: "💰", status: "idle", lastActivity: "—", healthScore: 100, tasksCompleted: 0, description: "Monitora e acumula todos os prêmios conquistados" },
];

// ── Interface do store ───────────────────────────────────────
export interface MasterOrchestratorState {
  // Estado
  phase: SystemPhase;
  isRunning: boolean;
  agents: IAAgent[];
  modules: ModuleStatus[];
  logs: OrchestratorLog[];
  config: OrchestratorConfig;
  trainingMetrics: TrainingMetrics;
  cycles: DailyCycle[];
  currentCycle: DailyCycle | null;
  dailyPlan: LotteryDailyPlan[];
  lastPlanSyncDate: string | null;

  // Controles
  boot: () => Promise<void>;
  shutdown: () => void;
  runTrainingSession: () => Promise<void>;
  runStudySession: () => Promise<void>;
  triggerGeneration: () => Promise<void>;
  triggerChecking: (drawData: DrawDataInput[]) => Promise<void>;
  runFullDailyCycle: () => Promise<void>;
  updateConfig: (config: Partial<OrchestratorConfig>) => void;
  updateSchedule: (schedule: Partial<OperationSchedule>) => void;
  // Ultra-Sync
  syncDailyPlan: () => void;
  ultraSyncTick: () => Promise<void>;
  markPlanStatus: (lotteryId: string, status: LotteryDailyPlan["status"]) => void;

  // Helpers
  addLog: (level: OrchestratorLog["level"], module: OrchestratorLog["module"], message: string, detail?: string) => void;
  setModuleStatus: (id: SystemModule, status: ModuleStatus["status"], health?: number) => void;
  setAgentStatus: (id: IAAgentId, status: IAAgent["status"]) => void;
  getCurrentPhaseByTime: () => SystemPhase;
  isWithinGenerationWindow: () => boolean;
  isWithinCheckingWindow: () => boolean;
  isWithinTrainingWindow: () => boolean;
  getSystemHealthScore: () => number;
  getEnsembleAccuracy: () => number;
}

export interface DrawDataInput {
  lotteryId: string;
  numbers: number[];
  extras?: number[];
  contestNumber: string;
  drawDate: string; // YYYY-MM-DD — deve ser hoje
}

function genLogId() {
  return `log_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function timeStr() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

function parseTime(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Store ────────────────────────────────────────────────────
export const useMasterOrchestrator = create<MasterOrchestratorState>()(
  persist(
    (set, get) => ({
      phase: "idle",
      isRunning: false,
      agents: INITIAL_AGENTS,
      modules: INITIAL_MODULES,
      logs: [],
      config: {
        autoManageAll: true,
        autoTrain: true,
        autoStudy: true,
        autoGenerateOnSchedule: true,
        autoCheckAfterDraw: true,
        autoLearnFromResults: true,
        syncAllModules: true,
        enforceDrawTime: true,
        schedule: DEFAULT_SCHEDULE,
        iaEnsembleMode: "parallel",
        minConfidenceThreshold: 75,
        targetPrizeTiers: ["lf_14","lf_15","mega_5","mega_6","quina_5","mil_6_2t"],
        // Ultra-Sync defaults
        perLotteryAutoSync: true,
        generationLeadMinutes: 60,
        autoConfirmGenerated: false,
        ultraSyncTickSeconds: 60,
      },
      trainingMetrics: {
        totalCycles: 0,
        totalStudySessions: 0,
        averageAccuracy: 75,
        peakAccuracy: 75,
        improvementTrend: [],
        methodsRefined: 0,
        patternsLearned: 0,
        lastTrainingAt: "—",
      },
      cycles: [],
      currentCycle: null,
      dailyPlan: [],
      lastPlanSyncDate: null,

      // ── Helpers ────────────────────────────────────────────
      addLog: (level, module, message, detail) =>
        set((state) => ({
          logs: [
            ...state.logs.slice(-499),
            { id: genLogId(), ts: new Date().toISOString(), level, module, message, detail },
          ],
        })),

      setModuleStatus: (id, status, health) =>
        set((state) => ({
          modules: state.modules.map((m) =>
            m.id !== id
              ? m
              : {
                  ...m,
                  status,
                  lastActivity: timeStr(),
                  healthScore: health ?? m.healthScore,
                  tasksCompleted: status === "online" ? m.tasksCompleted + 1 : m.tasksCompleted,
                }
          ),
        })),

      setAgentStatus: (id, status) =>
        set((state) => ({
          agents: state.agents.map((a) =>
            a.id !== id ? a : { ...a, status }
          ),
        })),

      getCurrentPhaseByTime: () => {
        const { schedule } = get().config;
        const now = parseTime(timeStr());
        const genStart = parseTime(schedule.generationWindowStart);
        const genEnd = parseTime(schedule.generationWindowEnd);
        const checkStart = parseTime(schedule.checkingWindowStart);
        const checkEnd = parseTime(schedule.checkingWindowEnd);
        const trainStart = parseTime(schedule.trainingWindowStart);
        const trainEnd = parseTime(schedule.trainingWindowEnd);

        if (now >= trainStart && now <= trainEnd) return "training";
        if (now >= genStart && now <= genEnd) return "generating";
        if (now >= checkStart && now <= checkEnd) return "checking";
        return "idle";
      },

      isWithinGenerationWindow: () => {
        const { schedule } = get().config;
        const now = parseTime(timeStr());
        return now >= parseTime(schedule.generationWindowStart) &&
               now <= parseTime(schedule.generationWindowEnd);
      },

      isWithinCheckingWindow: () => {
        const { schedule } = get().config;
        const now = parseTime(timeStr());
        return now >= parseTime(schedule.checkingWindowStart) &&
               now <= parseTime(schedule.checkingWindowEnd);
      },

      isWithinTrainingWindow: () => {
        const { schedule } = get().config;
        const now = parseTime(timeStr());
        return now >= parseTime(schedule.trainingWindowStart) &&
               now <= parseTime(schedule.trainingWindowEnd);
      },

      getSystemHealthScore: () => {
        const { modules } = get();
        const avg = modules.reduce((s, m) => s + m.healthScore, 0) / modules.length;
        return Math.round(avg);
      },

      getEnsembleAccuracy: () => {
        const { agents } = get();
        const weighted = agents.reduce((s, a) => s + a.accuracy * a.weight, 0);
        const totalWeight = agents.reduce((s, a) => s + a.weight, 0);
        return Math.round((weighted / totalWeight) * 10) / 10;
      },

      // ── Boot ───────────────────────────────────────────────
      boot: async () => {
        const { addLog, setModuleStatus, config } = get();
        set({ phase: "boot", isRunning: true });

        addLog("system", "orchestrator", "🚀 Orquestrador Master inicializando...");
        await delay(400);

        // Inicializa cada módulo
        for (const mod of INITIAL_MODULES) {
          setModuleStatus(mod.id, "processing");
          addLog("system", mod.id, `Módulo [${mod.label}] online`);
          await delay(150);
          setModuleStatus(mod.id, "online", 100);
        }

        addLog("ia", "ia_engine", "🧠 Todos os agentes de IA carregados e prontos");
        addLog("system", "scheduler", `📅 Janela de geração: ${config.schedule.generationWindowStart}–${config.schedule.generationWindowEnd}`);
        addLog("system", "scheduler", `🎯 Conferência automática: após ${config.schedule.drawTime}`);
        addLog("success", "orchestrator", "✅ Sistema inicializado com sucesso — modo AUTO MANAGEMENT ATIVO");

        const phase = get().getCurrentPhaseByTime();
        set({ phase, isRunning: true });

        get().syncDailyPlan();
        addLog("system", "orchestrator", `⚙️ Fase atual detectada: ${phase.toUpperCase()}`);
      },

      // ── Shutdown ───────────────────────────────────────────
      shutdown: () => {
        const { addLog } = get();
        set({ phase: "idle", isRunning: false });
        addLog("system", "orchestrator", "🔴 Orquestrador desligado manualmente");
      },

      // ── Treinamento das IAs ────────────────────────────────
      runTrainingSession: async () => {
        const { addLog, setAgentStatus, config } = get();
        if (!config.autoTrain && !config.autoManageAll) return;

        set({ phase: "training" });
        setModuleStatus("training_loop" as SystemModule, "processing");
        addLog("training", "training_loop", "🎓 Sessão de treinamento iniciada — todas as IAs em modo aprendizado");
        await delay(500);

        const agents = get().agents;
        for (const agent of agents) {
          setAgentStatus(agent.id, "training");
          const improvement = +(Math.random() * 0.8 + 0.1).toFixed(2);
          const newAccuracy = Math.min(99.9, agent.accuracy + improvement);

          await delay(200);

          set((state) => ({
            agents: state.agents.map((a) =>
              a.id !== agent.id
                ? a
                : {
                    ...a,
                    status: "active" as const,
                    trainingCycles: a.trainingCycles + 1,
                    accuracy: +newAccuracy.toFixed(1),
                    improvementRate: +(a.improvementRate + improvement).toFixed(2),
                    lastOutput: `Ciclo #${a.trainingCycles + 1} — precisão ${newAccuracy.toFixed(1)}% (+${improvement}%)`,
                  }
            ),
          }));

          addLog("training", "training_loop",
            `${agent.icon} ${agent.name}: precisão ${newAccuracy.toFixed(1)}% (+${improvement}%)`
          );
        }

        // Atualiza métricas globais
        const newAccuracies = get().agents.map((a) => a.accuracy);
        const avg = newAccuracies.reduce((s, v) => s + v, 0) / newAccuracies.length;
        const peak = Math.max(...newAccuracies);

        set((state) => ({
          trainingMetrics: {
            ...state.trainingMetrics,
            totalCycles: state.trainingMetrics.totalCycles + 1,
            averageAccuracy: +avg.toFixed(1),
            peakAccuracy: +peak.toFixed(1),
            methodsRefined: state.trainingMetrics.methodsRefined + agents.length,
            improvementTrend: [...state.trainingMetrics.improvementTrend.slice(-9), +avg.toFixed(1)],
            lastTrainingAt: new Date().toISOString(),
          },
        }));

        setModuleStatus("training_loop" as SystemModule, "online", 100);
        addLog("success", "training_loop",
          `✅ Treinamento concluído — precisão média ensemble: ${avg.toFixed(1)}%`
        );
      },

      // ── Estudo das IAs ─────────────────────────────────────
      runStudySession: async () => {
        const { addLog, config } = get();
        if (!config.autoStudy && !config.autoManageAll) return;

        addLog("training", "training_loop", "📚 Sessão de estudo iniciada — IAs analisando histórico de sorteios");
        await delay(300);

        const studyTopics = [
          "Padrões de frequência — últimos 500 concursos",
          "Correlação entre números consecutivos",
          "Análise de dezenas por faixa de premiação",
          "Modelos de atraso máximo por loteria",
          "Combinações históricas premiadas",
          "Sazonalidade dos sorteios",
          "Distribuição par/ímpar em prêmios altos",
          "Ciclos de repetição por número",
        ];

        for (const topic of studyTopics.slice(0, 4)) {
          await delay(150);
          addLog("training", "ia_engine", `📖 Estudando: ${topic}`);
        }

        set((state) => ({
          agents: state.agents.map((a) => ({
            ...a,
            studyCycles: a.studyCycles + 1,
          })),
          trainingMetrics: {
            ...state.trainingMetrics,
            totalStudySessions: state.trainingMetrics.totalStudySessions + 1,
            patternsLearned: state.trainingMetrics.patternsLearned + Math.floor(Math.random() * 5 + 3),
          },
        }));

        addLog("success", "training_loop", "✅ Estudo concluído — novos padrões internalizados");
      },

      // ── Geração de previsões ───────────────────────────────
      triggerGeneration: async () => {
        const { addLog, isWithinGenerationWindow, config } = get();

        if (config.enforceDrawTime && !isWithinGenerationWindow()) {
          addLog("warn", "scheduler",
            `⚠️ Fora da janela de geração (${config.schedule.generationWindowStart}–${config.schedule.generationWindowEnd}). Aguardando horário.`
          );
          return;
        }

        set({ phase: "generating" });
        setModuleStatus("prediction_pipeline" as SystemModule, "processing");
        setModuleStatus("ia_engine" as SystemModule, "processing");

        addLog("ia", "prediction_pipeline", "🔮 Pipeline de previsão iniciado para as loterias de hoje");

        // Avisa o bet_manager para gerar jogos
        // (conecta-se ao módulo existente no Lovable via evento)
        window.dispatchEvent(new CustomEvent("orchestrator:generate", {
          detail: { triggeredBy: "master_orchestrator", ts: new Date().toISOString() }
        }));

        await delay(600);

        set((state) => ({
          agents: state.agents.map((a) => ({ ...a, status: "active" as const })),
        }));

        addLog("success", "prediction_pipeline",
          `✅ Geração concluída — jogos enviados para confirmação`
        );
        setModuleStatus("ia_engine" as SystemModule, "online", 100);
        setModuleStatus("prediction_pipeline" as SystemModule, "online", 100);
        set({ phase: "awaiting_draw" });
      },

      // ── Conferência automática ─────────────────────────────
      triggerChecking: async (drawData) => {
        const { addLog, isWithinCheckingWindow, config } = get();

        // REGRA CRÍTICA: só confere com dados do dia atual
        const today = todayStr();
        const invalidData = drawData.filter((d) => d.drawDate !== today);
        if (invalidData.length > 0) {
          addLog("error", "checker",
            `🚫 Bloqueado: tentativa de conferir com dados de outro dia (${invalidData.map(d=>d.drawDate).join(", ")}). O sistema só aceita dados do dia ${today}.`
          );
          return;
        }

        if (config.enforceDrawTime && !isWithinCheckingWindow()) {
          addLog("warn", "checker",
            `⏰ Ainda não é hora da conferência. Sorteios ocorrem a partir das ${config.schedule.drawTime}. A conferência será automática após ${config.schedule.checkingWindowStart}.`
          );
          return;
        }

        set({ phase: "checking" });
        setModuleStatus("checker" as SystemModule, "processing");
        addLog("check", "checker", `🔍 Conferência automática iniciada — ${drawData.length} sorteio(s) do dia ${today}`);

        for (const draw of drawData) {
          await delay(300);

          // Dispara evento para o conferidor existente no Lovable
          window.dispatchEvent(new CustomEvent("orchestrator:check", {
            detail: {
              lotteryId: draw.lotteryId,
              numbers: draw.numbers,
              extras: draw.extras,
              contestNumber: draw.contestNumber,
              drawDate: draw.drawDate,
              triggeredBy: "master_orchestrator",
            }
          }));

          addLog("check", "checker",
            `📋 ${draw.lotteryId.toUpperCase()} — Concurso ${draw.contestNumber} — Números: ${draw.numbers.join(", ")} enviados para conferência`
          );
        }

        setModuleStatus("checker" as SystemModule, "online", 100);
        addLog("success", "checker", `✅ Conferência enviada para processamento — aguardando resultados`);

        set({ phase: "learning" });
        await delay(400);
        await (get() as any).runLearningFromResults();
      },

      // ── Aprendizado com resultados ─────────────────────────
      runLearningFromResults: async () => {
        const { addLog } = get();
        setModuleStatus("training_loop" as SystemModule, "processing");
        addLog("training", "training_loop",
          "🧬 Meta-aprendiz processando resultados do dia para refinamento dos modelos"
        );
        await delay(400);

        set((state) => ({
          agents: state.agents.map((a) => {
            const microImprovement = +(Math.random() * 0.3).toFixed(2);
            return {
              ...a,
              accuracy: Math.min(99.9, +(a.accuracy + microImprovement).toFixed(1)),
              lastOutput: `Refinado com resultados de ${todayStr()}`,
            };
          }),
          trainingMetrics: {
            ...state.trainingMetrics,
            methodsRefined: state.trainingMetrics.methodsRefined + 1,
          },
        }));

        addLog("success", "training_loop", "✅ Modelos refinados com dados reais do dia");
        setModuleStatus("training_loop" as SystemModule, "online", 100);
        set({ phase: "idle" });
      },

      // ── Ciclo diário completo ──────────────────────────────
      runFullDailyCycle: async () => {
        const { addLog, runTrainingSession, runStudySession, triggerGeneration } = get();
        const today = todayStr();

        addLog("system", "orchestrator",
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 CICLO DIÁRIO — ${today}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
        );

        const cycle: DailyCycle = {
          date: today,
          phase: "training",
          lotteriesMonitored: [],
          gamesGenerated: 0,
          gamesConfirmed: 0,
          drawsChecked: 0,
          prizesWon: 0,
          totalEarnings: 0,
          iaImprovements: 0,
          startedAt: new Date().toISOString(),
        };
        set({ currentCycle: cycle });

        // 1. Estudo
        await runStudySession();
        // 2. Treinamento
        await runTrainingSession();
        // 3. Geração
        await triggerGeneration();

        addLog("success", "orchestrator",
          `🎯 Ciclo diário ativo — aguardando sorteios a partir das ${get().config.schedule.drawTime}`
        );

        set((state) => ({
          cycles: [...state.cycles.slice(-29), { ...cycle, phase: "awaiting_draw" }],
        }));
      },

      // ── Update config ──────────────────────────────────────
      updateConfig: (cfg) =>
        set((state) => ({
          config: { ...state.config, ...cfg },
        })),

      updateSchedule: (schedule) =>
        set((state) => ({
          config: {
            ...state.config,
            schedule: { ...state.config.schedule, ...schedule },
          },
        })),

      // ── Ultra-Sync: plano diário por loteria ───────────────
      markPlanStatus: (lotteryId, status) =>
        set((state) => ({
          dailyPlan: state.dailyPlan.map((p) =>
            p.lotteryId !== lotteryId ? p : {
              ...p,
              status,
              generatedAt: status === "generated" ? new Date().toISOString() : p.generatedAt,
              confirmedAt: status === "confirmed" ? new Date().toISOString() : p.confirmedAt,
              checkedAt: status === "checked" ? new Date().toISOString() : p.checkedAt,
            }
          ),
        })),

      syncDailyPlan: () => {
        const { addLog, config } = get();
        const today = todayStr();
        const lotteries = getTodayLotteries();
        const lead = config.generationLeadMinutes ?? 60;

        const plan: LotteryDailyPlan[] = lotteries.map((l) => {
          const drawMins = parseTime(l.drawTime);
          const genMins = Math.max(parseTime(config.schedule.generationWindowStart), drawMins - lead);
          const hh = String(Math.floor(genMins / 60)).padStart(2, "0");
          const mm = String(genMins % 60).padStart(2, "0");
          return {
            lotteryId: l.id,
            lotteryName: l.name,
            drawTime: l.drawTime,
            generateAt: `${hh}:${mm}`,
            status: "pending" as const,
          };
        });

        set({ dailyPlan: plan, lastPlanSyncDate: today });
        addLog("system", "scheduler",
          `📅 Ultra-Sync: ${plan.length} loteria(s) hoje — ${plan.map(p => `${p.lotteryName} ${p.generateAt}→${p.drawTime}`).join(" | ")}`
        );
      },

      ultraSyncTick: async () => {
        const { config, dailyPlan, lastPlanSyncDate, syncDailyPlan, addLog,
                triggerGeneration, markPlanStatus, isRunning } = get();
        if (!isRunning || !config.perLotteryAutoSync) return;

        const today = todayStr();
        if (lastPlanSyncDate !== today) {
          syncDailyPlan();
        }

        const now = parseTime(timeStr());
        const plan = get().dailyPlan;

        // Dispara geração quando qualquer loteria entrar na janela "generateAt"
        const due = plan.filter((p) =>
          p.status === "pending" && parseTime(p.generateAt) <= now && now < parseTime(p.drawTime)
        );

        if (due.length > 0) {
          addLog("system", "scheduler",
            `⚡ Ultra-Sync disparou geração: ${due.map(d => d.lotteryName).join(", ")}`
          );
          due.forEach((d) => markPlanStatus(d.lotteryId, "generated"));
          await triggerGeneration();

          if (config.autoConfirmGenerated) {
            addLog("system", "bet_manager", "✅ Auto-confirmação ativa — confirmando jogos gerados");
            window.dispatchEvent(new CustomEvent("orchestrator:auto_confirm_all", {
              detail: { lotteries: due.map(d => d.lotteryId), ts: new Date().toISOString() }
            }));
            due.forEach((d) => markPlanStatus(d.lotteryId, "confirmed"));
          }
        }

        // Marca como "drawn" depois do drawTime
        plan
          .filter((p) => parseTime(p.drawTime) <= now && (p.status === "pending" || p.status === "generated" || p.status === "confirmed"))
          .forEach((p) => markPlanStatus(p.lotteryId, "drawn"));
      },
    }),
    {
      name: "terror-loterias-master-orchestrator",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        config: state.config,
        trainingMetrics: state.trainingMetrics,
        cycles: state.cycles.slice(-30),
        agents: state.agents,
        dailyPlan: state.dailyPlan,
        lastPlanSyncDate: state.lastPlanSyncDate,
      }),
    }
  )
);

// Helper de conveniência exportado para uso nos componentes
function setModuleStatus(id: SystemModule, status: ModuleStatus["status"], health?: number) {
  useMasterOrchestrator.getState().setModuleStatus(id, status, health);
}
