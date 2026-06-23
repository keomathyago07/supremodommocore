
CREATE TABLE IF NOT EXISTS public.titan_backtest_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  loteria TEXT NOT NULL,
  ia_engine TEXT NOT NULL,
  algoritmo TEXT NOT NULL,
  amostras INTEGER NOT NULL DEFAULT 0,
  acertos_total INTEGER NOT NULL DEFAULT 0,
  hit_rate NUMERIC NOT NULL DEFAULT 0,
  precisao NUMERIC NOT NULL DEFAULT 0,
  roi_simulado NUMERIC NOT NULL DEFAULT 0,
  brier_score NUMERIC NOT NULL DEFAULT 0,
  ci_low NUMERIC NOT NULL DEFAULT 0,
  ci_high NUMERIC NOT NULL DEFAULT 0,
  risk_level TEXT NOT NULL DEFAULT 'medium',
  garantia_nivel TEXT NOT NULL DEFAULT 'media',
  faixa_acertos JSONB NOT NULL DEFAULT '{}'::jsonb,
  calibracao JSONB NOT NULL DEFAULT '{}'::jsonb,
  parametros JSONB NOT NULL DEFAULT '{}'::jsonb,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.titan_backtest_runs TO authenticated;
GRANT ALL ON public.titan_backtest_runs TO service_role;

ALTER TABLE public.titan_backtest_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own backtest runs"
  ON public.titan_backtest_runs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_titan_backtest_user_loteria ON public.titan_backtest_runs(user_id, loteria, created_at DESC);
