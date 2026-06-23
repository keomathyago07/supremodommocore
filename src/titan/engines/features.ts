// ============================================================
// engines/features.ts — Feature engineering sobre sorteios
// Port TS de: Feature engineering (Python)
// Descreve sorteio passado / agrega histórico (não preditivo).
// ============================================================

export const PRIMES_UP_TO_60 = new Set<number>([
  2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59,
]);

export interface DrawFeatures {
  mean: number;
  std: number;
  odd_ratio: number;
  sum: number;
  spread: number;
  prime_count: number;
  max_gap: number;
  mean_gap: number;
}

function mean(a: number[]): number {
  if (!a.length) return 0;
  return a.reduce((s, x) => s + x, 0) / a.length;
}
function std(a: number[]): number {
  if (!a.length) return 0;
  const m = mean(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / a.length);
}

export function buildFeatures(draw: number[]): DrawFeatures {
  const nums = [...draw].sort((a, b) => a - b);
  const gaps: number[] = nums.length > 1
    ? nums.slice(1).map((v, i) => v - nums[i])
    : [0];
  return {
    mean: mean(nums),
    std: std(nums),
    odd_ratio: nums.filter((n) => n % 2 !== 0).length / Math.max(nums.length, 1),
    sum: nums.reduce((s, x) => s + x, 0),
    spread: nums.length ? Math.max(...nums) - Math.min(...nums) : 0,
    prime_count: nums.filter((n) => PRIMES_UP_TO_60.has(n)).length,
    max_gap: Math.max(...gaps),
    mean_gap: mean(gaps),
  };
}

export type FeatureKey = keyof DrawFeatures;

export function featureVector(
  draw: number[],
  keys: FeatureKey[] = ["mean", "std", "odd_ratio", "sum", "spread"],
): number[] {
  const f = buildFeatures(draw);
  return keys.map((k) => f[k]);
}

/** Frequência relativa de cada número no histórico (descritiva, não preditiva). */
export function rollingFrequency(
  history: number[][],
  universe = 60,
): Record<number, number> {
  const counter = new Map<number, number>();
  for (const draw of history) {
    for (const n of draw) counter.set(n, (counter.get(n) ?? 0) + 1);
  }
  const total = Math.max(history.length, 1);
  const out: Record<number, number> = {};
  for (let n = 1; n <= universe; n++) out[n] = (counter.get(n) ?? 0) / total;
  return out;
}

/** Quantos números do combo já saíram nos últimos `lookback` sorteios. */
export function overlapWithRecent(
  combo: number[],
  history: number[][],
  lookback = 10,
): number {
  const recent = new Set<number>();
  for (const draw of history.slice(-lookback)) for (const n of draw) recent.add(n);
  return combo.filter((n) => recent.has(n)).length;
}
