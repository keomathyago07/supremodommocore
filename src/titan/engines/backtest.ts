// ============================================================
// backtest.ts — Backtest ultra avançado dos algoritmos Titan
// Métricas: hit rate, precisão, ROI, Brier, intervalo de confiança
// Ranking por nível de risco/garantia. Persistência no banco.
// ============================================================

import { supabase } from "@/integrations/supabase/client";

export type LoteriaKey =
  | "megasena" | "lotofacil" | "quina" | "lotomania"
  | "timemania" | "duplasena" | "diadesorte" | "supersete" | "maismilionaria";

export const LOTERIA_CONFIG: Record<LoteriaKey, { pick: number; pool: number; ticket: number; prizes: Record<number, number> }> = {
  megasena:      { pick: 6,  pool: 60, ticket: 5.00,  prizes: { 6: 50_000_000, 5: 80_000,  4: 1_500 } },
  lotofacil:     { pick: 15, pool: 25, ticket: 3.00,  prizes: { 15: 2_000_000, 14: 2_500,  13: 30, 12: 12, 11: 6 } },
  quina:         { pick: 5,  pool: 80, ticket: 2.50,  prizes: { 5: 8_000_000,  4: 8_000,   3: 130, 2: 5 } },
  lotomania:     { pick: 50, pool: 100,ticket: 3.00,  prizes: { 20: 3_000_000, 19: 30_000, 18: 1_500, 17: 50, 16: 8, 0: 2_000_000 } },
  timemania:     { pick: 10, pool: 80, ticket: 3.50,  prizes: { 7: 6_000_000,  6: 30_000,  5: 1_500, 4: 9, 3: 3 } },
  duplasena:     { pick: 6,  pool: 50, ticket: 3.00,  prizes: { 6: 3_000_000,  5: 3_000,   4: 90, 3: 3 } },
  diadesorte:    { pick: 7,  pool: 31, ticket: 2.50,  prizes: { 7: 800_000,    6: 2_500,   5: 30, 4: 4 } },
  supersete:     { pick: 7,  pool: 10, ticket: 2.50,  prizes: { 7: 1_500_000,  6: 30_000,  5: 1_500, 4: 50, 3: 5 } },
  maismilionaria:{ pick: 6,  pool: 50, ticket: 6.00,  prizes: { 6: 10_000_000, 5: 25_000,  4: 600, 3: 50, 2: 6 } },
};

export interface BacktestSample {
  concurso: number;
  dezenas: number[];
  data: string;
}

export interface BacktestRoundDetail {
  concurso: number;
  data: string;
  sorteados: number[];
  previstos: number[];
  acertos: number;
  premio: number;
  confidence: number;
}

export interface BacktestResult {
  loteria: LoteriaKey;
  iaEngine: string;
  algoritmo: string;
  amostras: number;
  acertosTotal: number;
  hitRate: number;        // % média acertos por jogo
  precisao: number;       // % jogos com >= faixa-alvo
  roiSimulado: number;    // % retorno
  brierScore: number;     // calibração (menor = melhor)
  ci: { low: number; high: number; level: 0.95 };
  risk: "low" | "medium" | "high";
  garantia: "alta" | "media" | "baixa";
  faixaAcertos: Record<number, number>;
  calibracao: { bins: { p: number; observado: number; n: number }[] };
  parametros: Record<string, unknown>;
  rounds?: BacktestRoundDetail[]; // drill-down opcional
}

// ============================================================
// Algoritmos de geração (estratégias plugáveis)
// ============================================================

export type Predictor = (history: BacktestSample[], cfg: { pick: number; pool: number }) => { numbers: number[]; confidence: number };

function rngPick(pool: number, k: number, rng: () => number): number[] {
  const all = Array.from({ length: pool }, (_, i) => i + 1);
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all.slice(0, k).sort((a, b) => a - b);
}

