import { Bet, OfficialResult, CheckOutcome } from "./types";

const TIERS: Record<number, string> = { 6: "Sena", 5: "Quina", 4: "Quadra", 3: "Terno" };

// Dois motores independentes — cada sorteio confere em separado.
export function conferirDuplaSena(bet: Bet, r: OfficialResult): CheckOutcome {
  const set1 = new Set(r.dezenas);
  const set2 = new Set(r.extras?.dezenas2 ?? []);

  const a1 = bet.numeros.filter(n => set1.has(n)).length;
  const a2 = bet.numeros.filter(n => set2.has(n)).length;

  const f1 = TIERS[a1] ?? null;
  const f2 = TIERS[a2] ?? null;

  const faixa = [
    f1 ? `1º sorteio: ${f1}` : null,
    f2 ? `2º sorteio: ${f2}` : null,
  ].filter(Boolean).join(" · ") || null;

  return {
    status: faixa ? "PREMIADA" : "CONFERIDA",
    faixa,
    acertos: Math.max(a1, a2),
    prizeEstimate: 0,
    detalhe: {
      sorteio1: { acertos: a1, faixa: f1, dezenas: r.dezenas },
      sorteio2: { acertos: a2, faixa: f2, dezenas: r.extras?.dezenas2 },
    },
  };
}
