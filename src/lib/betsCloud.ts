// ============================================================
// betsCloud.ts — Persistência de apostas confirmadas + conferência
// Grava em public.bets, public.gate_history e public.result_checks
// Faz polling em public.resultados_sorteios para conferir automaticamente
// ============================================================
import { supabase } from "@/integrations/supabase/client";

// Mapeia ids internos do Terror v2 para chaves de loteria do backend
const LOTTERY_MAP: Record<string, string> = {
  mega: "megasena",
  quina: "quina",
  lotofacil: "lotofacil",
  lotomania: "lotomania",
  timemania: "timemania",
  duplasena: "duplasena",
  diasorte: "diadesorte",
  supersete: "supersete",
  milionaria: "maismilionaria",
};

export function backendLotteryKey(id: string): string {
  return LOTTERY_MAP[id] ?? id;
}

export async function persistConfirmedBet(input: {
  lotteryId: string;
  numbers: number[];
  confidence: number;
  concurso?: number;
}): Promise<{ ok: boolean; betId?: string; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "no-auth" };
  const lottery = backendLotteryKey(input.lotteryId);
  const concurso = input.concurso ?? 0;

  // gate_history (snapshot do que foi aprovado)
  await supabase.from("gate_history").insert({
    user_id: user.id,
    lottery,
    concurso,
    numbers: input.numbers,
    confidence: Number(input.confidence.toFixed(3)),
    gate_status: "APPROVED",
  } as any);

  // bets
  const { data, error } = await supabase
    .from("bets")
    .insert({
      user_id: user.id,
      lottery,
      concurso,
      numbers: input.numbers,
      confidence: Number(input.confidence.toFixed(3)),
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
    } as any)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  return { ok: true, betId: (data as any)?.id };
}

export async function fetchLatestResult(lotteryId: string): Promise<{ concurso: number; dezenas: number[] } | null> {
  const lottery = backendLotteryKey(lotteryId);
  const { data } = await supabase
    .from("resultados_sorteios")
    .select("concurso, dezenas")
    .eq("loteria", lottery)
    .order("concurso", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return { concurso: (data as any).concurso, dezenas: (data as any).dezenas ?? [] };
}

export async function saveResultCheck(input: {
  lotteryId: string;
  concurso: number;
  betNumbers: number[];
  drawNumbers: number[];
  hits: number;
  prizeTier?: string | null;
  prizeValue?: number;
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const matched = input.betNumbers.filter((n) => input.drawNumbers.includes(n));
  await supabase.from("result_checks").insert({
    user_id: user.id,
    lottery: backendLotteryKey(input.lotteryId),
    concurso: input.concurso,
    bet_numbers: input.betNumbers,
    draw_numbers: input.drawNumbers,
    matched_numbers: matched,
    hits: input.hits,
    prize_tier: input.prizeTier ?? null,
    prize_value: input.prizeValue ?? 0,
  } as any);
  // Atualiza a aposta correspondente
  await supabase
    .from("bets")
    .update({
      hits: input.hits,
      prize_amount: input.prizeValue ?? 0,
      draw_numbers: input.drawNumbers,
      checked_at: new Date().toISOString(),
      status: (input.prizeValue ?? 0) > 0 ? "won" : "checked",
    } as any)
    .eq("user_id", user.id)
    .eq("lottery", backendLotteryKey(input.lotteryId))
    .eq("concurso", input.concurso);
}
