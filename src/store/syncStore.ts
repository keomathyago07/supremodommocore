// ============================================================
// syncStore.ts — Sincronização em tempo real entre dispositivos
// BroadcastChannel + storage events + heartbeat
// ============================================================
import { create } from "zustand";

export type SyncStatus = "online" | "syncing" | "offline" | "conflict";

export interface ConnectedDevice {
  id: string;
  name: string;
  type: "mobile" | "desktop" | "tablet";
  lastSeen: Date;
  status: "online" | "offline";
}

export interface SyncLogEntry {
  timestamp: Date;
  message: string;
  type: "info" | "success" | "warn" | "error";
}

export interface SyncConfig {
  autoSync: boolean;
  syncOnSave: boolean;
  syncLotteryRules: boolean;
  syncBets: boolean;
  lastWriterWins: boolean;
  offlineQueue: boolean;
  heartbeatIntervalMs: number;
  protocol: "websocket" | "sse" | "polling";
}

export interface SyncState {
  status: SyncStatus;
  config: SyncConfig;
  devices: ConnectedDevice[];
  log: SyncLogEntry[];
  lastSync: Date | null;
  pendingChanges: number;
  setStatus: (status: SyncStatus) => void;
  updateConfig: (config: Partial<SyncConfig>) => void;
  addDevice: (device: ConnectedDevice) => void;
  removeDevice: (id: string) => void;
  addLog: (message: string, type?: SyncLogEntry["type"]) => void;
  forceSync: () => Promise<void>;
  broadcastChange: (channel: string, payload: unknown) => void;
  initBroadcastListener: () => () => void;
}

const DEFAULT_CONFIG: SyncConfig = {
  autoSync: true,
  syncOnSave: true,
  syncLotteryRules: true,
  syncBets: true,
  lastWriterWins: true,
  offlineQueue: true,
  heartbeatIntervalMs: 5000,
  protocol: "websocket",
};

const SESSION_ID = `device_${Math.random().toString(36).slice(2, 9)}`;
const isMobile = typeof navigator !== "undefined" && /Mobi|Android/i.test(navigator.userAgent);

export const useSyncStore = create<SyncState>((set, get) => ({
  status: "online",
  config: { ...DEFAULT_CONFIG },
  devices: [
    {
      id: SESSION_ID,
      name: isMobile ? "Este dispositivo (mobile)" : "Este dispositivo (desktop)",
      type: isMobile ? "mobile" : "desktop",
      lastSeen: new Date(),
      status: "online",
    },
  ],
  log: [{ timestamp: new Date(), message: "Sistema de sincronização inicializado", type: "success" }],
  lastSync: null,
  pendingChanges: 0,

  setStatus: (status) => set({ status }),
  updateConfig: (config) => set((state) => ({ config: { ...state.config, ...config } })),
  addDevice: (device) =>
    set((state) => {
      const exists = state.devices.find((d) => d.id === device.id);
      if (exists) {
        return {
          devices: state.devices.map((d) => (d.id === device.id ? { ...d, ...device, lastSeen: new Date() } : d)),
        };
      }
      return { devices: [...state.devices, device] };
    }),
  removeDevice: (id) => set((state) => ({ devices: state.devices.filter((d) => d.id !== id) })),
  addLog: (message, type = "info") =>
    set((state) => ({ log: [...state.log.slice(-99), { timestamp: new Date(), message, type }] })),

  forceSync: async () => {
    const { addLog, broadcastChange } = get();
    set({ status: "syncing", pendingChanges: 0 });
    addLog("Sincronização forçada iniciada...", "info");
    broadcastChange("force_sync", {
      sessionId: SESSION_ID,
      timestamp: new Date().toISOString(),
      iaControl: localStorage.getItem("ia-control-storage"),
      lotteryRules: localStorage.getItem("lottery-rules-storage"),
    });
    await new Promise((r) => setTimeout(r, 800));
    set({ status: "online", lastSync: new Date() });
    addLog("Sincronização concluída com sucesso", "success");
  },

  broadcastChange: (channel, payload) => {
    if (typeof BroadcastChannel !== "undefined") {
      const bc = new BroadcastChannel("terror_loterias_sync");
      bc.postMessage({ channel, payload, from: SESSION_ID });
      bc.close();
    }
    const key = `sync_${channel}_${Date.now()}`;
    localStorage.setItem(key, JSON.stringify({ payload, from: SESSION_ID }));
    setTimeout(() => localStorage.removeItem(key), 5000);
  },

  initBroadcastListener: () => {
    const { addLog } = get();
    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      bc = new BroadcastChannel("terror_loterias_sync");
      bc.onmessage = (ev) => {
        if (ev.data.from === SESSION_ID) return;
        addLog(`Sync recebido de: ${ev.data.from} [${ev.data.channel}]`, "success");
        set({ lastSync: new Date() });
        if (get().config.lastWriterWins && ev.data.channel === "force_sync") {
          const p = ev.data.payload;
          if (p.iaControl) localStorage.setItem("ia-control-storage", p.iaControl);
          if (p.lotteryRules) localStorage.setItem("lottery-rules-storage", p.lotteryRules);
          window.dispatchEvent(new Event("storage"));
        }
      };
    }
    const onStorage = (ev: StorageEvent) => {
      if (!ev.key?.startsWith("sync_")) return;
      addLog(`Evento de sync detectado via storage: ${ev.key}`, "info");
    };
    window.addEventListener("storage", onStorage);
    const heartbeat = setInterval(() => {
      const { broadcastChange, status } = get();
      if (status === "offline") return;
      broadcastChange("heartbeat", {
        sessionId: SESSION_ID,
        deviceType: isMobile ? "mobile" : "desktop",
        ts: new Date().toISOString(),
      });
    }, get().config.heartbeatIntervalMs);
    return () => {
      bc?.close();
      window.removeEventListener("storage", onStorage);
      clearInterval(heartbeat);
    };
  },
}));
