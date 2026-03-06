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

export async function persistGateOnly(input: PersistGateInput): Promise<PersistGateResult> {
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

  if (gateLookupError) {
    return { gateInserted: false, betInserted: false, alreadyConfirmed: false, error: gateLookupError.message };
  }

  if (existingGate) {
    return { gateInserted: false, betInserted: false, alreadyConfirmed: false, error: null };
  }

  const gatePayload: TablesInsert<'gate_history'> = {
    user_id: input.userId,
    lottery: input.lottery,
    concurso: input.concurso,
    confidence: normalizedConfidence,
    numbers: input.numbers,
    gate_status: 'PENDING',
    found_at: foundAt,
  };

  const { error: gateInsertError } = await supabase.from('gate_history').insert(gatePayload);
  if (gateInsertError) {
    return { gateInserted: false, betInserted: false, alreadyConfirmed: false, error: gateInsertError.message };
  }

  return { gateInserted: true, betInserted: false, alreadyConfirmed: false, error: null };
}

export async function confirmGateAndCreateBet(input: PersistGateInput): Promise<PersistGateResult> {
  const normalizedConfidence = Number(input.confidence.toFixed(3));
  const foundAt = input.foundAt ?? new Date().toISOString();

  // Update gate status to APPROVED
  const { error: updateError } = await supabase
    .from('gate_history')
    .update({ gate_status: 'APPROVED' })
    .eq('user_id', input.userId)
    .eq('lottery', input.lottery)
    .eq('concurso', input.concurso);

  if (updateError) {
    return { gateInserted: false, betInserted: false, alreadyConfirmed: false, error: updateError.message };
  }

  // Check existing bet
  const { data: existingBet } = await supabase
    .from('bets')
    .select('id')
    .eq('user_id', input.userId)
    .eq('lottery', input.lottery)
    .eq('concurso', input.concurso)
    .eq('status', 'confirmed')
    .limit(1)
    .maybeSingle();

  if (existingBet) {
    return { gateInserted: false, betInserted: false, alreadyConfirmed: true, error: null };
  }

  const betPayload: TablesInsert<'bets'> = {
    user_id: input.userId,
    lottery: input.lottery,
    concurso: input.concurso,
    numbers: input.numbers,
    confidence: normalizedConfidence,
    status: 'confirmed',
    confirmed_at: new Date().toISOString(),
  };

  const { error: betInsertError } = await supabase.from('bets').insert(betPayload);
  if (betInsertError) {
    return { gateInserted: false, betInserted: false, alreadyConfirmed: false, error: betInsertError.message };
  }

  return { gateInserted: true, betInserted: true, alreadyConfirmed: false, error: null };
}

// Keep backward compat
export const persistGateAndBet = persistGateOnly;
