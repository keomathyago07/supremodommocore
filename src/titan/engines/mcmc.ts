// ============================================================
// engines/mcmc.ts — Amostrador MCMC (Metropolis-Hastings)
// Port TS de: Amostrador MCMC (Python)
// Amostragem ponderada por desejabilidade heurística — NÃO estima
// probabilidade real de vitória (em sorteio justo: uniforme).
// ============================================================

export type Combo = number[];
export type DesirabilityFn = (combo: Combo) => number;

function sampleInitial(universe: number, drawSize: number): Combo {
  const pool = Array.from({ length: universe }, (_, i) => i + 1);
  for (let i = 0; i < drawSize; i++) {
    const j = i + Math.floor(Math.random() * (universe - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, drawSize).sort((a, b) => a - b);
}

function propose(current: Combo, universe: number): Combo {
  const next = [...current];
  const idx = Math.floor(Math.random() * next.length);
  const set = new Set(next);
  let pick = 0;
  // tenta até achar um número fora do combo
  for (let tries = 0; tries < 100; tries++) {
    pick = 1 + Math.floor(Math.random() * universe);
    if (!set.has(pick)) break;
  }
  next[idx] = pick;
  return [...new Set(next)].sort((a, b) => a - b);
}

export function metropolisHastings(
  desirabilityFn: DesirabilityFn,
  options: {
    universe?: number;
    drawSize?: number;
    nSteps?: number;
    burnIn?: number;
  } = {},
): Combo[] {
  const universe = options.universe ?? 60;
  const drawSize = options.drawSize ?? 6;
  const nSteps = options.nSteps ?? 5000;
  const burnIn = options.burnIn ?? 500;

  let current = sampleInitial(universe, drawSize);
  let currentScore = desirabilityFn(current);
  const chain: Combo[] = [];

  for (let step = 0; step < nSteps; step++) {
    const proposal = propose(current, universe);
    if (proposal.length !== drawSize) continue;
    const proposalScore = desirabilityFn(proposal);
    const ratio = proposalScore / Math.max(currentScore, 1e-9);
    if (ratio >= 1 || Math.random() < ratio) {
      current = proposal;
      currentScore = proposalScore;
    }
    if (step >= burnIn) chain.push(current);
  }
  return chain;
}

/** Heurística de normalidade estatística (soma e paridade equilibradas). */
export function defaultDesirability(combo: Combo, universe = 60): number {
  const theoMean = ((universe + 1) / 2) * combo.length;
  const s = combo.reduce((a, b) => a + b, 0);
  const sumScore = 1 - Math.min(Math.abs(s - theoMean) / theoMean, 1);
  const oddRatio = combo.filter((n) => n % 2 === 1).length / combo.length;
  const parityScore = 1 - Math.abs(oddRatio - 0.5) * 2;
  return Math.max((sumScore + parityScore) / 2, 1e-6);
}
