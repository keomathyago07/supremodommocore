// ============================================================
// useBetStatus.ts — Hook que confere se uma aposta é Premiada
// ============================================================
import { useLotteryRulesStore } from "@/store/lotteryRulesStore";

export type BetStatus = "premiada" | "aguardando" | "nao_premiada";

export interface BetCheckResult {
  status: BetStatus;
  matchedTier: string | null;
}

export function useBetStatus() {
  const { isPrize } = useLotteryRulesStore();

  function checkBet(
    lotteryId: string,
    acertos: number | null,
    extras?: { trevos?: number; timeDoCoracao?: boolean; mesCorreto?: boolean; sorteio?: 1 | 2 }
  ): BetCheckResult {
    if (acertos === null) return { status: "aguardando", matchedTier: null };
    const tierId = resolveTierId(lotteryId, acertos, extras);
    if (!tierId) return { status: "nao_premiada", matchedTier: null };
    const won = isPrize(lotteryId, tierId);
    return { status: won ? "premiada" : "nao_premiada", matchedTier: won ? tierId : null };
  }

  return { checkBet };
}

function resolveTierId(
  lotteryId: string,
  acertos: number,
  extras?: { trevos?: number; timeDoCoracao?: boolean; mesCorreto?: boolean; sorteio?: 1 | 2 }
): string | null {
  const t = extras?.trevos ?? 0;
  switch (lotteryId) {
    case "mega":
      if (acertos === 6) return "mega_6";
      if (acertos === 5) return "mega_5";
      if (acertos === 4) return "mega_4";
      return null;
    case "quina":
      if (acertos === 5) return "quina_5";
      if (acertos === 4) return "quina_4";
      if (acertos === 3) return "quina_3";
      if (acertos === 2) return "quina_2";
      return null;
    case "milionaria":
      if (acertos === 6 && t === 2) return "mil_6_2t";
      if (acertos === 6 && t <= 1) return "mil_6_1t";
      if (acertos === 5 && t === 2) return "mil_5_2t";
      if (acertos === 5 && t <= 1) return "mil_5_1t";
      if (acertos === 4 && t === 2) return "mil_4_2t";
      if (acertos === 4 && t <= 1) return "mil_4_1t";
      if (acertos === 3 && t === 2) return "mil_3_2t";
      if (acertos === 2 && t === 2) return "mil_2_2t";
      return null;
    case "lotofacil":
      if (acertos === 15) return "lf_15";
      if (acertos === 14) return "lf_14";
      if (acertos === 13) return "lf_13";
      if (acertos === 12) return "lf_12";
      if (acertos === 11) return "lf_11";
      return null;
    case "timemania":
      if (acertos === 7 && extras?.timeDoCoracao) return "tm_7t";
      if (acertos === 7) return "tm_7";
      if (acertos === 6) return "tm_6";
      if (acertos === 5) return "tm_5";
      if (acertos === 3) return "tm_3";
      return null;
    case "lotomania":
      if (acertos === 20) return "lm_20";
      if (acertos === 19) return "lm_19";
      if (acertos === 18) return "lm_18";
      if (acertos === 17) return "lm_17";
      if (acertos === 16) return "lm_16";
      if (acertos === 0) return "lm_0";
      return null;
    case "supersete":
      if (acertos === 7) return "ss_7";
      if (acertos === 6) return "ss_6";
      if (acertos === 5) return "ss_5";
      if (acertos === 4) return "ss_4";
      if (acertos === 3) return "ss_3";
      return null;
    case "diasorte":
      if (acertos === 7 && extras?.mesCorreto) return "ds_7m";
      if (acertos === 7) return "ds_7";
      if (acertos === 6) return "ds_6";
      if (acertos === 5) return "ds_5";
      if (acertos === 4) return "ds_4";
      if (extras?.mesCorreto) return "ds_mes";
      return null;
    case "duplasena": {
      const s = extras?.sorteio ?? 1;
      if (acertos === 6 && s === 1) return "ds1_6";
      if (acertos === 5 && s === 1) return "ds1_5";
      if (acertos === 4 && s === 1) return "ds1_4";
      if (acertos === 6 && s === 2) return "ds2_6";
      if (acertos === 5 && s === 2) return "ds2_5";
      if (acertos === 4 && s === 2) return "ds2_4";
      return null;
    }
    default:
      return null;
  }
}
