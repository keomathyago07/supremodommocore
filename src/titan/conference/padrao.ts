import { Bet, OfficialResult, CheckOutcome } from "./types";

const TIERS: Record<string, Record<number, string>> = {
  megasena: { 6: "Sena", 5: "Quina", 4: "Quadra" },
  quina:    { 5: "Quina", 4: "Quadra", 3: "Terno", 2: "Duque" },
  lotofacil:{ 15: "15 acertos", 14: "14 acertos", 13: "13 acertos", 12: "12 acertos", 11: "11 acertos" },
};

export function conferirPadrao(bet: Bet, r: OfficialResult): CheckOutcome {
  const set = new Set(r.dezenas);
  const acertos = bet.numeros.filter(n => set.has(n)).length;
  const faixa = TIERS[bet.lottery]?.[acertos] ?? null;
  return {
    status: faixa ? "PREMIADA" : "CONFERIDA",
    faixa, acertos, prizeEstimate: 0,
    detalhe: { dezenasSorteadas: r.dezenas },
  };
}
