// ============================================================
// guardianAlerts.ts — Alertas do TitanGuardian com severidade
// e histórico por módulo (latência, memória, filas, reconnect).
// ============================================================
import { supabase } from "@/integrations/supabase/client";
import { emitTitanEvent } from "@/titan/sync/titanEventBus";

export type Severity = "info" | "warn" | "error" | "critical";

export interface GuardianAlert {
  id: string;
  modulo: string;
  tipo: "latency" | "memory" | "queue" | "reconnect" | "module_down" | "recovery";
  severidade: Severity;
  mensagem: string;
  valor?: number;
  limite?: number;
  at: number;
}

const LS_KEY = "titan.guardian.alerts.v1";
const MAX = 300;

export const THRESHOLDS = {
  latencyWarnMs: 1_500,
  latencyErrorMs: 4_000,
  memoryWarnPct: 70,
  memoryErrorPct: 88,
  queueWarn: 10,
  queueError: 40,
  dlqWarn: 1,
  dlqError: 10,
  reconnectWarn: 3,
  reconnectError: 8,
};

function load(): GuardianAlert[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? "[]") as GuardianAlert[]; } catch { return []; }
}

let alerts: GuardianAlert[] = typeof localStorage !== "undefined" ? load() : [];
const listeners = new Set<(a: GuardianAlert[]) => void>();
const lastFired = new Map<string, number>();

function persist() {
  alerts = alerts.slice(-MAX);
  try { localStorage.setItem(LS_KEY, JSON.stringify(alerts)); } catch { /* quota */ }
  listeners.forEach(l => { try { l(alerts); } catch { /* noop */ } });
}

export function subscribeAlerts(fn: (a: GuardianAlert[]) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getAlerts() { return alerts; }

export function alertsByModule(): Record<string, GuardianAlert[]> {
  return alerts.reduce<Record<string, GuardianAlert[]>>((acc, a) => {
    (acc[a.modulo] ??= []).push(a);
    return acc;
  }, {});
}

export function clearAlerts() { alerts = []; persist(); }

/** Emite alerta com anti-flood (mesmo módulo+tipo no máx. 1x/60s). */
export function raiseAlert(a: Omit<GuardianAlert, "id" | "at">) {
  const key = `${a.modulo}:${a.tipo}:${a.severidade}`;
  const now = Date.now();
  if (now - (lastFired.get(key) ?? 0) < 60_000) return;
  lastFired.set(key, now);

  const alert: GuardianAlert = {
    ...a,
    id: (() => { try { return crypto.randomUUID(); } catch { return `${now}-${Math.random()}`; } })(),
    at: now,
  };
  alerts.push(alert);
  persist();

  void emitTitanEvent("guardian_alert", { ...alert });

  void (async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("god_core_events" as any).insert({
        user_id: user.id,
        tipo: `guardian_${alert.tipo}`,
        modulo: alert.modulo,
        severidade: alert.severidade === "critical" ? "error" : alert.severidade,
        mensagem: alert.mensagem,
        payload: { valor: alert.valor, limite: alert.limite, severidade: alert.severidade },
      });
    } catch { /* nunca throw */ }
  })();
}

/** Avalia métricas e dispara alertas conforme severidade. */
export function evaluateMetrics(m: {
  latencyMs?: number;
  memoryPct?: number;
  queuePending?: number;
  dlqCount?: number;
  reconnects?: number;
  modulesDown?: string[];
}) {
  if (m.latencyMs != null) {
    if (m.latencyMs >= THRESHOLDS.latencyErrorMs) {
      raiseAlert({ modulo: "scheduler", tipo: "latency", severidade: "error",
        mensagem: `🐢 Latência crítica do ciclo: ${Math.round(m.latencyMs)}ms`, valor: m.latencyMs, limite: THRESHOLDS.latencyErrorMs });
    } else if (m.latencyMs >= THRESHOLDS.latencyWarnMs) {
      raiseAlert({ modulo: "scheduler", tipo: "latency", severidade: "warn",
        mensagem: `⚠️ Latência elevada do ciclo: ${Math.round(m.latencyMs)}ms`, valor: m.latencyMs, limite: THRESHOLDS.latencyWarnMs });
    }
  }
  if (m.memoryPct != null) {
    if (m.memoryPct >= THRESHOLDS.memoryErrorPct) {
      raiseAlert({ modulo: "runtime", tipo: "memory", severidade: "critical",
        mensagem: `🔥 Memória em ${m.memoryPct.toFixed(1)}% do heap`, valor: m.memoryPct, limite: THRESHOLDS.memoryErrorPct });
    } else if (m.memoryPct >= THRESHOLDS.memoryWarnPct) {
      raiseAlert({ modulo: "runtime", tipo: "memory", severidade: "warn",
        mensagem: `⚠️ Memória em ${m.memoryPct.toFixed(1)}% do heap`, valor: m.memoryPct, limite: THRESHOLDS.memoryWarnPct });
    }
  }
  if (m.queuePending != null && m.queuePending >= THRESHOLDS.queueWarn) {
    raiseAlert({ modulo: "queue", tipo: "queue",
      severidade: m.queuePending >= THRESHOLDS.queueError ? "error" : "warn",
      mensagem: `📥 Fila com ${m.queuePending} jobs pendentes`, valor: m.queuePending, limite: THRESHOLDS.queueWarn });
  }
  if (m.dlqCount != null && m.dlqCount >= THRESHOLDS.dlqWarn) {
    raiseAlert({ modulo: "queue", tipo: "queue",
      severidade: m.dlqCount >= THRESHOLDS.dlqError ? "critical" : "error",
      mensagem: `☠️ DLQ com ${m.dlqCount} item(ns) — reprocessamento necessário`, valor: m.dlqCount, limite: THRESHOLDS.dlqWarn });
  }
  if (m.reconnects != null && m.reconnects >= THRESHOLDS.reconnectWarn) {
    raiseAlert({ modulo: "realtime", tipo: "reconnect",
      severidade: m.reconnects >= THRESHOLDS.reconnectError ? "error" : "warn",
      mensagem: `🔌 ${m.reconnects} reconexões de Realtime detectadas`, valor: m.reconnects, limite: THRESHOLDS.reconnectWarn });
  }
  (m.modulesDown ?? []).forEach(mod => {
    raiseAlert({ modulo: mod, tipo: "module_down", severidade: "error",
      mensagem: `🛑 Módulo "${mod}" fora do ar — recuperação cirúrgica acionada` });
  });
}
