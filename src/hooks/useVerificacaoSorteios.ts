import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { dentroDaJanelaOficial } from "@/titan/conference";

/** Data de hoje em BRT no formato dd/mm/yyyy (padrão da Caixa). */
function hojeBRT(): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

/** Normaliza qualquer formato de data da API para dd/mm/yyyy BRT. */
function normalizarData(raw?: string): string {
  if (!raw) return "";
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(d);
}

/** Imposto de renda retido (30%) — valor líquido a receber. */
const TAXA_IR = 0.3;

const SLUG_LOTERIA: Record<string, string> = {
  Quina: "quina",
  Lotomania: "lotomania",
  "Lotofácil": "lotofacil",
  "Super Sete": "supersete",
  "Dupla Sena": "duplasena",
  Megasena: "megasena",
  "Dia de Sorte": "diadesorte",
  Timemania: "timemania",
  "+Milionária": "maismilionaria",
};

const MIN_ACERTOS_FINANCEIRO: Record<string, number> = {
  Quina: 2,
  Lotomania: 15,
  "Lotofácil": 11,
  "Super Sete": 3,
  "Dupla Sena": 3,
  Megasena: 4,
  "Dia de Sorte": 4,
  Timemania: 3,
  "+Milionária": 2,
};

interface ResultadoCaixa {
  numero: number;
  dezenas: string[];
  dataApuracao: string;
  acumulado: boolean;
  premiacao?: { descricao: string; faixa: number; winners: number; valorPremio: number }[];
}

interface ApostaConfirmada {
  id: string;
  user_id: string;
  loteria: string;
  numeros: number[];
  concurso: number | null;
  status_verificacao: string;
  pontos_acertados: number | null;
  valor_premio: number | null;
}

async function buscarResultadoCaixa(loteria: string, concurso?: number): Promise<ResultadoCaixa | null> {
  const slug = SLUG_LOTERIA[loteria];
  if (!slug) return null;

  const endpoint = concurso
    ? `https://servicebus2.caixa.gov.br/portaldeloterias/api/${slug}/${concurso}`
    : `https://servicebus2.caixa.gov.br/portaldeloterias/api/${slug}/`;

  try {
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    try {
      const fb = await fetch(`https://api.guidi.dev.br/loteria/${slug}/ultimo`);
      if (!fb.ok) return null;
      return await fb.json();
    } catch {
      return null;
    }
  }
}

function contarAcertos(numerosAposta: number[], numerosSorteio: number[]): number {
  const setSorteio = new Set(numerosSorteio.map(Number));
  return numerosAposta.filter((n) => setSorteio.has(n)).length;
}

function calcularPremio(
  loteria: string,
  acertos: number,
  premiacao?: ResultadoCaixa["premiacao"]
): { descricao: string; valor: number } | null {
  if (!premiacao) return null;
  const faixas: Record<string, Record<number, number>> = {
    Quina: { 5: 0, 4: 1, 3: 2, 2: 3 },
    Lotomania: { 20: 0, 19: 1, 18: 2, 17: 3, 16: 4, 15: 5, 0: 6 },
    "Lotofácil": { 15: 0, 14: 1, 13: 2, 12: 3, 11: 4 },
    "Super Sete": { 7: 0, 6: 1, 5: 2, 4: 3, 3: 4 },
    "Dupla Sena": { 6: 0, 5: 1, 4: 2, 3: 3 },
    Megasena: { 6: 0, 5: 1, 4: 2 },
    "Dia de Sorte": { 7: 0, 6: 1, 5: 2, 4: 3 },
    Timemania: { 7: 0, 6: 1, 5: 2, 4: 3, 3: 4 },
    "+Milionária": { 6: 0, 5: 1, 4: 2, 3: 3, 2: 4 },
  };
  const idx = faixas[loteria]?.[acertos];
  if (idx === undefined) return null;
  const p = premiacao[idx];
  if (!p || p.valorPremio === 0) return null;
  return { descricao: p.descricao, valor: p.valorPremio };
}

