// Envio agendado no servidor: no horário de cada usuário (BRT), gera 1 jogo
// por loteria que sorteia hoje (com base no histórico) e grava em Minhas Apostas.
// Roda via agendamento mesmo com o app fechado. Idempotente por usuário+dia+loteria.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const JOB = "envio_previsoes";
const MAX_USUARIOS = 20;

const CFG: Record<string, { qtd: number; min: number; max: number; dias: number[] }> = {
  megasena: { qtd: 6, min: 1, max: 60, dias: [2, 4, 6] },
  quina: { qtd: 5, min: 1, max: 80, dias: [1, 2, 3, 4, 5, 6] },
  lotofacil: { qtd: 15, min: 1, max: 25, dias: [1, 2, 3, 4, 5, 6] },
  lotomania: { qtd: 50, min: 0, max: 99, dias: [1, 3, 5] },
  timemania: { qtd: 10, min: 1, max: 80, dias: [2, 4, 6] },
  duplasena: { qtd: 6, min: 1, max: 50, dias: [1, 3, 5] },
  diadesorte: { qtd: 7, min: 1, max: 31, dias: [1, 2, 3, 4, 5, 6] },
  supersete: { qtd: 7, min: 0, max: 9, dias: [1, 3, 5] },
  maismilionaria: { qtd: 6, min: 1, max: 50, dias: [3, 6] },
};
const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const TIMES = ["FLAMENGO/RJ","CORINTHIANS/SP","PALMEIRAS/SP","SÃO PAULO/SP","GRÊMIO/RS","CRUZEIRO/MG","SANTOS/SP","VASCO DA GAMA/RJ"];

function brt() {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const hm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return { d, ymd, hm, dow: d.getDay() };
}

function amostrar(pesos: Map<number, number>, min: number, max: number, qtd: number): number[] {
  const pool: { n: number; w: number }[] = [];
  for (let n = min; n <= max; n++) pool.push({ n, w: pesos.get(n) ?? 1 });
  const out: number[] = [];
  while (out.length < qtd && pool.length) {
    let r = Math.random() * pool.reduce((s, p) => s + p.w, 0);
    let i = pool.length - 1;
    for (let k = 0; k < pool.length; k++) { r -= pool[k].w; if (r <= 0) { i = k; break; } }
    out.push(pool[i].n); pool.splice(i, 1);
  }
  return out.sort((a, b) => a - b);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  const { data: job } = await db.from("ingest_jobs").select("*").eq("job", JOB).maybeSingle();
  if (job?.paused) return json({ skipped: true, reason: "paused" });
  const now = new Date().toISOString();
  const { data: lease } = await db.from("ingest_jobs")
    .update({ lease_until: new Date(Date.now() + 4 * 60_000).toISOString(), updated_at: now })
    .eq("job", JOB).lt("lease_until", now).select("job");
  if (!lease?.length) return json({ skipped: true, reason: "already_running" });

  const t = brt();
  const resumoGeral: Record<string, unknown> = {};
  try {
    const { data: agendas } = await db.from("agenda_previsoes").select("*").eq("ativo", true).lte("horario", t.hm).limit(200);
    const pendentes = (agendas ?? []).filter((a: any) => {
      if (!a.ultima_execucao) return true;
      const last = new Date(new Date(a.ultima_execucao).toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
      return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}` !== t.ymd;
    }).slice(0, MAX_USUARIOS);

    const hoje = Object.keys(CFG).filter(l => CFG[l].dias.includes(t.dow));
    const pesosCache = new Map<string, Map<number, number>>();
    for (const l of hoje) {
      const { data: hist } = await db.from("resultados_sorteios").select("dezenas").eq("loteria", l).order("concurso", { ascending: false }).limit(200);
      const p = new Map<number, number>();
      for (const h of hist ?? []) for (const n of (h as any).dezenas ?? []) p.set(n, (p.get(n) ?? 1) + 1);
      pesosCache.set(l, p);
    }

    for (const ag of pendentes as any[]) {
      const enviadas: string[] = []; const ignoradas: string[] = []; const falhas: string[] = [];
      for (const l of hoje) {
        const { data: ja } = await db.from("envio_previsoes_log").select("id").eq("user_id", ag.user_id).eq("data_envio", t.ymd).eq("loteria", l).maybeSingle();
        if (ja) { ignoradas.push(l); continue; }
        const c = CFG[l];
        const numeros = l === "supersete"
          ? Array.from({ length: 7 }, () => Math.floor(Math.random() * 10))
          : amostrar(pesosCache.get(l) ?? new Map(), c.min, c.max, c.qtd);
        const { data: conc } = await db.from("proximo_concurso").select("concurso_atual, data_proxima").eq("loteria", l).maybeSingle();
        const { data: ins, error } = await db.from("apostas_pendentes").insert({
          user_id: ag.user_id, loteria: l, numeros, dominancia: 0, precisao: 0, status: "pendente",
          concurso: conc?.concurso_atual ?? null, data_sorteio_alvo: conc?.data_proxima ?? t.ymd,
          criterios_atendidos: [{ nome: "Origem", valor: "envio_agendado_servidor" }],
          tipo_jogo: l === "lotomania" ? "duplo" : "simples",
          mes_da_sorte: l === "diadesorte" ? MESES[Math.floor(Math.random() * 12)] : null,
          time_timemania: l === "timemania" ? TIMES[Math.floor(Math.random() * TIMES.length)] : null,
          trevos_maismilionaria: l === "maismilionaria" ? amostrar(new Map(), 1, 6, 2) : null,
          colunas_supersete: l === "supersete" ? numeros.map((n, i) => ({ coluna: i + 1, numero: n })) : null,
        }).select("id").maybeSingle();
        await db.from("envio_previsoes_log").insert({
          user_id: ag.user_id, data_envio: t.ymd, loteria: l, aposta_id: ins?.id ?? null, numeros,
          status: error ? "falha" : "enviado", detalhe: error?.message ?? null,
        });
        (error ? falhas : enviadas).push(l);
      }
      const resumo = `${enviadas.length} enviada(s)${ignoradas.length ? ` · ${ignoradas.length} já enviada(s)` : ""}${falhas.length ? ` · ${falhas.length} falha(s)` : ""}`;
      await db.from("agenda_previsoes").update({ ultima_execucao: new Date().toISOString(), ultimo_resumo: resumo }).eq("user_id", ag.user_id);
      if (enviadas.length) {
        await db.from("notificacoes").insert({
          user_id: ag.user_id, tipo: "previsao_agendada", titulo: "🔮 Jogos do dia enviados",
          corpo: `${enviadas.join(", ")} — disponíveis em Minhas Apostas.`, prioridade: "alta", emoji: "🔮", lido: false,
        });
      }
      resumoGeral[ag.user_id] = { enviadas, ignoradas, falhas };
    }

    await db.from("ingest_jobs").update({
      lease_until: new Date(Date.now() - 1000).toISOString(), last_run_at: new Date().toISOString(),
      last_status: "ok", last_summary: { usuarios: Object.keys(resumoGeral).length, hm: t.hm },
      runs_total: (job?.runs_total ?? 0) + 1, updated_at: new Date().toISOString(),
    }).eq("job", JOB);
    return json({ ok: true, horario: t.hm, usuarios: Object.keys(resumoGeral).length });
  } catch (e) {
    await db.from("ingest_jobs").update({
      lease_until: new Date(Date.now() - 1000).toISOString(), last_run_at: new Date().toISOString(),
      last_status: "error", last_summary: { erro: String((e as Error)?.message ?? e) },
    }).eq("job", JOB);
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
