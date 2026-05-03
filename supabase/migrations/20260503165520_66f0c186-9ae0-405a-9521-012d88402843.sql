
CREATE TABLE IF NOT EXISTS public.regimes_hmm (
  loteria TEXT NOT NULL,
  concurso INTEGER NOT NULL,
  regime_id INTEGER NOT NULL,
  regime_nome TEXT,
  probabilidade NUMERIC,
  numeros_scores JSONB DEFAULT '{}'::jsonb,
  detectado_em TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (loteria, concurso)
);

CREATE TABLE IF NOT EXISTS public.ciclos_espectrais (
  loteria TEXT NOT NULL,
  numero INTEGER NOT NULL,
  ciclo_medio NUMERIC,
  fase_atual NUMERIC,
  prob_proximo NUMERIC,
  amplitude NUMERIC,
  atualizado TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (loteria, numero)
);

CREATE TABLE IF NOT EXISTS public.correlacoes_numeros (
  loteria TEXT NOT NULL,
  num_a INTEGER NOT NULL,
  num_b INTEGER NOT NULL,
  lift NUMERIC,
  suporte NUMERIC,
  confianca NUMERIC,
  atualizado TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (loteria, num_a, num_b)
);
CREATE INDEX IF NOT EXISTS idx_corr_loteria_lift ON public.correlacoes_numeros(loteria, lift DESC);

CREATE TABLE IF NOT EXISTS public.backtesting_resultados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loteria TEXT,
  data_teste DATE,
  n_concursos_test INTEGER,
  media_acertos NUMERIC,
  taxa_premiacao NUMERIC,
  roi_estimado NUMERIC,
  modelo_versao TEXT,
  detalhes JSONB DEFAULT '{}'::jsonb,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.previsao_acumulo (
  loteria TEXT NOT NULL,
  concurso_alvo INTEGER NOT NULL,
  prob_acumulo NUMERIC,
  prob_ganhador NUMERIC,
  estrategia TEXT,
  confianca NUMERIC,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (loteria, concurso_alvo)
);

CREATE TABLE IF NOT EXISTS public.scores_ultra (
  loteria TEXT NOT NULL,
  numero INTEGER NOT NULL,
  score NUMERIC NOT NULL DEFAULT 0,
  componentes JSONB DEFAULT '{}'::jsonb,
  atualizado TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (loteria, numero)
);
CREATE INDEX IF NOT EXISTS idx_scores_ultra_loteria ON public.scores_ultra(loteria, score DESC);

ALTER TABLE public.regimes_hmm ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ciclos_espectrais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.correlacoes_numeros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backtesting_resultados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.previsao_acumulo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores_ultra ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['regimes_hmm','ciclos_espectrais','correlacoes_numeros','backtesting_resultados','previsao_acumulo','scores_ultra']) LOOP
    EXECUTE format('CREATE POLICY "public read %I" ON public.%I FOR SELECT TO anon, authenticated USING (true)', t, t);
    EXECUTE format('CREATE POLICY "auth write %I" ON public.%I FOR INSERT TO authenticated WITH CHECK (true)', t, t);
    EXECUTE format('CREATE POLICY "auth update %I" ON public.%I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)', t, t);
    EXECUTE format('CREATE POLICY "auth delete %I" ON public.%I FOR DELETE TO authenticated USING (true)', t, t);
  END LOOP;
END $$;
