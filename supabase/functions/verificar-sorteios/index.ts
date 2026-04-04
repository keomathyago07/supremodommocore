import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SLUG_LOTERIA: Record<string, string> = {
  Quina: "quina", Lotomania: "lotomania", "Lotofácil": "lotofacil",
  "Super Sete": "supersete", "Dupla Sena": "duplasena", Megasena: "megasena",
  "Dia de Sorte": "diadesorte", Timemania: "timemania", "+Milionária": "maismilionaria",
};

const MIN_ACERTOS: Record<string, number> = {
  Quina: 2, Lotomania: 15, "Lotofácil": 11, "Super Sete": 3,
  "Dupla Sena": 3, Megasena: 4, "Dia de Sorte": 4, Timemania: 3, "+Milionária": 2,
};

interface ResultadoCaixa {
  numero: number;
  dezenas: string[];
  dataApuracao: string;
  premiacao?: { descricao: string; faixa: number; winners: number; valorPremio: number }[];
}

async function buscarResultado(loteria: string): Promise<ResultadoCaixa | null> {
  const slug = SLUG_LOTERIA[loteria];
  if (!slug) return null;
  try {
    const res = await fetch(`https://servicebus2.caixa.gov.br/portaldeloterias/api/${slug}/`, { headers: { "Accept": "application/json" } });
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    try {
      const fb = await fetch(`https://api.guidi.dev.br/loteria/${slug}/ultimo`);
      if (!fb.ok) return null;
      return await fb.json();
    } catch { return null; }
  }
}

function contarAcertos(apostados: number[], sorteados: number[]): number {
  const s = new Set(sorteados.map(Number));
  return apostados.filter((n) => s.has(n)).length;
}

function premioFaixa(loteria: string, acertos: number, premiacao?: ResultadoCaixa["premiacao"]): { descricao: string; valor: number } | null {
  if (!premiacao) return null;
  const mapa: Record<string, Record<number, number>> = {
    Quina: { 5: 0, 4: 1, 3: 2, 2: 3 }, Lotomania: { 20: 0, 19: 1, 18: 2, 17: 3, 16: 4, 15: 5, 0: 6 },
    "Lotofácil": { 15: 0, 14: 1, 13: 2, 12: 3, 11: 4 }, "Super Sete": { 7: 0, 6: 1, 5: 2, 4: 3, 3: 4 },
    "Dupla Sena": { 6: 0, 5: 1, 4: 2, 3: 3 }, Megasena: { 6: 0, 5: 1, 4: 2 },
    "Dia de Sorte": { 7: 0, 6: 1, 5: 2, 4: 3 }, Timemania: { 7: 0, 6: 1, 5: 2, 4: 3, 3: 4 },
    "+Milionária": { 6: 0, 5: 1, 4: 2, 3: 3, 2: 4 },
  };
  const idx = mapa[loteria]?.[acertos];
  if (idx === undefined) return null;
  const p = premiacao[idx];
  if (!p || p.valorPremio === 0) return null;
  return { descricao: p.descricao, valor: p.valorPremio };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const brasilia = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const hora = brasilia.getHours();
  const forcado = new URL(req.url).searchParams.get("force") === "1";

  if (!forcado && (hora < 21 || hora > 23)) {
    return new Response(JSON.stringify({ msg: "Fora do horário (21h–23h59 BRT)" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const { data: apostas, error } = await supabase.from("apostas_confirmadas").select("*").eq("status_verificacao", "aguardando_sorteio");

  if (error) return new Response(JSON.stringify({ erro: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const resultados: object[] = [];
  for (const aposta of apostas ?? []) {
    const resultado = await buscarResultado(aposta.loteria);
    if (!resultado?.dezenas?.length) { resultados.push({ id: aposta.id, loteria: aposta.loteria, status: "sem_resultado" }); continue; }

    const dezenas = resultado.dezenas.map(Number);
    const acertos = contarAcertos(aposta.numeros, dezenas);
    const min = MIN_ACERTOS[aposta.loteria] ?? 3;
    const premio = premioFaixa(aposta.loteria, acertos, resultado.premiacao);

    await supabase.from("apostas_confirmadas").update({
      status_verificacao: "verificada", pontos_acertados: acertos, valor_premio: premio?.valor ?? 0,
      numeros_sorteados: dezenas, concurso_verificado: resultado.numero, data_sorteio: resultado.dataApuracao,
      descricao_faixa: premio?.descricao ?? null,
    }).eq("id", aposta.id);

    await supabase.from("resultados_sorteios").upsert({
      loteria: aposta.loteria, concurso: resultado.numero, dezenas,
      data_apuracao: resultado.dataApuracao, raw_response: resultado,
    }, { onConflict: "loteria,concurso" });

    if (acertos >= min && (premio?.valor ?? 0) > 0) {
      await supabase.from("financeiro_premiacoes").insert({
        user_id: aposta.user_id, aposta_confirmada_id: aposta.id, loteria: aposta.loteria,
        concurso: resultado.numero, numeros_apostados: aposta.numeros, numeros_sorteados: dezenas,
        acertos, descricao_faixa: premio?.descricao, valor_bruto: premio!.valor,
        valor_liquido: premio!.valor * 0.7, status_pagamento: "a_receber",
      });
    }

    resultados.push({ id: aposta.id, loteria: aposta.loteria, concurso: resultado.numero, acertos, status: "verificada" });
    await new Promise((r) => setTimeout(r, 1500));
  }

  return new Response(JSON.stringify({ total: resultados.length, resultados }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
