
-- ═══════════════════════════════════════════════════════════
-- MIGRATION: Campos especiais para todas as loterias v3
-- ═══════════════════════════════════════════════════════════

-- 1. Adicionar campos especiais em apostas_pendentes
ALTER TABLE public.apostas_pendentes ADD COLUMN IF NOT EXISTS numeros_invertido INTEGER[] DEFAULT NULL;
ALTER TABLE public.apostas_pendentes ADD COLUMN IF NOT EXISTS colunas_supersete JSONB DEFAULT NULL;
ALTER TABLE public.apostas_pendentes ADD COLUMN IF NOT EXISTS mes_da_sorte TEXT DEFAULT NULL;
ALTER TABLE public.apostas_pendentes ADD COLUMN IF NOT EXISTS time_timemania TEXT DEFAULT NULL;
ALTER TABLE public.apostas_pendentes ADD COLUMN IF NOT EXISTS trevos_maismilionaria INTEGER[] DEFAULT NULL;
ALTER TABLE public.apostas_pendentes ADD COLUMN IF NOT EXISTS tipo_jogo TEXT DEFAULT 'simples';
ALTER TABLE public.apostas_pendentes ADD COLUMN IF NOT EXISTS score_qualidade NUMERIC DEFAULT 0;

-- 2. Adicionar campos especiais em apostas_confirmadas
ALTER TABLE public.apostas_confirmadas ADD COLUMN IF NOT EXISTS numeros_invertido INTEGER[] DEFAULT NULL;
ALTER TABLE public.apostas_confirmadas ADD COLUMN IF NOT EXISTS colunas_supersete JSONB DEFAULT NULL;
ALTER TABLE public.apostas_confirmadas ADD COLUMN IF NOT EXISTS mes_da_sorte TEXT DEFAULT NULL;
ALTER TABLE public.apostas_confirmadas ADD COLUMN IF NOT EXISTS time_timemania TEXT DEFAULT NULL;
ALTER TABLE public.apostas_confirmadas ADD COLUMN IF NOT EXISTS trevos_maismilionaria INTEGER[] DEFAULT NULL;
ALTER TABLE public.apostas_confirmadas ADD COLUMN IF NOT EXISTS tipo_jogo TEXT DEFAULT 'simples';
ALTER TABLE public.apostas_confirmadas ADD COLUMN IF NOT EXISTS score_qualidade NUMERIC DEFAULT 0;

-- 3. Tabela verificações detalhadas
CREATE TABLE IF NOT EXISTS public.verificacoes_sorteio (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID NOT NULL,
  aposta_id        UUID REFERENCES public.apostas_confirmadas(id) ON DELETE CASCADE,
  loteria          TEXT NOT NULL,
  concurso         INTEGER NOT NULL,
  data_sorteio     TEXT NOT NULL,
  hora_sorteio     TEXT DEFAULT '21:00',
  numeros_sorteados  INTEGER[] NOT NULL DEFAULT '{}',
  numeros_apostados  INTEGER[] NOT NULL DEFAULT '{}',
  acertos_s1         INTEGER NOT NULL DEFAULT 0,
  faixa_s1           TEXT,
  valor_s1           NUMERIC DEFAULT 0,
  numeros_sorteio2   INTEGER[] DEFAULT '{}',
  numeros_apostados2 INTEGER[] DEFAULT '{}',
  acertos_s2         INTEGER DEFAULT 0,
  faixa_s2           TEXT,
  valor_s2           NUMERIC DEFAULT 0,
  acertos_total      INTEGER NOT NULL DEFAULT 0,
  valor_total        NUMERIC DEFAULT 0,
  premiado           BOOLEAN DEFAULT FALSE,
  time_coracao       TEXT,
  time_acertou       BOOLEAN DEFAULT FALSE,
  mes_sorte          TEXT,
  mes_acertou        BOOLEAN DEFAULT FALSE,
  trevos_sorteados   INTEGER[] DEFAULT '{}',
  trevos_acertados   INTEGER DEFAULT 0,
  dentro_padrao      BOOLEAN DEFAULT FALSE,
  lancado_financeiro BOOLEAN DEFAULT FALSE,
  verificado_em      TIMESTAMPTZ DEFAULT NOW(),
  raw_api            JSONB DEFAULT '{}'
);

