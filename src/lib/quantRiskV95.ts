// ================================================================
// 🧠 QUANT RISK V70-V95 — Camada de decisão profissional
// V70: Anti-aposta-ruim (filtro de qualidade)
// V71: Simulação Monte Carlo de aceitação
// V80: RL decision SKIP/BET (epsilon-greedy)
// V90-V95: Multi-action bet sizing + bankroll + auto-pause
// ================================================================

// ── V70: SCORE DE QUALIDADE DO JOGO ────────────────────────────
export function scoreJogo(jogo: number[], maxNum = 60): number {
  if (!jogo.length) return 0;
  let s = 0;
  // par/ímpar balanceado
  const pares = jogo.filter(n => n % 2 === 0).length;
  if (pares >= 2 && pares <= jogo.length - 2) s++;
  // sequências curtas
  const sorted = [...jogo].sort((a, b) => a - b);
  let seq = 0;
  for (let i = 0; i < sorted.length - 1; i++) if (sorted[i] + 1 === sorted[i + 1]) seq++;
  if (seq <= 2) s++;
  // distribuição por faixa (3 zonas)
  const z = maxNum / 3;
  const faixas = [0, 0, 0];
  jogo.forEach(n => {
    if (n <= z) faixas[0]++;
    else if (n <= 2 * z) faixas[1]++;
    else faixas[2]++;
  });
  if (faixas.every(f => f >= 1)) s++;
  return s;
}

export function bloquearJogo(jogo: number[], maxNum = 60): boolean {
  return scoreJogo(jogo, maxNum) <= 1;
}

// ── V71: SIMULAÇÃO ─────────────────────────────────────────────
export function simularJogo(jogo: number[], maxNum = 60, qtd = 6, n = 2000): number {
  let totalHits = 0;
  for (let i = 0; i < n; i++) {
    const sorteio = new Set<number>();
    while (sorteio.size < qtd) sorteio.add(1 + Math.floor(Math.random() * maxNum));
    let hits = 0;
    jogo.forEach(x => { if (sorteio.has(x)) hits++; });
    totalHits += hits;
  }
  return totalHits / n;
}

export function aceitarJogo(jogo: number[], maxNum = 60, qtd = 6): boolean {
  if (bloquearJogo(jogo, maxNum)) return false;
  return simularJogo(jogo, maxNum, qtd, 1500) >= 0.4;
}

// ── V90-V92: BANKROLL ─────────────────────────────────────────
const BANKROLL_KEY = 'quant_bankroll_v95';
export interface Bankroll { balance: number; peak: number; drawdown: number; lossHistory: number[]; }

export function getBankroll(): Bankroll {
  try {
    const raw = localStorage.getItem(BANKROLL_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { balance: 1000, peak: 1000, drawdown: 0, lossHistory: [] };
}

export function updateBankroll(resultado: number): Bankroll {
  const b = getBankroll();
  b.balance += resultado;
  if (b.balance > b.peak) b.peak = b.balance;
  b.drawdown = b.peak > 0 ? (b.peak - b.balance) / b.peak : 0;
  b.lossHistory.push(resultado);
  b.lossHistory = b.lossHistory.slice(-20);
  try { localStorage.setItem(BANKROLL_KEY, JSON.stringify(b)); } catch {}
  return b;
}

// ── V93: RISK CONTROL ─────────────────────────────────────────
export function riskControl(b = getBankroll()): 'OK' | 'STOP' {
  if (b.drawdown > 0.3) return 'STOP';
  if (b.balance < 100) return 'STOP';
  return 'OK';
}

// ── V94: DETECTOR DE DIA RUIM ─────────────────────────────────
export function badDay(b = getBankroll()): boolean {
  if (b.lossHistory.length < 10) return false;
  const losses = b.lossHistory.filter(x => x < 0).length;
  return losses / b.lossHistory.length > 0.7;
}

export function systemPause(b = getBankroll()): boolean {
  return badDay(b) || riskControl(b) === 'STOP';
}

// ── V90: AÇÕES MULTI-NÍVEL ────────────────────────────────────
export type ActionLevel = 'SKIP' | 'BET_SMALL' | 'BET_MEDIUM' | 'BET_AGGRESSIVE' | 'PAUSE';

export function betSize(action: ActionLevel, bankroll = getBankroll().balance): number {
  switch (action) {
    case 'SKIP':
    case 'PAUSE': return 0;
    case 'BET_SMALL': return bankroll * 0.01;
    case 'BET_MEDIUM': return bankroll * 0.03;
    case 'BET_AGGRESSIVE': return bankroll * 0.07;
  }
}

// ── V95: DECISÃO MASTER ───────────────────────────────────────
export interface MasterFeatures {
  scoreEnsemble: number;   // 0..100
  failRate: number;        // 0..1
  entropia: number;        // 0..1
  roiRecent: number;       // -1..+inf
}

export function masterDecision(f: MasterFeatures): ActionLevel {
  const b = getBankroll();
  if (systemPause(b)) return 'PAUSE';
  if (f.failRate > 0.4 || f.roiRecent < -0.2) return 'SKIP';
  if (f.entropia > 0.92) return 'SKIP';
  if (f.scoreEnsemble >= 90 && f.entropia < 0.85) return 'BET_AGGRESSIVE';
  if (f.scoreEnsemble >= 75) return 'BET_MEDIUM';
  if (f.scoreEnsemble >= 60) return 'BET_SMALL';
  return 'SKIP';
}
