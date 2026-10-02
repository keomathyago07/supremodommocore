CREATE TABLE public.agenda_previsoes (
  user_id uuid PRIMARY KEY,
  ativo boolean NOT NULL DEFAULT true,
  horario text NOT NULL DEFAULT '19:30',
  ultima_execucao timestamptz,
  ultimo_resumo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agenda_previsoes TO authenticated;
GRANT ALL ON public.agenda_previsoes TO service_role;
ALTER TABLE public.agenda_previsoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own agenda" ON public.agenda_previsoes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_agenda_prev_updated BEFORE UPDATE ON public.agenda_previsoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.envio_previsoes_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  data_envio date NOT NULL,
  loteria text NOT NULL,
  aposta_id uuid,
  numeros integer[],
  status text NOT NULL,
  detalhe text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, data_envio, loteria)
);
GRANT SELECT ON public.envio_previsoes_log TO authenticated;
GRANT ALL ON public.envio_previsoes_log TO service_role;
ALTER TABLE public.envio_previsoes_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own envio log" ON public.envio_previsoes_log FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

INSERT INTO public.ingest_jobs(job, lease_until, paused, runs_total, updated_at)
VALUES ('envio_previsoes', now() - interval '1 minute', false, 0, now())
ON CONFLICT (job) DO NOTHING;