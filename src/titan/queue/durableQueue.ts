// ============================================================
// durableQueue.ts — Filas com retry exponencial + Dead-Letter Queue.
// Usada para sincronização e conferência. Falhas detalhadas na auditoria.
// ============================================================
import { supabase } from "@/integrations/supabase/client";
import { emitTitanEvent } from "@/titan/sync/titanEventBus";

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
}

export interface DeadLetter extends QueueJob {
  deadAt: number;
  errors: string[];
}

type Handler = (job: QueueJob) => Promise<void> | void;

const LS_JOBS = "titan.queue.jobs.v1";
const LS_DLQ = "titan.queue.dlq.v1";
const BASE_DELAY = 2_000;
const MAX_DELAY = 5 * 60_000;

function uuid(): string {
  try { return crypto.randomUUID(); } catch { return `${Date.now()}-${Math.random()}`; }
}

function load<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) ?? "[]") as T[]; } catch { return []; }
}
function save<T>(key: string, v: T[]) {
  try { localStorage.setItem(key, JSON.stringify(v.slice(-500))); } catch { /* quota */ }
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

  register(type: string, fn: Handler) { this.handlers.set(type, fn); }

  start(intervalMs = 3_000) {
    if (this.timer) return;
    this.timer = setInterval(() => void this.drain(), intervalMs);
  }
  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; }

  enqueue(queue: QueueName, type: string, payload: Record<string, unknown>, maxAttempts = 6): QueueJob {
    const job: QueueJob = {
      id: uuid(), queue, type, payload,
      attempts: 0, maxAttempts,
      nextRunAt: Date.now(), createdAt: Date.now(),
    };
    this.jobs.push(job);
    save(LS_JOBS, this.jobs);
    return job;
  }

  private backoff(attempts: number) {
    const jitter = Math.random() * 0.3 + 0.85; // ±15%
    return Math.min(MAX_DELAY, BASE_DELAY * Math.pow(2, attempts) * jitter);
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
        try {
          await handler(job);
          this.jobs = this.jobs.filter(j => j.id !== job.id);
          this.errorTrail.delete(job.id);
          save(LS_JOBS, this.jobs);
        } catch (err) {
          const msg = (err as Error)?.message ?? String(err);
          job.attempts += 1;
          job.lastError = msg;
          const trail = this.errorTrail.get(job.id) ?? [];
          trail.push(`#${job.attempts} ${new Date().toISOString()} — ${msg}`);
          this.errorTrail.set(job.id, trail);

          if (job.attempts >= job.maxAttempts) {
            await this.toDlq(job, msg);
          } else {
            job.nextRunAt = Date.now() + this.backoff(job.attempts);
            save(LS_JOBS, this.jobs);
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
    this.jobs = this.jobs.filter(j => j.id !== job.id);
    this.errorTrail.delete(job.id);
    save(LS_JOBS, this.jobs);
    save(LS_DLQ, this.dlq);
    await audit("queue_dead_letter",
      `☠️ DLQ · ${job.queue}/${job.type} após ${job.attempts} tentativas — ${msg}`,
      "error", { job: dead });
    void emitTitanEvent("queue_failure", { queue: job.queue, type: job.type, error: msg, attempts: job.attempts });
  }

  /** Reprocessa itens da DLQ (idempotência garante segurança). */
  requeueDlq(id?: string) {
    const targets = id ? this.dlq.filter(d => d.id === id) : [...this.dlq];
    targets.forEach(d => {
      this.jobs.push({ ...d, attempts: 0, nextRunAt: Date.now(), lastError: undefined });
    });
    this.dlq = id ? this.dlq.filter(d => d.id !== id) : [];
    save(LS_JOBS, this.jobs);
    save(LS_DLQ, this.dlq);
  }

  clearDlq() { this.dlq = []; save(LS_DLQ, this.dlq); }

  stats() {
    return {
      pending: this.jobs.length,
      dead: this.dlq.length,
      byQueue: {
        sync: this.jobs.filter(j => j.queue === "sync").length,
        conference: this.jobs.filter(j => j.queue === "conference").length,
      },
      jobs: [...this.jobs],
      dlq: [...this.dlq],
    };
  }
}

export const durableQueue = new DurableQueue();
