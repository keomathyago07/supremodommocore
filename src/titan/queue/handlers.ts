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

  // Reprocessamento idempotente de um concurso específico.
  durableQueue.register("reprocessar_concurso", async (job) => {
    const loteria = String(job.payload.loteria ?? "");
    const concurso = Number(job.payload.concurso ?? 0);
    const motivo = String(job.payload.motivo ?? "reprocessamento manual");
    if (!loteria || !Number.isFinite(concurso) || concurso <= 0) {
      throw new Error("payload inválido: loteria/concurso ausentes");
    }
    const { error } = await supabase.functions.invoke("sync-e-confere", {
      body: { loteria, concurso, motivo, force: true },
    });
    if (error) throw new Error(`reprocessar_concurso: ${error.message}`);
    await emitTitanEvent("resultado", { source: "reprocessar_concurso", loteria, concurso, motivo });
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
