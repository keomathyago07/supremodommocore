
-- 1. apostas_pendentes
CREATE TABLE IF NOT EXISTS public.apostas_pendentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  loteria text NOT NULL,
  numeros integer[] NOT NULL,
  dominancia numeric(6,2) NOT NULL DEFAULT 0,
  precisao numeric(6,2) NOT NULL DEFAULT 0,
  concurso integer,
  horario_envio timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pendente',
  criterios_atendidos jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.apostas_pendentes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own apostas_pendentes"
  ON public.apostas_pendentes FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Validation trigger instead of CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_aposta_pendente_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('pendente', 'confirmada', 'cancelada') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_aposta_pendente_status
  BEFORE INSERT OR UPDATE ON public.apostas_pendentes
  FOR EACH ROW EXECUTE FUNCTION public.validate_aposta_pendente_status();

-- 2. apostas_confirmadas
CREATE TABLE IF NOT EXISTS public.apostas_confirmadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  aposta_pendente_id uuid REFERENCES public.apostas_pendentes(id),
  loteria text NOT NULL,
  numeros integer[] NOT NULL,
  numeros_sorteados integer[],
  dominancia numeric(6,2) NOT NULL DEFAULT 0,
  precisao numeric(6,2) NOT NULL DEFAULT 0,
  concurso integer,
  concurso_verificado integer,
  data_sorteio text,
  horario_confirmacao timestamptz NOT NULL DEFAULT now(),
  status_verificacao text NOT NULL DEFAULT 'aguardando_sorteio',
  qtd_numeros_esperada integer NOT NULL DEFAULT 6,
  range_min integer NOT NULL DEFAULT 1,
  range_max integer NOT NULL DEFAULT 60,
  custo_aposta numeric(8,2) NOT NULL DEFAULT 2.50,
  faixas_premio jsonb DEFAULT '[]',
  pontos_acertados integer,
  valor_premio numeric(12,2),
  descricao_faixa text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.apostas_confirmadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own apostas_confirmadas"
  ON public.apostas_confirmadas FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.validate_aposta_confirmada_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status_verificacao NOT IN ('aguardando_sorteio', 'verificada', 'erro_verificacao') THEN
    RAISE EXCEPTION 'Invalid status_verificacao: %', NEW.status_verificacao;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_aposta_confirmada_status
  BEFORE INSERT OR UPDATE ON public.apostas_confirmadas
  FOR EACH ROW EXECUTE FUNCTION public.validate_aposta_confirmada_status();

-- 3. financeiro_premiacoes
CREATE TABLE IF NOT EXISTS public.financeiro_premiacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  aposta_confirmada_id uuid REFERENCES public.apostas_confirmadas(id),
  loteria text NOT NULL,
  concurso integer,
  numeros_apostados integer[] NOT NULL,
  numeros_sorteados integer[],
  acertos integer NOT NULL DEFAULT 0,
  descricao_faixa text,
  valor_bruto numeric(12,2) NOT NULL DEFAULT 0,
  valor_liquido numeric(12,2) NOT NULL DEFAULT 0,
  data_lancamento timestamptz NOT NULL DEFAULT now(),
  status_pagamento text NOT NULL DEFAULT 'a_receber',
  observacoes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.financeiro_premiacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own financeiro_premiacoes"
  ON public.financeiro_premiacoes FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.validate_financeiro_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status_pagamento NOT IN ('a_receber', 'recebido', 'cancelado') THEN
    RAISE EXCEPTION 'Invalid status_pagamento: %', NEW.status_pagamento;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_financeiro_status
  BEFORE INSERT OR UPDATE ON public.financeiro_premiacoes
  FOR EACH ROW EXECUTE FUNCTION public.validate_financeiro_status();

-- 4. resultados_sorteios
CREATE TABLE IF NOT EXISTS public.resultados_sorteios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loteria text NOT NULL,
  concurso integer NOT NULL,
  dezenas integer[] NOT NULL,
  data_apuracao text,
  acumulado boolean DEFAULT false,
  valor_proximo numeric(14,2),
  raw_response jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE (loteria, concurso)
);

ALTER TABLE public.resultados_sorteios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read resultados_sorteios"
  ON public.resultados_sorteios FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY "Authenticated insert resultados_sorteios"
  ON public.resultados_sorteios FOR INSERT
  TO authenticated WITH CHECK (true);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_apostas_pendentes_status ON public.apostas_pendentes(status);
CREATE INDEX IF NOT EXISTS idx_apostas_pendentes_loteria ON public.apostas_pendentes(loteria);
CREATE INDEX IF NOT EXISTS idx_apostas_pendentes_user ON public.apostas_pendentes(user_id);
CREATE INDEX IF NOT EXISTS idx_apostas_confirmadas_status ON public.apostas_confirmadas(status_verificacao);
CREATE INDEX IF NOT EXISTS idx_apostas_confirmadas_loteria ON public.apostas_confirmadas(loteria);
CREATE INDEX IF NOT EXISTS idx_apostas_confirmadas_user ON public.apostas_confirmadas(user_id);
CREATE INDEX IF NOT EXISTS idx_financeiro_loteria ON public.financeiro_premiacoes(loteria);
CREATE INDEX IF NOT EXISTS idx_financeiro_user ON public.financeiro_premiacoes(user_id);

-- 6. Views
CREATE OR REPLACE VIEW public.vw_financeiro_resumo AS
SELECT
  user_id,
  loteria,
  COUNT(*) AS total_premiadas,
  SUM(acertos) AS total_acertos,
  ROUND(AVG(acertos)::numeric, 2) AS media_acertos,
  SUM(valor_bruto) AS total_bruto,
  SUM(valor_liquido) AS total_liquido,
  COUNT(*) FILTER (WHERE status_pagamento = 'recebido') AS ja_recebido,
  COUNT(*) FILTER (WHERE status_pagamento = 'a_receber') AS a_receber
FROM public.financeiro_premiacoes
GROUP BY user_id, loteria
ORDER BY total_liquido DESC;

CREATE OR REPLACE VIEW public.vw_dashboard_loterias AS
SELECT
  ac.user_id,
  ac.loteria,
  COUNT(ac.id) AS total_apostas,
  COUNT(ac.id) FILTER (WHERE ac.status_verificacao = 'verificada') AS verificadas,
  COUNT(ac.id) FILTER (WHERE ac.pontos_acertados IS NOT NULL AND ac.pontos_acertados > 0) AS com_acertos,
  ROUND(AVG(ac.pontos_acertados) FILTER (WHERE ac.pontos_acertados IS NOT NULL)::numeric, 2) AS media_pontos,
  COALESCE(SUM(fp.valor_liquido), 0) AS total_premio_liquido
FROM public.apostas_confirmadas ac
LEFT JOIN public.financeiro_premiacoes fp ON fp.aposta_confirmada_id = ac.id
GROUP BY ac.user_id, ac.loteria
ORDER BY total_apostas DESC;
