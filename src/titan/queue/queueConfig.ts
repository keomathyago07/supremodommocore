// ============================================================
// queueConfig.ts — Parâmetros de retry exponencial e limites da DLQ
// por tipo de tarefa, com versionamento e rollback (institucional).
// ============================================================
import { supabase } from "@/integrations/supabase/client";

export interface TaskPolicy {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitter: number;        // 0..1
  dlqLimit: number;      // máximo de itens retidos na DLQ para o tipo
  autoRequeueDlq: boolean;
}

export interface QueueConfig {
  version: number;
  updatedAt: number;
  motivo: string;
  policies: Record<string, TaskPolicy>;   // por type de tarefa; "*" = default
}

const LS_CONFIG = "titan.queue.config.v1";
const LS_HISTORY = "titan.queue.config.history.v1";
const MAX_HISTORY = 30;

export const DEFAULT_POLICY: TaskPolicy = {
  maxAttempts: 6,
  baseDelayMs: 2_000,
  maxDelayMs: 300_000,
  jitter: 0.15,
  dlqLimit: 200,
  autoRequeueDlq: false,
};

const DEFAULT_CONFIG: QueueConfig = {
  version: 1,
  updatedAt: 0,
  motivo: "configuração institucional inicial",
  policies: {
    "*": { ...DEFAULT_POLICY },
    sync_e_confere: { ...DEFAULT_POLICY, maxAttempts: 8, baseDelayMs: 3_000 },
    conferir_aposta: { ...DEFAULT_POLICY, maxAttempts: 10, baseDelayMs: 5_000, maxDelayMs: 600_000, dlqLimit: 400 },
    reprocessar_concurso: { ...DEFAULT_POLICY, maxAttempts: 5, baseDelayMs: 4_000 },
  },
};

function read(): QueueConfig {
  try {
    const raw = localStorage.getItem(LS_CONFIG);
    if (!raw) return { ...DEFAULT_CONFIG };
    const p = JSON.parse(raw) as QueueConfig;
    return { ...DEFAULT_CONFIG, ...p, policies: { ...DEFAULT_CONFIG.policies, ...(p.policies ?? {}) } };
  } catch { return { ...DEFAULT_CONFIG }; }
}
function readHistory(): QueueConfig[] {
  try { return JSON.parse(localStorage.getItem(LS_HISTORY) ?? "[]") as QueueConfig[]; } catch { return []; }
}

let config: QueueConfig = typeof localStorage !== "undefined" ? read() : { ...DEFAULT_CONFIG };
let history: QueueConfig[] = typeof localStorage !== "undefined" ? readHistory() : [];
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(LS_CONFIG, JSON.stringify(config));
    localStorage.setItem(LS_HISTORY, JSON.stringify(history.slice(-MAX_HISTORY)));
  } catch { /* quota */ }
  listeners.forEach(l => { try { l(); } catch { /* noop */ } });
}

async function audit(mensagem: string, payload: Record<string, unknown>) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("god_core_events" as any).insert({
      user_id: user.id, tipo: "queue_config", modulo: "titan_queue",
      severidade: "info", mensagem, payload,
    });
  } catch { /* nunca throw */ }
}

export const queueConfig = {
  get(): QueueConfig { return config; },
  history(): QueueConfig[] { return [...history].reverse(); },
  subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },

  policy(type: string): TaskPolicy {
    return { ...DEFAULT_POLICY, ...(config.policies["*"] ?? {}), ...(config.policies[type] ?? {}) };
  },

  types(): string[] { return Object.keys(config.policies); },

  /** Salva nova versão da política de um tipo (versionamento + auditoria). */
  update(type: string, patch: Partial<TaskPolicy>, motivo = "ajuste manual institucional") {
    history.push({ ...config });
    config = {
      version: config.version + 1,
      updatedAt: Date.now(),
      motivo,
      policies: { ...config.policies, [type]: { ...queueConfig.policy(type), ...patch } },
    };
    persist();
    void audit(`⚙️ Política de fila "${type}" atualizada → v${config.version} (${motivo})`, { type, patch, version: config.version });
    return config;
  },

  /** Rollback para uma versão anterior registrada. */
  rollback(version: number, motivo = "rollback institucional") {
    const target = history.find(h => h.version === version);
    if (!target) return null;
    history.push({ ...config });
    config = { ...target, version: config.version + 1, updatedAt: Date.now(), motivo: `${motivo} (restaurado de v${version})` };
    persist();
    void audit(`⏪ Rollback de políticas de fila para v${version} → nova v${config.version}`, { version, novaVersao: config.version, motivo });
    return config;
  },

  resetDefaults(motivo = "reset institucional para padrões") {
    history.push({ ...config });
    config = { ...DEFAULT_CONFIG, version: config.version + 1, updatedAt: Date.now(), motivo };
    persist();
    void audit(`♻️ Políticas de fila restauradas aos padrões → v${config.version}`, { motivo });
    return config;
  },
};
