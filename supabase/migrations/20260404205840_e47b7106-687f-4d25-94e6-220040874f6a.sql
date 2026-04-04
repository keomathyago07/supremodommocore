
-- Fix views to use SECURITY INVOKER
CREATE OR REPLACE VIEW public.vw_financeiro_resumo
WITH (security_invoker = true) AS
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

CREATE OR REPLACE VIEW public.vw_dashboard_loterias
WITH (security_invoker = true) AS
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
