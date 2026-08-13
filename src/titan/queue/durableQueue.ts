// ============================================================
// durableQueue.ts — Filas com retry exponencial + Dead-Letter Queue.
// Políticas por tipo de tarefa (queueConfig), métricas/tracing
// (titanTelemetry) e auditoria detalhada de falhas/descartes.
// ============================================================
import { supabase } from "@/integrations/supabase/client";
import { emitTitanEvent } from "@/titan/sync/titanEventBus";
import { queueConfig } from "./queueConfig";
import { titanTelemetry } from "@/titan/metrics/titanTelemetry";

export type QueueName = "sync" | "conference";

export interface QueueJob {
  id: string;
  queue: QueueName;
  type: string;
  payload: Record<string, unknown>;
  attempts: number;
  maxAttempts: number;
  nextRunAt: number;
  createdAt: number;
  lastError?: string;
  traceKey?: string;
}

export interface DeadLetter extends QueueJob {
  deadAt: number;
  errors: string[];
}

type Handler = (job: QueueJob) => Promise<void> | void;

const LS_JOBS = "titan.queue.jobs.v1";
const LS_DLQ = "titan.queue.dlq.v1";

function uuid(): string {
  try { return crypto.randomUUID(); } catch { return `${Date.now()}-${Math.random()}`; }
}

function load<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) ?? "[]") as T[]; } catch { return []; }
}
function save<T>(key: string, v: T[]) {
  try { localStorage.setItem(key, JSON.stringify(v.slice(-500))); } catch { /* quota */ }
}

export function traceKeyOf(payload: Record<string, unknown>): string {
  const loteria = (payload?.loteria ?? (payload as any)?.bet?.lottery) as string | undefined;
  const concurso = (payload?.concurso ?? (payload as any)?.bet?.concurso) as number | undefined;
  return loteria && concurso != null ? `${loteria}:${concurso}` : "-";
}

async function audit(tipo: string, mensagem: string, severidade: "info" | "warn" | "error", payload: Record<string, unknown>) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("god_core_events" as any).insert({
      user_id: user.id, tipo, mensagem, severidade, modulo: "titan_queue", payload,
    });
  } catch { /* nunca throw */ }
}

class DurableQueue {
  private jobs: QueueJob[] = load<QueueJob>(LS_JOBS);
  private dlq: DeadLetter[] = load<DeadLetter>(LS_DLQ);
  private handlers = new Map<string, Handler>();
  private errorTrail = new Map<string, string[]>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private processing = false;
  private listeners = new Set<() => void>();

  subscribe(fn: () => void) { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
  private notify() { this.listeners.forEach(l => { try { l(); } catch { /* noop */ } }); }

  register(type: string, fn: Handler) { this.handlers.set(type, fn); }

  start(intervalMs = 3_000) {
    if (this.timer) return;
    this.timer = setInterval(() => void this.drain(), intervalMs);
    titanTelemetry.startCollector(() => ({ pending: this.jobs.length, dead: this.dlq.length }));
  }
  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; }

  enqueue(queue: QueueName, type: string, payload: Record<string, unknown>, maxAttempts?: number): QueueJob {
    const policy = queueConfig.policy(type);
    const job: QueueJob = {
      id: uuid(), queue, type, payload,
      attempts: 0, maxAttempts: maxAttempts ?? policy.maxAttempts,
      nextRunAt: Date.now(), createdAt: Date.now(),
      traceKey: traceKeyOf(payload),
    };
    this.jobs.push(job);
    save(LS_JOBS, this.jobs);
    this.notify();
    return job;
  }

  private backoff(type: string, attempts: number) {
    const p = queueConfig.policy(type);
    const jitter = 1 - p.jitter + Math.random() * p.jitter * 2;
    return Math.min(p.maxDelayMs, p.baseDelayMs * Math.pow(2, attempts) * jitter);
  }

  async drain() {
    if (this.processing) return;
    this.processing = true;
    try {
      const now = Date.now();
      const due = this.jobs.filter(j => j.nextRunAt <= now);
      for (const job of due) {
        const handler = this.handlers.get(job.type);
        if (!handler) {
          await this.toDlq(job, `Nenhum handler registrado para "${job.type}"`);
          continue;
        }
        const span = titanTelemetry.startSpan("queue_job", `${job.queue}/${job.type}`, job.traceKey ?? "-", {
          attempts: job.attempts, jobId: job.id,
        });
        try {
          await handler(job);
          titanTelemetry.endSpan(span, "ok");
          titanTelemetry.incr("jobsOk");
          this.jobs = this.jobs.filter(j => j.id !== job.id);
          this.errorTrail.delete(job.id);
          save(LS_JOBS, this.jobs);
          this.notify();
        } catch (err) {
          const msg = (err as Error)?.message ?? String(err);
          titanTelemetry.endSpan(span, "error", msg);
          titanTelemetry.incr("jobsError");
          job.attempts += 1;
          job.lastError = msg;
          const trail = this.errorTrail.get(job.id) ?? [];
          trail.push(`#${job.attempts} ${new Date().toISOString()} — ${msg}`);
          this.errorTrail.set(job.id, trail);

          if (job.attempts >= job.maxAttempts) {
            await this.toDlq(job, msg);
          } else {
            titanTelemetry.incr("retries");
            job.nextRunAt = Date.now() + this.backoff(job.type, job.attempts);
            save(LS_JOBS, this.jobs);
            this.notify();
            await audit("queue_retry",
              `♻️ Retry ${job.attempts}/${job.maxAttempts} · ${job.queue}/${job.type} — ${msg}`,
              "warn", { job });
          }
        }
      }
    } finally {
      this.processing = false;
    }
  }

