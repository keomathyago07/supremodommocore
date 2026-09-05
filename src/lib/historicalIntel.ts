// ============================================================
// historicalIntel.ts — CRUZAMENTO HISTÓRICO ULTRA (banco + API)
// Lê os sorteios persistidos em public.resultados_sorteios e produz
// inteligência estatística por loteria: frequência, atraso, momentum,
// ciclos, correlações e um score final por número (0–1).
// Usado pelo motor de previsão (useGerarJogo) e pela tela /previsoes.
// ============================================================

import { supabase } from "@/integrations/supabase/client";

export type LoteriaSlug =
  | "megasena" | "quina" | "lotofacil" | "lotomania"
  | "timemania" | "duplasena" | "diadesorte"
  | "supersete" | "maismilionaria";

export const UNIVERSO: Record<LoteriaSlug, { min: number; max: number; qtd: number }> = {
  megasena: { min: 1, max: 60, qtd: 6 },
  quina: { min: 1, max: 80, qtd: 5 },
  lotofacil: { min: 1, max: 25, qtd: 15 },
  lotomania: { min: 0, max: 99, qtd: 50 },
  timemania: { min: 1, max: 80, qtd: 10 },
  duplasena: { min: 1, max: 50, qtd: 6 },
  diadesorte: { min: 1, max: 31, qtd: 7 },
  supersete: { min: 0, max: 9, qtd: 7 },
  maismilionaria: { min: 1, max: 50, qtd: 6 },
};

export interface NumeroIntel {
  numero: number;
  freq: number;        // aparições
  freqRel: number;     // 0–1 (aparições / sorteios)
  atraso: number;      // concursos desde a última aparição
  momentum: number;    // freq recente(20) − freq global, normalizado
  ciclo: number;       // atraso / ciclo médio esperado
  score: number;       // 0–1 blend ultra
}

export interface TendenciaPonto {
  concurso: number;
  data: string;
  soma: number;
  pares: number;
  impares: number;
  primos: number;
  mediaAtraso: number;
}

export interface LotteryIntel {
  loteria: LoteriaSlug;
  amostras: number;
  ultimoConcurso: number;
  ultimaData: string;
  numeros: NumeroIntel[];
  quentes: NumeroIntel[];
  frios: NumeroIntel[];
  tendencia: TendenciaPonto[];
  paresTop: { par: string; lift: number }[];
  indicePrevisibilidade: number; // 0–100
  confiabilidadeDados: number;   // 0–100 (cobertura histórica)
  atualizadoEm: string;
}

const PRIMOS = new Set([2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61,67,71,73,79,83,89,97]);
const CACHE = new Map<string, { at: number; intel: LotteryIntel }>();
const TTL_MS = 5 * 60 * 1000;

interface DrawRow { concurso: number; dezenas: number[]; data_apuracao: string | null }

/** Carrega sorteios do banco (fonte primária de cruzamento histórico). */
export async function carregarHistorico(loteria: LoteriaSlug, limite = 400): Promise<DrawRow[]> {
  const { data, error } = await supabase
    .from("resultados_sorteios")
    .select("concurso, dezenas, data_apuracao")
    .eq("loteria", loteria)
    .order("concurso", { ascending: false })
    .limit(limite);
  if (error || !data) return [];
  return (data as DrawRow[])
    .filter((d) => Array.isArray(d.dezenas) && d.dezenas.length > 0)
    .sort((a, b) => a.concurso - b.concurso); // ordem cronológica
}

