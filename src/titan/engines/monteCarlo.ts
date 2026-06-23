// ============================================================
// engines/monteCarlo.ts — Monte Carlo massivo (browser-friendly)
// Port TS de: Motor de Monte Carlo (Python)
// Estima distribuição (soma, paridade, spread) p/ calibrar filtros
// e estimar EV/variância. NÃO estima probabilidade individual.
// ============================================================

export type Combo = number[];

export interface MCStats {
  sum_mean: number;
  sum_std: number;
  spread_mean: number;
  spread_std: number;
  odd_ratio_mean: number;
  odd_ratio_std: number;
  n_simulations: number;
}

function sampleCombo(universe: number, drawSize: number): Combo {
  // Reservoir/Fisher-Yates parcial
  const pool = new Array(universe);
  for (let i = 0; i < universe; i++) pool[i] = i + 1;
  for (let i = 0; i < drawSize; i++) {
    const j = i + Math.floor(Math.random() * (universe - i));
    const tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
  }
  return pool.slice(0, drawSize).sort((a, b) => a - b);
}

export function monteCarloSimulation(
  n = 50_000,
  universe = 60,
  drawSize = 6,
): Combo[] {
  const out: Combo[] = new Array(n);
  for (let i = 0; i < n; i++) out[i] = sampleCombo(universe, drawSize);
  return out;
}

export function distributionStats(sims: Combo[]): MCStats {
  const n = sims.length || 1;
  let sumAcc = 0, sumSq = 0;
  let sprAcc = 0, sprSq = 0;
  let oddAcc = 0, oddSq = 0;
  for (const s of sims) {
    let sum = 0, mn = Infinity, mx = -Infinity, odd = 0;
    for (const v of s) {
      sum += v;
      if (v < mn) mn = v;
      if (v > mx) mx = v;
      if (v % 2 === 1) odd++;
    }
    const spr = mx - mn;
    const oddR = odd / s.length;
    sumAcc += sum; sumSq += sum * sum;
    sprAcc += spr; sprSq += spr * spr;
    oddAcc += oddR; oddSq += oddR * oddR;
  }
  const mean = (a: number) => a / n;
  const std = (sq: number, m: number) => Math.sqrt(Math.max(sq / n - m * m, 0));
  const sm = mean(sumAcc), spm = mean(sprAcc), om = mean(oddAcc);
  return {
    sum_mean: sm, sum_std: std(sumSq, sm),
    spread_mean: spm, spread_std: std(sprSq, spm),
    odd_ratio_mean: om, odd_ratio_std: std(oddSq, om),
    n_simulations: n,
  };
}

/** Score de cobertura/estabilidade (não confiança de vitória). */
export function simulateAndScore(
  n = 20_000,
  universe = 60,
  drawSize = 6,
): number {
  const sims = monteCarloSimulation(n, universe, drawSize);
  const stats = distributionStats(sims);
  const theoMean = ((universe + 1) / 2) * drawSize;
  const drift = Math.abs(stats.sum_mean - theoMean) / theoMean;
  const stability = Math.max(0, 1 - drift * 10);
  return Math.min(Math.max(stability, 0), 1);
}
