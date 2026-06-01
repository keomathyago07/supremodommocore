
CREATE TABLE public.ia_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  active_level TEXT NOT NULL DEFAULT 'infinita',
  custom_goals JSONB NOT NULL DEFAULT '{}'::jsonb,
  device_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ia_config TO authenticated;
GRANT ALL ON public.ia_config TO service_role;

ALTER TABLE public.ia_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own ia_config" ON public.ia_config
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own ia_config" ON public.ia_config
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own ia_config" ON public.ia_config
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own ia_config" ON public.ia_config
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_ia_config_updated_at
  BEFORE UPDATE ON public.ia_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.ia_config REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ia_config;
