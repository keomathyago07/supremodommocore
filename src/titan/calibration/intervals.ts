// Intervalos de confiança — Wilson 95% e 99%
export function wilson(p: number, n: number, z: number): { low: number; high: number } {
  if (n <= 0) return { low: 0, high: 0 };
  const d = 1 + (z * z) / n;
  const c = (p + (z * z) / (2 * n)) / d;
  const m = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return { low: Math.max(0, c - m), high: Math.min(1, c + m) };
}
export const wilson95 = (p: number, n: number) => wilson(p, n, 1.96);
export const wilson99 = (p: number, n: number) => wilson(p, n, 2.576);

export interface CalibratedBand {
  p: number;
  observado: number;
  n: number;
  ci95: { low: number; high: number };
  ci99: { low: number; high: number };
}

export function bandsFromBins(
  bins: { p: number; observado: number; n: number }[],
): CalibratedBand[] {
  return bins.map(b => ({
    ...b,
    ci95: wilson95(b.observado, b.n),
    ci99: wilson99(b.observado, b.n),
  }));
}
