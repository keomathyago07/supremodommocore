// ============================================================
// ingestMonitor.ts — Monitor institucional do agendamento
// "atlas-ingest-diario-noturno" no ambiente real.
// Mede execuções, concursos coletados, falhas e atrasos por loteria
// cruzando public.ingest_jobs + public.resultados_sorteios +
// public.loterias_calendario. Consumido pelo painel SLA/Filas.
// ============================================================
import { supabase } from "@/integrations/supabase/client";

export type IngestSev = "ok" | "warn" | "error" | "critical";

export interface IngestLotteryStat {
  loteria: string;
  ultimoConcurso: number;
  ultimaData: string;
  totalHistorico: number;
  atrasoDias: number;        // dias desde a última apuração coletada
  esperadoHoje: boolean;     // há sorteio hoje pelo calendário
  faltando: boolean;         // sorteio esperado hoje ainda não coletado
  sev: IngestSev;
}

export interface IngestSnapshot {
  job: string;
  paused: boolean;
  pauseReason: string | null;
  lastRunAt: string | null;
  lastStatus: string | null;
  runsTotal: number;
  inseridos: number;
  falhas: number;
  backfill: number;
  atrasoMin: number | null;  // minutos desde a última execução
  dentroDaJanela: boolean;   // 20h–00h BRT (janela do cron)
  loterias: IngestLotteryStat[];
  totalColetado: number;
  sev: IngestSev;
  diagnostico: string;
  at: number;
}

const JOB = "atlas_ingest_diario";
// Cron real (UTC): a cada 10 min nas horas 23,0,1,2 ⇒ 20h–23h BRT.
export const INGEST_SLA = {
  atrasoWarnMin: 25,       // 2 ciclos perdidos
  atrasoErrorMin: 70,      // 7 ciclos perdidos
  atrasoCriticalMin: 24 * 60,
  falhasWarn: 1,
  falhasError: 3,
  atrasoDiasWarn: 3,
  atrasoDiasError: 7,
};

function brtNow(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
}

function pior(a: IngestSev, b: IngestSev): IngestSev {
  const ord: Record<IngestSev, number> = { ok: 0, warn: 1, error: 2, critical: 3 };
  return ord[a] >= ord[b] ? a : b;
}

/** Converte DD/MM/YYYY ou YYYY-MM-DD para Date (BRT, meio-dia p/ evitar fuso). */
function parseData(s: string | null | undefined): Date | null {
  if (!s) return null;
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (br) return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]), 12);
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 12);
  return null;
}

