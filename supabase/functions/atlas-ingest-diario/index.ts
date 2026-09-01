// ================================================================
// ATLAS INGEST DIÁRIO — IAS Ultra
// Armazena no banco TODOS os sorteios do dia (9 loterias) e faz
// backfill limitado de concursos anteriores para cruzamento de dados.
//
// Regras de job em background:
//  - Trabalho limitado por execução (LATEST + BACKFILL_BUDGET)
//  - Single-flight lock via lease em public.ingest_jobs
//  - Progresso idempotente (upsert por loteria+concurso)
//  - Circuit breaker: pausa o job após falha total das fontes
//  - Guard de pausa em toda entrada
// ================================================================
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const JOB = "atlas_ingest_diario";
const LEASE_MS = 4 * 60 * 1000;      // lease de 4 minutos
const BACKFILL_BUDGET = 12;          // máximo de concursos históricos por execução
const LOTERIAS = [
  "megasena", "quina", "lotofacil", "lotomania",
  "timemania", "duplasena", "diadesorte", "supersete", "maismilionaria",
] as const;

const SLUG_CAIXA: Record<string, string> = {
  megasena: "megasena", quina: "quina", lotofacil: "lotofacil", lotomania: "lotomania",
  timemania: "timemania", duplasena: "duplasena", diadesorte: "diadesorte",
  supersete: "supersete", maismilionaria: "maismilionaria",
};
const SLUG_ALT: Record<string, string> = {
  megasena: "megasena", quina: "quina", lotofacil: "lotofacil", lotomania: "lotomania",
  timemania: "timemania", duplasena: "duplasena", diadesorte: "diadesorte",
  supersete: "supersete", maismilionaria: "maismilionaria",
};

interface Draw {
  concurso: number;
  dezenas: number[];
  data_apuracao: string;
  acumulado: boolean;
  valor_proximo: number;
  raw: unknown;
}

function parseDraw(j: any): Draw | null {
  const dezenas = (j?.listaDezenas ?? j?.dezenasSorteadasOrdemSorteio ?? j?.dezenas ?? j?.listaResultadoEquipeEsportiva ?? [])
    .map((d: unknown) => Number(String(d).replace(/\D/g, "")))
    .filter((n: number) => Number.isFinite(n));
  const concurso = Number(j?.numero ?? j?.concurso ?? 0);
  if (!dezenas.length || !concurso) return null;
  const raw = j?.dataApuracao ?? j?.data ?? j?.dataSorteio ?? "";
  let data = String(raw);
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(data) && data) {
    const d = new Date(data);
    if (!isNaN(d.getTime())) {
      data = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(d);
    }
  }
  return {
    concurso,
    dezenas,
    data_apuracao: data,
    acumulado: Boolean(j?.acumulado ?? j?.acumulou),
    valor_proximo: Number(j?.valorEstimadoProximoConcurso ?? j?.valorAcumulado ?? 0),
    raw: j,
  };
}

