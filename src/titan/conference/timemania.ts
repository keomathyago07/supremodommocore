import { Bet, OfficialResult, CheckOutcome } from "./types";

const TIERS: Record<number, string> = { 7: "7 acertos", 6: "6 acertos", 5: "5 acertos", 4: "4 acertos", 3: "3 acertos" };

export function conferirTimemania(bet: Bet, r: OfficialResult): CheckOutcome {
  const set = new Set(r.dezenas);
  const acertos = bet.numeros.filter(n => set.has(n)).length;
  const timeOk = !!(bet.extras?.timeCoracao && r.extras?.timeCoracao &&
    bet.extras.timeCoracao.toLowerCase() === r.extras.timeCoracao.toLowerCase());

  let faixa = TIERS[acertos] ?? null;
  if (!faixa && timeOk) faixa = "Time do Coração";

  return {
    status: faixa ? "PREMIADA" : "CONFERIDA",
    faixa, acertos, acertosExtra: timeOk ? 1 : 0,
    prizeEstimate: 0,
    detalhe: { timeApostado: bet.extras?.timeCoracao, timeSorteado: r.extras?.timeCoracao, timeOk },
  };
}
