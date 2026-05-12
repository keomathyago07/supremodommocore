// ============================================================
// lotteryRules.ts — Regras oficiais de premiação de cada loteria
// ============================================================

export interface PrizeTier {
  id: string;
  description: string;
  enabled: boolean;
}

export interface LotteryRule {
  id: string;
  name: string;
  color: string;
  drawDays: string[];
  prizeTiers: PrizeTier[];
}

export const LOTTERY_RULES: LotteryRule[] = [
  {
    id: "mega",
    name: "Mega Sena",
    color: "#00c853",
    drawDays: ["Terça-feira", "Quinta-feira", "Sábado"],
    prizeTiers: [
      { id: "mega_6", description: "6 acertos (Sena)", enabled: true },
      { id: "mega_5", description: "5 acertos (Quina)", enabled: true },
      { id: "mega_4", description: "4 acertos (Quadra)", enabled: true },
    ],
  },
  {
    id: "quina",
    name: "Quina",
    color: "#aa00ff",
    drawDays: ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"],
    prizeTiers: [
      { id: "quina_5", description: "5 acertos (Quina)", enabled: true },
      { id: "quina_4", description: "4 acertos (Quadra)", enabled: true },
      { id: "quina_3", description: "3 acertos (Terno)", enabled: true },
      { id: "quina_2", description: "2 acertos (Duque)", enabled: true },
    ],
  },
  {
    id: "milionaria",
    name: "+Milionária",
    color: "#ff6d00",
    drawDays: ["Quarta-feira", "Sábado"],
    prizeTiers: [
      { id: "mil_6_2t", description: "6 acertos + 2 trevos", enabled: true },
      { id: "mil_6_1t", description: "6 acertos + 1 ou nenhum trevo", enabled: true },
      { id: "mil_5_2t", description: "5 acertos + 2 trevos", enabled: true },
      { id: "mil_5_1t", description: "5 acertos + 1 ou nenhum trevo", enabled: true },
      { id: "mil_4_2t", description: "4 acertos + 2 trevos", enabled: true },
      { id: "mil_4_1t", description: "4 acertos + 1 ou nenhum trevo", enabled: true },
      { id: "mil_3_2t", description: "3 acertos + 2 trevos", enabled: true },
      { id: "mil_2_2t", description: "2 acertos + 2 trevos", enabled: true },
    ],
  },
  {
    id: "lotofacil",
    name: "Lotofácil",
    color: "#e91e63",
    drawDays: ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"],
    prizeTiers: [
      { id: "lf_15", description: "15 acertos", enabled: true },
      { id: "lf_14", description: "14 acertos", enabled: true },
      { id: "lf_13", description: "13 acertos", enabled: true },
      { id: "lf_12", description: "12 acertos", enabled: true },
      { id: "lf_11", description: "11 acertos", enabled: true },
    ],
  },
  {
    id: "timemania",
    name: "Timemania",
    color: "#00bcd4",
    drawDays: ["Terça-feira", "Quinta-feira", "Sábado"],
    prizeTiers: [
      { id: "tm_7t", description: "7 acertos + time do coração", enabled: true },
      { id: "tm_7", description: "7 acertos", enabled: true },
      { id: "tm_6", description: "6 acertos", enabled: true },
      { id: "tm_5", description: "5 acertos", enabled: true },
      { id: "tm_3", description: "3 acertos", enabled: true },
    ],
  },
  {
    id: "lotomania",
    name: "Lotomania",
    color: "#ff9800",
    drawDays: ["Segunda-feira", "Quarta-feira", "Sexta-feira"],
    prizeTiers: [
      { id: "lm_20", description: "20 acertos", enabled: true },
      { id: "lm_19", description: "19 acertos", enabled: true },
      { id: "lm_18", description: "18 acertos", enabled: true },
      { id: "lm_17", description: "17 acertos", enabled: true },
      { id: "lm_16", description: "16 acertos", enabled: true },
      { id: "lm_0", description: "0 acertos (acidente!)", enabled: true },
    ],
  },
  {
    id: "supersete",
    name: "Super Sete",
    color: "#8bc34a",
    drawDays: ["Segunda-feira", "Quarta-feira", "Sexta-feira"],
    prizeTiers: [
      { id: "ss_7", description: "7 acertos", enabled: true },
      { id: "ss_6", description: "6 acertos", enabled: true },
      { id: "ss_5", description: "5 acertos", enabled: true },
      { id: "ss_4", description: "4 acertos", enabled: true },
      { id: "ss_3", description: "3 acertos", enabled: true },
    ],
  },
  {
    id: "diasorte",
    name: "Dia de Sorte",
    color: "#ffd600",
    drawDays: ["Terça-feira", "Quinta-feira", "Sábado"],
    prizeTiers: [
      { id: "ds_7m", description: "7 acertos + mês da sorte", enabled: true },
      { id: "ds_7", description: "7 acertos", enabled: true },
      { id: "ds_6", description: "6 acertos", enabled: true },
      { id: "ds_5", description: "5 acertos", enabled: true },
      { id: "ds_4", description: "4 acertos", enabled: true },
      { id: "ds_mes", description: "Mês da Sorte", enabled: true },
    ],
  },
  {
    id: "duplasena",
    name: "Dupla Sena",
    color: "#f44336",
    drawDays: ["Segunda-feira", "Quarta-feira", "Sexta-feira"],
    prizeTiers: [
      { id: "ds1_6", description: "1º Sorteio — 6 acertos", enabled: true },
      { id: "ds1_5", description: "1º Sorteio — 5 acertos", enabled: true },
      { id: "ds1_4", description: "1º Sorteio — 4 acertos", enabled: true },
      { id: "ds2_6", description: "2º Sorteio — 6 acertos", enabled: true },
      { id: "ds2_5", description: "2º Sorteio — 5 acertos", enabled: true },
      { id: "ds2_4", description: "2º Sorteio — 4 acertos", enabled: true },
    ],
  },
];

export function isWinner(lotteryId: string, tierId: string, customRules?: LotteryRule[]): boolean {
  const rules = customRules ?? LOTTERY_RULES;
  const lottery = rules.find((l) => l.id === lotteryId);
  if (!lottery) return false;
  return lottery.prizeTiers.find((t) => t.id === tierId)?.enabled ?? false;
}

export function getEnabledTiers(lotteryId: string, customRules?: LotteryRule[]): PrizeTier[] {
  const rules = customRules ?? LOTTERY_RULES;
  const lottery = rules.find((l) => l.id === lotteryId);
  return lottery?.prizeTiers.filter((t) => t.enabled) ?? [];
}
