// ================================================================
// 🏦 QUANT CORE v17.0 — UNIFIED INTELLIGENCE LAYER
// Fusão de V600 → V1700 (Risk Engine + ROI + Meta-AI + Entropy +
// Monte Carlo Distribuído + DQN-style + Auto-Evolution + Decision)
// Camada de inteligência que decide QUANDO e SE apostar.
// ================================================================

import { LOTERIAS_CONFIG, LoteriaNome, sortearUnicos } from "./godCore";

// ── 1. ENTROPIA DE SHANNON ─────────────────────────────────────
export function calcularEntropia(historico: number[][]): number {
  if (!historico.length) return 1;
  const flat = historico.flat();
  const counts: Record<number, number> = {};
  flat.forEach(n => { counts[n] = (counts[n] ?? 0) + 1; });
  const total = flat.length;
  let H = 0;
  Object.values(counts).forEach(c => {
    const p = c / total;
    if (p > 0) H -= p * Math.log2(p);
  });
  // normaliza 0..1
  const Hmax = Math.log2(Object.keys(counts).length || 2);
  return Hmax > 0 ? H / Hmax : 1;
}

// ── 2. DETECTOR DE CICLOS ──────────────────────────────────────
export function detectarCiclo(hist: number[][]): number {
  if (hist.length < 20) return 0;
  const recent = new Set(hist.slice(-5).flat());
  const older = new Set(hist.slice(-20, -5).flat());
  const inter = [...recent].filter(n => older.has(n)).length;
  return inter / Math.max(1, recent.size);
}

// ── 3. MOMENTUM ────────────────────────────────────────────────
export function calcularMomentum(hist: number[][]): number {
  if (hist.length < 20) return 0.5;
  const recent = hist.slice(-5).flat();
  const older = hist.slice(-20, -5).flat();
  const fr: Record<number, number> = {};
  const fo: Record<number, number> = {};
  recent.forEach(n => fr[n] = (fr[n] ?? 0) + 1);
  older.forEach(n => fo[n] = (fo[n] ?? 0) + 1);
  let diff = 0;
  Object.keys(fr).forEach(k => {
    diff += Math.abs((fr[+k] ?? 0) / recent.length - (fo[+k] ?? 0) / older.length);
  });
  return Math.min(1, diff);
}

// ── 4. ANTI-CROWD (evitar números populares) ───────────────────
const POPULARES = [
  1, 7, 13, 17, 23, 27, 33, 37, 43, 47,
  3, 5, 9, 11, 21, 25, 31, 41,
];
export function antiCrowdPenalty(numeros: number[]): number {
  const pop = numeros.filter(n => POPULARES.includes(n)).length;
  return pop / numeros.length;
}

// ── 5. PAYOUT TABLE (V1100 — REWARD FINANCEIRO REAL) ──────────
const PAYOUT_TABLE: Record<LoteriaNome, Record<number, number>> = {
  megasena:   { 6: 50_000_000, 5: 50_000, 4: 1_000 },
  quina:      { 5: 5_000_000,  4: 8_000, 3: 100, 2: 4 },
  lotofacil:  { 15: 1_500_000, 14: 2_000, 13: 30, 12: 12, 11: 6 },
  lotomania:  { 20: 5_000_000, 19: 30_000, 18: 1_500, 17: 100, 16: 20, 15: 6, 0: 5_000_000 },
  timemania:  { 7: 8_000_000, 6: 60_000, 5: 1_500, 4: 12, 3: 3 },
  duplasena:  { 6: 3_000_000, 5: 2_500, 4: 75, 3: 3 },
  diadesorte: { 7: 800_000, 6: 1_500, 5: 25, 4: 4 },
  supersete:  { 7: 1_500_000, 6: 3_000, 5: 80, 4: 8, 3: 3 },
  milionaria: { 6: 100_000_000, 5: 50_000, 4: 500, 3: 50 },
};
const CUSTO_APOSTA: Record<LoteriaNome, number> = {
  megasena: 5, quina: 2.5, lotofacil: 3, lotomania: 3, timemania: 3.5,
  duplasena: 2.5, diadesorte: 2.5, supersete: 2.5, milionaria: 6,
};

export function rewardFunction(loteria: LoteriaNome, hits: number): number {
  return (PAYOUT_TABLE[loteria]?.[hits] ?? 0) - CUSTO_APOSTA[loteria];
}

// ── 6. MONTE CARLO MASSIVO (V1200) ─────────────────────────────
export function monteCarloROI(
  loteria: LoteriaNome,
  candidato: number[],
  historico: number[][],
  simulacoes = 5000
): { roi: number; winRate: number; expectedValue: number } {
  if (!historico.length) return { roi: -1, winRate: 0, expectedValue: 0 };
  let lucro = 0;
  let wins = 0;
  for (let i = 0; i < simulacoes; i++) {
    const real = historico[Math.floor(Math.random() * historico.length)];
    const hits = candidato.filter(n => real.includes(n)).length;
    const r = rewardFunction(loteria, hits);
    lucro += r;
    if (r > 0) wins++;
  }
  const ev = lucro / simulacoes;
  const roi = ev / CUSTO_APOSTA[loteria];
  return { roi, winRate: wins / simulacoes, expectedValue: ev };
}

