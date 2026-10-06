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

// Estratégia equilibrada: soma dentro da faixa histórica (média ± 1 desvio),
// pares/ímpares balanceados e poucas sequências. Não aumenta a chance de acerto;
// evita combinações muito jogadas, reduzindo a divisão do prêmio.
type Faixa = { media: number; dp: number };
function equilibrado(nums: number[], f: Faixa | undefined, qtd: number): number {
  const s = nums.reduce((a, b) => a + b, 0);
  const pares = nums.filter(n => n % 2 === 0).length;
  let seq = 1, maxSeq = 1;
  for (let i = 1; i < nums.length; i++) { seq = nums[i] === nums[i - 1] + 1 ? seq + 1 : 1; maxSeq = Math.max(maxSeq, seq); }
  let pen = 0;
  if (f && f.dp > 0) pen += Math.max(0, Math.abs(s - f.media) / f.dp - 1);
  pen += Math.max(0, Math.abs(pares - qtd / 2) - Math.max(1, qtd * 0.15));
  if (qtd <= 10) pen += Math.max(0, maxSeq - 2);
  if (qtd <= 10 && nums.every(n => n <= 31)) pen += 1;
  if (qtd <= 10 && nums.length >= 3) {
    // Progressão aritmética (ex.: 5-10-15-20) — padrão muito jogado
    const d = nums[1] - nums[0];
    if (nums.every((n, i) => i === 0 || n - nums[i - 1] === d)) pen += 2;
    // Mesmo final repetido (ex.: 3,13,23,33) e concentração numa só dezena
    const finais = new Map<number, number>(); const dez = new Map<number, number>();
    nums.forEach(n => { finais.set(n % 10, (finais.get(n % 10) ?? 0) + 1); dez.set(Math.floor(n / 10), (dez.get(Math.floor(n / 10)) ?? 0) + 1); });
    pen += Math.max(0, Math.max(...finais.values()) - 3) * 0.5;
    pen += Math.max(0, Math.max(...dez.values()) - Math.ceil(qtd / 2)) * 0.5;
  }
  return pen;
}
function melhorJogo(pesos: Map<number, number>, c: { qtd: number; min: number; max: number }, f?: Faixa): number[] {
  let melhor: number[] = []; let melhorPen = Infinity;
  for (let i = 0; i < 400; i++) {
    const j = amostrar(pesos, c.min, c.max, c.qtd);
    const p = equilibrado(j, f, c.qtd);
    if (p < melhorPen) { melhor = j; melhorPen = p; if (p === 0) break; }
  }
  return melhor;
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
    const faixas = new Map<string, Faixa>();
    for (const l of hoje) {
      const { data: hist } = await db.from("resultados_sorteios").select("dezenas").eq("loteria", l).order("concurso", { ascending: false }).limit(200);
      const p = new Map<number, number>();
      for (const h of hist ?? []) for (const n of (h as any).dezenas ?? []) p.set(n, (p.get(n) ?? 1) + 1);
      pesosCache.set(l, p);
      const somas = (hist ?? []).map((h: any) => ((h.dezenas ?? []) as number[]).reduce((a, b) => a + Number(b), 0)).filter((x: number) => x > 0);
      if (somas.length > 10) {
        const media = somas.reduce((a: number, b: number) => a + b, 0) / somas.length;
        const dp = Math.sqrt(somas.reduce((a: number, b: number) => a + (b - media) ** 2, 0) / somas.length);
        faixas.set(l, { media, dp });
      }
    }

    for (const ag of pendentes as any[]) {
      const enviadas: string[] = []; const ignoradas: string[] = []; const falhas: string[] = [];
      for (const l of hoje) {
        const { data: ja } = await db.from("envio_previsoes_log").select("id").eq("user_id", ag.user_id).eq("data_envio", t.ymd).eq("loteria", l).maybeSingle();
        if (ja) { ignoradas.push(l); continue; }
        const inicioDia = new Date(`${t.ymd}T03:00:00Z`).toISOString();
        const { data: jaPend } = await db.from("apostas_pendentes").select("id").eq("user_id", ag.user_id).eq("loteria", l).gte("horario_envio", inicioDia).limit(1);
        if (jaPend?.length) { ignoradas.push(l); continue; }
        const c = CFG[l];
        const numeros = l === "supersete"
          ? Array.from({ length: 7 }, () => Math.floor(Math.random() * 10))
          : melhorJogo(pesosCache.get(l) ?? new Map(), c, faixas.get(l));
        const { data: conc } = await db.from("proximo_concurso").select("concurso_atual, data_proxima").eq("loteria", l).maybeSingle();
        const { data: ins, error } = await db.from("apostas_pendentes").insert({
          user_id: ag.user_id, loteria: l, numeros, dominancia: 0, precisao: 0, status: "pendente",
          concurso: conc?.concurso_atual ?? null, data_sorteio_alvo: conc?.data_proxima ?? t.ymd,
          criterios_atendidos: [{ nome: "Origem", valor: "envio_agendado_servidor" }, { nome: "Estratégia", valor: "histórico + equilíbrio (soma, pares/ímpares, sequências)" }],
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
