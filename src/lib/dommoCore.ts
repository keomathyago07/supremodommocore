// ============================================
// DOMMO CORE — NÚCLEO COMPLETO v4 (GLOBAL)
// Atlas Ingest + Certus Engine + Decision Engine
// + Scoring + Auto-Learning + Chat Orchestrator
// ============================================

import { type LotteryConfig, LOTTERIES, TIMEMANIA_TEAMS } from './lotteryConstants';

// ============ CONFIG ============
export const DOMMO_CONFIG = {
  CONFIDENCE_THRESHOLD: 0.6,
  MAX_GAMES: 1,
  LOTTERIES: LOTTERIES.map(l => l.apiName),
  APILOTERIAS_URL: 'https://apiloterias.com.br/app/v2/resultado',
  TIMEOUT: 20000,
};

// ============ ATLAS INGEST ============
export interface IngestResult {
  mode: 'APILOTERIAS_ONLY' | 'CONSENSUS' | 'CONFLICT' | 'FALLBACK' | 'CAIXA_ONLY';
  data: any;
  source: string;
}

export class AtlasIngest {
  async fetchApiLoterias(lottery: string, token?: string): Promise<{ status: string; data: any; source: string }> {
    try {
      const url = token 
        ? `${DOMMO_CONFIG.APILOTERIAS_URL}?loteria=${lottery}&token=${token}`
        : `${DOMMO_CONFIG.APILOTERIAS_URL}?loteria=${lottery}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(DOMMO_CONFIG.TIMEOUT) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return { status: 'ok', data, source: 'apiloterias' };
    } catch (e: any) {
      return { status: 'error', data: null, source: 'apiloterias' };
    }
  }

  async resolve(lottery: string, token?: string): Promise<IngestResult> {
    const a = await this.fetchApiLoterias(lottery, token);
    if (a.status === 'ok') {
      return { mode: 'APILOTERIAS_ONLY', data: a.data, source: 'apiloterias' };
    }
    return { mode: 'FALLBACK', data: null, source: 'none' };
  }
}

// ============ CERTUS ENGINE v4 ============
export class CertusEngine {
  frequencyScore(history: number[][], number: number): number {
    if (history.length === 0) return 0;
    const count = history.filter(draw => draw.includes(number)).length;
    return count / history.length;
  }

  delayScore(history: number[][], number: number): number {
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].includes(number)) return (history.length - 1 - i) / history.length;
    }
    return 1.0;
  }

  entropy(history: number[][]): number {
    const flat = history.flat();
    const counts: Record<number, number> = {};
    flat.forEach(n => { counts[n] = (counts[n] || 0) + 1; });
    const total = flat.length;
    if (total === 0) return 0;
    let ent = 0;
    Object.values(counts).forEach(c => {
      const p = c / total;
      if (p > 0) ent -= p * Math.log(p);
    });
    return ent;
  }

  correlation(history: number[][], n1: number, n2: number): number {
    if (history.length === 0) return 0;
    const both = history.filter(d => d.includes(n1) && d.includes(n2)).length;
    return both / history.length;
  }

  trendScore(history: number[][], number: number): number {
    if (history.length < 20) return 0.5;
    const recent = history.slice(-20);
    const older = history.slice(-100, -20);
    const recentFreq = recent.filter(d => d.includes(number)).length / recent.length;
    const olderFreq = older.length > 0 ? older.filter(d => d.includes(number)).length / older.length : 0;
    return Math.min(1, Math.max(0, 0.5 + (recentFreq - olderFreq)));
  }

  gapAnalysis(history: number[][], number: number): number {
    const gaps: number[] = [];
    let lastSeen = -1;
    history.forEach((draw, i) => {
      if (draw.includes(number)) {
        if (lastSeen >= 0) gaps.push(i - lastSeen);
        lastSeen = i;
      }
    });
    if (gaps.length === 0) return 0.5;
    const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
    const currentGap = history.length - 1 - (lastSeen >= 0 ? lastSeen : 0);
    return Math.min(1, currentGap / (avgGap + 1));
  }

  scoreNumber(history: number[][], number: number): number {
    const freq = this.frequencyScore(history, number);
    const delay = this.delayScore(history, number);
    const trend = this.trendScore(history, number);
    const gap = this.gapAnalysis(history, number);
    const ent = this.entropy(history);
    return (
      0.25 * freq +
      0.20 * (1 - delay) +
      0.20 * trend +
      0.15 * gap +
      0.20 * Math.min(1, ent / 5)
    );
  }

  scoreAllNumbers(history: number[][], maxNumber: number, startAt: number = 1): Record<number, number> {
    const scores: Record<number, number> = {};
    for (let n = startAt; n <= maxNumber; n++) {
      scores[n] = this.scoreNumber(history, n);
    }
    return scores;
  }
}

// ============ DECISION ENGINE ============
export class DecisionEngine {
  generateGame(scores: Record<number, number>, size: number, config?: LotteryConfig): number[] {
    // Super Sete: one number per column (0-9)
    if (config?.hasColumns && config.columnsCount) {
      const nums: number[] = [];
      for (let col = 0; col < config.columnsCount; col++) {
        // Weighted random from scores for each column digit
        const colScores = Array.from({ length: (config.columnMax ?? 9) + 1 }, (_, i) => ({
          n: i,
          score: scores[i] || Math.random(),
        })).sort((a, b) => b.score - a.score);
        nums.push(colScores[Math.floor(Math.random() * Math.min(3, colScores.length))].n);
      }
      return nums; // Don't sort - column order matters
    }

    const sorted = Object.entries(scores)
      .sort(([, a], [, b]) => b - a)
      .map(([n]) => Number(n));
    const poolSize = Math.min(sorted.length, size * 3);
    const pool = sorted.slice(0, poolSize);
    const selected = new Set<number>();
    while (selected.size < size && pool.length > 0) {
      const idx = Math.floor(Math.random() * pool.length);
      selected.add(pool[idx]);
      pool.splice(idx, 1);
    }
    return Array.from(selected).sort((a, b) => a - b);
  }

  generateComplementary(numbers: number[], maxNumber: number): number[] {
    // Generate the complementary set (numbers NOT in the original game)
    // Used for Lotomania (50 marked → 50 unmarked)
    const allNumbers = Array.from({ length: maxNumber }, (_, i) => i);
    return allNumbers.filter(n => !numbers.includes(n)).sort((a, b) => a - b);
  }

  buildGames(scores: Record<number, number>, config: LotteryConfig): GameResult[] {
    const games: GameResult[] = [];
    const game = this.generateGame(scores, config.numbersCount, config);
    const confidence = game.reduce((s, n) => s + (scores[n] || 0), 0) / game.length;

    const result: GameResult = {
      numbers: game,
      confidence: Number((confidence * 100).toFixed(3)),
      trevos: undefined,
      team: undefined,
      complementaryNumbers: undefined,
    };

    // +Milionária: generate trevos
    if (config.hasSpecial && config.specialCount && config.specialMax) {
      const trevos = new Set<number>();
      while (trevos.size < config.specialCount) {
        trevos.add(Math.floor(Math.random() * config.specialMax) + 1);
      }
      result.trevos = Array.from(trevos).sort((a, b) => a - b);
    }

    // Timemania: generate team
    if (config.hasTeam) {
      result.team = TIMEMANIA_TEAMS[Math.floor(Math.random() * TIMEMANIA_TEAMS.length)];
    }

    // Lotomania: generate complementary game (50 not marked)
    if (config.id === 'lotomania') {
      // Lotomania picks 50 from 0-99 (100 numbers total)
      result.complementaryNumbers = this.generateComplementary(game, config.maxNumber);
    }

    games.push(result);
    return games;
  }
}

export interface GameResult {
  numbers: number[];
  confidence: number;
  trevos?: number[];
  team?: string | null;
  complementaryNumbers?: number[]; // Lotomania complementary
}

// ============ GLOBAL SCORING ============
export class GlobalScoring {
  scoreModel(games: GameResult[]): { confidence: number; level: string } {
    const avg = games.reduce((s, g) => s + g.confidence, 0) / games.length;
    let level = 'BAIXA';
    if (avg > 75) level = 'ALTA';
    else if (avg > 60) level = 'MEDIA';
    return { confidence: Number(avg.toFixed(3)), level };
  }
}

// ============ AUTO-LEARNING ============
export class AutoLearning {
  adjustWeights(performance: number): { freqWeight: number; delayWeight: number; trendWeight: number; gapWeight: number } {
    if (performance < 0.4) {
      return { freqWeight: 0.35, delayWeight: 0.25, trendWeight: 0.25, gapWeight: 0.15 };
    }
    if (performance < 0.6) {
      return { freqWeight: 0.30, delayWeight: 0.25, trendWeight: 0.25, gapWeight: 0.20 };
    }
    return { freqWeight: 0.25, delayWeight: 0.20, trendWeight: 0.25, gapWeight: 0.30 };
  }

  evaluateAndAdapt(history: number[][], predictions: number[][], lastDraws: number[][]): number {
    if (predictions.length === 0 || lastDraws.length === 0) return 0.5;
    let totalHits = 0;
    let totalPossible = 0;
    predictions.forEach((pred, i) => {
      const draw = lastDraws[i] || lastDraws[0];
      const hits = pred.filter(n => draw.includes(n)).length;
      totalHits += hits;
      totalPossible += pred.length;
    });
    return totalPossible > 0 ? totalHits / totalPossible : 0;
  }
}

// ============ CHAT ORCHESTRATOR ============
export class ChatOrchestrator {
  interpret(message: string): { action: string; params?: any } {
    const lower = message.toLowerCase();
    if (lower.includes('agressivo') || lower.includes('arriscado')) return { action: 'increase_risk' };
    if (lower.includes('conservador') || lower.includes('seguro')) return { action: 'decrease_risk' };
    if (lower.includes('lotomania')) return { action: 'focus_lottery', params: { lottery: 'lotomania' } };
    if (lower.includes('mega')) return { action: 'focus_lottery', params: { lottery: 'megasena' } };
    if (lower.includes('status')) return { action: 'show_status' };
    if (lower.includes('forçar') || lower.includes('gerar agora')) return { action: 'force_generate' };
    return { action: 'default' };
  }

  respond(state: { action: string }): string {
    switch (state.action) {
      case 'increase_risk': return '⚡ Modo agressivo ativado. Pool reduzido, maior concentração nos top scores.';
      case 'decrease_risk': return '🛡️ Modo conservador ativado. Pool ampliado, maior distribuição estatística.';
      case 'focus_lottery': return '🎯 Foco alterado. Priorizando análise da loteria selecionada.';
      case 'show_status': return '📊 Status do sistema DOMMO CORE exibido no Motor Analítico.';
      case 'force_generate': return '🔥 Geração forçada iniciada. Aguarde os resultados.';
      default: return '✅ Configuração mantida. Sistema operando normalmente.';
    }
  }
}

// ============ PIPELINE RUNNER ============
export async function runDommoPipeline(
  config: LotteryConfig,
  history: number[][],
  token?: string
): Promise<{ games: GameResult[]; model: { confidence: number; level: string } }> {
  const certus = new CertusEngine();
  const startAt = config.id === 'supersete' ? 0 : (config.id === 'lotomania' ? 0 : 1);
  const scores = certus.scoreAllNumbers(history, config.maxNumber, startAt);

  const decision = new DecisionEngine();
  const games = decision.buildGames(scores, config);

  const scoring = new GlobalScoring();
  const model = scoring.scoreModel(games);

  return { games, model };
}

// ============ DUPLA SENA CONFERENCE ============
export interface DuplaSenaResult {
  draw1: { numbers: number[]; hits: number; matched: number[] };
  draw2: { numbers: number[]; hits: number; matched: number[] };
}

export function conferenceDuplaSena(betNumbers: number[], draw1Numbers: number[], draw2Numbers: number[]): DuplaSenaResult {
  const matched1 = betNumbers.filter(n => draw1Numbers.includes(n));
  const matched2 = betNumbers.filter(n => draw2Numbers.includes(n));
  return {
    draw1: { numbers: draw1Numbers, hits: matched1.length, matched: matched1 },
    draw2: { numbers: draw2Numbers, hits: matched2.length, matched: matched2 },
  };
}

// ============ LOTOMANIA DUAL CONFERENCE ============
export interface LotomaniaDualResult {
  game1: { numbers: number[]; hits: number; matched: number[] }; // 50 marked
  game2: { numbers: number[]; hits: number; matched: number[] }; // 50 complementary
}

export function conferenceLotomania(
  markedNumbers: number[],
  complementaryNumbers: number[],
  drawNumbers: number[]
): LotomaniaDualResult {
  const matched1 = markedNumbers.filter(n => drawNumbers.includes(n));
  const matched2 = complementaryNumbers.filter(n => drawNumbers.includes(n));
  return {
    game1: { numbers: markedNumbers, hits: matched1.length, matched: matched1 },
    game2: { numbers: complementaryNumbers, hits: matched2.length, matched: matched2 },
  };
}

// ============ GENERIC CONFERENCE ============
export function conferenceGeneric(betNumbers: number[], drawNumbers: number[]): { hits: number; matched: number[] } {
  const matched = betNumbers.filter(n => drawNumbers.includes(n));
  return { hits: matched.length, matched };
}
