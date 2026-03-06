export interface LotteryPrize {
  lotteryId: string;
  estimatedPrize: string;
  prizeValue: number;
}

// Estimated prizes based on typical accumulated values
export const LOTTERY_PRIZES: Record<string, LotteryPrize> = {
  megasena: { lotteryId: 'megasena', estimatedPrize: 'R$ 45.000.000,00', prizeValue: 45000000 },
  lotofacil: { lotteryId: 'lotofacil', estimatedPrize: 'R$ 2.000.000,00', prizeValue: 2000000 },
  quina: { lotteryId: 'quina', estimatedPrize: 'R$ 12.500.000,00', prizeValue: 12500000 },
  lotomania: { lotteryId: 'lotomania', estimatedPrize: 'R$ 1.100.000,00', prizeValue: 1100000 },
  timemania: { lotteryId: 'timemania', estimatedPrize: 'R$ 9.400.000,00', prizeValue: 9400000 },
  duplasena: { lotteryId: 'duplasena', estimatedPrize: 'R$ 3.700.000,00', prizeValue: 3700000 },
  diadesorte: { lotteryId: 'diadesorte', estimatedPrize: 'R$ 1.200.000,00', prizeValue: 1200000 },
  supersete: { lotteryId: 'supersete', estimatedPrize: 'R$ 3.200.000,00', prizeValue: 3200000 },
  maismilionaria: { lotteryId: 'maismilionaria', estimatedPrize: 'R$ 28.000.000,00', prizeValue: 28000000 },
};

export function getPrizeForLottery(lotteryId: string): LotteryPrize | null {
  return LOTTERY_PRIZES[lotteryId] || null;
}

export function formatPrize(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function getTotalPrizesToday(lotteryIds: string[]): number {
  return lotteryIds.reduce((sum, id) => sum + (LOTTERY_PRIZES[id]?.prizeValue || 0), 0);
}