async function verificarAposta(
  aposta: ApostaConfirmada,
  qc: ReturnType<typeof useQueryClient>
): Promise<void> {
  const resultado = await buscarResultadoCaixa(aposta.loteria, aposta.concurso ?? undefined);
  if (!resultado || !resultado.dezenas?.length) return;

  // IAS Guard: confere SOMENTE com o sorteio do dia corrente (BRT).
  // Resultado antigo => permanece aguardando_sorteio, nunca conferido com concurso anterior.
  const dataResultado = normalizarData(resultado.dataApuracao);
  if (dataResultado !== hojeBRT()) {
    console.info(`[conferencia] ${aposta.loteria}: resultado ${dataResultado} não é do dia (${hojeBRT()}) — aguardando oficial`);
    return;
  }

  const dezenas = resultado.dezenas.map(Number);
  const acertos = contarAcertos(aposta.numeros, dezenas);
  const minAcertos = MIN_ACERTOS_FINANCEIRO[aposta.loteria] ?? 3;
  const premioParcial = calcularPremio(aposta.loteria, acertos, resultado.premiacao);
  const valorPremio = premioParcial?.valor ?? 0;

  await supabase
    .from("apostas_confirmadas" as any)
    .update({
      status_verificacao: "verificada",
      pontos_acertados: acertos,
      valor_premio: valorPremio,
      numeros_sorteados: dezenas,
      concurso_verificado: resultado.numero,
      data_sorteio: resultado.dataApuracao,
      descricao_faixa: premioParcial?.descricao ?? null,
    })
    .eq("id", aposta.id);

  const liquido = valorPremio * (1 - TAXA_IR);
  const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  if (acertos >= minAcertos && valorPremio > 0) {
    await supabase.from("financeiro_premiacoes" as any).insert({
      user_id: aposta.user_id,
      aposta_confirmada_id: aposta.id,
      loteria: aposta.loteria,
      concurso: resultado.numero,
      numeros_apostados: aposta.numeros,
      numeros_sorteados: dezenas,
      acertos,
      descricao_faixa: premioParcial?.descricao,
      valor_bruto: valorPremio,
      valor_liquido: valorPremio * 0.7,
      data_lancamento: new Date().toISOString(),
      status_pagamento: "a_receber",
    });

    toast.success(`🏆 PREMIADO — ${aposta.loteria}`, {
      description:
        `Concurso #${resultado.numero} · ${dataResultado}\n` +
        `Pontos: ${acertos}/${aposta.numeros.length} — ${premioParcial?.descricao}\n` +
        `Dezenas sorteadas: ${dezenas.join(" · ")}\n` +
        `Bruto: ${brl(valorPremio)} · IR 30%: ${brl(valorPremio - liquido)} · Líquido: ${brl(liquido)}`,
      duration: 15000,
    });
  } else {
    toast.info(`📊 ${aposta.loteria} conferida`, {
      description:
        `Concurso #${resultado.numero} · ${dataResultado}\n` +
        `Pontos: ${acertos}/${aposta.numeros.length} — sem faixa premiada\n` +
        `Dezenas sorteadas: ${dezenas.join(" · ")}`,
      duration: 9000,
    });
  }

  qc.invalidateQueries({ queryKey: ["apostas-confirmadas"] });
  qc.invalidateQueries({ queryKey: ["financeiro-premiacoes"] });
}

export function useVerificacaoSorteios() {
  const qc = useQueryClient();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Janela oficial institucional: Seg–Sáb após 21:00 BRT, Domingo após 11:00 BRT.
  const eHorarioSorteio = useCallback((): boolean => dentroDaJanelaOficial(), []);

  const executarVerificacao = useCallback(async () => {
    if (!eHorarioSorteio()) return;

    const { data: apostas, error } = await supabase
      .from("apostas_confirmadas" as any)
      .select("*")
      .eq("status_verificacao", "aguardando_sorteio");

    if (error || !apostas || apostas.length === 0) return;

    for (const aposta of apostas) {
      await verificarAposta(aposta as unknown as ApostaConfirmada, qc);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }, [eHorarioSorteio, qc]);

  useEffect(() => {
    executarVerificacao();
    timerRef.current = setInterval(executarVerificacao, 5 * 60 * 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [executarVerificacao]);
}

export async function verificarAgoraManual(
  qc: ReturnType<typeof useQueryClient>
): Promise<void> {
  const { data: apostas } = await supabase
    .from("apostas_confirmadas" as any)
    .select("*")
    .eq("status_verificacao", "aguardando_sorteio");

  if (!apostas || apostas.length === 0) {
    toast.info("Nenhuma aposta aguardando verificação.");
    return;
  }

  toast.info(`Verificando ${apostas.length} aposta(s)...`);
  for (const aposta of apostas) {
    await verificarAposta(aposta as unknown as ApostaConfirmada, qc);
    await new Promise((r) => setTimeout(r, 2000));
  }
}