function media(a: number[]): number {
  return a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
}
function desvio(a: number[]): number {
  if (!a.length) return 0;
  const m = media(a);
  return Math.sqrt(media(a.map((x) => (x - m) ** 2)));
}
function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Constrói a inteligência histórica cruzada de uma loteria. */
export function computarIntel(loteria: LoteriaSlug, draws: DrawRow[]): LotteryIntel {
  const u = UNIVERSO[loteria];
  const total = draws.length;
  const universo: number[] = [];
  for (let n = u.min; n <= u.max; n++) universo.push(n);

  const freq = new Map<number, number>();
  const ultimaPos = new Map<number, number>();
  draws.forEach((d, idx) => {
    for (const n of d.dezenas) {
      freq.set(n, (freq.get(n) ?? 0) + 1);
      ultimaPos.set(n, idx);
    }
  });

  const recentes = draws.slice(-20);
  const freqRecente = new Map<number, number>();
  for (const d of recentes) for (const n of d.dezenas) freqRecente.set(n, (freqRecente.get(n) ?? 0) + 1);

  // ciclo médio esperado = universo / dezenas por sorteio
  const cicloEsperado = Math.max(1, (u.max - u.min + 1) / Math.max(1, u.qtd));

  const numeros: NumeroIntel[] = universo.map((numero) => {
    const f = freq.get(numero) ?? 0;
    const freqRel = total ? f / total : 0;
    const pos = ultimaPos.get(numero);
    const atraso = pos === undefined ? total : total - 1 - pos;
    const fr = (freqRecente.get(numero) ?? 0) / Math.max(1, recentes.length);
    const momentum = clamp01(0.5 + (fr - freqRel) * 2);
    const ciclo = atraso / cicloEsperado;

    // Blend ULTRA: frequência histórica + atraso maduro + momentum + fase de ciclo
    const fFreq = clamp01(freqRel * (cicloEsperado / 1)); // normaliza p/ ~0..1
    const fAtraso = clamp01(ciclo / 2.2);                  // maturidade do atraso
    const fCiclo = clamp01(1 - Math.abs(ciclo - 1) / 2);   // proximidade da fase ideal
    const score = clamp01(
      fFreq * 0.30 + fAtraso * 0.26 + momentum * 0.22 + fCiclo * 0.22,
    );
    return { numero, freq: f, freqRel, atraso, momentum, ciclo, score };
  });

  const ordenados = [...numeros].sort((a, b) => b.score - a.score);

  const tendencia: TendenciaPonto[] = draws.slice(-60).map((d) => {
    const pares = d.dezenas.filter((n) => n % 2 === 0).length;
    const atrasos = d.dezenas.map((n) => numeros.find((x) => x.numero === n)?.atraso ?? 0);
    return {
      concurso: d.concurso,
      data: d.data_apuracao ?? "",
      soma: d.dezenas.reduce((s, n) => s + n, 0),
      pares,
      impares: d.dezenas.length - pares,
      primos: d.dezenas.filter((n) => PRIMOS.has(n)).length,
      mediaAtraso: Number(media(atrasos).toFixed(1)),
    };
  });

  // Correlações (pares que saem juntos acima do esperado)
  const parCount = new Map<string, number>();
  for (const d of draws.slice(-150)) {
    const ns = [...d.dezenas].sort((a, b) => a - b).slice(0, 20);
    for (let i = 0; i < ns.length; i++) {
      for (let j = i + 1; j < ns.length; j++) parCount.set(`${ns[i]}-${ns[j]}`, (parCount.get(`${ns[i]}-${ns[j]}`) ?? 0) + 1);
    }
  }
  const baseEsperado = Math.max(1, (u.qtd / (u.max - u.min + 1)) ** 2 * Math.min(150, total));
  const paresTop = [...parCount.entries()]
    .map(([par, c]) => ({ par, lift: Number((c / baseEsperado).toFixed(2)) }))
    .sort((a, b) => b.lift - a.lift)
    .slice(0, 8);

  // Índice de previsibilidade: dispersão da frequência vs uniforme (quanto mais desvio, mais sinal)
  const rels = numeros.map((n) => n.freqRel);
  const uniforme = u.qtd / (u.max - u.min + 1);
  const sinal = uniforme > 0 ? desvio(rels) / uniforme : 0;
  const indicePrevisibilidade = Number(Math.min(100, sinal * 100 * 1.8).toFixed(1));
  const confiabilidadeDados = Number(Math.min(100, (total / 200) * 100).toFixed(1));

  const ultimo = draws[draws.length - 1];
  return {
    loteria,
    amostras: total,
    ultimoConcurso: ultimo?.concurso ?? 0,
    ultimaData: ultimo?.data_apuracao ?? "",
    numeros,
    quentes: ordenados.slice(0, 12),
    frios: [...numeros].sort((a, b) => b.atraso - a.atraso).slice(0, 12),
    tendencia,
    paresTop,
    indicePrevisibilidade,
    confiabilidadeDados,
    atualizadoEm: new Date().toISOString(),
  };
}

/** Intel com cache de 5 min (banco de sorteios persistido). */
export async function getIntel(loteria: LoteriaSlug, limite = 400): Promise<LotteryIntel | null> {
  const key = `${loteria}:${limite}`;
  const hit = CACHE.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.intel;
  const draws = await carregarHistorico(loteria, limite);
  if (!draws.length) return null;
  const intel = computarIntel(loteria, draws);
  CACHE.set(key, { at: Date.now(), intel });
  return intel;
}

/** Pesos por número (0–1) prontos para amostragem ponderada no motor. */
export async function getPesosHistoricos(loteria: LoteriaSlug): Promise<Map<number, number>> {
  const intel = await getIntel(loteria);
  const pesos = new Map<number, number>();
  if (!intel) return pesos;
  for (const n of intel.numeros) pesos.set(n.numero, 0.05 + n.score);
  return pesos;
}

/** Ranking de loterias por sinal histórico (previsibilidade × cobertura de dados). */
export async function rankLoterias(): Promise<LotteryIntel[]> {
  const slugs = Object.keys(UNIVERSO) as LoteriaSlug[];
  const all = await Promise.all(slugs.map((s) => getIntel(s, 300).catch(() => null)));
  return (all.filter(Boolean) as LotteryIntel[]).sort(
    (a, b) =>
      b.indicePrevisibilidade * (b.confiabilidadeDados / 100) -
      a.indicePrevisibilidade * (a.confiabilidadeDados / 100),
  );
}