ALTER TABLE public.verificacoes_sorteio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own verificacoes"
  ON public.verificacoes_sorteio
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_verif_aposta ON public.verificacoes_sorteio(aposta_id);
CREATE INDEX IF NOT EXISTS idx_verif_loteria ON public.verificacoes_sorteio(loteria);
CREATE INDEX IF NOT EXISTS idx_verif_premiado ON public.verificacoes_sorteio(premiado);

-- 4. Atualizar RPC inserir_aposta_ia com campos especiais
CREATE OR REPLACE FUNCTION public.inserir_aposta_ia(
  p_loteria TEXT,
  p_numeros INTEGER[],
  p_dominancia NUMERIC DEFAULT 0,
  p_precisao NUMERIC DEFAULT 0,
  p_criterios JSONB DEFAULT '[]'::jsonb,
  p_numeros_invertido INTEGER[] DEFAULT NULL,
  p_colunas_supersete JSONB DEFAULT NULL,
  p_mes_da_sorte TEXT DEFAULT NULL,
  p_time_timemania TEXT DEFAULT NULL,
  p_trevos INTEGER[] DEFAULT NULL,
  p_tipo_jogo TEXT DEFAULT 'simples',
  p_score_qualidade NUMERIC DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  DELETE FROM apostas_pendentes
  WHERE user_id = v_user_id
    AND loteria = p_loteria
    AND status = 'pendente'
    AND DATE(horario_envio AT TIME ZONE 'America/Sao_Paulo') = (NOW() AT TIME ZONE 'America/Sao_Paulo')::date;

  INSERT INTO apostas_pendentes (
    user_id, loteria, numeros, dominancia, precisao, status, criterios_atendidos,
    numeros_invertido, colunas_supersete, mes_da_sorte, time_timemania,
    trevos_maismilionaria, tipo_jogo, score_qualidade
  ) VALUES (
    v_user_id, p_loteria, p_numeros, p_dominancia, p_precisao, 'pendente', p_criterios,
    p_numeros_invertido, p_colunas_supersete, p_mes_da_sorte, p_time_timemania,
    p_trevos, p_tipo_jogo, p_score_qualidade
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- 5. Atualizar RPC confirmar_aposta_ia para copiar campos especiais
CREATE OR REPLACE FUNCTION public.confirmar_aposta_ia(p_aposta_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_aposta RECORD;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  SELECT * INTO v_aposta FROM apostas_pendentes
  WHERE id = p_aposta_id AND user_id = v_user_id AND status = 'pendente';

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  INSERT INTO apostas_confirmadas (
    user_id, aposta_pendente_id, loteria, numeros,
    dominancia, precisao, horario_confirmacao, status_verificacao,
    numeros_invertido, colunas_supersete, mes_da_sorte, time_timemania,
    trevos_maismilionaria, tipo_jogo, score_qualidade
  ) VALUES (
    v_user_id, v_aposta.id, v_aposta.loteria, v_aposta.numeros,
    v_aposta.dominancia, v_aposta.precisao, NOW(), 'aguardando_sorteio',
    v_aposta.numeros_invertido, v_aposta.colunas_supersete, v_aposta.mes_da_sorte,
    v_aposta.time_timemania, v_aposta.trevos_maismilionaria,
    v_aposta.tipo_jogo, v_aposta.score_qualidade
  );

  UPDATE apostas_pendentes SET status = 'confirmada' WHERE id = p_aposta_id;

  INSERT INTO gate_history (
    user_id, lottery, concurso, confidence, numbers, gate_status
  ) VALUES (
    v_user_id, v_aposta.loteria, COALESCE(v_aposta.concurso, 0),
    v_aposta.dominancia, v_aposta.numeros, 'APPROVED'
  );

  RETURN TRUE;
END;
$$;

-- 6. Enable realtime for verificacoes
ALTER PUBLICATION supabase_realtime ADD TABLE public.verificacoes_sorteio;