async function fetchJson(url: string, ms = 8000): Promise<any | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" }, signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** Busca um concurso (ou o último) rotacionando fontes. Nunca lança. */
async function fetchDraw(loteria: string, concurso?: number): Promise<Draw | null> {
  const c = SLUG_CAIXA[loteria], a = SLUG_ALT[loteria];
  const urls = concurso
    ? [
        `https://servicebus2.caixa.gov.br/portaldeloterias/api/${c}/${concurso}`,
        `https://loteriascaixa-api.herokuapp.com/api/${a}/${concurso}`,
      ]
    : [
        `https://servicebus2.caixa.gov.br/portaldeloterias/api/${c}`,
        `https://loteriascaixa-api.herokuapp.com/api/${a}/latest`,
        `https://api.guidi.dev.br/loteria/${a}/ultimo`,
      ];
  for (const u of urls) {
    const j = await fetchJson(u);
    const d = j ? parseDraw(j) : null;
    if (d) return d;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  // 1) Guard de pausa
  const { data: job } = await db.from("ingest_jobs").select("*").eq("job", JOB).maybeSingle();
  if (job?.paused) {
    return json({ skipped: true, reason: "paused", pause_reason: job.pause_reason });
  }

  // 2) Single-flight lock (lease atômico)
  const nowIso = new Date().toISOString();
  const leaseIso = new Date(Date.now() + LEASE_MS).toISOString();
  const { data: leased } = await db
    .from("ingest_jobs")
    .update({ lease_until: leaseIso, updated_at: nowIso })
    .eq("job", JOB)
    .lt("lease_until", nowIso)
    .select("job");
  if (!leased?.length) return json({ skipped: true, reason: "already_running" });

  const resumo: Record<string, unknown> = {};
  let inseridos = 0, falhas = 0, backfill = 0;

  try {
    for (const loteria of LOTERIAS) {
      const ultimo = await fetchDraw(loteria);
      if (!ultimo) { falhas++; resumo[loteria] = "fonte_indisponivel"; continue; }

      const { error: upErr } = await db.from("resultados_sorteios").upsert({
        loteria,
        concurso: ultimo.concurso,
        dezenas: ultimo.dezenas,
        data_apuracao: ultimo.data_apuracao,
        acumulado: ultimo.acumulado,
        valor_proximo: ultimo.valor_proximo,
        raw_response: ultimo.raw as Record<string, unknown>,
      }, { onConflict: "loteria,concurso" });
      if (upErr) { falhas++; resumo[loteria] = `erro_db: ${upErr.message}`; continue; }
      inseridos++;

      await db.from("proximo_concurso").upsert({
        loteria,
        concurso_atual: ultimo.concurso + 1,
        atualizado_em: new Date().toISOString(),
      }, { onConflict: "loteria" });

      // 3) Backfill limitado: preenche lacunas históricas p/ cruzamento de dados
      if (backfill < BACKFILL_BUDGET) {
        const { data: existentes } = await db
          .from("resultados_sorteios")
          .select("concurso")
          .eq("loteria", loteria)
          .gte("concurso", Math.max(1, ultimo.concurso - 30))
          .order("concurso", { ascending: false });
        const have = new Set((existentes ?? []).map((r: { concurso: number }) => r.concurso));
        for (let c = ultimo.concurso - 1; c > Math.max(0, ultimo.concurso - 30); c--) {
          if (backfill >= BACKFILL_BUDGET) break;
          if (have.has(c)) continue;
          const d = await fetchDraw(loteria, c);
          if (!d) break;
          await db.from("resultados_sorteios").upsert({
            loteria, concurso: d.concurso, dezenas: d.dezenas,
            data_apuracao: d.data_apuracao, acumulado: d.acumulado,
            valor_proximo: d.valor_proximo, raw_response: d.raw as Record<string, unknown>,
          }, { onConflict: "loteria,concurso" });
          backfill++;
        }
      }

      resumo[loteria] = { concurso: ultimo.concurso, data: ultimo.data_apuracao };
    }

    // 4) Circuit breaker: todas as fontes falharam → pausa até nova avaliação
    const pausar = falhas === LOTERIAS.length;
    await db.from("ingest_jobs").update({
      lease_until: new Date(Date.now() - 1000).toISOString(),
      last_run_at: new Date().toISOString(),
      last_status: pausar ? "failed" : "ok",
      last_summary: { inseridos, backfill, falhas, resumo },
      runs_total: (job?.runs_total ?? 0) + 1,
      paused: pausar,
      pause_reason: pausar ? "todas as fontes de resultados indisponíveis" : null,
      updated_at: new Date().toISOString(),
    }).eq("job", JOB);

    return json({ ok: true, inseridos, backfill, falhas, resumo });
  } catch (e) {
    await db.from("ingest_jobs").update({
      lease_until: new Date(Date.now() - 1000).toISOString(),
      last_run_at: new Date().toISOString(),
      last_status: "error",
      last_summary: { erro: String((e as Error)?.message ?? e) },
      updated_at: new Date().toISOString(),
    }).eq("job", JOB);
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
