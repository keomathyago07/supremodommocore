// ============================================================
// resilientStats.ts — Telemetria do cliente API resiliente
// Tracks: tentativas, endpoint ativo, latência, últimas falhas
// ============================================================
import { create } from "zustand";

export interface ResilientAttempt {
  ts: string;             // ISO BRT-friendly (toLocaleString abaixo)
  endpoint: string;
  ok: boolean;
  attempts: number;
  latencyMs: number;
  error?: string;
  concurso?: number;
}

interface State {
  totalCalls: number;
  totalOk: number;
  totalFail: number;
  totalAttempts: number;
  avgLatencyMs: number;
  activeEndpoint: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  attempts: ResilientAttempt[]; // últimas 50
  record: (a: ResilientAttempt) => void;
  reset: () => void;
}

export const useResilientStats = create<State>((set, get) => ({
  totalCalls: 0,
  totalOk: 0,
  totalFail: 0,
  totalAttempts: 0,
  avgLatencyMs: 0,
  activeEndpoint: null,
  lastSuccessAt: null,
  lastFailureAt: null,
  attempts: [],
  record: (a) => {
    const s = get();
    const calls = s.totalCalls + 1;
    const okCount = s.totalOk + (a.ok ? 1 : 0);
    const failCount = s.totalFail + (a.ok ? 0 : 1);
    const totalAtt = s.totalAttempts + a.attempts;
    // Média móvel simples
    const avg = (s.avgLatencyMs * s.totalCalls + a.latencyMs) / calls;
    set({
      totalCalls: calls,
      totalOk: okCount,
      totalFail: failCount,
      totalAttempts: totalAtt,
      avgLatencyMs: Math.round(avg),
      activeEndpoint: a.ok ? a.endpoint : s.activeEndpoint,
      lastSuccessAt: a.ok ? a.ts : s.lastSuccessAt,
      lastFailureAt: !a.ok ? a.ts : s.lastFailureAt,
      attempts: [a, ...s.attempts].slice(0, 50),
    });
  },
  reset: () =>
    set({
      totalCalls: 0, totalOk: 0, totalFail: 0, totalAttempts: 0,
      avgLatencyMs: 0, activeEndpoint: null,
      lastSuccessAt: null, lastFailureAt: null, attempts: [],
    }),
}));
