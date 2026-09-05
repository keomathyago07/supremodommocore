// ============================================================
// previsaoAgendada.ts — Envio programado das Previsões Inteligentes
// No horário definido pelo usuário (BRT), o motor histórico gera
// APENAS 1 jogo por loteria que sorteia no dia e envia direto para
// "Minhas Apostas" (apostas_pendentes) + notificação no app.
// Sincronia total: usa o mesmo pipeline de geração já configurado.
// ============================================================
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CONFIG_LOTERIAS, gerarJogoIAHistorico, type ApostaGerada } from "@/hooks/useGerarJogo";

export type LoteriaNome = keyof typeof CONFIG_LOTERIAS;

export interface AgendaPrevisao {
  ativo: boolean;
  horario: string;          // "HH:MM" BRT
  ultimaExecucao: string | null;
  ultimoResumo: string | null;
}

const LS = "dommo.previsao.agenda.v1";

const DEFAULT: AgendaPrevisao = {
  ativo: true,
  horario: "19:30",
  ultimaExecucao: null,
  ultimoResumo: null,
};

const listeners = new Set<(a: AgendaPrevisao) => void>();

function read(): AgendaPrevisao {
  try {
    const raw = localStorage.getItem(LS);
    return raw ? { ...DEFAULT, ...(JSON.parse(raw) as AgendaPrevisao) } : { ...DEFAULT };
  } catch { return { ...DEFAULT }; }
}

let state: AgendaPrevisao = typeof localStorage !== "undefined" ? read() : { ...DEFAULT };

function commit(next: Partial<AgendaPrevisao>) {
  state = { ...state, ...next };
  try { localStorage.setItem(LS, JSON.stringify(state)); } catch { /* quota */ }
  listeners.forEach(l => { try { l(state); } catch { /* noop */ } });
}

export const agendaPrevisao = {
  get: (): AgendaPrevisao => state,
  set: (patch: Partial<AgendaPrevisao>) => commit(patch),
  subscribe(fn: (a: AgendaPrevisao) => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
};

export function brtAgora(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
}

export function brtHoraMinuto(d = brtAgora()): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Loterias que sorteiam HOJE (BRT), conforme configuração interna. */
export function loteriasDeHoje(d = brtAgora()): LoteriaNome[] {
  const dow = d.getDay();
  return (Object.keys(CONFIG_LOTERIAS) as LoteriaNome[]).filter(
    l => (CONFIG_LOTERIAS[l].dias as number[]).includes(dow),
  );
}

async function jaEnviadaHoje(userId: string, loteria: string): Promise<boolean> {
  const hoje = brtAgora();
  const inicio = new Date(Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 3, 0, 0)); // 00h BRT
  const { data } = await supabase
    .from("apostas_pendentes")
    .select("id")
    .eq("user_id", userId)
    .eq("loteria", loteria)
    .gte("horario_envio", inicio.toISOString())
    .limit(1);
  return Boolean(data?.length);
}

async function enviarParaMinhasApostas(jogo: ApostaGerada): Promise<string | null> {
  const { data, error } = await supabase.rpc("inserir_aposta_ia", {
    p_loteria: jogo.loteria,
    p_numeros: jogo.numeros,
    p_dominancia: jogo.dominancia,
    p_precisao: jogo.precisao,
    p_criterios: JSON.stringify([
      { nome: "Origem", valor: "previsao_agendada" },
      { nome: "Dominância", valor: jogo.dominancia },
      { nome: "Precisão", valor: jogo.precisao },
      { nome: "Score", valor: jogo.scoreQualidade },
    ]),
    p_numeros_invertido: jogo.numerosInvertido ?? null,
    p_colunas_supersete: jogo.colunasSuperSete ?? null,
    p_mes_da_sorte: jogo.mesDaSorte ?? null,
    p_time_timemania: jogo.timeTimemania ?? null,
    p_trevos: jogo.trevos ?? null,
    p_tipo_jogo: jogo.tipoJogo,
    p_score_qualidade: jogo.scoreQualidade,
  } as never);
  if (error) return null;
  return data as string;
}

async function notificar(userId: string, titulo: string, corpo: string) {
  try {
    await supabase.from("notificacoes").insert({
      user_id: userId, tipo: "previsao_agendada", titulo, corpo,
      prioridade: "alta", emoji: "🔮", lido: false,
    } as never);
  } catch { /* nunca bloqueia */ }
}

export interface ResultadoEnvio {
  enviadas: string[];
  ignoradas: string[];
  falhas: string[];
  resumo: string;
}

/** Executa o envio programado (idempotente por loteria/dia). */
export async function executarEnvioProgramado(forcar = false): Promise<ResultadoEnvio> {
  const enviadas: string[] = []; const ignoradas: string[] = []; const falhas: string[] = [];
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { enviadas, ignoradas, falhas, resumo: "sem usuário autenticado" };

  for (const loteria of loteriasDeHoje()) {
    try {
      if (!forcar && await jaEnviadaHoje(user.id, loteria)) { ignoradas.push(loteria); continue; }
      const jogo = await gerarJogoIAHistorico(loteria);
      const id = await enviarParaMinhasApostas(jogo);
      if (id) enviadas.push(loteria); else falhas.push(loteria);
      await new Promise(r => setTimeout(r, 250));
    } catch { falhas.push(loteria); }
  }

  const nomes = enviadas.map(l => CONFIG_LOTERIAS[l as LoteriaNome].nome);
  const resumo = enviadas.length
    ? `${enviadas.length} jogo(s) enviado(s): ${nomes.join(", ")}${ignoradas.length ? ` · ${ignoradas.length} já enviada(s)` : ""}${falhas.length ? ` · ${falhas.length} falha(s)` : ""}`
    : ignoradas.length
      ? `Nenhum novo envio: ${ignoradas.length} loteria(s) já com jogo do dia.`
      : "Nenhuma loteria sorteia hoje.";

  commit({ ultimaExecucao: new Date().toISOString(), ultimoResumo: resumo });

  if (enviadas.length) {
    await notificar(
      user.id,
      "🔮 Previsões do dia enviadas",
      `${nomes.join(", ")} — 1 jogo por loteria disponível em Minhas Apostas.`,
    );
  }
  return { enviadas, ignoradas, falhas, resumo };
}

/** Loop 24/7 do envio programado (checa a cada 30s, executa uma vez por dia). */
export function useAgendadorPrevisoes() {
  const [agenda, setAgenda] = useState<AgendaPrevisao>(agendaPrevisao.get());
  const execRef = useRef("");

  useEffect(() => agendaPrevisao.subscribe(setAgenda), []);

  useEffect(() => {
    const tick = async () => {
      const a = agendaPrevisao.get();
      if (!a.ativo) return;
      const agora = brtAgora();
      const chave = `${agora.toISOString().slice(0, 10)}_${a.horario}`;
      if (brtHoraMinuto(agora) !== a.horario || execRef.current === chave) return;
      execRef.current = chave;
      await executarEnvioProgramado();
    };
    const it = setInterval(() => { void tick(); }, 30_000);
    void tick();
    return () => clearInterval(it);
  }, []);

  return agenda;
}