// ── 7. META-AI: escolhe estratégia ─────────────────────────────
export type Estrategia = "AGRESSIVO" | "NORMAL" | "CONSERVADOR" | "BLOQUEADO";

export interface ContextoMercado {
  entropia: number;
  ciclo: number;
  momentum: number;
  scoreEnsemble: number;
  failRate: number;
}

export function metaAI(ctx: ContextoMercado): Estrategia {
  if (ctx.failRate > 0.3) return "BLOQUEADO";
  if (ctx.entropia > 0.92) return "BLOQUEADO";
  if (ctx.scoreEnsemble > 75 && ctx.momentum > 0.4 && ctx.entropia < 0.85) return "AGRESSIVO";
  if (ctx.scoreEnsemble > 60 && ctx.entropia < 0.9) return "NORMAL";
  return "CONSERVADOR";
}

// ── 8. RISK ENGINE ─────────────────────────────────────────────
export interface DecisaoRisco {
  acao: "BET" | "NO_BET" | "STOP";
  estrategia: Estrategia;
  bankrollPct: number;
  motivo: string;
  scoreFinal: number;
}

export function riskEngine(
  loteria: LoteriaNome,
  candidato: number[],
  historico: number[][],
  scoreEnsemble: number,
  failRate = 0
): DecisaoRisco & { metricas: ContextoMercado & { roi: number; ev: number; winRate: number; antiCrowd: number } } {
  const entropia = calcularEntropia(historico);
  const ciclo = detectarCiclo(historico);
  const momentum = calcularMomentum(historico);
  const ctx: ContextoMercado = { entropia, ciclo, momentum, scoreEnsemble, failRate };
  const estrategia = metaAI(ctx);
  const mc = monteCarloROI(loteria, candidato, historico, 3000);
  const antiCrowd = antiCrowdPenalty(candidato);

  let acao: DecisaoRisco["acao"] = "NO_BET";
  let bankrollPct = 0;
  let motivo = "";

  if (estrategia === "BLOQUEADO") {
    acao = "STOP";
    motivo = `Sistema em modo SAFE (entropia=${entropia.toFixed(2)}, fail=${failRate.toFixed(2)})`;
  } else if (mc.roi < -0.5 && estrategia !== "AGRESSIVO") {
    acao = "NO_BET";
    motivo = `ROI esperado muito negativo (${mc.roi.toFixed(2)})`;
  } else {
    acao = "BET";
    const base = estrategia === "AGRESSIVO" ? 0.04 : estrategia === "NORMAL" ? 0.02 : 0.005;
    bankrollPct = base * (1 - antiCrowd * 0.5);
    motivo = `Estratégia ${estrategia} · ROI=${mc.roi.toFixed(2)} · WR=${(mc.winRate * 100).toFixed(1)}%`;
  }

  const scoreFinal = Math.max(
    0,
    Math.min(100, scoreEnsemble * (1 - antiCrowd * 0.3) * (1 - entropia * 0.2))
  );

  return {
    acao,
    estrategia,
    bankrollPct,
    motivo,
    scoreFinal,
    metricas: { ...ctx, roi: mc.roi, ev: mc.expectedValue, winRate: mc.winRate, antiCrowd },
  };
}

// ── 9. DQN-STYLE EPSILON-GREEDY (V800) ─────────────────────────
let _epsilon = 1.0;
const EPS_MIN = 0.05;
const EPS_DECAY = 0.995;
export function epsilonGreedyChoice(
  loteria: LoteriaNome,
  ensemble: number[]
): number[] {
  const cfg = LOTERIAS_CONFIG[loteria];
  if (Math.random() < _epsilon) {
    _epsilon = Math.max(EPS_MIN, _epsilon * EPS_DECAY);
    return sortearUnicos(cfg.min, cfg.max, cfg.qtd);
  }
  _epsilon = Math.max(EPS_MIN, _epsilon * EPS_DECAY);
  return ensemble.slice(0, cfg.qtd);
}
export function getEpsilon() { return _epsilon; }

// ── 10. AUTO-EVOLUTION REGISTRY (V1300/V1400) ──────────────────
interface ModelVersion {
  name: string;
  config: Record<string, number>;
  score: number;
  timestamp: string;
}
const REGISTRY_KEY = "quant_model_registry";

export function saveModelVersion(name: string, config: Record<string, number>, score: number) {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY);
    const arr: ModelVersion[] = raw ? JSON.parse(raw) : [];
    arr.push({ name, config, score, timestamp: new Date().toISOString() });
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(arr.slice(-50)));
  } catch {}
}

export function selectBestModel(): ModelVersion | null {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY);
    if (!raw) return null;
    const arr: ModelVersion[] = JSON.parse(raw);
    return arr.reduce<ModelVersion | null>(
      (best, cur) => (!best || cur.score > best.score ? cur : best),
      null
    );
  } catch { return null; }
}

export function mutateConfig(cfg: Record<string, number>): Record<string, number> {
  const out = { ...cfg };
  out.lr = (cfg.lr ?? 0.001) * (0.8 + Math.random() * 0.4);
  out.hidden = [128, 256, 512][Math.floor(Math.random() * 3)];
  out.dropout = [0.2, 0.3, 0.5][Math.floor(Math.random() * 3)];
  return out;
}
