// Scheduler de backtests automáticos — cliente + persistência Supabase
import { supabase } from "@/integrations/supabase/client";
import {
  runBacktest, saveBacktestRun, PREDICTORS,
  type LoteriaKey, type BacktestResult,
} from "@/titan/engines/backtest";

export interface BacktestSchedule {
  id: string;
  user_id: string;
  nome: string;
  loterias: string[];
  algoritmos: string[];
  ia_engine: string;
  window_size: number;
  max_samples: number;
  interval_hours: number;
  proxima_execucao: string;
  ultima_execucao: string | null;
  ultimo_status: string | null;
  ultimo_resumo: any;
  execucoes_total: number;
  ativo: boolean;
  created_at: string;
}

export type NewSchedulePayload = Omit<
  BacktestSchedule,
  "id" | "user_id" | "proxima_execucao" | "ultima_execucao" | "ultimo_status" | "ultimo_resumo" | "execucoes_total" | "created_at"
> & { proxima_execucao?: string };

const TABLE = "titan_backtest_schedules" as const;

export async function listSchedules(): Promise<BacktestSchedule[]> {
  const { data, error } = await supabase.from(TABLE as any).select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown) as BacktestSchedule[];
}

export async function createSchedule(p: NewSchedulePayload) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Não autenticado");
  const proxima = p.proxima_execucao ?? new Date(Date.now() + p.interval_hours * 3600_000).toISOString();
  const { data, error } = await supabase.from(TABLE as any).insert({
    user_id: userData.user.id,
    nome: p.nome,
    loterias: p.loterias,
    algoritmos: p.algoritmos,
    ia_engine: p.ia_engine,
    window_size: p.window_size,
    max_samples: p.max_samples,
    interval_hours: p.interval_hours,
    proxima_execucao: proxima,
    ativo: p.ativo,
  }).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function toggleSchedule(id: string, ativo: boolean) {
  const { error } = await supabase.from(TABLE as any).update({ ativo }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteSchedule(id: string) {
  const { error } = await supabase.from(TABLE as any).delete().eq("id", id);
  if (error) throw new Error(error.message);
}

async function markExecution(id: string, status: string, resumo: any, intervalHours: number, executionsTotal: number) {
  const now = new Date();
  const proxima = new Date(now.getTime() + intervalHours * 3600_000).toISOString();
  await supabase.from(TABLE as any).update({
    ultima_execucao: now.toISOString(),
    ultimo_status: status,
    ultimo_resumo: resumo,
    proxima_execucao: proxima,
    execucoes_total: executionsTotal + 1,
  }).eq("id", id);
}

async function logRun(scheduleId: string, runId: string, nivel: string, mensagem: string, extra?: { duracao_ms?: number; tentativa?: number; contexto?: any }) {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    await supabase.from("titan_backtest_run_logs" as any).insert({
      user_id: userData.user.id,
      schedule_id: scheduleId, run_id: runId,
      nivel, mensagem,
      duracao_ms: extra?.duracao_ms ?? null,
      tentativa: extra?.tentativa ?? 1,
      contexto: extra?.contexto ?? {},
    });
  } catch { /* silent */ }
}

export async function runSchedule(s: BacktestSchedule): Promise<{ ok: boolean; runs: number; error?: string }> {
  const runId = crypto.randomUUID();
  const t0 = Date.now();
  await logRun(s.id, runId, "INFO", `▶ Iniciando "${s.nome}" · ${s.loterias.length}×${s.algoritmos.length} combinações`);
  try {
    const results: BacktestResult[] = [];
    for (const lot of s.loterias) {
      for (const alg of s.algoritmos) {
        if (!PREDICTORS[alg as keyof typeof PREDICTORS]) {
          await logRun(s.id, runId, "WARN", `Algoritmo desconhecido: ${alg}`);
          continue;
        }
        const tCombo = Date.now();
        let attempt = 0, ok = false, lastErr: any = null;
        while (attempt < 3 && !ok) {
          attempt++;
          try {
            const r = await runBacktest({
              loteria: lot as LoteriaKey, predictor: alg as keyof typeof PREDICTORS,
              iaEngine: s.ia_engine, windowSize: s.window_size, maxSamples: s.max_samples,
              collectRounds: false,
            });
            results.push(r);
            if (r.amostras > 0) {
              try { await saveBacktestRun(r, `Scheduler: ${s.nome}`); } catch { /* ignore */ }
            }
            await logRun(s.id, runId, "INFO", `✓ ${lot}/${alg} · amostras=${r.amostras} · precisão=${r.precisao}%`,
              { duracao_ms: Date.now() - tCombo, tentativa: attempt, contexto: { hit: r.hitRate, roi: r.roiSimulado } });
            ok = true;
          } catch (e: any) {
            lastErr = e;
            await logRun(s.id, runId, "WARN", `Retry ${lot}/${alg}: ${e?.message ?? e}`, { tentativa: attempt });
            await new Promise(r => setTimeout(r, 300 * attempt));
          }
        }
        if (!ok) {
          await logRun(s.id, runId, "ERROR", `Falha ${lot}/${alg}: ${lastErr?.message ?? lastErr}`,
            { duracao_ms: Date.now() - tCombo, tentativa: attempt, contexto: { error: String(lastErr) } });
        }
      }
    }
    const resumo = {
      total: results.length,
      hitRateAvg: avg(results.map(r => r.hitRate)),
      roiAvg: avg(results.map(r => r.roiSimulado)),
      brierAvg: avg(results.map(r => r.brierScore)),
      melhores: results.sort((a, b) => b.precisao - a.precisao).slice(0, 3)
        .map(r => ({ loteria: r.loteria, algoritmo: r.algoritmo, precisao: r.precisao, roi: r.roiSimulado })),
    };
    await markExecution(s.id, "done", resumo, s.interval_hours, s.execucoes_total);
    await logRun(s.id, runId, "INFO", `✅ Concluído em ${Date.now() - t0}ms`, { duracao_ms: Date.now() - t0, contexto: resumo });
    return { ok: true, runs: results.length };
  } catch (e: any) {
    await markExecution(s.id, "failed", { error: e?.message ?? String(e) }, s.interval_hours, s.execucoes_total);
    await logRun(s.id, runId, "ERROR", `❌ ${e?.message ?? e}`, { duracao_ms: Date.now() - t0, contexto: { stack: e?.stack } });
    return { ok: false, runs: 0, error: e?.message ?? String(e) };
  }
}

function avg(xs: number[]): number {
  if (!xs.length) return 0;
  return Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 100) / 100;
}

// ─── Loop residente ──────────────────────────────────────────
let loopHandle: number | null = null;
let running = new Set<string>();

export function startSchedulerLoop(tickMs = 60_000) {
  if (loopHandle != null) return;
  const tick = async () => {
    try {
      const schedules = await listSchedules();
      const now = Date.now();
      for (const s of schedules) {
        if (!s.ativo) continue;
        if (running.has(s.id)) continue;
        if (new Date(s.proxima_execucao).getTime() > now) continue;
        running.add(s.id);
        runSchedule(s).finally(() => running.delete(s.id));
      }
    } catch { /* silent */ }
  };
  tick();
  loopHandle = window.setInterval(tick, tickMs) as unknown as number;
}

export function stopSchedulerLoop() {
  if (loopHandle != null) { clearInterval(loopHandle); loopHandle = null; }
}
