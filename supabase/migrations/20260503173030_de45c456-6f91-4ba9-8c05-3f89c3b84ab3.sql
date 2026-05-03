
-- 1) Calendário oficial das loterias
CREATE TABLE IF NOT EXISTS public.loterias_calendario (
  loteria TEXT PRIMARY KEY,
  dias_semana INTEGER[] NOT NULL, -- 0=dom..6=sab
  hora_sorteio TEXT NOT NULL DEFAULT '21:00',
  threshold_atraso INTEGER NOT NULL DEFAULT 20,
  qtd_dezenas_total INTEGER NOT NULL DEFAULT 60,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.loterias_calendario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read calendario" ON public.loterias_calendario FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "auth write calendario" ON public.loterias_calendario FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.loterias_calendario(loteria, dias_semana, hora_sorteio, threshold_atraso, qtd_dezenas_total) VALUES
  ('megasena', ARRAY[2,4,6], '20:00', 20, 60),
  ('lotofacil', ARRAY[1,2,3,4,5,6], '20:00', 4, 25),
  ('quina', ARRAY[1,2,3,4,5,6], '20:00', 32, 80),
  ('lotomania', ARRAY[1,3,5], '20:00', 14, 100),
  ('timemania', ARRAY[2,4,6], '20:00', 28, 80),
  ('duplasena', ARRAY[2,4,6], '20:00', 24, 50),
  ('diadesorte', ARRAY[2,4,6], '20:00', 18, 31),
  ('supersete', ARRAY[1,3,5], '15:00', 12, 10),
  ('maismilionaria', ARRAY[3,6], '20:00', 22, 50)
ON CONFLICT (loteria) DO UPDATE SET
  dias_semana = EXCLUDED.dias_semana,
  hora_sorteio = EXCLUDED.hora_sorteio,
  threshold_atraso = EXCLUDED.threshold_atraso,
  qtd_dezenas_total = EXCLUDED.qtd_dezenas_total,
  updated_at = now();

-- 2) Alertas de atraso (9 loterias)
CREATE TABLE IF NOT EXISTS public.alertas_atraso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  loteria TEXT NOT NULL,
  numero INTEGER NOT NULL,
  atraso INTEGER NOT NULL,
  concurso_referencia INTEGER,
  hash TEXT NOT NULL,
  notificado BOOLEAN NOT NULL DEFAULT false,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, hash)
);
CREATE INDEX IF NOT EXISTS idx_alertas_atraso_user_lot ON public.alertas_atraso(user_id, loteria, criado_em DESC);
ALTER TABLE public.alertas_atraso ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own alertas_atraso" ON public.alertas_atraso FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER alertas_atraso_set_user
  BEFORE INSERT ON public.alertas_atraso
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id_automatico();

-- 3) Deduplicação global TTL 6h
CREATE TABLE IF NOT EXISTS public.alertas_dedupe (
  hash TEXT PRIMARY KEY,
  loteria TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'atraso',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alertas_dedupe ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage dedupe" ON public.alertas_dedupe FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "public read dedupe" ON public.alertas_dedupe FOR SELECT TO anon, authenticated USING (true);

-- 4) Engine config supremo
CREATE TABLE IF NOT EXISTS public.engine_config_supremo (
  loteria TEXT PRIMARY KEY,
  peso_mcmc NUMERIC NOT NULL DEFAULT 0.55,
  peso_stacking NUMERIC NOT NULL DEFAULT 0.35,
  peso_lstm NUMERIC NOT NULL DEFAULT 0.10,
  timeout_mcmc_ms INTEGER NOT NULL DEFAULT 30000,
  timeout_lstm_ms INTEGER NOT NULL DEFAULT 20000,
  timeout_stacking_ms INTEGER NOT NULL DEFAULT 5000,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.engine_config_supremo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read engine_cfg" ON public.engine_config_supremo FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "auth write engine_cfg" ON public.engine_config_supremo FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.engine_config_supremo(loteria) VALUES
  ('megasena'),('lotofacil'),('quina'),('lotomania'),
  ('timemania'),('duplasena'),('diadesorte'),('supersete'),('maismilionaria')
ON CONFLICT (loteria) DO NOTHING;

-- 5) Função: tem sorteio hoje (BRT)?
CREATE OR REPLACE FUNCTION public.tem_sorteio_hoje(p_loteria TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dias INTEGER[];
  v_dow INTEGER;
BEGIN
  SELECT dias_semana INTO v_dias FROM loterias_calendario WHERE loteria = p_loteria;
  IF v_dias IS NULL THEN RETURN false; END IF;
  v_dow := EXTRACT(DOW FROM (now() AT TIME ZONE 'America/Sao_Paulo'))::INTEGER;
  RETURN v_dow = ANY(v_dias);
END;
$$;

-- 6) Limpeza dedupe TTL
CREATE OR REPLACE FUNCTION public.limpar_dedupe_expirado()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count INTEGER;
BEGIN
  DELETE FROM alertas_dedupe WHERE criado_em < now() - INTERVAL '6 hours';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
