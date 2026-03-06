import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert } from '@/integrations/supabase/types';

export interface PersistGateInput {
  userId: string;
  lottery: string;
  concurso: number;
  confidence: number;
  numbers: number[];
  foundAt?: string;
}

export interface PersistGateResult {
  gateInserted: boolean;
  betInserted: boolean;
  alreadyConfirmed: boolean;
  error: string | null;
}

function isNoRowsError(code?: string) {
  return code === 'PGRST116';
}

export async function persistGateAndBet(input: PersistGateInput): Promise<PersistGateResult> {
  const foundAt = input.foundAt ?? new Date().toISOString();
  const normalizedConfidence = Number(input.confidence.toFixed(3));

  const { data: existingGate, error: gateLookupError } = await supabase
    .from('gate_history')
    .select('id')
    .eq('user_id', input.userId)
    .eq('lottery', input.lottery)
    .eq('concurso', input.concurso)
    .limit(1)
    .maybeSingle();

  if (gateLookupError && !isNoRowsError(gateLookupError.code)) {
    return {
      gateInserted: false,
      betInserted: false,
      alreadyConfirmed: false,
      error: gateLookupError.message,
    };
  }

  let gateInserted = false;
  if (!existingGate) {
    const gatePayload: TablesInsert<'gate_history'> = {
      user_id: input.userId,
      lottery: input.lottery,
      concurso: input.concurso,
      confidence: normalizedConfidence,
      numbers: input.numbers,
      gate_status: 'APPROVED',
      found_at: foundAt,
    };

    const { error: gateInsertError } = await supabase.from('gate_history').insert(gatePayload);
    if (gateInsertError) {
      return {
        gateInserted: false,
        betInserted: false,
        alreadyConfirmed: false,
        error: gateInsertError.message,
      };
    }
    gateInserted = true;
  }

  const { data: existingBet, error: betLookupError } = await supabase
    .from('bets')
    .select('id')
    .eq('user_id', input.userId)
    .eq('lottery', input.lottery)
    .eq('concurso', input.concurso)
    .eq('status', 'confirmed')
    .limit(1)
    .maybeSingle();

  if (betLookupError && !isNoRowsError(betLookupError.code)) {
    return {
      gateInserted,
      betInserted: false,
      alreadyConfirmed: false,
      error: betLookupError.message,
    };
  }

  let betInserted = false;
  if (!existingBet) {
    const betPayload: TablesInsert<'bets'> = {
      user_id: input.userId,
      lottery: input.lottery,
      concurso: input.concurso,
      numbers: input.numbers,
      confidence: normalizedConfidence,
      status: 'confirmed',
      confirmed_at: foundAt,
    };

    const { error: betInsertError } = await supabase.from('bets').insert(betPayload);
    if (betInsertError) {
      return {
        gateInserted,
        betInserted: false,
        alreadyConfirmed: false,
        error: betInsertError.message,
      };
    }
    betInserted = true;
  }

  return {
    gateInserted,
    betInserted,
    alreadyConfirmed: Boolean(existingBet),
    error: null,
  };
}
