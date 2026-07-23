import { Bet, OfficialResult, CheckOutcome } from "./types";

// Super Sete: comparação POSIÇÃO por COLUNA. Nunca por conjunto.
// bet.extras.colunas = 7 números (1 por coluna, 0..9)
// r.extras.colunas   = 7 números sorteados (1 por coluna)
export function conferirSuperSete(bet: Bet, r: OfficialResult): CheckOutcome {
  const apostaCols = bet.extras?.colunas ?? [];
  const sorteioCols = r.extras?.colunas ?? r.dezenas;
  if (apostaCols.length !== 7 || sorteioCols.length !== 7) {
    return {
      status: "CONFERIDA", faixa: null, acertos: 0, prizeEstimate: 0,
      detalhe: { erro: "colunas incompletas" },
    };
  }
  let acertos = 0;
  const detalheCols: Array<{ col: number; aposta: number; sorteio: number; hit: boolean }> = [];
  for (let i = 0; i < 7; i++) {
    const hit = apostaCols[i] === sorteioCols[i];
    if (hit) acertos++;
    detalheCols.push({ col: i + 1, aposta: apostaCols[i], sorteio: sorteioCols[i], hit });
  }
  const faixa = acertos >= 3 ? `${acertos} colunas` : null;
  return {
    status: faixa ? "PREMIADA" : "CONFERIDA",
    faixa, acertos, prizeEstimate: 0,
    detalhe: { colunas: detalheCols },
  };
}
