import { Bet, OfficialResult, CheckOutcome } from "./types";

const FAIXAS = new Set([20, 19, 18, 17, 16, 15, 0]);

// Conferência dupla: 50 principais + 50 complementares.
// Regra: complementar = 20 - principal (Lotomania sorteia 20 dezenas).
export function conferirLotomania(bet: Bet, r: OfficialResult): CheckOutcome {
  const sorteio = new Set(r.dezenas);
  const principal = bet.numeros.filter(n => sorteio.has(n)).length;

  // se complementar não veio explicitamente, deduz 1..100 \ principal
  const complementarBet = bet.extras?.complementar ??
    Array.from({ length: 100 }, (_, i) => i).filter(n => !bet.numeros.includes(n));
  const complementar = complementarBet.filter(n => sorteio.has(n)).length;

  // sanity: principal + complementar deve = 20
  const somaOk = principal + complementar === 20;

  const premiadoPrincipal = FAIXAS.has(principal);
  const premiadoComplementar = FAIXAS.has(complementar);
  const premiada = premiadoPrincipal || premiadoComplementar;

  const faixa = premiada
    ? [
        premiadoPrincipal ? `Principal ${principal}` : null,
        premiadoComplementar ? `Complementar ${complementar}` : null,
      ].filter(Boolean).join(" · ")
    : null;

  return {
    status: premiada ? "PREMIADA" : "CONFERIDA",
    faixa,
    acertos: principal,
    acertosExtra: complementar,
    prizeEstimate: 0,
    detalhe: { principal, complementar, somaOk, dezenasSorteadas: r.dezenas },
  };
}
