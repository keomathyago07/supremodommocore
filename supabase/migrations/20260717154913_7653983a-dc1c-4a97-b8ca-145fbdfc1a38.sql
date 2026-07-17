
CREATE TABLE public.titan_backtest_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  nome TEXT NOT NULL DEFAULT 'Agendamento',
  loterias TEXT[] NOT NULL DEFAULT '{}',
  algoritmos TEXT[] NOT NULL DEFAULT '{}',
  ia_engine TEXT NOT NULL DEFAULT 'Titan-Ensemble-Quantum',
  window_size INT NOT NULL DEFAULT 20,
  max_samples INT NOT NULL DEFAULT 300,
  interval_hours NUMERIC NOT NULL DEFAULT 24,
  proxima_execucao TIMESTAMPTZ NOT NULL DEFAULT now(),
  ultima_execucao TIMESTAMPTZ,
  ultimo_status TEXT,
  ultimo_resumo JSONB,
  execucoes_total INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.titan_backtest_schedules TO authenticated;
GRANT ALL ON public.titan_backtest_schedules TO service_role;

ALTER TABLE public.titan_backtest_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_schedules_all"
ON public.titan_backtest_schedules
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_backtest_sched_updated
BEFORE UPDATE ON public.titan_backtest_schedules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_backtest_sched_next ON public.titan_backtest_schedules(user_id, ativo, proxima_execucao);
