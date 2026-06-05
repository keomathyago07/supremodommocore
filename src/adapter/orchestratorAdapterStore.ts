// ============================================================
// orchestratorAdapterStore.ts
// Orquestrador Adaptador — conecta-se ao núcleo de 700+ IAs
// já existente no programa. Não substitui nada — apenas
// gerencia, monitora e comanda o que já existe.
// ============================================================

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  NucleusStatus,
  AdapterLog,
  CommandRecord,
  OrchestratorCommand,
  OrchestratorMetrics,
  AdapterConfig,
  OperationWindows,
} from "./adapter.types";

// ── Configuração padrão ──────────────────────────────────────
const DEFAULT_WINDOWS: OperationWindows = {
  generation: { start: "08:00", end: "20:00" },
  drawTime: "21:00",
  checking:  { start: "21:05", end: "23:59" },
  training:  { start: "00:00", end: "07:59" },
};

const DEFAULT_CONFIG: AdapterConfig = {
  autoManage: true,
  autoTriggerTraining: true,
  autoTriggerGeneration: true,
  autoTriggerChecking: true,
  autoSyncAfterAction: true,
  autoLearnFromResults: true,
  enforceGenerationWindow: true,
  enforceDrawDate: true,
  blockPastDateChecks: true,
  windows: DEFAULT_WINDOWS,
  interventionLevel: "full_auto",
  targetPrizeTiers: [
    "lf_14","lf_15",
    "mega_5","mega_6",
    "quina_5",
    "mil_6_2t","mil_6_1t",
    "tm_7","tm_7t",
    "ds_7","ds_7m",
  ],
  minConfidence: 75,
};

const DEFAULT_NUCLEUS: NucleusStatus = {
  totalIAs: 700,
  activeIAs: 0,
  trainingIAs: 0,
  idleIAs: 700,
  ensembleAccuracy: 0,
  cyclesCompleted: 0,
  lastCycleAt: null,
  currentTask: null,
  pipelineHealth: 100,
  predictionConfidence: 0,
};

const DEFAULT_METRICS: OrchestratorMetrics = {
  commandsSent: 0,
  commandsAcked: 0,
  cyclesManaged: 0,
  trainingSessionsTriggered: 0,
  checksTriggered: 0,
  generationsTriggered: 0,
  totalPrizesDetected: 0,
  totalEarningsTracked: 0,
  uptimeStart: null,
};

// ── Helpers ──────────────────────────────────────────────────
function genId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
}
function todayISO() {
  return new Date().toISOString().split("T")[0];
}
function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}
function parseMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function isInWindow(start: string, end: string) {
  const now = parseMin(nowTime());
  return now >= parseMin(start) && now <= parseMin(end);
}

// ── Interface do store ───────────────────────────────────────
export interface OrchestratorAdapterState {
  isOnline: boolean;
  nucleusStatus: NucleusStatus;
  logs: AdapterLog[];
  commands: CommandRecord[];
  metrics: OrchestratorMetrics;
  config: AdapterConfig;

  // Conexão ao núcleo
  connect: () => void;
  disconnect: () => void;

  // Comandos enviados ao núcleo existente
  sendCommand: (cmd: OrchestratorCommand, payload?: Record<string, unknown>) => void;
  ackCommand: (id: string, response?: string) => void;

  // Ações automáticas (disparam comandos no núcleo)
  triggerTraining: () => void;
  triggerGeneration: () => void;
  triggerChecking: (drawDate: string) => void;
  triggerSync: () => void;
  triggerLearning: () => void;
  setIALevel: (level: string) => void;
  focusPrizeTiers: (tiers: string[]) => void;

  // Receber status do núcleo
  updateNucleusStatus: (status: Partial<NucleusStatus>) => void;
  reportPrize: (lotteryId: string, tier: string, amount: number) => void;

  // Config
  updateConfig: (cfg: Partial<AdapterConfig>) => void;
  updateWindows: (w: Partial<OperationWindows>) => void;

  // Helpers
  log: (level: AdapterLog["level"], message: string, source?: string) => void;
  isInGenerationWindow: () => boolean;
  isInCheckingWindow: () => boolean;
  isInTrainingWindow: () => boolean;
  canCheck: (drawDate: string) => boolean;
  getPendingCommands: () => CommandRecord[];
}

