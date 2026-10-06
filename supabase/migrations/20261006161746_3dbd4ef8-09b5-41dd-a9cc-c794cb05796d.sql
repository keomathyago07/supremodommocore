CREATE TABLE public.cron_keys (nome text PRIMARY KEY, chave text NOT NULL DEFAULT encode(gen_random_bytes(24),'hex'));
GRANT ALL ON public.cron_keys TO service_role;
ALTER TABLE public.cron_keys ENABLE ROW LEVEL SECURITY;
INSERT INTO public.cron_keys(nome) VALUES ('conferencia') ON CONFLICT DO NOTHING;