  private async toDlq(job: QueueJob, msg: string) {
    const errors = this.errorTrail.get(job.id) ?? [msg];
    const dead: DeadLetter = { ...job, lastError: msg, deadAt: Date.now(), errors };
    this.dlq.push(dead);
    titanTelemetry.incr("dlq");

    // aplica limite de DLQ por tipo de tarefa (política institucional)
    const limit = queueConfig.policy(job.type).dlqLimit;
    const sameType = this.dlq.filter(d => d.type === job.type);
    if (sameType.length > limit) {
      const excess = sameType.slice(0, sameType.length - limit).map(d => d.id);
      this.dlq = this.dlq.filter(d => !excess.includes(d.id));
      await audit("queue_dlq_trim",
        `🧹 DLQ de "${job.type}" excedeu o limite (${limit}) — ${excess.length} registro(s) mais antigo(s) descartado(s)`,
        "warn", { type: job.type, limit, descartados: excess });
    }

    this.jobs = this.jobs.filter(j => j.id !== job.id);
    this.errorTrail.delete(job.id);
    save(LS_JOBS, this.jobs);
    save(LS_DLQ, this.dlq);
    this.notify();
    await audit("queue_dead_letter",
      `☠️ DLQ · ${job.queue}/${job.type} após ${job.attempts} tentativas — ${msg}`,
      "error", { job: dead });
    void emitTitanEvent("queue_failure", { queue: job.queue, type: job.type, error: msg, attempts: job.attempts });

    if (queueConfig.policy(job.type).autoRequeueDlq) {
      await this.requeueDlq(dead.id, "auto-requeue definido na política institucional");
    }
  }

  /** Reprocessa itens da DLQ (idempotência garante segurança). */
  async requeueDlq(id?: string, motivo = "reprocessamento manual da DLQ") {
    const targets = id ? this.dlq.filter(d => d.id === id) : [...this.dlq];
    if (!targets.length) return 0;
    targets.forEach(d => {
      this.jobs.push({ ...d, attempts: 0, nextRunAt: Date.now(), lastError: undefined });
    });
    this.dlq = id ? this.dlq.filter(d => d.id !== id) : [];
    save(LS_JOBS, this.jobs);
    save(LS_DLQ, this.dlq);
    this.notify();
    await audit("queue_dlq_requeue",
      `♻️ ${targets.length} mensagem(ns) reprocessada(s) da DLQ — ${motivo}`,
      "info", { motivo, ids: targets.map(t => t.id), tipos: targets.map(t => t.type) });
    return targets.length;
  }

  /** Descarta permanentemente mensagens da DLQ, registrando na auditoria. */
  async discardDlq(id?: string, motivo = "descarte manual da DLQ") {
    const targets = id ? this.dlq.filter(d => d.id === id) : [...this.dlq];
    if (!targets.length) return 0;
    this.dlq = id ? this.dlq.filter(d => d.id !== id) : [];
    save(LS_DLQ, this.dlq);
    this.notify();
    await audit("queue_dlq_discard",
      `🗑️ ${targets.length} mensagem(ns) descartada(s) da DLQ — ${motivo}`,
      "warn", { motivo, itens: targets });
    return targets.length;
  }

  clearDlq() { void this.discardDlq(undefined, "limpeza total da DLQ"); }

  stats() {
    return {
      pending: this.jobs.length,
      dead: this.dlq.length,
      byQueue: {
        sync: this.jobs.filter(j => j.queue === "sync").length,
        conference: this.jobs.filter(j => j.queue === "conference").length,
      },
      byTypeDead: this.dlq.reduce<Record<string, number>>((acc, d) => {
        acc[d.type] = (acc[d.type] ?? 0) + 1; return acc;
      }, {}),
      jobs: [...this.jobs],
      dlq: [...this.dlq],
    };
  }
}

export const durableQueue = new DurableQueue();
