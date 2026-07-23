import { Bet, OfficialResult, CheckOutcome } from "./types";

export function conferirDiaSorte(bet: Bet, r: OfficialResult): CheckOutcome {
  const set = new Set(r.dezenas);
  const acertos = bet.numeros.filter(n => set.has(n)).length;
  const mesOk = !!(bet.extras?.mesSorte && r.extras?.mesSorte &&
    bet.extras.mesSorte.toLowerCase() === r.extras.mesSorte.toLowerCase());

  let faixa: string | null = null;
  if (acertos === 7) faixa = "7 acertos";
  else if (acertos === 6) faixa = "6 acertos";
  else if (acertos === 5) faixa = "5 acertos";
  else if (acertos === 4) faixa = "4 acertos";
  else if (mesOk) faixa = "Mês da Sorte";

  return {
    status: faixa ? "PREMIADA" : "CONFERIDA",
    faixa, acertos,
    acertosExtra: mesOk ? 1 : 0,
    prizeEstimate: 0,
    detalhe: { mesSorteApostado: bet.extras?.mesSorte, mesSorteado: r.extras?.mesSorte, mesOk },
  };
}
