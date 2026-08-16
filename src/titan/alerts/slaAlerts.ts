// ============================================================
// slaAlerts.ts — Alertas automáticos de SLA (IA ultra avançada).
// Limiares por severidade para latência p95, taxa de falhas,
// retries, fila, DLQ, memória e dedupe. Registra histórico
// detalhado por MÓDULO e por CONCURSO (modalidade:concurso).
// ============================================================
import { titanTelemetry } from "@/titan/metrics/titanTelemetry";
import { durableQueue } from "@/titan/queue/durableQueue";
import { raiseAlert, Severity, THRESHOLDS } from "./guardianAlerts";

export interface SlaThresholds {
  p95WarnMs: number;
  p95ErrorMs: number;
  p95CriticalMs: number;
  failWarnPct: number;
  failErrorPct: number;
  failCriticalPct: number;
  retryWarnPct: number;
  retryErrorPct: number;
  minSamples: number;          // evita alerta com amostra insuficiente
}

export const SLA_THRESHOLDS: SlaThresholds = {
  p95WarnMs: THRESHOLDS.latencyWarnMs,
  p95ErrorMs: THRESHOLDS.latencyErrorMs,
  p95CriticalMs: THRESHOLDS.latencyErrorMs * 2,
  failWarnPct: 5,
  failErrorPct: 20,
  failCriticalPct: 45,
  retryWarnPct: 25,
  retryErrorPct: 60,
  minSamples: 3,
};

export interface SlaBreach {
  id: string;
  modulo: string;               // módulo/tarefa avaliada
  traceKey: string | null;      // `${loteria}:${concurso}` quando aplicável
  metrica: "p95" | "fail_rate" | "retry_rate" | "queue" | "dlq" | "memory" | "dedupe";
  severidade: Severity;
  valor: number;
  limite: number;
  amostras: number;
  mensagem: string;
  at: number;
}

const LS_KEY = "titan.sla.breaches.v1";
const MAX = 400;

function uuid() {
  try { return crypto.randomUUID(); } catch { return `${Date.now()}-${Math.random()}`; }
}
function load(): SlaBreach[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? "[]") as SlaBreach[]; } catch { return []; }
}

let breaches: SlaBreach[] = typeof localStorage !== "undefined" ? load() : [];
const listeners = new Set<(b: SlaBreach[]) => void>();

function persist() {
  breaches = breaches.slice(-MAX);
  try { localStorage.setItem(LS_KEY, JSON.stringify(breaches)); } catch { /* quota */ }
  listeners.forEach(l => { try { l(breaches); } catch { /* noop */ } });
}

