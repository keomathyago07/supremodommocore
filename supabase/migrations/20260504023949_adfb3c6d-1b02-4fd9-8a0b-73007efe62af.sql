
-- 1) Tabela proximo_concurso
CREATE TABLE IF NOT EXISTS public.proximo_concurso (
  loteria TEXT PRIMARY KEY,
  concurso_atual INTEGER NOT NULL,
  data_proxima DATE,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.proximo_concurso ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read proximo_concurso" ON public.proximo_concurso;
CREATE POLICY "public read proximo_concurso" ON public.proximo_concurso
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth write proximo_concurso" ON public.proximo_concurso;
CREATE POLICY "auth write proximo_concurso" ON public.proximo_concurso
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed inicial (será atualizado pela edge function ao buscar resultados)
INSERT INTO public.proximo_concurso (loteria, concurso_atual, data_proxima) VALUES
  ('megasena', 2999, '2026-04-23'),
  ('lotofacil', 3668, '2026-04-22'),
  ('quina', 7008, '2026-04-22'),
  ('lotomania', 2915, '2026-04-22'),
  ('timemania', 2384, '2026-04-24'),
  ('duplasena', 2949, '2026-04-24'),
  ('diadesorte', 1205, '2026-04-24'),
  ('supersete', 838, '2026-04-22'),
  ('maismilionaria', 349, '2026-04-22')
ON CONFLICT (loteria) DO NOTHING;

-- 2) Colunas adicionais nas tabelas de apostas
ALTER TABLE public.apostas_confirmadas
  ADD COLUMN IF NOT EXISTS concurso_invalido BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS data_sorteio_alvo DATE;

ALTER TABLE public.apostas_pendentes
  ADD COLUMN IF NOT EXISTS concurso_invalido BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS data_sorteio_alvo DATE;

-- 3) Marcar apostas confirmadas com IDs fora dos intervalos válidos
UPDATE public.apostas_confirmadas
SET concurso_invalido = TRUE
WHERE concurso IS NOT NULL AND (
     (loteria='megasena'       AND (concurso < 2900 OR concurso > 3050))
  OR (loteria='lotofacil'      AND (concurso < 3600 OR concurso > 3750))
  OR (loteria='quina'          AND (concurso < 6950 OR concurso > 7100))
  OR (loteria='lotomania'      AND (concurso < 2880 OR concurso > 2960))
  OR (loteria='timemania'      AND (concurso < 2350 OR concurso > 2450))
  OR (loteria='duplasena'      AND (concurso < 2900 OR concurso > 2980))
  OR (loteria='diadesorte'     AND (concurso < 1180 OR concurso > 1260))
  OR (loteria='supersete'      AND (concurso < 820  OR concurso > 900))
  OR (loteria='maismilionaria' AND (concurso < 320  OR concurso > 400))
);

UPDATE public.apostas_confirmadas
SET data_sorteio_alvo = DATE(horario_confirmacao AT TIME ZONE 'America/Sao_Paulo')
WHERE data_sorteio_alvo IS NULL;

-- 4) Gatilho que garante concurso real em novas apostas confirmadas
CREATE OR REPLACE FUNCTION public.fn_garantir_concurso_real()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_concurso INTEGER;
  v_data DATE;
BEGIN
  SELECT concurso_atual, data_proxima INTO v_concurso, v_data
  FROM public.proximo_concurso WHERE loteria = NEW.loteria;

  IF v_concurso IS NOT NULL THEN
    IF NEW.concurso IS NULL OR NEW.concurso > 100000 THEN
      NEW.concurso := v_concurso;
    END IF;
    IF NEW.data_sorteio_alvo IS NULL THEN
      NEW.data_sorteio_alvo := v_data;
    END IF;
  ELSE
    IF NEW.data_sorteio_alvo IS NULL THEN
      NEW.data_sorteio_alvo := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
    END IF;
  END IF;

  NEW.concurso_invalido := FALSE;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_garantir_concurso_confirmadas ON public.apostas_confirmadas;
CREATE TRIGGER trg_garantir_concurso_confirmadas
  BEFORE INSERT ON public.apostas_confirmadas
  FOR EACH ROW EXECUTE FUNCTION public.fn_garantir_concurso_real();

-- 5) Função de conferência POR DATA (nunca por ID)
CREATE OR REPLACE FUNCTION public.conferir_pelo_dia(
  p_loteria TEXT,
  p_data    DATE DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date
) RETURNS TABLE (
  concurso     INTEGER,
  data_sorteio TEXT,
  numeros      INTEGER[],
  acumulado    BOOLEAN,
  raw_response JSONB
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT concurso, data_apuracao, dezenas, acumulado, raw_response
  FROM public.resultados_sorteios
  WHERE loteria = p_loteria
    AND (
      data_apuracao = to_char(p_data, 'YYYY-MM-DD')
      OR data_apuracao = to_char(p_data, 'DD/MM/YYYY')
    )
  ORDER BY concurso DESC
  LIMIT 1;
$$;

-- 6) Tabela de notificações com valores de prêmio
CREATE TABLE IF NOT EXISTS public.notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  tipo TEXT NOT NULL,
  loteria TEXT,
  loteria_nome TEXT,
  titulo TEXT NOT NULL,
  corpo TEXT,
  prioridade TEXT DEFAULT 'normal',
  emoji TEXT,
  lido BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own or global notificacoes" ON public.notificacoes;
CREATE POLICY "Users see own or global notificacoes" ON public.notificacoes
  FOR SELECT TO authenticated USING (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own notificacoes" ON public.notificacoes
;
CREATE POLICY "Users update own notificacoes" ON public.notificacoes
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "auth insert notificacoes" ON public.notificacoes;
CREATE POLICY "auth insert notificacoes" ON public.notificacoes
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_notificacoes_user_lido ON public.notificacoes(user_id, lido, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_apostas_conf_data ON public.apostas_confirmadas(loteria, data_sorteio_alvo);
