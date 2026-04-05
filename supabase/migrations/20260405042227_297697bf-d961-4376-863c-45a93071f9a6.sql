
-- ═══ Trigger auto user_id ═══
CREATE OR REPLACE FUNCTION public.set_user_id_automatico()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Triggers on existing tables
DROP TRIGGER IF EXISTS tg_apostas_pendentes_user_id ON public.apostas_pendentes;
CREATE TRIGGER tg_apostas_pendentes_user_id
  BEFORE INSERT ON public.apostas_pendentes
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id_automatico();

DROP TRIGGER IF EXISTS tg_apostas_confirmadas_user_id ON public.apostas_confirmadas;
CREATE TRIGGER tg_apostas_confirmadas_user_id
  BEFORE INSERT ON public.apostas_confirmadas
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id_automatico();

DROP TRIGGER IF EXISTS tg_financeiro_user_id ON public.financeiro_premiacoes;
CREATE TRIGGER tg_financeiro_user_id
  BEFORE INSERT ON public.financeiro_premiacoes
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id_automatico();

DROP TRIGGER IF EXISTS tg_gate_history_user_id ON public.gate_history;
CREATE TRIGGER tg_gate_history_user_id
  BEFORE INSERT ON public.gate_history
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id_automatico();

-- ═══ RPC: Inserir aposta com segurança (máx 1 por loteria/dia) ═══
CREATE OR REPLACE FUNCTION public.inserir_aposta_ia(
  p_loteria TEXT,
  p_numeros INTEGER[],
  p_dominancia DECIMAL DEFAULT 0,
  p_precisao DECIMAL DEFAULT 0,
  p_criterios JSONB DEFAULT '[]'
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

  -- Remove aposta pendente anterior da mesma loteria no mesmo dia
  DELETE FROM apostas_pendentes
  WHERE user_id = v_user_id
    AND loteria = p_loteria
    AND status = 'pendente'
    AND DATE(horario_envio AT TIME ZONE 'America/Sao_Paulo') = (NOW() AT TIME ZONE 'America/Sao_Paulo')::date;

  INSERT INTO apostas_pendentes (
    user_id, loteria, numeros, dominancia, precisao, status, criterios_atendidos
  ) VALUES (
    v_user_id, p_loteria, p_numeros, p_dominancia, p_precisao, 'pendente', p_criterios
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ═══ RPC: Confirmar aposta (move para confirmadas + gate_history) ═══
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

  -- Insert into confirmed
  INSERT INTO apostas_confirmadas (
    user_id, aposta_pendente_id, loteria, numeros,
    dominancia, precisao, horario_confirmacao,
    status_verificacao
  ) VALUES (
    v_user_id, v_aposta.id, v_aposta.loteria, v_aposta.numeros,
    v_aposta.dominancia, v_aposta.precisao, NOW(),
    'aguardando_sorteio'
  );

  -- Update pending status
  UPDATE apostas_pendentes SET status = 'confirmada' WHERE id = p_aposta_id;

  -- Register in gate_history
  INSERT INTO gate_history (
    user_id, lottery, concurso, confidence, numbers, gate_status
  ) VALUES (
    v_user_id, v_aposta.loteria, v_aposta.concurso,
    v_aposta.dominancia, v_aposta.numeros, 'APPROVED'
  );

  RETURN TRUE;
END;
$$;

-- ═══ Enable realtime ═══
ALTER PUBLICATION supabase_realtime ADD TABLE public.apostas_pendentes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.apostas_confirmadas;