export function subscribeSlaBreaches(fn: (b: SlaBreach[]) => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
export function getSlaBreaches() { return [...breaches]; }
export function clearSlaBreaches() { breaches = []; persist(); }

/** Histórico agregado por módulo. */
export function slaBreachesByModule(): Record<string, SlaBreach[]> {
  return breaches.reduce<Record<string, SlaBreach[]>>((acc, b) => {
    (acc[b.modulo] ??= []).push(b); return acc;
  }, {});
}

/** Histórico agregado por concurso (modalidade:concurso). */
export function slaBreachesByConcurso(): Record<string, SlaBreach[]> {
  return breaches.reduce<Record<string, SlaBreach[]>>((acc, b) => {
    if (!b.traceKey) return acc;
    (acc[b.traceKey] ??= []).push(b); return acc;
  }, {});
}

/** Registra uma violação de SLA + alerta do Guardian (com auditoria). */
export function recordBreach(b: Omit<SlaBreach, "id" | "at">): SlaBreach {
  const breach: SlaBreach = { ...b, id: uuid(), at: Date.now() };
  breaches.push(breach);
  persist();
  raiseAlert({
    modulo: b.modulo,
    tipo: b.metrica === "p95" ? "latency"
      : b.metrica === "memory" ? "memory"
      : b.metrica === "queue" || b.metrica === "dlq" ? "queue"
      : "recovery",
    severidade: b.severidade,
    mensagem: `${b.mensagem}${b.traceKey ? ` · concurso ${b.traceKey}` : ""}`,
    valor: b.valor,
    limite: b.limite,
  });
  return breach;
}

function sev(value: number, warn: number, error: number, critical: number): Severity | null {
  if (value >= critical) return "critical";
  if (value >= error) return "error";
  if (value >= warn) return "warn";
  return null;
}

function memoryPct(): number | null {
  try {
    const m = (performance as unknown as { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
    if (!m?.jsHeapSizeLimit) return null;
    return (m.usedJSHeapSize / m.jsHeapSizeLimit) * 100;
  } catch { return null; }
}

/**
 * Avaliação inteligente do SLA: percorre latências por tipo de span,
 * falhas por módulo/tarefa, filas, DLQ, memória e correlaciona os
 * gargalos por concurso. Retorna as violações registradas.
 */
export function evaluateSlaAlerts(opts: { thresholds?: Partial<SlaThresholds> } = {}): SlaBreach[] {
  const T = { ...SLA_THRESHOLDS, ...opts.thresholds };
  const found: SlaBreach[] = [];
  const stats = durableQueue.stats();
  const counters = titanTelemetry.getCounters();
  const hot = titanTelemetry.hotTraces(20);

  const worstTrace = hot.find(h => h.errors > 0)?.traceKey
    ?? stats.dlq[stats.dlq.length - 1]?.traceKey
    ?? null;

  // 1) Latência p95 por módulo (kind do span)
  titanTelemetry.latencyByKind().forEach(l => {
    if (l.amostras < T.minSamples) return;
    const s = sev(l.p95Ms, T.p95WarnMs, T.p95ErrorMs, T.p95CriticalMs);
    if (!s) return;
    found.push(recordBreach({
      modulo: l.kind, traceKey: worstTrace, metrica: "p95", severidade: s,
      valor: l.p95Ms,
      limite: s === "critical" ? T.p95CriticalMs : s === "error" ? T.p95ErrorMs : T.p95WarnMs,
      amostras: l.amostras,
      mensagem: `⏱️ SLA de latência violado em "${l.kind}": p95 ${l.p95Ms}ms (média ${l.avgMs}ms, máx ${l.maxMs}ms)`,
    }));
  });

  // 2) Taxa de falhas por módulo/tarefa
  const spans = titanTelemetry.getSpans();
  const porTipo = new Map<string, { ok: number; err: number; trace: string | null }>();
  spans.forEach(s => {
    if (s.status !== "ok" && s.status !== "error") return;
    const cur = porTipo.get(s.name) ?? { ok: 0, err: 0, trace: null };
    if (s.status === "ok") cur.ok += 1; else { cur.err += 1; cur.trace = s.traceKey !== "-" ? s.traceKey : cur.trace; }
    porTipo.set(s.name, cur);
  });
  porTipo.forEach((v, name) => {
    const total = v.ok + v.err;
    if (total < T.minSamples) return;
    const pct = (v.err / total) * 100;
    const s = sev(pct, T.failWarnPct, T.failErrorPct, T.failCriticalPct);
    if (!s) return;
    found.push(recordBreach({
      modulo: name, traceKey: v.trace, metrica: "fail_rate", severidade: s,
      valor: Number(pct.toFixed(2)),
      limite: s === "critical" ? T.failCriticalPct : s === "error" ? T.failErrorPct : T.failWarnPct,
      amostras: total,
      mensagem: `💥 Taxa de falhas de "${name}" em ${pct.toFixed(1)}% (${v.err}/${total} execuções)`,
    }));
  });

  // 3) Taxa de retries global
  const execs = counters.jobsOk + counters.jobsError;
  if (execs >= T.minSamples) {
    const retryPct = (counters.retries / execs) * 100;
    const s = sev(retryPct, T.retryWarnPct, T.retryErrorPct, T.retryErrorPct * 2);
    if (s) {
      found.push(recordBreach({
        modulo: "queue", traceKey: worstTrace, metrica: "retry_rate", severidade: s,
        valor: Number(retryPct.toFixed(2)),
        limite: s === "warn" ? T.retryWarnPct : T.retryErrorPct,
        amostras: execs,
        mensagem: `♻️ Taxa de retry em ${retryPct.toFixed(1)}% (${counters.retries}/${execs}) — backoff exponencial ativo`,
      }));
    }
  }

  // 4) Fila pendente e DLQ
  const sq = sev(stats.pending, THRESHOLDS.queueWarn, THRESHOLDS.queueError, THRESHOLDS.queueError * 3);
  if (sq) {
    found.push(recordBreach({
      modulo: "queue", traceKey: worstTrace, metrica: "queue", severidade: sq,
      valor: stats.pending, limite: THRESHOLDS.queueWarn, amostras: stats.pending,
      mensagem: `📥 Fila acumulada com ${stats.pending} job(s) pendente(s)`,
    }));
  }
  const sd = sev(stats.dead, THRESHOLDS.dlqWarn, THRESHOLDS.dlqError, THRESHOLDS.dlqError * 3);
  if (sd) {
    Object.entries(stats.byTypeDead).forEach(([tipo, qtd]) => {
      const trace = stats.dlq.filter(d => d.type === tipo).slice(-1)[0]?.traceKey ?? null;
      found.push(recordBreach({
        modulo: tipo, traceKey: trace && trace !== "-" ? trace : null, metrica: "dlq",
        severidade: qtd >= THRESHOLDS.dlqError ? "critical" : "error",
        valor: qtd, limite: THRESHOLDS.dlqWarn, amostras: qtd,
        mensagem: `☠️ DLQ de "${tipo}" com ${qtd} mensagem(ns) — reprocessamento idempotente recomendado`,
      }));
    });
  }

  // 5) Memória do runtime
  const mem = memoryPct();
  if (mem != null) {
    const sm = sev(mem, THRESHOLDS.memoryWarnPct, THRESHOLDS.memoryErrorPct, 95);
    if (sm) {
      found.push(recordBreach({
        modulo: "runtime", traceKey: null, metrica: "memory", severidade: sm,
        valor: Number(mem.toFixed(1)), limite: THRESHOLDS.memoryWarnPct, amostras: 1,
        mensagem: `🧠 Memória do heap em ${mem.toFixed(1)}%`,
      }));
    }
  }

  // 6) Dedupe/duplicidade anômala por concurso
  const dupes = counters.dedupeHits + counters.duplicates;
  if (dupes >= 10) {
    found.push(recordBreach({
      modulo: "conference", traceKey: worstTrace, metrica: "dedupe",
      severidade: dupes >= 40 ? "error" : "warn",
      valor: dupes, limite: 10, amostras: dupes,
      mensagem: `🔁 ${dupes} tentativa(s) duplicada(s) bloqueada(s) pela idempotência`,
    }));
  }

  return found;
}

let timer: ReturnType<typeof setInterval> | null = null;

/** Watchdog automático de SLA (avalia continuamente). */
export function startSlaWatchdog(intervalMs = 15_000) {
  if (timer) return () => { /* já ativo */ };
  timer = setInterval(() => { try { evaluateSlaAlerts(); } catch { /* nunca throw */ } }, intervalMs);
  return () => stopSlaWatchdog();
}
export function stopSlaWatchdog() { if (timer) clearInterval(timer); timer = null; }