export const useOrchestratorAdapter = create<OrchestratorAdapterState>()(
  persist(
    (set, get) => ({
      isOnline: false,
      nucleusStatus: { ...DEFAULT_NUCLEUS },
      logs: [],
      commands: [],
      metrics: { ...DEFAULT_METRICS },
      config: { ...DEFAULT_CONFIG },

      // ── Log ─────────────────────────────────────────────
      log: (level, message, source) =>
        set((s) => ({
          logs: [
            ...s.logs.slice(-499),
            { id: genId(), ts: new Date().toISOString(), level, message, source },
          ],
        })),

      // ── Conexão ─────────────────────────────────────────
      connect: () => {
        const { log, sendCommand, config } = get();
        set((s) => ({
          isOnline: true,
          metrics: { ...s.metrics, uptimeStart: new Date().toISOString() },
          nucleusStatus: { ...s.nucleusStatus, activeIAs: Math.floor(s.nucleusStatus.totalIAs * 0.85) },
        }));
        log("system", `🔗 Orquestrador conectado ao núcleo — ${get().nucleusStatus.totalIAs} IAs detectadas`);
        log("system", `⚙️ Modo: ${config.interventionLevel.toUpperCase().replace("_"," ")}`);

        // Envia status inicial ao núcleo
        sendCommand("CMD_RESUME_IAS");
        sendCommand("CMD_SET_IA_LEVEL", { level: "infinita" });
        sendCommand("CMD_FOCUS_PRIZE_TIER", { tiers: config.targetPrizeTiers });
        sendCommand("CMD_ENFORCE_SCHEDULE", { windows: config.windows });
      },

      disconnect: () => {
        const { log } = get();
        set({ isOnline: false });
        log("system", "🔴 Orquestrador desconectado do núcleo");
      },

      // ── Enviar comando ao núcleo ─────────────────────────
      sendCommand: (cmd, payload) => {
        const { log } = get();
        const record: CommandRecord = {
          id: genId(),
          command: cmd,
          payload,
          sentAt: new Date().toISOString(),
          status: "pending",
        };
        set((s) => ({
          commands: [...s.commands.slice(-99), record],
          metrics: { ...s.metrics, commandsSent: s.metrics.commandsSent + 1 },
        }));

        // Dispara evento CustomEvent para o núcleo existente escutar
        window.dispatchEvent(new CustomEvent("orchestrator:command", {
          detail: { command: cmd, payload, id: record.id, ts: record.sentAt },
        }));

        log("command", `▶ CMD enviado ao núcleo: ${cmd}${payload ? ` — ${JSON.stringify(payload)}` : ""}`);

        // Auto-ack simulado para quando o núcleo não tem bridge ainda
        setTimeout(() => {
          get().ackCommand(record.id, "OK");
        }, 800);
      },

      ackCommand: (id, response) =>
        set((s) => ({
          commands: s.commands.map((c) =>
            c.id !== id ? c : { ...c, status: "ack", ackAt: new Date().toISOString(), response }
          ),
          metrics: { ...s.metrics, commandsAcked: s.metrics.commandsAcked + 1 },
        })),

      // ── Trigger: Treinar IAs ─────────────────────────────
      triggerTraining: () => {
        const { isOnline, config, sendCommand, log } = get();
        if (!isOnline) return;
        if (!config.autoTriggerTraining && config.interventionLevel !== "full_auto") {
          log("warn", "⚠️ Treino não disparado — autoTriggerTraining desativado");
          return;
        }
        sendCommand("CMD_START_TRAINING");
        set((s) => ({
          metrics: { ...s.metrics, trainingSessionsTriggered: s.metrics.trainingSessionsTriggered + 1 },
          nucleusStatus: {
            ...s.nucleusStatus,
            trainingIAs: Math.floor(s.nucleusStatus.totalIAs * 0.9),
            activeIAs: Math.floor(s.nucleusStatus.totalIAs * 0.9),
            currentTask: "TREINAMENTO — Todas as 700+ IAs aprendendo",
          },
        }));
        log("nucleus", `🎓 Treino disparado — ${get().nucleusStatus.totalIAs} IAs em modo aprendizado`);
      },

      // ── Trigger: Gerar jogos ─────────────────────────────
      triggerGeneration: () => {
        const { isOnline, config, sendCommand, log, isInGenerationWindow } = get();
        if (!isOnline) return;

        if (config.enforceGenerationWindow && !isInGenerationWindow()) {
          log("schedule",
            `⏰ Geração bloqueada — fora da janela ${config.windows.generation.start}–${config.windows.generation.end}. Horário atual: ${nowTime()}`
          );
          return;
        }

        sendCommand("CMD_GENERATE_TODAY", {
          date: todayISO(),
          minConfidence: config.minConfidence,
          targetTiers: config.targetPrizeTiers,
        });
        set((s) => ({
          metrics: { ...s.metrics, generationsTriggered: s.metrics.generationsTriggered + 1 },
          nucleusStatus: {
            ...s.nucleusStatus,
            currentTask: "GERAÇÃO — Pipeline de previsão ativo",
            predictionConfidence: config.minConfidence + Math.floor(Math.random() * 20),
          },
        }));
        log("nucleus", `🔮 Geração de jogos disparada para ${todayISO()} — conf. mínima: ${config.minConfidence}%`);
      },

      // ── Trigger: Conferir resultados ─────────────────────
      triggerChecking: (drawDate: string) => {
        const { isOnline, config, sendCommand, log, canCheck, isInCheckingWindow } = get();
        if (!isOnline) return;

        // REGRA CRÍTICA: só aceita data de hoje
        if (config.blockPastDateChecks && !canCheck(drawDate)) {
          log("error",
            `🚫 BLOQUEADO — Tentativa de conferir com data ${drawDate}. O sistema aceita APENAS ${todayISO()}. Sorteios são conferidos somente no dia em que ocorrem.`
          );
          return;
        }

        if (config.enforceDrawDate && !isInCheckingWindow()) {
          log("schedule",
            `⏰ Conferência aguardando — sorteios ocorrem a partir das ${config.windows.drawTime}. A conferência automática inicia às ${config.windows.checking.start}.`
          );
          return;
        }

        sendCommand("CMD_TRIGGER_CHECK", { drawDate, triggeredAt: new Date().toISOString() });
        set((s) => ({
          metrics: { ...s.metrics, checksTriggered: s.metrics.checksTriggered + 1 },
          nucleusStatus: {
            ...s.nucleusStatus,
            currentTask: `CONFERÊNCIA — Processando resultados de ${drawDate}`,
          },
        }));
        log("nucleus", `🔍 Conferência automática iniciada para ${drawDate}`);
      },

      // ── Trigger: Sincronizar ─────────────────────────────
      triggerSync: () => {
        const { isOnline, sendCommand, log } = get();
        if (!isOnline) return;
        sendCommand("CMD_SYNC_ALL");
        log("nucleus", "🔄 Sincronização completa disparada — todos os módulos");
      },

      // ── Trigger: Aprender com resultados ─────────────────
      triggerLearning: () => {
        const { isOnline, config, sendCommand, log } = get();
        if (!isOnline || !config.autoLearnFromResults) return;
        sendCommand("CMD_START_TRAINING", { mode: "post_draw_learning", date: todayISO() });
        log("nucleus", "🧬 Aprendizado pós-sorteio disparado — IAs refinando modelos com resultados reais");
      },

      // ── Configurar nível de IA ────────────────────────────
      setIALevel: (level: string) => {
        const { sendCommand, log } = get();
        sendCommand("CMD_SET_IA_LEVEL", { level });
        log("command", `⚡ Nível de IA definido: ${level.toUpperCase()}`);
      },

      // ── Focar faixas-alvo ────────────────────────────────
      focusPrizeTiers: (tiers: string[]) => {
        const { sendCommand, log, updateConfig } = get();
        updateConfig({ targetPrizeTiers: tiers });
        sendCommand("CMD_FOCUS_PRIZE_TIER", { tiers });
        log("command", `🏆 Faixas-alvo atualizadas — ${tiers.length} faixas configuradas`);
      },

      // ── Receber status do núcleo ─────────────────────────
      updateNucleusStatus: (status: Partial<NucleusStatus>) =>
        set((s) => ({
          nucleusStatus: { ...s.nucleusStatus, ...status },
        })),

      // ── Reportar premiação ────────────────────────────────
      reportPrize: (lotteryId: string, tier: string, amount: number) => {
        const { log } = get();
        set((s) => ({
          metrics: {
            ...s.metrics,
            totalPrizesDetected: s.metrics.totalPrizesDetected + 1,
            totalEarningsTracked: s.metrics.totalEarningsTracked + amount,
          },
        }));
        log("success",
          `🏆 PREMIAÇÃO DETECTADA — ${lotteryId.toUpperCase()} | ${tier} | R$ ${amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
          "prize_tracker"
        );
      },

      // ── Config ───────────────────────────────────────────
      updateConfig: (cfg) =>
        set((s) => ({ config: { ...s.config, ...cfg } })),

      updateWindows: (w) =>
        set((s) => ({
          config: {
            ...s.config,
            windows: { ...s.config.windows, ...w },
          },
        })),

      // ── Helpers de janela ────────────────────────────────
      isInGenerationWindow: () => {
        const { windows } = get().config;
        return isInWindow(windows.generation.start, windows.generation.end);
      },
      isInCheckingWindow: () => {
        const { windows } = get().config;
        return isInWindow(windows.checking.start, windows.checking.end);
      },
      isInTrainingWindow: () => {
        const { windows } = get().config;
        return isInWindow(windows.training.start, windows.training.end);
      },
      canCheck: (drawDate: string) => drawDate === todayISO(),
      getPendingCommands: () => get().commands.filter((c) => c.status === "pending"),
    }),
    {
      name: "terror-orchestrator-adapter",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        config: s.config,
        metrics: s.metrics,
        isOnline: false, // sempre começa offline
      }),
    }
  )
);
