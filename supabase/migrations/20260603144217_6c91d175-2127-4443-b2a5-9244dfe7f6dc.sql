
-- 1) Lock shared/admin tables: writes only via service_role (edge functions)
-- engine_config_supremo
DROP POLICY IF EXISTS "auth write engine_cfg" ON public.engine_config_supremo;
REVOKE INSERT, UPDATE, DELETE ON public.engine_config_supremo FROM authenticated, anon;

-- loterias_calendario
DROP POLICY IF EXISTS "auth write calendario" ON public.loterias_calendario;
REVOKE INSERT, UPDATE, DELETE ON public.loterias_calendario FROM authenticated, anon;

-- proximo_concurso
DROP POLICY IF EXISTS "auth write proximo_concurso" ON public.proximo_concurso;
REVOKE INSERT, UPDATE, DELETE ON public.proximo_concurso FROM authenticated, anon;

-- alertas_dedupe
DROP POLICY IF EXISTS "auth manage dedupe" ON public.alertas_dedupe;
REVOKE INSERT, UPDATE, DELETE ON public.alertas_dedupe FROM authenticated, anon;

-- backtesting_resultados
DROP POLICY IF EXISTS "auth write backtesting_resultados" ON public.backtesting_resultados;
DROP POLICY IF EXISTS "auth update backtesting_resultados" ON public.backtesting_resultados;
DROP POLICY IF EXISTS "auth delete backtesting_resultados" ON public.backtesting_resultados;
REVOKE INSERT, UPDATE, DELETE ON public.backtesting_resultados FROM authenticated, anon;

-- ciclos_espectrais
DROP POLICY IF EXISTS "auth write ciclos_espectrais" ON public.ciclos_espectrais;
DROP POLICY IF EXISTS "auth update ciclos_espectrais" ON public.ciclos_espectrais;
DROP POLICY IF EXISTS "auth delete ciclos_espectrais" ON public.ciclos_espectrais;
REVOKE INSERT, UPDATE, DELETE ON public.ciclos_espectrais FROM authenticated, anon;

-- correlacoes_numeros
DROP POLICY IF EXISTS "auth write correlacoes_numeros" ON public.correlacoes_numeros;
DROP POLICY IF EXISTS "auth update correlacoes_numeros" ON public.correlacoes_numeros;
DROP POLICY IF EXISTS "auth delete correlacoes_numeros" ON public.correlacoes_numeros;
REVOKE INSERT, UPDATE, DELETE ON public.correlacoes_numeros FROM authenticated, anon;

-- previsao_acumulo
DROP POLICY IF EXISTS "auth write previsao_acumulo" ON public.previsao_acumulo;
DROP POLICY IF EXISTS "auth update previsao_acumulo" ON public.previsao_acumulo;
DROP POLICY IF EXISTS "auth delete previsao_acumulo" ON public.previsao_acumulo;
REVOKE INSERT, UPDATE, DELETE ON public.previsao_acumulo FROM authenticated, anon;

-- regimes_hmm
DROP POLICY IF EXISTS "auth write regimes_hmm" ON public.regimes_hmm;
DROP POLICY IF EXISTS "auth update regimes_hmm" ON public.regimes_hmm;
DROP POLICY IF EXISTS "auth delete regimes_hmm" ON public.regimes_hmm;
REVOKE INSERT, UPDATE, DELETE ON public.regimes_hmm FROM authenticated, anon;

-- scores_ultra
DROP POLICY IF EXISTS "auth write scores_ultra" ON public.scores_ultra;
DROP POLICY IF EXISTS "auth update scores_ultra" ON public.scores_ultra;
DROP POLICY IF EXISTS "auth delete scores_ultra" ON public.scores_ultra;
REVOKE INSERT, UPDATE, DELETE ON public.scores_ultra FROM authenticated, anon;

-- resultados_sorteios: only service_role inserts (edge functions)
DROP POLICY IF EXISTS "Authenticated insert resultados_sorteios" ON public.resultados_sorteios;
REVOKE INSERT, UPDATE, DELETE ON public.resultados_sorteios FROM authenticated, anon;

-- 2) notificacoes: restrict inserts so users can only target themselves or global (NULL)
DROP POLICY IF EXISTS "auth insert notificacoes" ON public.notificacoes;
CREATE POLICY "Users insert own notificacoes"
  ON public.notificacoes
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- 3) Revoke EXECUTE on SECURITY DEFINER functions from anon (keep authenticated for RPCs)
REVOKE EXECUTE ON FUNCTION public.inserir_aposta_ia(text, integer[], numeric, numeric, jsonb) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.inserir_aposta_ia(text, integer[], numeric, numeric, jsonb, integer[], jsonb, text, text, integer[], text, numeric) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.confirmar_aposta_ia(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.tem_sorteio_hoje(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.limpar_dedupe_expirado() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.conferir_pelo_dia(text, date) FROM anon, public;
