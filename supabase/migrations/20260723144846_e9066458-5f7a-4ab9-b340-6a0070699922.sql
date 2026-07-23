DROP POLICY IF EXISTS "Users manage own gate_config" ON public.gate_config;

CREATE POLICY "gate_config_select_own" ON public.gate_config
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "gate_config_insert_own" ON public.gate_config
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "gate_config_update_own" ON public.gate_config
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "gate_config_delete_own" ON public.gate_config
  FOR DELETE TO authenticated USING (auth.uid() = user_id);