/** Amostragem ponderada sem reposição usando os pesos históricos. */
export function amostrarPonderado(
  pesos: Map<number, number>,
  min: number,
  max: number,
  qtd: number,
): number[] {
  const pool: { n: number; w: number }[] = [];
  for (let n = min; n <= max; n++) pool.push({ n, w: pesos.get(n) ?? 0.5 });
  const out: number[] = [];
  while (out.length < qtd && pool.length) {
    const total = pool.reduce((s, p) => s + p.w, 0);
    let r = Math.random() * total;
    let idx = pool.length - 1;
    for (let i = 0; i < pool.length; i++) {
      r -= pool[i].w;
      if (r <= 0) { idx = i; break; }
    }
    out.push(pool[idx].n);
    pool.splice(idx, 1);
  }
  return out.sort((a, b) => a - b);
}

// ============================================================
// Desvio previsão × concurso real (backtest walk-forward)
// Reconstrói a previsão histórica usando só os sorteios ANTERIORES
// a cada concurso e compara com as dezenas realmente sorteadas.
// ============================================================
export interface DesvioConcurso {
  concurso: number;
  data: string;
  previsto: number[];
  real: number[];
  acertos: number;
  esperadoAleatorio: number;   // acertos esperados por sorte
  desvio: number;              // acertos - esperado (ganho do motor)
  desvioMedioPosicional: number; // distância média entre previsto/real ordenados
  hitRate: number;             // acertos / dezenas do sorteio (%)
}

export interface DesvioResumo {
  loteria: LoteriaSlug;
  concursos: DesvioConcurso[];
  mediaAcertos: number;
  mediaEsperado: number;
  ganhoMedio: number;          // média do desvio
  melhor: DesvioConcurso | null;
  pior: DesvioConcurso | null;
  aderencia: number;           // 0..100 — quanto o motor supera o aleatório
}

/** Previsão determinística (top-N por score) a partir de um histórico parcial. */
function preverTopN(loteria: LoteriaSlug, draws: DrawRow[]): number[] {
  const intel = computarIntel(loteria, draws);
  const u = UNIVERSO[loteria];
  return [...intel.numeros]
    .sort((a, b) => b.score - a.score)
    .slice(0, u.qtd)
    .map((n) => n.numero)
    .sort((a, b) => a - b);
}

export async function calcularDesvioPrevisao(
  loteria: LoteriaSlug,
  janela = 12,
  limite = 400,
): Promise<DesvioResumo | null> {
  const draws = await carregarHistorico(loteria, limite);
  if (draws.length < 40) return null;
  const u = UNIVERSO[loteria];
  const universoTam = u.max - u.min + 1;

  const concursos: DesvioConcurso[] = [];
  const inicio = Math.max(30, draws.length - janela);
  for (let i = inicio; i < draws.length; i++) {
    const passado = draws.slice(0, i);
    const alvo = draws[i];
    const previsto = preverTopN(loteria, passado);
    const set = new Set(alvo.dezenas);
    const acertos = previsto.filter((n) => set.has(n)).length;
    const esperadoAleatorio = Number(((previsto.length * alvo.dezenas.length) / universoTam).toFixed(2));
    const realOrd = [...alvo.dezenas].sort((a, b) => a - b);
    const pares = Math.min(previsto.length, realOrd.length);
    const desvioMedioPosicional = pares
      ? Number((previsto.slice(0, pares).reduce((s, n, k) => s + Math.abs(n - realOrd[k]), 0) / pares).toFixed(2))
      : 0;
    concursos.push({
      concurso: alvo.concurso,
      data: alvo.data_apuracao ?? "",
      previsto,
      real: realOrd,
      acertos,
      esperadoAleatorio,
      desvio: Number((acertos - esperadoAleatorio).toFixed(2)),
      desvioMedioPosicional,
      hitRate: Number(((acertos / Math.max(1, alvo.dezenas.length)) * 100).toFixed(1)),
    });
  }

  const mediaAcertos = media(concursos.map((c) => c.acertos));
  const mediaEsperado = media(concursos.map((c) => c.esperadoAleatorio));
  const ganhoMedio = mediaAcertos - mediaEsperado;
  const ordenado = [...concursos].sort((a, b) => b.desvio - a.desvio);
  return {
    loteria,
    concursos,
    mediaAcertos: Number(mediaAcertos.toFixed(2)),
    mediaEsperado: Number(mediaEsperado.toFixed(2)),
    ganhoMedio: Number(ganhoMedio.toFixed(2)),
    melhor: ordenado[0] ?? null,
    pior: ordenado[ordenado.length - 1] ?? null,
    aderencia: Number(Math.max(0, Math.min(100, mediaEsperado > 0 ? (mediaAcertos / mediaEsperado) * 50 : 0)).toFixed(1)),
  };
}
