import { describe, it, expect, beforeEach, vi } from "vitest";

// ---- Mock do client (auditoria/edge function) ---------------------------
const insertMock = vi.fn().mockResolvedValue({ error: null });
const invokeMock = vi.fn().mockResolvedValue({ data: { ok: true }, error: null });

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
      send: vi.fn().mockResolvedValue(undefined),
      on: function () { return this; },
      subscribe: function () { return this; },
    }),
    removeChannel: vi.fn(),
  },
}));

import { durableQueue } from "../durableQueue";
import { enqueueReprocessoConcurso } from "../handlers";
import { titanPersistence } from "@/titan/state/titanPersistence";
import {
  acquireReprocessLock, releaseReprocessLock, isReprocessing, reprocessKey,
  resetConferenciaConcurso, betKey,
} from "@/titan/conference/idempotency";

beforeEach(() => {
  localStorage.clear();
  titanPersistence.reset();
  durableQueue.clearDlq();
  invokeMock.mockClear();
  insertMock.mockClear();
});

describe("enqueueReprocessoConcurso", () => {
  it("cria job com tipo, payload e traceKey por modalidade+concurso", () => {
    const job = enqueueReprocessoConcurso("megasena", 2800, "resultado corrigido pela fonte oficial");
    expect(job.type).toBe("reprocessar_concurso");
    expect(job.queue).toBe("conference");
    expect(job.traceKey).toBe("megasena:2800");
    expect(job.payload).toMatchObject({ loteria: "megasena", concurso: 2800 });
    expect(job.payload.motivo).toContain("resultado corrigido");
  });

  it("registra a solicitação na auditoria com o motivo", async () => {
    enqueueReprocessoConcurso("quina", 6400, "motivo auditável");
    await Promise.resolve();
    await new Promise(r => setTimeout(r, 0));
    expect(insertMock).toHaveBeenCalled();
    const payloads = insertMock.mock.calls.map(c => c[0]);
    expect(payloads.some(p => p.tipo === "reprocess_request" && p.mensagem.includes("quina #6400"))).toBe(true);
  });
});

describe("handler reprocessar_concurso", () => {
  it("limpa idempotência do concurso e chama a sincronização forçada", async () => {
    const key = betKey("lotofacil", 3100, "bet-1");
    titanPersistence.markConferencia(key);
    expect(titanPersistence.hasConferencia(key)).toBe(true);

    enqueueReprocessoConcurso("lotofacil", 3100, "conferência divergente");
    await durableQueue.drain();

    expect(titanPersistence.hasConferencia(key)).toBe(false);
    expect(invokeMock).toHaveBeenCalledWith("sync-e-confere", {
      body: { loteria: "lotofacil", concurso: 3100, motivo: "conferência divergente", force: true },
    });
    expect(durableQueue.stats().pending).toBe(0);
    expect(durableQueue.stats().dead).toBe(0);
  });

  it("payload inválido vai para retry/DLQ sem quebrar o loop", async () => {
    durableQueue.enqueue("conference", "reprocessar_concurso", { loteria: "", concurso: 0, motivo: "x" }, 1);
    await durableQueue.drain();
    expect(durableQueue.stats().dead).toBe(1);
    expect(durableQueue.stats().dlq[0].lastError).toContain("payload inválido");
  });

  it("libera a trava ao final, permitindo novo reprocessamento do mesmo concurso", async () => {
    enqueueReprocessoConcurso("timemania", 2200, "1ª tentativa");
    await durableQueue.drain();
    expect(isReprocessing("timemania", 2200)).toBe(false);
    enqueueReprocessoConcurso("timemania", 2200, "2ª tentativa");
    await durableQueue.drain();
    expect(invokeMock).toHaveBeenCalledTimes(2);
  });
});

describe("idempotency key por concurso", () => {
  it("gera chave estável por modalidade+concurso", () => {
    expect(reprocessKey("duplasena", 2700)).toBe("reprocess:duplasena:2700");
  });

  it("bloqueia reprocessamento concorrente do mesmo concurso", () => {
    expect(acquireReprocessLock("supersete", 500)).toBe(true);
    expect(acquireReprocessLock("supersete", 500)).toBe(false);
    // concursos distintos não se bloqueiam
    expect(acquireReprocessLock("supersete", 501)).toBe(true);
    releaseReprocessLock("supersete", 500);
    releaseReprocessLock("supersete", 501);
    expect(acquireReprocessLock("supersete", 500)).toBe(true);
    releaseReprocessLock("supersete", 500);
  });

  it("resetConferenciaConcurso remove apenas as chaves do concurso alvo", async () => {
    titanPersistence.markConferencia(betKey("megasena", 100, "a"));
    titanPersistence.markConferencia(betKey("megasena", 100, "b"));
    titanPersistence.markConferencia(betKey("megasena", 101, "c"));
    const removidas = await resetConferenciaConcurso("megasena", 100, "teste");
    expect(removidas.sort()).toEqual(["megasena:100:a", "megasena:100:b"]);
    expect(titanPersistence.hasConferencia(betKey("megasena", 101, "c"))).toBe(true);
  });
});
