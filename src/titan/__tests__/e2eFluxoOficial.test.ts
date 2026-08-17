// ============================================================
// E2E: aposta → resultado OFICIAL → conferência → prêmio.
// Valida deduplicação por concurso e sincronização imediata
// no dashboard (eventos do titanEventBus).
// ============================================================
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const { insertMock, sendMock, invokeMock } = vi.hoisted(() => ({
  insertMock: vi.fn().mockResolvedValue({ error: null }),
  sendMock: vi.fn().mockResolvedValue(undefined),
  invokeMock: vi.fn().mockResolvedValue({ data: { ok: true }, error: null }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
    from: () => ({
      insert: insertMock,
      upsert: vi.fn().mockResolvedValue({ error: null }),
      select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }) }) }),
    }),
    functions: { invoke: invokeMock },
    channel: () => ({
      send: sendMock,
      on: function () { return this; },
      subscribe: function () { return this; },
    }),
    removeChannel: vi.fn(),
  },
}));

import { durableQueue } from "@/titan/queue/durableQueue";
import { enqueueConferencia, enqueueReprocessoConcurso } from "@/titan/queue/handlers";
import { conferirIdempotente, betKey } from "@/titan/conference/idempotency";
import { titanPersistence } from "@/titan/state/titanPersistence";
import { onTitanEvent, emitTitanEvent, TitanEvent } from "@/titan/sync/titanEventBus";
import type { Bet, OfficialResult } from "@/titan/conference/types";

const bet: Bet = { id: "bet-e2e", lottery: "megasena", concurso: 2900, numeros: [1, 2, 3, 4, 5, 6] };
const oficial: OfficialResult = {
  lottery: "megasena", concurso: 2900, dataApuracao: "2026-08-17",
  status: "OFICIAL", dezenas: [1, 2, 3, 4, 5, 6],
};

beforeEach(() => {
  // 22:00 BRT de uma segunda-feira → dentro da janela oficial
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-18T01:00:00Z"));
  localStorage.clear();
  titanPersistence.reset();
  durableQueue.clearDlq();
  insertMock.mockClear(); sendMock.mockClear(); invokeMock.mockClear();
});
afterEach(() => { vi.useRealTimers(); });

describe("E2E fluxo oficial: aposta → resultado → conferência → prêmio", () => {
  it("confere aposta com resultado OFICIAL e emite prêmio ao dashboard", async () => {
    const events: TitanEvent[] = [];
    const un = onTitanEvent(e => events.push(e));

    await emitTitanEvent("aposta", { loteria: bet.lottery, concurso: bet.concurso, betId: bet.id });

    const persisted: unknown[] = [];
    const { outcome, skipped } = await conferirIdempotente(bet, oficial, async (b, r, out) => {
      persisted.push({ b: b.id, r: r.concurso, status: out.status });
    });

    expect(skipped).toBe(false);
    expect(outcome?.status).toBe("PREMIADA");
    expect(outcome?.acertos).toBe(6);
    expect(outcome?.faixa).toBe("Sena");
    expect(persisted).toHaveLength(1);

    // sincronização imediata no dashboard
    const kinds = events.map(e => e.kind);
    expect(kinds).toContain("aposta");
    expect(kinds).toContain("conferencia");
    expect(kinds).toContain("premio");
    un();
  });

  it("não confere resultado que não é OFICIAL (aguarda)", async () => {
    const provisorio: OfficialResult = { ...oficial, status: "PROVISORIO" };
    const { outcome, skipped, reason } = await conferirIdempotente(bet, provisorio);
    expect(skipped).toBe(true);
    expect(reason).toBe("awaiting_official");
    expect(outcome?.status).toBe("AGUARDANDO_OFICIAL");
    expect(titanPersistence.hasConferencia(betKey(bet.lottery, bet.concurso, bet.id))).toBe(false);
  });

  it("deduplica por concurso: segunda conferência do mesmo concurso é ignorada", async () => {
    const primeiro = await conferirIdempotente(bet, oficial);
    expect(primeiro.skipped).toBe(false);

    const segundo = await conferirIdempotente(bet, oficial);
    expect(segundo.skipped).toBe(true);
    expect(segundo.reason).toBe("already_checked");
    expect(segundo.outcome).toBeNull();

    // concurso diferente da mesma modalidade não é bloqueado
    const outro = await conferirIdempotente(
      { ...bet, id: "bet-e2e-2", concurso: 2901 },
      { ...oficial, concurso: 2901 },
    );
    expect(outro.skipped).toBe(false);
  });

  it("fila durável executa a conferência uma única vez por aposta+concurso", async () => {
    enqueueConferencia(bet, oficial);
    enqueueConferencia(bet, oficial); // duplicata enfileirada
    await durableQueue.drain();

    expect(durableQueue.stats().pending).toBe(0);
    expect(durableQueue.stats().dead).toBe(0);
    const verifs = titanPersistence.get().ultimasVerificacoes;
    expect(Object.keys(verifs)).toEqual([betKey(bet.lottery, bet.concurso, bet.id)]);
    expect(verifs[betKey(bet.lottery, bet.concurso, bet.id)].status).toBe("PREMIADA");
  });

  it("reprocessamento libera nova conferência sem duplicar o registro", async () => {
    await conferirIdempotente(bet, oficial);
    const key = betKey(bet.lottery, bet.concurso, bet.id);
    expect(titanPersistence.hasConferencia(key)).toBe(true);

    enqueueReprocessoConcurso(bet.lottery, bet.concurso, "resultado oficial corrigido");
    await durableQueue.drain();
    expect(titanPersistence.hasConferencia(key)).toBe(false);
    expect(invokeMock).toHaveBeenCalledWith("sync-e-confere", {
      body: { loteria: bet.lottery, concurso: bet.concurso, motivo: "resultado oficial corrigido", force: true },
    });

    const novo = await conferirIdempotente(bet, oficial);
    expect(novo.skipped).toBe(false);
    expect(novo.outcome?.status).toBe("PREMIADA");
    // sem duplicação: uma única chave e uma única verificação por aposta
    const st = titanPersistence.get();
    expect(st.conferenciasConcluidas.filter(k => k === key)).toHaveLength(1);
    expect(Object.keys(st.ultimasVerificacoes)).toHaveLength(1);
  });
});
