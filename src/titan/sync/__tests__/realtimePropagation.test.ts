// ============================================================
// Valida a propagação em tempo real (WebSocket/Realtime broadcast)
// dos eventos aposta, resultado, conferência e prêmio até o
// dashboard — e que o reprocessamento atualiza status sem duplicar.
// ============================================================
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const { sendMock, insertMock, invokeMock, removeChannelMock, subscribers } = vi.hoisted(() => ({
  sendMock: vi.fn().mockResolvedValue(undefined),
  insertMock: vi.fn().mockResolvedValue({ error: null }),
  invokeMock: vi.fn().mockResolvedValue({ data: { ok: true }, error: null }),
  removeChannelMock: vi.fn(),
  subscribers: new Set<(msg: { event: string; payload: unknown }) => void>(),
}));

// Canal Realtime simulado: broadcasts enviados são entregues aos assinantes.
type BroadcastCb = (msg: { event: string; payload: unknown }) => void;

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
    from: () => ({
      insert: insertMock,
      upsert: vi.fn().mockResolvedValue({ error: null }),
      select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }) }) }),
    }),
    functions: { invoke: invokeMock },
    channel: () => {
      const ch: any = {
        send: async (m: { type: string; event: string; payload: unknown }) => {
          sendMock(m);
          subscribers.forEach(cb => cb({ event: m.event, payload: m.payload }));
        },
        on: (_type: string, _filter: unknown, cb: BroadcastCb) => { subscribers.add(cb); return ch; },
        subscribe: () => ch,
      };
      return ch;
    },
    removeChannel: removeChannelMock,
  },
}));

import { emitTitanEvent, onTitanEvent, TitanEvent, TitanEventKind } from "../titanEventBus";
import { durableQueue } from "@/titan/queue/durableQueue";
import { enqueueReprocessoConcurso } from "@/titan/queue/handlers";
import { conferirIdempotente, betKey } from "@/titan/conference/idempotency";
import { titanPersistence } from "@/titan/state/titanPersistence";
import type { Bet, OfficialResult } from "@/titan/conference/types";

const bet: Bet = { id: "bet-rt", lottery: "lotofacil", concurso: 3200, numeros: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15] };
const oficial: OfficialResult = {
  lottery: "lotofacil", concurso: 3200, dataApuracao: "2026-08-17",
  status: "OFICIAL", dezenas: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-18T01:00:00Z")); // 22:00 BRT
  localStorage.clear();
  titanPersistence.reset();
  durableQueue.clearDlq();
  subscribers.clear();
  sendMock.mockClear(); insertMock.mockClear(); invokeMock.mockClear();
});
afterEach(() => { vi.useRealTimers(); });

describe("propagação realtime até o dashboard", () => {
  it("entrega aposta, resultado, conferência e prêmio via WebSocket", async () => {
    const recebidos: TitanEvent[] = [];
    const un = onTitanEvent(e => recebidos.push(e));

    const kinds: TitanEventKind[] = ["aposta", "resultado", "conferencia", "premio"];
    for (const k of kinds) {
      await emitTitanEvent(k, { loteria: bet.lottery, concurso: bet.concurso });
    }

    // enviado ao canal (WebSocket) uma vez por evento
    expect(sendMock).toHaveBeenCalledTimes(4);
    sendMock.mock.calls.forEach(([m]) => expect(m.type).toBe("broadcast"));

    // dashboard recebeu todos os tipos, sem duplicar por id
    expect(recebidos.map(e => e.kind)).toEqual(kinds);
    expect(new Set(recebidos.map(e => e.id)).size).toBe(4);
    un();
  });

  it("deduplica o mesmo evento reentregue pelo Realtime", async () => {
    const recebidos: TitanEvent[] = [];
    const un = onTitanEvent(e => recebidos.push(e));
    const evt = await emitTitanEvent("resultado", { loteria: bet.lottery, concurso: bet.concurso });
    // reentrega do mesmo payload (eco do servidor)
    subscribers.forEach(cb => cb({ event: "resultado", payload: evt }));
    expect(recebidos.filter(e => e.id === evt.id)).toHaveLength(1);
    un();
  });

  it("dispara window events titan:<kind> para os painéis do dashboard", async () => {
    const spy = vi.fn();
    window.addEventListener("titan:conferencia", spy);
    await emitTitanEvent("conferencia", { loteria: bet.lottery, concurso: bet.concurso, status: "CONFERIDA" });
    expect(spy).toHaveBeenCalledTimes(1);
    window.removeEventListener("titan:conferencia", spy);
  });

  it("reprocessamento atualiza o status no dashboard sem duplicar eventos/registros", async () => {
    const recebidos: TitanEvent[] = [];
    const un = onTitanEvent(e => recebidos.push(e));

    await conferirIdempotente(bet, oficial);
    const key = betKey(bet.lottery, bet.concurso, bet.id);
    const conferenciasIniciais = recebidos.filter(e => e.kind === "conferencia").length;

    // duas solicitações de reprocessamento do MESMO concurso
    enqueueReprocessoConcurso(bet.lottery, bet.concurso, "divergência na fonte oficial");
    enqueueReprocessoConcurso(bet.lottery, bet.concurso, "divergência na fonte oficial");
    await durableQueue.drain();

    // idempotência limpa e sincronização forçada acionada
    expect(titanPersistence.hasConferencia(key)).toBe(false);
    expect(invokeMock).toHaveBeenCalled();

    const novo = await conferirIdempotente(bet, oficial);
    expect(novo.skipped).toBe(false);

    // status atualizado uma única vez — sem duplicar registros
    const st = titanPersistence.get();
    expect(st.conferenciasConcluidas.filter(k => k === key)).toHaveLength(1);
    expect(Object.keys(st.ultimasVerificacoes)).toHaveLength(1);
    expect(recebidos.filter(e => e.kind === "conferencia").length).toBeGreaterThan(conferenciasIniciais);
    expect(new Set(recebidos.map(e => e.id)).size).toBe(recebidos.length);
    un();
  });
});
