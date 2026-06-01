// ============================================================
// iaConfigCloud.ts — Persistência real (Supabase) + sync multi-device
// Substitui o "Redis" do prompt usando o backend gerenciado (Lovable Cloud).
// ============================================================
import { supabase } from "@/integrations/supabase/client";
import { useIAControlStore, type IALevel, type IACustomGoals } from "@/store/iaControlStore";

const DEVICE_ID_KEY = "dommo-device-id";

export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = `dev_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export interface CloudIAConfig {
  active_level: IALevel;
  custom_goals: IACustomGoals;
  device_id?: string | null;
  updated_at?: string;
}

export async function loadIAConfigFromCloud(): Promise<CloudIAConfig | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await (supabase
    .from("ia_config" as any)
    .select("active_level, custom_goals, device_id, updated_at")
    .eq("user_id", user.id)
    .maybeSingle() as any);
  if (error || !data) return null;
  return data as CloudIAConfig;
}

export async function saveIAConfigToCloud(level: IALevel, goals: IACustomGoals): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const payload = {
    user_id: user.id,
    active_level: level,
    custom_goals: goals as any,
    device_id: getDeviceId(),
    updated_at: new Date().toISOString(),
  };
  const { error } = await (supabase
    .from("ia_config" as any)
    .upsert(payload, { onConflict: "user_id" }) as any);
  if (error) {
    console.warn("[iaConfigCloud] save error:", error);
    return false;
  }
  return true;
}

/**
 * Aplica config do cloud no store local (sem disparar nova gravação).
 */
function applyToStore(cfg: CloudIAConfig) {
  const store = useIAControlStore.getState();
  if (cfg.active_level && cfg.active_level !== store.activeLevel) {
    store.setLevel(cfg.active_level);
  }
  if (cfg.custom_goals && typeof cfg.custom_goals === "object") {
    store.setCustomGoals(cfg.custom_goals);
  }
  // Sinaliza aos engines (mesmo evento que o painel dispara)
  window.dispatchEvent(new CustomEvent("ias:config-changed", {
    detail: { activeLevel: cfg.active_level, customGoals: cfg.custom_goals, source: "cloud" },
  }));
}

let realtimeStarted = false;

/**
 * Inicia hidratação do cloud + assinatura realtime para sync entre dispositivos.
 * Idempotente — pode ser chamado em qualquer App boot.
 */
export async function startIAConfigSync(): Promise<void> {
  if (realtimeStarted) return;
  realtimeStarted = true;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    realtimeStarted = false;
    return;
  }

  // 1) Hidrata local com a versão do cloud
  try {
    const remote = await loadIAConfigFromCloud();
    if (remote) applyToStore(remote);
  } catch (e) {
    console.warn("[iaConfigSync] hidratação falhou:", e);
  }

  // 2) Realtime — qualquer device do mesmo user que salvar, atualiza aqui
  const myDevice = getDeviceId();
  supabase
    .channel("ia_config_sync")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "ia_config", filter: `user_id=eq.${user.id}` },
      (payload: any) => {
        const row = (payload.new || payload.record) as CloudIAConfig | undefined;
        if (!row) return;
        // Ignora eco do próprio dispositivo
        if (row.device_id && row.device_id === myDevice) return;
        applyToStore(row);
      }
    )
    .subscribe();
}
