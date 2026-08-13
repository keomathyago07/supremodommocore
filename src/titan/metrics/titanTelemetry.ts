// ============================================================
// titanTelemetry.ts — Métricas + tracing ponta a ponta do Titan.
// Correlação por modalidade+concurso (traceKey), latências, filas,
// idempotência e SLA do scheduler. Detecta gargalos e regressões.
// ============================================================
import { supabase } from "@/integrations/supabase/client";

export type SpanKind =
  | "sync" | "conference" | "queue_job" | "idempotency" | "pipeline" | "reprocess";

export interface TitanSpan {
  id: string;
  kind: SpanKind;
  name: string;
  traceKey: string;           // `${loteria}:${concurso}` quando aplicável
  startedAt: number;
  endedAt?: number;
  durationMs?: number;
  status: "running" | "ok" | "error" | "skipped";
  error?: string;
  attrs: Record<string, unknown>;
}

export interface SlaSample {
  at: number;
  syncMs: number;             // latência média de sincronização na janela
  retryRate: number;          // 0..1 retries / execuções
  dlqVolume: number;
  pending: number;
  dedupeHits: number;
  p95Ms: number;
}

const LS_SPANS = "titan.telemetry.spans.v1";
const LS_SLA = "titan.telemetry.sla.v1";
const MAX_SPANS = 800;
const MAX_SLA = 720; // ~2h a cada 10s

function uuid() {
  try { return crypto.randomUUID(); } catch { return `${Date.now()}-${Math.random()}`; }
}
function load<T>(k: string): T[] {
  try { return JSON.parse(localStorage.getItem(k) ?? "[]") as T[]; } catch { return []; }
}
function save<T>(k: string, v: T[]) {
  try { localStorage.setItem(k, JSON.stringify(v.slice(-MAX_SPANS))); } catch { /* quota */ }
}

interface Counters {
  jobsOk: number;
  jobsError: number;
  retries: number;
  dlq: number;
  dedupeHits: number;
  duplicates: number;
  reprocessos: number;
}

const EMPTY_COUNTERS: Counters = {
  jobsOk: 0, jobsError: 0, retries: 0, dlq: 0,
  dedupeHits: 0, duplicates: 0, reprocessos: 0,
};

class TitanTelemetry {
  private spans: TitanSpan[] = typeof localStorage !== "undefined" ? load<TitanSpan>(LS_SPANS) : [];
  private sla: SlaSample[] = typeof localStorage !== "undefined" ? load<SlaSample>(LS_SLA) : [];
  private counters: Counters = { ...EMPTY_COUNTERS };
  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setInterval> | null = null;

