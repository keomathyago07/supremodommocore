// ENGINE SCORE ULTRA V17 — TitanDommoCore
// Combina 20 tecnologias num score por número e gera jogo via algoritmo genético.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOT: Record<string, { max: number; k: number; min?: number }> = {
  megasena: { max: 60, k: 6 }, lotofacil: { max: 25, k: 15 }, quina: { max: 80, k: 5 },
  lotomania: { max: 100, k: 50 }, timemania: { max: 80, k: 7 }, duplasena: { max: 50, k: 6 },
  diadesorte: { max: 31, k: 7 }, supersete: { max: 9, k: 7, min: 0 }, maismilionaria: { max: 50, k: 6 },
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function rng(loteria: string): number[] {
  const c = LOT[loteria];
  const start = c.min ?? 1;
  return Array.from({ length: c.max - start + 1 }, (_, i) => start + i);
}

async function calcularScores(loteria: string): Promise<{ scores: Record<number, number>; comp: Record<number, any> }> {
  const nums = rng(loteria);
  const [ciclosRes, corrRes, regRes, accRes, histRes] = await Promise.all([
    supabase.from("ciclos_espectrais").select("*").eq("loteria", loteria),
    supabase.from("correlacoes_numeros").select("*").eq("loteria", loteria).gt("lift", 1.5).order("lift", { ascending: false }).limit(200),
    supabase.from("regimes_hmm").select("*").eq("loteria", loteria).order("detectado_em", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("previsao_acumulo").select("*").eq("loteria", loteria).order("criado_em", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("resultados_sorteios").select("dezenas").eq("loteria", loteria).order("concurso", { ascending: false }).limit(200),
  ]);

  const ciclo: Record<number, any> = {};
  (ciclosRes.data ?? []).forEach((c: any) => (ciclo[c.numero] = c));

  const liftAgg: Record<number, number> = {};
  nums.forEach((n) => (liftAgg[n] = 0));
  (corrRes.data ?? []).forEach((c: any) => {
    liftAgg[c.num_a] = (liftAgg[c.num_a] ?? 0) + c.lift;
    liftAgg[c.num_b] = (liftAgg[c.num_b] ?? 0) + c.lift;
  });
  const maxLift = Math.max(...Object.values(liftAgg), 1);

  const sorteios = (histRes.data ?? []).map((r: any) => r.dezenas as number[]);
  const freq: Record<number, number> = {};
  const ultimaSaida: Record<number, number> = {};
  nums.forEach((n) => { freq[n] = 0; ultimaSaida[n] = sorteios.length; });
  sorteios.forEach((s, idx) => s.forEach((n) => {
    freq[n] = (freq[n] ?? 0) + 1;
    if (idx < ultimaSaida[n]) ultimaSaida[n] = idx;
  }));
  const total = Math.max(sorteios.length, 1);
  const k = LOT[loteria].k;
  const atrasoCritico = (LOT[loteria].max / k) * 2;

  const regimeScores = (regRes.data?.numeros_scores ?? {}) as Record<string, number>;
  const estrategia = accRes.data?.estrategia ?? "neutro";

  // hot streak: contagem de sorteios consecutivos recentes em que o número saiu
  const hotStreak: Record<number, number> = {};
  nums.forEach((n) => {
    let s = 0;
    for (const sort of sorteios) {
      if (sort.includes(n)) s++;
      else break;
    }
    hotStreak[n] = s;
  });

  const scores: Record<number, number> = {};
  const comp: Record<number, any> = {};
  for (const n of nums) {
    const s_freq = Math.min(100, (freq[n] / total) * (LOT[loteria].max / k) * 100);
    const atraso = ultimaSaida[n];
    const s_atraso = Math.min(100, (atraso / atrasoCritico) * 70);
    const s_ciclo = Math.min(100, (ciclo[n]?.prob_proximo ?? 0.3) * 100);
    const s_regime = regimeScores[String(n)] ?? 50;
    const s_lift = ((liftAgg[n] ?? 0) / maxLift) * 100;
    const s_hot = Math.min(30, (hotStreak[n] ?? 0) * 5);
    let s_acc = 0;
    const alto = n > LOT[loteria].max * 0.5;
    if (estrategia === "numeros_impopulares" && alto) s_acc = 10;
    if (estrategia === "numeros_populares" && !alto) s_acc = 10;

    const final =
      s_freq * 0.15 + s_atraso * 0.25 + s_ciclo * 0.20 +
      s_regime * 0.20 + s_lift * 0.10 + s_hot * 0.05 + s_acc * 0.05;
    scores[n] = Math.round(final * 10) / 10;
    comp[n] = { freq: s_freq, atraso: s_atraso, ciclo: s_ciclo, regime: s_regime, lift: s_lift, hot: s_hot, acc: s_acc };
  }
  return { scores, comp };
}

function gerarJogoGenetico(loteria: string, scores: Record<number, number>): number[] {
  const c = LOT[loteria];
  const nums = rng(loteria);
  const k = c.k;

  function fitness(j: number[]): number {
    const base = j.reduce((a, n) => a + (scores[n] ?? 50), 0);
    const soma = j.reduce((a, b) => a + b, 0);
    const expectedSum = (c.max + (c.min ?? 1)) / 2 * k;
    const penaltySum = Math.abs(soma - expectedSum) / expectedSum * 20;
    const pares = j.filter((n) => n % 2 === 0).length;
    const ratio = pares / k;
    const penaltyParity = Math.abs(ratio - 0.5) > 0.4 ? 30 : 0;
    return base - penaltySum - penaltyParity;
  }

  function gerarRandom(): number[] {
    const sorted = [...nums].sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0));
    const top = sorted.slice(0, Math.max(k * 3, k + 5));
    const set = new Set<number>();
    while (set.size < k) set.add(top[Math.floor(Math.random() * top.length)]);
    return Array.from(set).sort((a, b) => a - b);
  }

  let pop = Array.from({ length: 60 }, gerarRandom);
  for (let gen = 0; gen < 40; gen++) {
    pop.sort((a, b) => fitness(b) - fitness(a));
    const elite = pop.slice(0, 15);
    const filhos: number[][] = [];
    while (filhos.length < 45) {
      const p1 = elite[Math.floor(Math.random() * elite.length)];
      const p2 = elite[Math.floor(Math.random() * elite.length)];
      const set = new Set<number>([...p1.slice(0, k / 2), ...p2.slice(k / 2)]);
      while (set.size < k) set.add(nums[Math.floor(Math.random() * nums.length)]);
      // mutação 10%
      if (Math.random() < 0.1) {
        const arr = Array.from(set);
        arr[Math.floor(Math.random() * arr.length)] = nums[Math.floor(Math.random() * nums.length)];
        filhos.push(Array.from(new Set(arr)).sort((a, b) => a - b));
      } else {
        filhos.push(Array.from(set).slice(0, k).sort((a, b) => a - b));
      }
    }
    pop = [...elite, ...filhos];
  }
  pop.sort((a, b) => fitness(b) - fitness(a));
  return pop[0];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const loteria: string = body.loteria ?? "megasena";
    if (!LOT[loteria]) throw new Error("Loteria inválida");

    const { scores, comp } = await calcularScores(loteria);
    const jogo = gerarJogoGenetico(loteria, scores);

    // persistir scores
    const rows = Object.entries(scores).map(([n, s]) => ({
      loteria, numero: Number(n), score: s, componentes: comp[Number(n)],
      atualizado: new Date().toISOString(),
    }));
    await supabase.from("scores_ultra").upsert(rows);

    return new Response(JSON.stringify({ ok: true, loteria, jogo, scores, top10: rows.sort((a, b) => b.score - a.score).slice(0, 10) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
