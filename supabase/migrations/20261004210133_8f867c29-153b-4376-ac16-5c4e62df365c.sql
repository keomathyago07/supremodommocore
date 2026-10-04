DROP POLICY IF EXISTS "Users manage own apostas_confirmadas" ON public.apostas_confirmadas;
CREATE POLICY "Users read own apostas_confirmadas" ON public.apostas_confirmadas FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own pending apostas_confirmadas" ON public.apostas_confirmadas FOR DELETE TO authenticated USING (auth.uid() = user_id AND status_verificacao = 'aguardando_sorteio');
REVOKE INSERT, UPDATE ON public.apostas_confirmadas FROM authenticated, anon;

DROP POLICY IF EXISTS "Users manage own financeiro_premiacoes" ON public.financeiro_premiacoes;
CREATE POLICY "Users read own financeiro" ON public.financeiro_premiacoes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users mark own financeiro received" ON public.financeiro_premiacoes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
REVOKE INSERT, UPDATE, DELETE ON public.financeiro_premiacoes FROM authenticated, anon;
GRANT UPDATE (status_pagamento, observacoes) ON public.financeiro_premiacoes TO authenticated;

DROP POLICY IF EXISTS "Users manage own verificacoes" ON public.verificacoes_sorteio;
CREATE POLICY "Users read own verificacoes" ON public.verificacoes_sorteio FOR SELECT TO authenticated USING (auth.uid() = user_id);
REVOKE INSERT, UPDATE, DELETE ON public.verificacoes_sorteio FROM authenticated, anon;
GRANT ALL ON public.apostas_confirmadas, public.financeiro_premiacoes, public.verificacoes_sorteio TO service_role;