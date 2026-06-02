// ============================================================
// dailyScheduler.ts — Loterias que ocorrem HOJE
// Retorna apenas 1 jogo por loteria, somente para o dia atual
// ============================================================

export type LotteryId =
  | "mega"
  | "quina"
  | "milionaria"
  | "lotofacil"
  | "timemania"
  | "lotomania"
  | "supersete"
  | "diasorte"
  | "duplasena";

export interface LotteryMeta {
  id: LotteryId;
  name: string;
  color: string;
  drawDays: number[]; // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb
  numbersRange: [number, number];
  numbersToChoose: number;
  extras?: {
    type: "trevos" | "time" | "mes";
    count?: number;
    range?: [number, number];
  };
  prizeTable: { id: string; desc: string; minPrize?: number }[];
  drawTime: string; // horário do sorteio
}

export const LOTTERIES: LotteryMeta[] = [
  {
    id: "mega",
    name: "Mega Sena",
    color: "#00c853",
    drawDays: [2, 4, 6],
    numbersRange: [1, 60],
    numbersToChoose: 6,
    drawTime: "20:00",
    prizeTable: [
      { id: "mega_6", desc: "6 acertos (Sena)" },
      { id: "mega_5", desc: "5 acertos (Quina)" },
      { id: "mega_4", desc: "4 acertos (Quadra)" },
    ],
  },
  {
    id: "quina",
    name: "Quina",
    color: "#aa00ff",
    drawDays: [1, 2, 3, 4, 5, 6],
    numbersRange: [1, 80],
    numbersToChoose: 5,
    drawTime: "20:00",
    prizeTable: [
      { id: "quina_5", desc: "5 acertos (Quina)" },
      { id: "quina_4", desc: "4 acertos (Quadra)" },
      { id: "quina_3", desc: "3 acertos (Terno)" },
      { id: "quina_2", desc: "2 acertos (Duque)" },
    ],
  },
  {
    id: "milionaria",
    name: "+Milionária",
    color: "#ff6d00",
    drawDays: [3, 6],
    numbersRange: [1, 50],
    numbersToChoose: 6,
    extras: { type: "trevos", count: 2, range: [1, 6] },
    drawTime: "20:00",
    prizeTable: [
      { id: "mil_6_2t", desc: "6 acertos + 2 trevos" },
      { id: "mil_6_1t", desc: "6 acertos + 1 ou nenhum trevo" },
      { id: "mil_5_2t", desc: "5 acertos + 2 trevos" },
      { id: "mil_5_1t", desc: "5 acertos + 1 ou nenhum trevo" },
      { id: "mil_4_2t", desc: "4 acertos + 2 trevos" },
    ],
  },
  {
    id: "lotofacil",
    name: "Lotofácil",
    color: "#e91e63",
    drawDays: [1, 2, 3, 4, 5, 6],
    numbersRange: [1, 25],
    numbersToChoose: 15,
    drawTime: "20:00",
    prizeTable: [
      { id: "lf_15", desc: "15 acertos" },
      { id: "lf_14", desc: "14 acertos" },
      { id: "lf_13", desc: "13 acertos" },
      { id: "lf_12", desc: "12 acertos" },
      { id: "lf_11", desc: "11 acertos" },
    ],
  },
  {
    id: "timemania",
    name: "Timemania",
    color: "#00bcd4",
    drawDays: [2, 4, 6],
    numbersRange: [1, 80],
    numbersToChoose: 7,
    extras: { type: "time" },
    drawTime: "20:00",
    prizeTable: [
      { id: "tm_7t", desc: "7 acertos + time do coração" },
      { id: "tm_7", desc: "7 acertos" },
      { id: "tm_6", desc: "6 acertos" },
      { id: "tm_5", desc: "5 acertos" },
      { id: "tm_3", desc: "3 acertos" },
    ],
  },
  {
    id: "lotomania",
    name: "Lotomania",
    color: "#ff9800",
    drawDays: [1, 3, 5],
    numbersRange: [0, 99],
    numbersToChoose: 50,
    drawTime: "20:00",
    prizeTable: [
      { id: "lm_20", desc: "20 acertos" },
      { id: "lm_19", desc: "19 acertos" },
      { id: "lm_18", desc: "18 acertos" },
      { id: "lm_17", desc: "17 acertos" },
      { id: "lm_16", desc: "16 acertos" },
      { id: "lm_0", desc: "0 acertos" },
    ],
  },
  {
    id: "supersete",
    name: "Super Sete",
    color: "#8bc34a",
    drawDays: [1, 3, 5],
    numbersRange: [0, 9],
    numbersToChoose: 7,
    drawTime: "15:00",
    prizeTable: [
      { id: "ss_7", desc: "7 acertos" },
      { id: "ss_6", desc: "6 acertos" },
      { id: "ss_5", desc: "5 acertos" },
      { id: "ss_4", desc: "4 acertos" },
      { id: "ss_3", desc: "3 acertos" },
    ],
  },
  {
    id: "diasorte",
    name: "Dia de Sorte",
    color: "#ffd600",
    drawDays: [2, 4, 6],
    numbersRange: [1, 31],
    numbersToChoose: 7,
    extras: { type: "mes" },
    drawTime: "20:00",
    prizeTable: [
      { id: "ds_7m", desc: "7 acertos + mês da sorte" },
      { id: "ds_7", desc: "7 acertos" },
      { id: "ds_6", desc: "6 acertos" },
      { id: "ds_5", desc: "5 acertos" },
      { id: "ds_4", desc: "4 acertos" },
      { id: "ds_mes", desc: "Mês da Sorte" },
    ],
  },
  {
    id: "duplasena",
    name: "Dupla Sena",
    color: "#f44336",
    drawDays: [1, 3, 5],
    numbersRange: [1, 50],
    numbersToChoose: 6,
    drawTime: "20:00",
    prizeTable: [
      { id: "ds1_6", desc: "1º Sorteio — 6 acertos" },
      { id: "ds1_5", desc: "1º Sorteio — 5 acertos" },
      { id: "ds1_4", desc: "1º Sorteio — 4 acertos" },
      { id: "ds2_6", desc: "2º Sorteio — 6 acertos" },
      { id: "ds2_5", desc: "2º Sorteio — 5 acertos" },
      { id: "ds2_4", desc: "2º Sorteio — 4 acertos" },
    ],
  },
];

/** Retorna apenas as loterias que sorteiam hoje */
export function getTodayLotteries(): LotteryMeta[] {
  const dayOfWeek = new Date().getDay(); // 0=Dom ... 6=Sáb
  return LOTTERIES.filter((l) => l.drawDays.includes(dayOfWeek));
}

/** Retorna a loteria pelo id */
export function getLottery(id: LotteryId): LotteryMeta | undefined {
  return LOTTERIES.find((l) => l.id === id);
}
