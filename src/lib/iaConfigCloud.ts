// ============================================================
// iaConfigCloud.ts — Persistência real (Supabase) + sync multi-device
// Conflict resolution: compara updated_at (ETag-like, last-writer-wins)
// Offline queue: enfileira mudanças e re-tenta ao reconectar
// ============================================================
import { supabase } from "@/integrations/supabase/client";
import { useIAControlStore, type IALevel, type IACustomGoals } from "@/store/iaControlStore";
import { enqueue, registerOfflineHandler, startOfflineQueue } from "./offlineQueue";

const DEVICE_ID_KEY = "dommo-device-id";
const LAST_REMOTE_KEY = "dommo-ia-config-last-remote-updated-at";

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

function setLastRemoteUpdatedAt(ts?: string | null) {
  if (ts) localStorage.setItem(LAST_REMOTE_KEY, ts);
}
function getLastRemoteUpdatedAt(): string | null {
  return localStorage.getItem(LAST_REMOTE_KEY);
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
  setLastRemoteUpdatedAt((data as any).updated_at);
  return data as CloudIAConfig;
}

async function _saveRaw(level: IALevel, goals: IACustomGoals): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // Conflict resolution: pega versão atual do servidor
  const { data: current } = await (supabase
    .from("ia_config" as any)
    .select("updated_at, device_id")
    .eq("user_id", user.id)
    .maybeSingle() as any);

  const knownRemote = getLastRemoteUpdatedAt();
  if (current?.updated_at && knownRemote && current.updated_at > knownRemote) {
    // Houve uma escrita remota mais nova do que a que conhecemos.
    // Last-writer-wins: sobrescrevemos mas avisamos via evento.
    window.dispatchEvent(new CustomEvent("ias:conflict-detected", {
      detail: {
        knownRemote,
        actualRemote: current.updated_at,
        remoteDevice: current.device_id,
      },
    }));
  }

  const payload = {
    user_id: user.id,
    active_level: level,
    custom_goals: goals as any,
    device_id: getDeviceId(),
    updated_at: new Date().toISOString(),
  };
  const { data: saved, error } = await (supabase
    .from("ia_config" as any)
    .upsert(payload, { onConflict: "user_id" })
    .select("updated_at")
    .maybeSingle() as any);
  if (error) {
    console.warn("[iaConfigCloud] save error:", error);
    return false;
  }
  setLastRemoteUpdatedAt((saved as any)?.updated_at ?? payload.updated_at);
  return true;
}

/**
 * Salva no cloud com fallback offline (fila persistida).
 */
export async function saveIAConfigToCloud(level: IALevel, goals: IACustomGoals): Promise<boolean> {
  startOfflineQueue();
  try {
    if (!navigator.onLine) throw new Error("offline");
    const ok = await _saveRaw(level, goals);
    if (!ok) throw new Error("save failed");
    return true;
  } catch {
    enqueue("ia_config", { level, goals });
    return false;
  }
}

// Registra handler para a fila offline (reenvio automático ao reconectar)
registerOfflineHandler("ia_config", async (p: { level: IALevel; goals: IACustomGoals }) => {
  return await _saveRaw(p.level, p.goals);
});

function applyToStore(cfg: CloudIAConfig) {
  const store = useIAControlStore.getState();
  if (cfg.active_level && cfg.active_level !== store.activeLevel) {
    store.setLevel(cfg.active_level);
  }
  if (cfg.custom_goals && typeof cfg.custom_goals === "object") {
    store.setCustomGoals(cfg.custom_goals);
  }
  setLastRemoteUpdatedAt(cfg.updated_at);
  window.dispatchEvent(new CustomEvent("ias:config-changed", {
    detail: { activeLevel: cfg.active_level, customGoals: cfg.custom_goals, source: "cloud" },
  }));
}

let realtimeStarted = false;

export async function startIAConfigSync(): Promise<void> {
  if (realtimeStarted) return;
  realtimeStarted = true;
  startOfflineQueue();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { realtimeStarted = false; return; }

  try {
    const remote = await loadIAConfigFromCloud();
    if (remote) applyToStore(remote);
  } catch (e) { console.warn("[iaConfigSync] hidratação falhou:", e); }

  const myDevice = getDeviceId();
  supabase
    .channel("ia_config_sync")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "ia_config", filter: `user_id=eq.${user.id}` },
      (payload: any) => {
        const row = (payload.new || payload.record) as CloudIAConfig | undefined;
        if (!row) return;
        if (row.device_id && row.device_id === myDevice) {
          setLastRemoteUpdatedAt(row.updated_at);
          return;
        }
        // Conflict-aware: só aplica se for mais novo que o último conhecido
        const known = getLastRemoteUpdatedAt();
        if (known && row.updated_at && row.updated_at <= known) return;
        applyToStore(row);
      }
    )
    .subscribe();
}