  subscribe(fn: () => void) { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
  private notify() { this.listeners.forEach(l => { try { l(); } catch { /* noop */ } }); }

  /** Abre um span de tracing. */
  startSpan(kind: SpanKind, name: string, traceKey = "-", attrs: Record<string, unknown> = {}): TitanSpan {
    const span: TitanSpan = {
      id: uuid(), kind, name, traceKey,
      startedAt: Date.now(), status: "running", attrs,
    };
    this.spans.push(span);
    if (this.spans.length > MAX_SPANS) this.spans = this.spans.slice(-MAX_SPANS);
    save(LS_SPANS, this.spans);
    this.notify();
    return span;
  }

  endSpan(span: TitanSpan, status: "ok" | "error" | "skipped" = "ok", error?: string) {
    span.endedAt = Date.now();
    span.durationMs = span.endedAt - span.startedAt;
    span.status = status;
    if (error) span.error = error;
    save(LS_SPANS, this.spans);
    this.notify();
  }

  /** Helper: instrumenta uma função async com span automático. */
  async trace<T>(kind: SpanKind, name: string, traceKey: string, fn: () => Promise<T>, attrs: Record<string, unknown> = {}): Promise<T> {
    const span = this.startSpan(kind, name, traceKey, attrs);
    try {
      const out = await fn();
      this.endSpan(span, "ok");
      return out;
    } catch (err) {
      this.endSpan(span, "error", (err as Error)?.message ?? String(err));
      throw err;
    }
  }

  incr(k: keyof Counters, by = 1) {
    this.counters[k] += by;
    this.notify();
  }

  getCounters(): Counters { return { ...this.counters }; }
  getSpans(filter?: { kind?: SpanKind; traceKey?: string }) {
    return this.spans.filter(s =>
      (!filter?.kind || s.kind === filter.kind) &&
      (!filter?.traceKey || s.traceKey === filter.traceKey)
    ).slice().reverse();
  }
  getSla() { return [...this.sla]; }

  /** Latências por tipo (média e p95) — detecção de gargalos. */
  latencyByKind() {
    const map = new Map<string, number[]>();
    this.spans.forEach(s => {
      if (s.durationMs == null) return;
      const arr = map.get(s.kind) ?? [];
      arr.push(s.durationMs);
      map.set(s.kind, arr);
    });
    return Array.from(map.entries()).map(([kind, arr]) => {
      const sorted = arr.slice().sort((a, b) => a - b);
      const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
      return {
        kind,
        amostras: arr.length,
        avgMs: Math.round(avg),
        p95Ms: Math.round(sorted[Math.floor(sorted.length * 0.95)] ?? sorted[sorted.length - 1] ?? 0),
        maxMs: Math.round(sorted[sorted.length - 1] ?? 0),
      };
    }).sort((a, b) => b.p95Ms - a.p95Ms);
  }

  /** Gargalos por modalidade+concurso. */
  hotTraces(limit = 10) {
    const map = new Map<string, { total: number; count: number; errors: number }>();
    this.spans.forEach(s => {
      if (s.traceKey === "-") return;
      const cur = map.get(s.traceKey) ?? { total: 0, count: 0, errors: 0 };
      cur.total += s.durationMs ?? 0;
      cur.count += 1;
      if (s.status === "error") cur.errors += 1;
      map.set(s.traceKey, cur);
    });
    return Array.from(map.entries())
      .map(([traceKey, v]) => ({ traceKey, totalMs: Math.round(v.total), spans: v.count, errors: v.errors }))
      .sort((a, b) => b.totalMs - a.totalMs)
      .slice(0, limit);
  }

  /** Amostra de SLA (chamado pelo coletor). */
  sample(queueStats: { pending: number; dead: number }) {
    const windowStart = Date.now() - 5 * 60_000;
    const recent = this.spans.filter(s => s.startedAt >= windowStart && s.durationMs != null);
    const syncSpans = recent.filter(s => s.kind === "sync" || s.kind === "queue_job");
    const durations = recent.map(s => s.durationMs!).sort((a, b) => a - b);
    const execs = this.counters.jobsOk + this.counters.jobsError;
    const s: SlaSample = {
      at: Date.now(),
      syncMs: syncSpans.length ? Math.round(syncSpans.reduce((a, b) => a + (b.durationMs ?? 0), 0) / syncSpans.length) : 0,
      retryRate: execs ? Number((this.counters.retries / execs).toFixed(4)) : 0,
      dlqVolume: queueStats.dead,
      pending: queueStats.pending,
      dedupeHits: this.counters.dedupeHits,
      p95Ms: durations.length ? Math.round(durations[Math.floor(durations.length * 0.95)] ?? 0) : 0,
    };
    this.sla.push(s);
    if (this.sla.length > MAX_SLA) this.sla = this.sla.slice(-MAX_SLA);
    save(LS_SLA, this.sla);
    this.notify();
    return s;
  }

  startCollector(getStats: () => { pending: number; dead: number }, intervalMs = 10_000) {
    if (this.timer) return;
    this.timer = setInterval(() => { try { this.sample(getStats()); } catch { /* noop */ } }, intervalMs);
  }
  stopCollector() { if (this.timer) clearInterval(this.timer); this.timer = null; }

  reset() {
    this.spans = []; this.sla = []; this.counters = { ...EMPTY_COUNTERS };
    save(LS_SPANS, this.spans); save(LS_SLA, this.sla);
    this.notify();
  }
}

export const titanTelemetry = new TitanTelemetry();

/** Auditoria de telemetria relevante (gargalos/regressões). */
export async function auditTelemetry(mensagem: string, severidade: "info" | "warn" | "error", payload: Record<string, unknown>) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("god_core_events" as any).insert({
      user_id: user.id, tipo: "telemetry", modulo: "titan_telemetry",
      severidade, mensagem, payload,
    });
  } catch { /* nunca throw */ }
}
