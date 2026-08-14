// ============================================================
// titanPersistence.ts — Persistência do estado do TitanDommoCore.
// Nunca perde ciclos, últimas verificações e consenso após reinício.
// Camada 1: localStorage (instantâneo) · Camada 2: nuvem (ai_memory).
// ============================================================
import { supabase } from "@/integrations/supabase/client";

const LS_KEY = "titan.core.state.v1";
const MEMORY_TYPE = "titan_core_state";

export interface ConsensoResultado {
  loteria: string;
  concurso: number;
  dezenas: number[];
  fontes: string[];        // quais fontes confirmaram
  concordancia: number;    // 0..1
  status: "OFICIAL" | "PROVISORIO" | "AGUARDANDO";
  at: number;
}

export interface UltimaVerificacao {
  key: string;             // loteria:concurso
  loteria: string;
  concurso: number;
  status: string;
  acertos: number;
  faixa: string | null;
  at: number;
}

export interface TitanPersistedState {
  version: number;
  cycles: number;                 // ciclos do persistent core
  evolutionGeneration: number;
  lastTickAt: number | null;
  stageStats: Record<string, { ok: number; fail: number; lastMs: number }>;
  ultimasVerificacoes: Record<string, UltimaVerificacao>;
  consenso: Record<string, ConsensoResultado>;   // loteria:concurso
  conferenciasConcluidas: string[];              // idempotência (loteria:concurso:betId)
  updatedAt: number;
}

const EMPTY: TitanPersistedState = {
  version: 1,
  cycles: 0,
  evolutionGeneration: 0,
  lastTickAt: null,
  stageStats: {},
  ultimasVerificacoes: {},
  consenso: {},
  conferenciasConcluidas: [],
  updatedAt: 0,
};

function readLocal(): TitanPersistedState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as TitanPersistedState;
    return { ...EMPTY, ...parsed };
  } catch {
    return { ...EMPTY };
  }
}

let state: TitanPersistedState = typeof localStorage !== "undefined" ? readLocal() : { ...EMPTY };
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<(s: TitanPersistedState) => void>();

function persistLocal() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* quota */ }
}

async function persistCloud() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("ai_memory" as any).upsert({
      user_id: user.id,
      lottery: "_titan_core",
      memory_type: MEMORY_TYPE,
      data: state as unknown as Record<string, unknown>,
      version: state.version,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,lottery,memory_type" });
  } catch { /* resiliente */ }
}

function scheduleFlush() {
  persistLocal();
  listeners.forEach(l => { try { l(state); } catch { /* noop */ } });
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void persistCloud();
  }, 4_000);
}

export const titanPersistence = {
  get(): TitanPersistedState { return state; },

  subscribe(fn: (s: TitanPersistedState) => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  patch(p: Partial<TitanPersistedState>) {
    state = { ...state, ...p, updatedAt: Date.now() };
    scheduleFlush();
  },

  bumpCycle(stageStats?: TitanPersistedState["stageStats"]) {
    state = {
      ...state,
      cycles: state.cycles + 1,
      lastTickAt: Date.now(),
      stageStats: stageStats ?? state.stageStats,
      updatedAt: Date.now(),
    };
    scheduleFlush();
  },

  recordVerificacao(v: UltimaVerificacao) {
    state = {
      ...state,
      ultimasVerificacoes: { ...state.ultimasVerificacoes, [v.key]: v },
      updatedAt: Date.now(),
    };
    scheduleFlush();
  },

  recordConsenso(c: ConsensoResultado) {
    const key = `${c.loteria}:${c.concurso}`;
    const prev = state.consenso[key];
    // consenso ultra-inteligente: mantém o de maior concordância / status mais forte
    const strength = (x?: ConsensoResultado) =>
      !x ? -1 : (x.status === "OFICIAL" ? 2 : x.status === "PROVISORIO" ? 1 : 0) * 10 + x.concordancia;
    if (strength(c) < strength(prev)) return;
    state = { ...state, consenso: { ...state.consenso, [key]: c }, updatedAt: Date.now() };
    scheduleFlush();
  },

  markConferencia(key: string) {
    if (state.conferenciasConcluidas.includes(key)) return false;
    state = {
      ...state,
      conferenciasConcluidas: [...state.conferenciasConcluidas, key].slice(-5000),
      updatedAt: Date.now(),
    };
    scheduleFlush();
    return true;
  },

  hasConferencia(key: string) { return state.conferenciasConcluidas.includes(key); },

  /**
   * Limpa a idempotência de um concurso (modalidade+concurso), permitindo
   * reprocessamento controlado. Retorna as chaves removidas.
   */
  clearConferenciasDoConcurso(loteria: string, concurso: number): string[] {
    const prefix = `${loteria}:${concurso}`;
    const removidas = state.conferenciasConcluidas.filter(k => k === prefix || k.startsWith(`${prefix}:`));
    if (!removidas.length) return [];
    const verifs = { ...state.ultimasVerificacoes };
    Object.keys(verifs).forEach(k => { if (k === prefix || k.startsWith(`${prefix}:`)) delete verifs[k]; });
    state = {
      ...state,
      conferenciasConcluidas: state.conferenciasConcluidas.filter(k => !removidas.includes(k)),
      ultimasVerificacoes: verifs,
      updatedAt: Date.now(),
    };
    scheduleFlush();
    return removidas;
  },


  /** Restaura da nuvem no boot (se a nuvem estiver mais recente). */
  async hydrateFromCloud() {
    try {
      const { data, error } = await supabase
        .from("ai_memory" as any)
        .select("data, updated_at")
        .eq("memory_type", MEMORY_TYPE)
        .eq("lottery", "_titan_core")
        .maybeSingle();
      if (error || !data) return state;
      const remote = (data as any).data as TitanPersistedState | null;
      if (remote && (remote.updatedAt ?? 0) > (state.updatedAt ?? 0)) {
        state = { ...EMPTY, ...remote };
        persistLocal();
        listeners.forEach(l => { try { l(state); } catch { /* noop */ } });
      }
    } catch { /* offline */ }
    return state;
  },

  reset() {
    state = { ...EMPTY, updatedAt: Date.now() };
    scheduleFlush();
  },
};