export const PREDICTORS: Record<string, Predictor> = {
  // Frequência ponderada (favorece dezenas mais sorteadas)
  frequency: (history, { pick, pool }) => {
    const freq = new Array(pool + 1).fill(0);
    history.forEach(h => h.dezenas.forEach(d => { if (d >= 1 && d <= pool) freq[d]++; }));
    const ranked = Array.from({ length: pool }, (_, i) => i + 1)
      .sort((a, b) => freq[b] - freq[a]);
    const top = ranked.slice(0, Math.min(pool, Math.ceil(pick * 1.6)));
    // pega os top-pick (determinístico, alta confiança)
    return { numbers: top.slice(0, pick).sort((a, b) => a - b), confidence: 0.62 };
  },
  // Atraso: favorece dezenas que mais demoram a sair
  delay: (history, { pick, pool }) => {
    const last = new Array(pool + 1).fill(-1);
    history.forEach((h, idx) => h.dezenas.forEach(d => { if (d >= 1 && d <= pool) last[d] = idx; }));
    const ranked = Array.from({ length: pool }, (_, i) => i + 1)
      .sort((a, b) => last[a] - last[b]);
    return { numbers: ranked.slice(0, pick).sort((a, b) => a - b), confidence: 0.55 };
  },
  // Ensemble híbrido frequency+delay+balanced
  ensemble: (history, { pick, pool }) => {
    const freq = new Array(pool + 1).fill(0);
    const last = new Array(pool + 1).fill(history.length);
    history.forEach((h, idx) => h.dezenas.forEach(d => {
      if (d >= 1 && d <= pool) { freq[d]++; last[d] = idx; }
    }));
    const score = (n: number) => {
      const f = freq[n] / Math.max(1, history.length);
      const d = (history.length - last[n]) / Math.max(1, history.length);
      return 0.55 * f + 0.45 * d;
    };
    const ranked = Array.from({ length: pool }, (_, i) => i + 1).sort((a, b) => score(b) - score(a));
    return { numbers: ranked.slice(0, pick).sort((a, b) => a - b), confidence: 0.72 };
  },
  // Monte Carlo random (baseline)
  monteCarlo: (_history, { pick, pool }) => {
    const seed = Date.now() % 2147483647;
    let s = seed;
    const rng = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    return { numbers: rngPick(pool, pick, rng), confidence: 0.35 };
  },
};

// ============================================================
// Estatística: intervalo de Wilson + Brier + ranking
// ============================================================

function wilsonInterval(p: number, n: number, z = 1.96): { low: number; high: number } {
  if (n <= 0) return { low: 0, high: 0 };
  const denom = 1 + (z * z) / n;
  const center = (p + (z * z) / (2 * n)) / denom;
  const margin = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denom;
  return { low: Math.max(0, center - margin), high: Math.min(1, center + margin) };
}

function brier(predictions: { p: number; outcome: 0 | 1 }[]): number {
  if (!predictions.length) return 0;
  return predictions.reduce((s, x) => s + (x.p - x.outcome) ** 2, 0) / predictions.length;
}

function calibrationBins(preds: { p: number; outcome: 0 | 1 }[], nBins = 10) {
  const bins = Array.from({ length: nBins }, () => ({ sum: 0, obs: 0, n: 0 }));
  preds.forEach(({ p, outcome }) => {
    const idx = Math.min(nBins - 1, Math.floor(p * nBins));
    bins[idx].sum += p;
    bins[idx].obs += outcome;
    bins[idx].n += 1;
  });
  return bins.map(b => ({
    p: b.n ? b.sum / b.n : 0,
    observado: b.n ? b.obs / b.n : 0,
    n: b.n,
  }));
}

// ============================================================
// Backtest principal
// ============================================================

