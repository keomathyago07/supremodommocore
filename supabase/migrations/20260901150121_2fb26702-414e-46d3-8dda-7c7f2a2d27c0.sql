CREATE TABLE IF NOT EXISTS public.ingest_jobs (
  job text PRIMARY KEY,
  lease_until timestamptz NOT NULL DEFAULT now() - interval '1 minute',
  paused boolean NOT NULL DEFAULT false,
  pause_reason text,
  last_run_at timestamptz,
  last_status text,
  last_summary jsonb,
  runs_total integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ingest_jobs TO authenticated;
GRANT SELECT ON public.ingest_jobs TO anon;
GRANT ALL ON public.ingest_jobs TO service_role;

ALTER TABLE public.ingest_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ingest_jobs_read" ON public.ingest_jobs;
CREATE POLICY "ingest_jobs_read" ON public.ingest_jobs FOR SELECT USING (true);

INSERT INTO public.ingest_jobs (job) VALUES ('atlas_ingest_diario')
ON CONFLICT (job) DO NOTHING;