
-- 1) titan_backtest_run_logs
CREATE TABLE public.titan_backtest_run_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  schedule_id uuid,
  run_id uuid,
  nivel text NOT NULL DEFAULT 'INFO',
  mensagem text NOT NULL,
  duracao_ms integer,
  tentativa integer DEFAULT 1,
  contexto jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.titan_backtest_run_logs TO authenticated;
GRANT ALL ON public.titan_backtest_run_logs TO service_role;
ALTER TABLE public.titan_backtest_run_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own logs" ON public.titan_backtest_run_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_bt_logs_schedule ON public.titan_backtest_run_logs(schedule_id, created_at DESC);
CREATE INDEX idx_bt_logs_user ON public.titan_backtest_run_logs(user_id, created_at DESC);

-- 2) titan_calibration_runs
CREATE TABLE public.titan_calibration_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  backtest_run_id uuid,
  loteria text NOT NULL,
  algoritmo text NOT NULL,
  metodo text NOT NULL CHECK (metodo IN ('temperature','platt','isotonic')),
  parametros jsonb DEFAULT '{}'::jsonb,
  brier_pre numeric,
  brier_post numeric,
  ece numeric,
  ci95 jsonb DEFAULT '[]'::jsonb,
  ci99 jsonb DEFAULT '[]'::jsonb,
  amostras integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.titan_calibration_runs TO authenticated;
GRANT ALL ON public.titan_calibration_runs TO service_role;
ALTER TABLE public.titan_calibration_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own calib" ON public.titan_calibration_runs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_calib_updated BEFORE UPDATE ON public.titan_calibration_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) god_core_heartbeats
CREATE TABLE public.god_core_heartbeats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  modulo text NOT NULL,
  status text NOT NULL,
  latencia_ms integer,
  mensagem text,
  ciclos integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.god_core_heartbeats TO authenticated;
GRANT ALL ON public.god_core_heartbeats TO service_role;
ALTER TABLE public.god_core_heartbeats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own hb" ON public.god_core_heartbeats FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_hb_user_time ON public.god_core_heartbeats(user_id, created_at DESC);

-- 4) god_core_events
CREATE TABLE public.god_core_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  tipo text NOT NULL,
  modulo text,
  severidade text NOT NULL DEFAULT 'info',
  mensagem text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.god_core_events TO authenticated;
GRANT ALL ON public.god_core_events TO service_role;
ALTER TABLE public.god_core_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ev" ON public.god_core_events FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_ev_user_time ON public.god_core_events(user_id, created_at DESC);
CREATE INDEX idx_ev_tipo ON public.god_core_events(user_id, tipo, created_at DESC);

-- 5) god_core_notifications
CREATE TABLE public.god_core_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  event_id uuid,
  titulo text NOT NULL,
  mensagem text NOT NULL,
  severidade text NOT NULL DEFAULT 'info',
  lida boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.god_core_notifications TO authenticated;
GRANT ALL ON public.god_core_notifications TO service_role;
ALTER TABLE public.god_core_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notif" ON public.god_core_notifications FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_notif_user_unread ON public.god_core_notifications(user_id, lida, created_at DESC);

-- 6) Trigger: cria notificação automaticamente quando evento é de auto-recovery
CREATE OR REPLACE FUNCTION public.fn_god_event_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tipo IN ('auto_recovery','module_restart','strategy_switch','full_reset','watchdog_trip') THEN
    INSERT INTO public.god_core_notifications(user_id, event_id, titulo, mensagem, severidade)
    VALUES (
      NEW.user_id, NEW.id,
      CASE NEW.tipo
        WHEN 'auto_recovery' THEN '🛡️ Auto-Recovery acionado'
        WHEN 'module_restart' THEN '🔄 Módulo reiniciado'
        WHEN 'strategy_switch' THEN '🧠 Estratégia trocada'
        WHEN 'full_reset' THEN '🔥 Reset total do sistema'
        WHEN 'watchdog_trip' THEN '⚠️ Watchdog acionado'
        ELSE 'Evento God Core'
      END,
      COALESCE(NEW.mensagem, NEW.tipo) || CASE WHEN NEW.modulo IS NOT NULL THEN ' · '||NEW.modulo ELSE '' END,
      NEW.severidade
    );
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.fn_god_event_notify() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_god_event_notify
  AFTER INSERT ON public.god_core_events
  FOR EACH ROW EXECUTE FUNCTION public.fn_god_event_notify();

-- 7) Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.titan_backtest_run_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.god_core_heartbeats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.god_core_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.god_core_notifications;
