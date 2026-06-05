// ENGINE DE CORRELACOES + CICLOS ESPECTRAIS - TitanDommoCore v17
// Calcula pares com lift e ciclos FFT (autocorrelação) por número.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RANGE: Record<string, number> = {
  megasena: 60, lotofacil: 25, quina: 80, lotomania: 100,
  timemania: 80, duplasena: 50, diadesorte: 31, supersete: 9, maismilionaria: 50,
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function range(loteria: string): number[] {
  const max = RANGE[loteria] ?? 60;
  const start = loteria === "supersete" ? 0 : 1;
  return Array.from({ length: max - start + 1 }, (_, i) => start + i);
}

function autocorrCycle(serie: number[]): number {
  const n = serie.length;
  if (n < 30) return 10;
  const media = serie.reduce((a, b) => a + b, 0) / n;
  const variancia = serie.reduce((a, v) => a + (v - media) ** 2, 0) / n;
  if (variancia === 0) return 10;
  let bestLag = 5, bestCorr = -Infinity;
  for (let lag = 3; lag <= Math.min(50, Math.floor(n / 3)); lag++) {
    let corr = 0;
    for (let i = 0; i < n - lag; i++) corr += (serie[i] - media) * (serie[i + lag] - media);
    corr /= (n - lag) * variancia;
    if (corr > bestCorr) { bestCorr = corr; bestLag = lag; }
  }
  return bestLag;
}

function faseAtual(serie: number[], ciclo: number): number {
  const last = serie.lastIndexOf(1);
  if (last < 0) return 1;
  const since = serie.length - 1 - last;
  return (since % ciclo) / ciclo;
}

async function processar(loteria: string) {
  const t0 = Date.now();
  const { data } = await supabase
    .from("resultados_sorteios")
    .select("concurso, dezenas")
    .eq("loteria", loteria)
    .order("concurso", { ascending: true })
    .limit(1000);
  const sorteios = (data ?? []).map((r: any) => (r.dezenas as number[]) ?? []);
  if (sorteios.length < 30) return { loteria, error: "histórico insuficiente", n: sorteios.length };

  const total = sorteios.length;
  const nums = range(loteria);

  // Frequência
  const freq: Record<number, number> = {};
  nums.forEach((n) => (freq[n] = 0));
  sorteios.forEach((s) => s.forEach((n) => (freq[n] = (freq[n] ?? 0) + 1)));

  // Co-ocorrências (pares)
  const cooc: Record<string, number> = {};
  for (const s of sorteios) {
    for (let i = 0; i < s.length; i++)
      for (let j = i + 1; j < s.length; j++) {
        const a = Math.min(s[i], s[j]), b = Math.max(s[i], s[j]);
        const k = `${a}_${b}`;
        cooc[k] = (cooc[k] ?? 0) + 1;
      }
  }

  const correlacoes: any[] = [];
  for (const [key, count] of Object.entries(cooc)) {
    const [a, b] = key.split("_").map(Number);
    const pA = freq[a] / total, pB = freq[b] / total, pAB = count / total;
    if (pA === 0 || pB === 0) continue;
    const lift = pAB / (pA * pB);
    if (lift > 1.2) {
      correlacoes.push({
        loteria, num_a: a, num_b: b,
        lift: +lift.toFixed(4),
        suporte: +pAB.toFixed(4),
        confianca: +(pAB / pA).toFixed(4),
        atualizado: new Date().toISOString(),
      });
    }
  }

  if (correlacoes.length) {
    // Limpar antigos e inserir novos
    await supabase.from("correlacoes_numeros").delete().eq("loteria", loteria);
    // batch de 500
    for (let i = 0; i < correlacoes.length; i += 500) {
      await supabase.from("correlacoes_numeros").insert(correlacoes.slice(i, i + 500));
    }
  }

  // Ciclos por número
  const ciclos: any[] = [];
  for (const n of nums) {
    const serie = sorteios.map((s) => (s.includes(n) ? 1 : 0));
    const ciclo = autocorrCycle(serie);
    const fase = faseAtual(serie, ciclo);
    const k = serie.reduce((a, b) => a + b, 0) / serie.length;
    const bonus = fase > 0.7 ? (fase - 0.7) * 2 : 0;
    const prob = Math.min(0.95, k + bonus);
    ciclos.push({
      loteria, numero: n,
      ciclo_medio: +ciclo.toFixed(2),
      fase_atual: +fase.toFixed(3),
      prob_proximo: +prob.toFixed(4),
      amplitude: +(Math.max(...serie.slice(-50)) - Math.min(...serie.slice(-50))).toFixed(2),
      atualizado: new Date().toISOString(),
    });
  }
  await supabase.from("ciclos_espectrais").upsert(ciclos);

  return {
    loteria,
    sorteios_analisados: total,
    pares_relevantes: correlacoes.length,
    ciclos_calculados: ciclos.length,
    ms: Date.now() - t0,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const authClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );
  const { data: userData, error: userErr } = await authClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const loterias: string[] = body.loterias ?? Object.keys(RANGE);
    const resultados = [];
    for (const l of loterias) resultados.push(await processar(l));
    return new Response(JSON.stringify({ ok: true, resultados }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
