// ============================================================
// idempotency.ts — Travas e idempotência por modalidade + concurso.
// A conferência nunca roda duas vezes para o mesmo resultado oficial.
// Tentativas duplicadas são registradas na auditoria.
// ============================================================
import { supabase } from "@/integrations/supabase/client";
import { titanPersistence } from "@/titan/state/titanPersistence";
import { emitTitanEvent } from "@/titan/sync/titanEventBus";
import { Bet, CheckOutcome, OfficialResult } from "./types";
import { conferirAposta } from "./index";

export function drawKey(loteria: string, concurso: number) {
  return `${loteria}:${concurso}`;
}
export function betKey(loteria: string, concurso: number, betId: string) {
  return `${loteria}:${concurso}:${betId}`;
}

const activeLocks = new Set<string>();
const duplicateCounts = new Map<string, number>();

async function auditDuplicate(key: string, motivo: string) {
  const n = (duplicateCounts.get(key) ?? 0) + 1;
  duplicateCounts.set(key, n);
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("god_core_events" as any).insert({
        user_id: user.id,
        tipo: "conference_duplicate",
        modulo: "conference",
        severidade: "warn",
        mensagem: `🔁 Tentativa duplicada de conferência (${key}) — ${motivo}. Ocorrência #${n}`,
        payload: { key, motivo, ocorrencia: n },
      });
    }
  } catch { /* nunca throw */ }
  void emitTitanEvent("duplicate_attempt", { key, motivo, ocorrencia: n });
}

export function duplicateStats() {
  return Object.fromEntries(duplicateCounts.entries());
}

/** Adquire trava exclusiva por modalidade+concurso. */
export function acquireDrawLock(loteria: string, concurso: number): boolean {
  const k = drawKey(loteria, concurso);
  if (activeLocks.has(k)) { void auditDuplicate(k, "trava de concurso já ativa"); return false; }
  activeLocks.add(k);
  return true;
}
export function releaseDrawLock(loteria: string, concurso: number) {
  activeLocks.delete(drawKey(loteria, concurso));
}

/**
 * Conferência idempotente: mesma modalidade+concurso(+aposta) só é
 * conferida e salva uma vez, mesmo com reprocessos.
 */
export async function conferirIdempotente(
  bet: Bet,
  r: OfficialResult,
  persist?: (bet: Bet, r: OfficialResult, out: CheckOutcome) => Promise<void>
): Promise<{ outcome: CheckOutcome | null; skipped: boolean; reason?: string }> {
  const bk = betKey(bet.lottery, bet.concurso, bet.id);

  if (titanPersistence.hasConferencia(bk)) {
    await auditDuplicate(bk, "conferência já concluída anteriormente");
    return { outcome: null, skipped: true, reason: "already_checked" };
  }
  if (!acquireDrawLock(bet.lottery, bet.concurso)) {
    return { outcome: null, skipped: true, reason: "locked" };
  }

  try {
    const outcome = conferirAposta(bet, r);
    if (outcome.status === "AGUARDANDO_OFICIAL") {
      return { outcome, skipped: true, reason: "awaiting_official" };
    }

    if (persist) await persist(bet, r, outcome);

    titanPersistence.markConferencia(bk);
    titanPersistence.recordVerificacao({
      key: bk,
      loteria: bet.lottery,
      concurso: bet.concurso,
      status: outcome.status,
      acertos: outcome.acertos,
      faixa: outcome.faixa,
      at: Date.now(),
    });
    titanPersistence.recordConsenso({
      loteria: bet.lottery,
      concurso: r.concurso,
      dezenas: r.dezenas,
      fontes: ["oficial"],
      concordancia: 1,
      status: r.status,
      at: Date.now(),
    });

    void emitTitanEvent("conferencia", {
      loteria: bet.lottery, concurso: bet.concurso, betId: bet.id,
      status: outcome.status, acertos: outcome.acertos, faixa: outcome.faixa,
    });
    if (outcome.status === "PREMIADA") {
      void emitTitanEvent("premio", {
        loteria: bet.lottery, concurso: bet.concurso,
        faixa: outcome.faixa, acertos: outcome.acertos, valor: outcome.prizeEstimate,
      });
    }

    return { outcome, skipped: false };
  } finally {
    releaseDrawLock(bet.lottery, bet.concurso);
  }
}

// ------------------------------------------------------------
// Reprocessamento idempotente por modalidade+concurso
// ------------------------------------------------------------
const reprocessInFlight = new Set<string>();

/** Chave de idempotência do reprocessamento (modalidade+concurso). */
export function reprocessKey(loteria: string, concurso: number) {
  return `reprocess:${loteria}:${concurso}`;
}

export function isReprocessing(loteria: string, concurso: number) {
  return reprocessInFlight.has(reprocessKey(loteria, concurso));
}

/** Trava exclusiva de reprocessamento — duplicidade vai para a auditoria. */
export function acquireReprocessLock(loteria: string, concurso: number): boolean {
  const k = reprocessKey(loteria, concurso);
  if (reprocessInFlight.has(k)) {
    void auditDuplicate(k, "reprocessamento já em andamento para este concurso");
    return false;
  }
  reprocessInFlight.add(k);
  return true;
}
export function releaseReprocessLock(loteria: string, concurso: number) {
  reprocessInFlight.delete(reprocessKey(loteria, concurso));
}

/**
 * Limpa a idempotência do concurso para permitir nova conferência,
 * registrando o motivo do reprocessamento na auditoria.
 */
export async function resetConferenciaConcurso(loteria: string, concurso: number, motivo: string) {
  const removidas = titanPersistence.clearConferenciasDoConcurso(loteria, concurso);
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("god_core_events" as any).insert({
        user_id: user.id,
        tipo: "conference_reset",
        modulo: "conference",
        severidade: "info",
        mensagem: `🧽 Idempotência limpa para ${loteria} #${concurso} (${removidas.length} chave(s)) — ${motivo}`,
        payload: { loteria, concurso, motivo, chaves: removidas },
      });
    }
  } catch { /* nunca throw */ }
  void emitTitanEvent("conferencia", { loteria, concurso, motivo, acao: "reset_idempotencia", chaves: removidas.length });
  return removidas;
}