export async function runBacktest(opts: {
  loteria: LoteriaKey;
  predictor: keyof typeof PREDICTORS;
  iaEngine: string;
  windowSize?: number;       // janela mínima de histórico
  maxSamples?: number;       // limita amostras (perf)
  collectRounds?: boolean;   // habilita drill-down por concurso
}): Promise<BacktestResult> {
  const cfg = LOTERIA_CONFIG[opts.loteria];
  const predictor = PREDICTORS[opts.predictor];
  const windowSize = opts.windowSize ?? 20;
  const maxSamples = opts.maxSamples ?? 500;
  const collectRounds = opts.collectRounds ?? true;

  const { data, error } = await supabase
    .from("resultados_sorteios")
    .select("concurso,dezenas,data_apuracao")
    .eq("loteria", opts.loteria)
    .order("concurso", { ascending: true })
    .limit(maxSamples + windowSize);

  if (error) throw new Error(`Falha ao carregar histórico: ${error.message}`);
  const samples: BacktestSample[] = (data ?? []).map((r: any) => ({
    concurso: r.concurso,
    dezenas: (r.dezenas ?? []).map(Number).filter((n: number) => Number.isFinite(n)),
    data: r.data_apuracao,
  })).filter(s => s.dezenas.length === cfg.pick);

  if (samples.length <= windowSize) {
    return emptyResult(opts.loteria, opts.iaEngine, opts.predictor, samples.length);
  }

  const faixa: Record<number, number> = {};
  const calibPreds: { p: number; outcome: 0 | 1 }[] = [];
  const rounds: BacktestRoundDetail[] = [];
  let totalHits = 0;
  let totalRevenue = 0;
  let totalCost = 0;
  let amostras = 0;
  let aciertosFaixa = 0;
  const tierKeys = Object.keys(cfg.prizes).map(Number).sort((a, b) => b - a);
  const minTier = tierKeys[tierKeys.length - 1];

  for (let i = windowSize; i < samples.length; i++) {
    const history = samples.slice(Math.max(0, i - windowSize), i);
    const target = samples[i];
    const { numbers, confidence } = predictor(history, { pick: cfg.pick, pool: cfg.pool });
    const hits = numbers.filter(n => target.dezenas.includes(n)).length;
    faixa[hits] = (faixa[hits] ?? 0) + 1;
    totalHits += hits;
    totalCost += cfg.ticket;
    const prize = cfg.prizes[hits] ?? 0;
    totalRevenue += prize;
    amostras += 1;
    if (hits >= minTier) aciertosFaixa += 1;

    const pPerNumber = Math.max(0.01, Math.min(0.99, confidence));
    numbers.forEach(n => calibPreds.push({ p: pPerNumber, outcome: target.dezenas.includes(n) ? 1 : 0 }));

    if (collectRounds) {
      rounds.push({
        concurso: target.concurso,
        data: target.data,
        sorteados: target.dezenas,
        previstos: numbers,
        acertos: hits,
        premio: prize,
        confidence: pPerNumber,
      });
    }
  }

  const hitRate = (totalHits / (amostras * cfg.pick)) * 100;
  const precisao = (aciertosFaixa / amostras) * 100;
  const roi = totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0;
  const brierScore = brier(calibPreds);
  const observedRate = aciertosFaixa / amostras;
  const wilson = wilsonInterval(observedRate, amostras);
  const calib = calibrationBins(calibPreds, 10);

  const risk = roi >= 0 ? "low" : roi >= -50 ? "medium" : "high";
  const garantia = brierScore <= 0.18 && precisao >= 5 ? "alta" : brierScore <= 0.25 ? "media" : "baixa";

  return {
    loteria: opts.loteria,
    iaEngine: opts.iaEngine,
    algoritmo: opts.predictor,
    amostras,
    acertosTotal: totalHits,
    hitRate: round(hitRate),
    precisao: round(precisao),
    roiSimulado: round(roi),
    brierScore: round(brierScore, 4),
    ci: { low: round(wilson.low * 100), high: round(wilson.high * 100), level: 0.95 },
    risk,
    garantia,
    faixaAcertos: faixa,
    calibracao: { bins: calib },
    parametros: { windowSize, maxSamples, ticket: cfg.ticket, pick: cfg.pick, pool: cfg.pool },
    rounds: collectRounds ? rounds : undefined,
  };
}

function emptyResult(loteria: LoteriaKey, iaEngine: string, algoritmo: string, amostras: number): BacktestResult {
  return {
    loteria, iaEngine, algoritmo, amostras,
    acertosTotal: 0, hitRate: 0, precisao: 0, roiSimulado: 0, brierScore: 0,
    ci: { low: 0, high: 0, level: 0.95 },
    risk: "high", garantia: "baixa",
    faixaAcertos: {}, calibracao: { bins: [] },
    parametros: { reason: "histórico insuficiente" },
  };
}

function round(n: number, digits = 2) {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

// ============================================================
// Persistência
// ============================================================

export async function saveBacktestRun(result: BacktestResult, observacoes?: string) {
  const { error } = await supabase.from("titan_backtest_runs" as any).insert({
    loteria: result.loteria,
    ia_engine: result.iaEngine,
    algoritmo: result.algoritmo,
    amostras: result.amostras,
    acertos_total: result.acertosTotal,
    hit_rate: result.hitRate,
    precisao: result.precisao,
    roi_simulado: result.roiSimulado,
    brier_score: result.brierScore,
    ci_low: result.ci.low,
    ci_high: result.ci.high,
    risk_level: result.risk,
    garantia_nivel: result.garantia,
    faixa_acertos: result.faixaAcertos,
    calibracao: result.calibracao,
    parametros: result.parametros,
    observacoes: observacoes ?? null,
  });
  if (error) throw new Error(`Falha ao salvar backtest: ${error.message}`);
}

export async function loadBacktestHistory(loteria?: LoteriaKey, limit = 50) {
  let q = supabase.from("titan_backtest_runs" as any).select("*").order("created_at", { ascending: false }).limit(limit);
  if (loteria) q = q.eq("loteria", loteria);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}

// Ranking por garantia/risco (combina ROI, Brier, precisão e CI)
export function rankResults(results: BacktestResult[]) {
  return [...results].map(r => {
    const ciWidth = Math.max(0.01, r.ci.high - r.ci.low);
    const score =
      0.40 * (r.precisao / 100) +
      0.25 * Math.max(0, Math.min(1, (r.roiSimulado + 100) / 200)) +
      0.20 * (1 - Math.min(1, r.brierScore * 2)) +
      0.15 * (1 - Math.min(1, ciWidth / 100));
    return { ...r, score: round(score * 100) };
  }).sort((a, b) => (b as any).score - (a as any).score);
}
