import { Bet, OfficialResult, CheckOutcome } from "./types";

// Faixas oficiais: 6+2, 6+1, 6+0, 5+2, 5+1, 5+0, 4+2, 4+1, 4+0, 3+2, 3+1, 2+2, 2+1
const FAIXAS: Array<[number, number]> = [
  [6, 2], [6, 1], [6, 0], [5, 2], [5, 1], [5, 0],
  [4, 2], [4, 1], [4, 0], [3, 2], [3, 1], [2, 2], [2, 1],
];

export function conferirMaisMilionaria(bet: Bet, r: OfficialResult): CheckOutcome {
  const setDez = new Set(r.dezenas);
  const setTrv = new Set(r.extras?.trevos ?? []);
  const acertos = bet.numeros.filter(n => setDez.has(n)).length;
  const trevos = (bet.extras?.trevos ?? []).filter(t => setTrv.has(t)).length;

  const match = FAIXAS.find(([d, t]) => acertos === d && trevos === t);
  const faixa = match ? `${match[0]}+${match[1]}` : null;

  return {
    status: faixa ? "PREMIADA" : "CONFERIDA",
    faixa, acertos, acertosExtra: trevos,
    prizeEstimate: 0,
    detalhe: { dezenas: acertos, trevos, trevosSorteados: r.extras?.trevos },
  };
}
