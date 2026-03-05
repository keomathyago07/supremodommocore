
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.api_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL DEFAULT 'apiloterias',
  token TEXT NOT NULL,
  is_valid BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.api_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own tokens" ON public.api_tokens FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_api_tokens_updated_at BEFORE UPDATE ON public.api_tokens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.bets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lottery TEXT NOT NULL,
  concurso INTEGER NOT NULL,
  numbers INTEGER[] NOT NULL,
  confidence NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  hits INTEGER,
  prize_amount NUMERIC,
  draw_numbers INTEGER[],
  confirmed_at TIMESTAMPTZ,
  checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own bets" ON public.bets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_bets_updated_at BEFORE UPDATE ON public.bets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.gate_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lottery TEXT NOT NULL,
  concurso INTEGER NOT NULL,
  confidence NUMERIC NOT NULL,
  numbers INTEGER[] NOT NULL,
  gate_status TEXT NOT NULL DEFAULT 'APPROVED',
  found_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gate_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own gate_history" ON public.gate_history FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.ai_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lottery TEXT NOT NULL,
  memory_type TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own ai_memory" ON public.ai_memory FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_ai_memory_updated_at BEFORE UPDATE ON public.ai_memory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.gate_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  min_confidence NUMERIC NOT NULL DEFAULT 99.9,
  auto_approve BOOLEAN NOT NULL DEFAULT true,
  notify_on_gate BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gate_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own gate_config" ON public.gate_config FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_gate_config_updated_at BEFORE UPDATE ON public.gate_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
