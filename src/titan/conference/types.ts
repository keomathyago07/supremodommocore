// Conferência Inteligente — tipos compartilhados
export type LotteryId =
  | "megasena" | "quina" | "lotofacil" | "lotomania"
  | "timemania" | "duplasena" | "diadesorte"
  | "supersete" | "maismilionaria";

export interface OfficialResult {
  lottery: LotteryId;
  concurso: number;
  dataApuracao: string; // YYYY-MM-DD (BRT)
  status: "OFICIAL" | "PROVISORIO" | "AGUARDANDO";
  dezenas: number[];          // dezenas principais
  extras?: {
    mesSorte?: string;        // Dia de Sorte
    timeCoracao?: string;     // Timemania
    trevos?: number[];        // +Milionária
    dezenas2?: number[];      // Dupla Sena (2º sorteio)
    colunas?: number[];       // Super Sete (7 números por coluna)
  };
}

export interface Bet {
  id: string;
  lottery: LotteryId;
  concurso: number;
  numeros: number[];
  extras?: {
    mesSorte?: string;
    timeCoracao?: string;
    trevos?: number[];
    colunas?: number[];        // Super Sete: 1 número por coluna
    complementar?: number[];   // Lotomania: 50 dezenas complementares
  };
}

export interface CheckOutcome {
  status: "AGUARDANDO_OFICIAL" | "CONFERIDA" | "PREMIADA";
  faixa: string | null;
  acertos: number;
  acertosExtra?: number;       // trevos, mês, time, complementar
  prizeEstimate: number;
  detalhe: Record<string, unknown>;
}
