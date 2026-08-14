// Handlers das filas duráveis (retry exponencial + DLQ).
import { supabase } from "@/integrations/supabase/client";
import { durableQueue } from "./durableQueue";
import { emitTitanEvent } from "@/titan/sync/titanEventBus";
import { conferirIdempotente } from "@/titan/conference/idempotency";
import type { Bet, OfficialResult } from "@/titan/conference/types";

let registered = false;

export function registerQueueHandlers() {
  if (registered) return;
  registered = true;

  durableQueue.register("sync_e_confere", async () => {
    const { error } = await supabase.functions.invoke("sync-e-confere", { body: {} });
    if (error) throw new Error(`sync-e-confere: ${error.message}`);
    await emitTitanEvent("resultado", { source: "sync-e-confere", at: Date.now() });
  });

  durableQueue.register("conferir_aposta", async (job) => {
    const bet = job.payload.bet as unknown as Bet;
    const result = job.payload.result as unknown as OfficialResult;
    if (!bet || !result) throw new Error("payload inválido: bet/result ausentes");
    const { skipped, reason } = await conferirIdempotente(bet, result);
    if (skipped && reason === "awaiting_official") {
      throw new Error("resultado ainda não oficial — reagendado com backoff");
    }
  });

  // Reprocessamento idempotente de um concurso específico:
  // trava por modalidade+concurso → limpa idempotência → reenfileira conferência.
  durableQueue.register("reprocessar_concurso", async (job) => {
    const loteria = String(job.payload.loteria ?? "");
    const concurso = Number(job.payload.concurso ?? 0);
    const motivo = String(job.payload.motivo ?? "reprocessamento manual");
    if (!loteria || !Number.isFinite(concurso) || concurso <= 0) {
      throw new Error("payload inválido: loteria/concurso ausentes");
    }
    if (!acquireReprocessLock(loteria, concurso)) {
      throw new Error(`reprocessamento já em andamento para ${loteria} #${concurso}`);
    }
    const span = titanTelemetry.startSpan("reprocess", "reprocessar_concurso", `${loteria}:${concurso}`, { motivo });
    try {
      const chaves = await resetConferenciaConcurso(loteria, concurso, motivo);
      titanTelemetry.incr("reprocessos");
      const { error } = await supabase.functions.invoke("sync-e-confere", {
        body: { loteria, concurso, motivo, force: true },
      });
      if (error) throw new Error(`reprocessar_concurso: ${error.message}`);
      titanTelemetry.endSpan(span, "ok");
      await emitTitanEvent("resultado", {
        source: "reprocessar_concurso", loteria, concurso, motivo, chavesLimpas: chaves.length,
      });
    } catch (err) {
      titanTelemetry.endSpan(span, "error", (err as Error)?.message ?? String(err));
      throw err;
    } finally {
      releaseReprocessLock(loteria, concurso);
    }
  });

}


/** Enfileira uma conferência idempotente. */
export function enqueueConferencia(bet: Bet, result: OfficialResult) {
  registerQueueHandlers();
  return durableQueue.enqueue("conference", "conferir_aposta", {
    bet: bet as unknown as Record<string, unknown>,
    result: result as unknown as Record<string, unknown>,
  }, 8);
}

/** Enfileira o reprocessamento idempotente de um concurso, auditando o motivo. */
export function enqueueReprocessoConcurso(loteria: string, concurso: number, motivo: string) {
  registerQueueHandlers();
  void supabase.auth.getUser().then(({ data }) => {
    if (!data.user) return;
    return supabase.from("god_core_events" as any).insert({
      user_id: data.user.id,
      tipo: "reprocess_request",
      modulo: "titan_queue",
      severidade: "info",
      mensagem: `🔁 Reprocessamento solicitado para ${loteria} #${concurso} — ${motivo}`,
      payload: { loteria, concurso, motivo },
    });
  }).catch(() => undefined);
  return durableQueue.enqueue("conference", "reprocessar_concurso", { loteria, concurso, motivo }, 5);
}