export async function fetchIngestSnapshot(): Promise<IngestSnapshot> {
  const agora = brtNow();
  const hora = agora.getHours() + agora.getMinutes() / 60;
  const dentroDaJanela = hora >= 20 || hora < 0.5;

  const [jobRes, drawsRes, calRes] = await Promise.all([
    supabase.from("ingest_jobs" as never).select("*").eq("job", JOB).maybeSingle(),
    supabase.from("resultados_sorteios").select("loteria, concurso, data_apuracao").order("concurso", { ascending: false }).limit(5000),
    supabase.from("loterias_calendario").select("loteria, dias_semana"),
  ]);

  const job = (jobRes.data ?? {}) as Record<string, unknown>;
  const summary = (job.last_summary ?? {}) as Record<string, unknown>;
  const lastRunAt = (job.last_run_at as string) ?? null;
  const atrasoMin = lastRunAt ? Math.round((Date.now() - new Date(lastRunAt).getTime()) / 60_000) : null;

  const rows = (drawsRes.data ?? []) as { loteria: string; concurso: number; data_apuracao: string | null }[];
  const cal = new Map<string, number[]>();
  for (const c of (calRes.data ?? []) as { loteria: string; dias_semana: number[] }[]) {
    cal.set(c.loteria, c.dias_semana ?? []);
  }

  const porLoteria = new Map<string, { ultimo: number; data: string; total: number }>();
  for (const r of rows) {
    const cur = porLoteria.get(r.loteria);
    if (!cur) porLoteria.set(r.loteria, { ultimo: r.concurso, data: r.data_apuracao ?? "", total: 1 });
    else {
      cur.total += 1;
      if (r.concurso > cur.ultimo) { cur.ultimo = r.concurso; cur.data = r.data_apuracao ?? ""; }
    }
  }

  const dow = agora.getDay();
  const hojeMeio = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 12).getTime();

  const loterias: IngestLotteryStat[] = [...porLoteria.entries()].map(([loteria, v]) => {
    const d = parseData(v.data);
    const atrasoDias = d ? Math.max(0, Math.round((hojeMeio - d.getTime()) / 86_400_000)) : 999;
    const dias = cal.get(loteria) ?? [];
    const esperadoHoje = dias.includes(dow);
    // Só é "faltando" após o horário do sorteio (a partir das 21h BRT)
    const faltando = esperadoHoje && atrasoDias >= 1 && hora >= 21;
    const sev: IngestSev =
      atrasoDias >= INGEST_SLA.atrasoDiasError || faltando ? "error"
        : atrasoDias >= INGEST_SLA.atrasoDiasWarn ? "warn"
          : "ok";
    return { loteria, ultimoConcurso: v.ultimo, ultimaData: v.data, totalHistorico: v.total, atrasoDias, esperadoHoje, faltando, sev };
  }).sort((a, b) => b.atrasoDias - a.atrasoDias || a.loteria.localeCompare(b.loteria));

  const falhas = Number(summary.falhas ?? 0);
  const inseridos = Number(summary.inseridos ?? 0);
  const backfill = Number(summary.backfill ?? 0);

  let sev: IngestSev = "ok";
  if (job.paused) sev = "critical";
  if ((job.last_status as string) === "error") sev = pior(sev, "error");
  if (falhas >= INGEST_SLA.falhasError) sev = pior(sev, "error");
  else if (falhas >= INGEST_SLA.falhasWarn) sev = pior(sev, "warn");
  if (atrasoMin != null) {
    if (atrasoMin >= INGEST_SLA.atrasoCriticalMin) sev = pior(sev, "critical");
    else if (dentroDaJanela && atrasoMin >= INGEST_SLA.atrasoErrorMin) sev = pior(sev, "error");
    else if (dentroDaJanela && atrasoMin >= INGEST_SLA.atrasoWarnMin) sev = pior(sev, "warn");
  } else sev = pior(sev, "warn");
  for (const l of loterias) sev = pior(sev, l.sev);

  const faltantes = loterias.filter(l => l.faltando).map(l => l.loteria);
  const diagnostico =
    job.paused ? `🔴 Ingestão PAUSADA (${(job.pause_reason as string) ?? "sem motivo"}) — retomar o job atlas-ingest-diario.`
      : faltantes.length ? `🔴 Concurso do dia ainda não coletado: ${faltantes.join(", ")} — disparar ingestão manual.`
        : sev === "error" || sev === "critical" ? `🔴 Cron atrasado (${atrasoMin ?? "?"} min) ou com falhas (${falhas}) — verificar agendamento noturno.`
          : sev === "warn" ? `🟠 Atraso moderado no cron (${atrasoMin ?? "?"} min) · falhas ${falhas} — monitorando próximo ciclo.`
            : `🟢 Ingestão saudável · ${loterias.length} loterias sincronizadas · ${inseridos} concursos no último ciclo.`;

  return {
    job: JOB,
    paused: Boolean(job.paused),
    pauseReason: (job.pause_reason as string) ?? null,
    lastRunAt,
    lastStatus: (job.last_status as string) ?? null,
    runsTotal: Number(job.runs_total ?? 0),
    inseridos, falhas, backfill,
    atrasoMin, dentroDaJanela,
    loterias,
    totalColetado: rows.length,
    sev, diagnostico,
    at: Date.now(),
  };
}

/** Dispara a ingestão sob demanda (edge function real, idempotente). */
export async function dispararIngestManual(): Promise<{ ok: boolean; erro?: string }> {
  try {
    const { error } = await supabase.functions.invoke("atlas-ingest-diario", { body: { manual: true } });
    if (error) return { ok: false, erro: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "falha ao invocar" };
  }
}
