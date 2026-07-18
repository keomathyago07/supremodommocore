// Métodos de calibração de confiança — Temperature, Platt, Isotonic
// Implementação pura TS, sem dependências externas.

export interface CalibrationSample { p: number; y: 0 | 1 }
export type CalibratorFn = (p: number) => number;

const clamp01 = (x: number) => Math.max(1e-6, Math.min(1 - 1e-6, x));

// ── Temperature scaling — encontra T que minimiza NLL via grid+refinamento
export function fitTemperature(samples: CalibrationSample[]): { T: number; calibrate: CalibratorFn } {
  if (!samples.length) return { T: 1, calibrate: (p) => p };
  const logits = samples.map(s => Math.log(clamp01(s.p) / (1 - clamp01(s.p))));
  const ys = samples.map(s => s.y);
  const nll = (T: number) => {
    let sum = 0;
    for (let i = 0; i < logits.length; i++) {
      const q = 1 / (1 + Math.exp(-logits[i] / T));
      const qc = clamp01(q);
      sum -= ys[i] * Math.log(qc) + (1 - ys[i]) * Math.log(1 - qc);
    }
    return sum / logits.length;
  };
  let bestT = 1, bestL = nll(1);
  // grid coarse then fine
  for (let T = 0.25; T <= 5; T += 0.05) {
    const l = nll(T);
    if (l < bestL) { bestL = l; bestT = T; }
  }
  for (let T = Math.max(0.05, bestT - 0.1); T <= bestT + 0.1; T += 0.005) {
    const l = nll(T);
    if (l < bestL) { bestL = l; bestT = T; }
  }
  return {
    T: bestT,
    calibrate: (p: number) => {
      const l = Math.log(clamp01(p) / (1 - clamp01(p)));
      return 1 / (1 + Math.exp(-l / bestT));
    },
  };
}

// ── Platt scaling — sigmoid(A*p + B) via IRLS simplificado (gradiente)
export function fitPlatt(samples: CalibrationSample[]): { A: number; B: number; calibrate: CalibratorFn } {
  if (!samples.length) return { A: 1, B: 0, calibrate: (p) => p };
  let A = 1, B = 0;
  const lr = 0.05;
  for (let iter = 0; iter < 400; iter++) {
    let gA = 0, gB = 0;
    for (const s of samples) {
      const z = A * s.p + B;
      const q = 1 / (1 + Math.exp(-z));
      const e = q - s.y;
      gA += e * s.p; gB += e;
    }
    A -= (lr * gA) / samples.length;
    B -= (lr * gB) / samples.length;
  }
  return { A, B, calibrate: (p: number) => 1 / (1 + Math.exp(-(A * p + B))) };
}

// ── Isotonic (Pool Adjacent Violators)
export function fitIsotonic(samples: CalibrationSample[]): { knots: [number, number][]; calibrate: CalibratorFn } {
  if (!samples.length) return { knots: [], calibrate: (p) => p };
  const sorted = [...samples].sort((a, b) => a.p - b.p);
  const xs = sorted.map(s => s.p);
  const ys = sorted.map(s => s.y as number);
  const w = new Array(xs.length).fill(1);
  // PAV
  let i = 0;
  while (i < ys.length - 1) {
    if (ys[i] > ys[i + 1]) {
      const totalW = w[i] + w[i + 1];
      const merged = (ys[i] * w[i] + ys[i + 1] * w[i + 1]) / totalW;
      ys[i] = merged; w[i] = totalW;
      ys.splice(i + 1, 1); xs.splice(i + 1, 1); w.splice(i + 1, 1);
      if (i > 0) i--;
    } else i++;
  }
  const knots: [number, number][] = xs.map((x, k) => [x, ys[k]]);
  return {
    knots,
    calibrate: (p: number) => {
      if (!knots.length) return p;
      if (p <= knots[0][0]) return knots[0][1];
      if (p >= knots[knots.length - 1][0]) return knots[knots.length - 1][1];
      for (let k = 0; k < knots.length - 1; k++) {
        if (p >= knots[k][0] && p <= knots[k + 1][0]) {
          const [x0, y0] = knots[k]; const [x1, y1] = knots[k + 1];
          const t = (p - x0) / Math.max(1e-9, x1 - x0);
          return y0 + t * (y1 - y0);
        }
      }
      return p;
    },
  };
}

// ── Brier + ECE
export function brierScore(samples: CalibrationSample[]): number {
  if (!samples.length) return 0;
  return samples.reduce((s, x) => s + (x.p - x.y) ** 2, 0) / samples.length;
}

export function expectedCalibrationError(samples: CalibrationSample[], nBins = 10): number {
  if (!samples.length) return 0;
  const bins = Array.from({ length: nBins }, () => ({ sp: 0, sy: 0, n: 0 }));
  samples.forEach(({ p, y }) => {
    const idx = Math.min(nBins - 1, Math.floor(p * nBins));
    bins[idx].sp += p; bins[idx].sy += y; bins[idx].n += 1;
  });
  let ece = 0;
  for (const b of bins) {
    if (!b.n) continue;
    ece += (b.n / samples.length) * Math.abs(b.sp / b.n - b.sy / b.n);
  }
  return ece;
}

export type CalibrationMethod = "temperature" | "platt" | "isotonic";

export function fitCalibration(method: CalibrationMethod, samples: CalibrationSample[]) {
  if (method === "temperature") return fitTemperature(samples);
  if (method === "platt")       return fitPlatt(samples);
  return fitIsotonic(samples);
}
