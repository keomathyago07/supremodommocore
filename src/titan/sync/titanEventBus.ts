// ============================================================
// titanEventBus.ts — Sincronização imediata por eventos.
// Propaga Desktop → Servidor (Supabase) → WebSocket/Realtime →
// Mobile/outras abas (BroadcastChannel) → e de volta.
// ============================================================
import { supabase } from "@/integrations/supabase/client";

export type TitanEventKind =
  | "aposta" | "resultado" | "conferencia" | "premio" | "config"
  | "queue_failure" | "guardian_alert" | "duplicate_attempt";

export interface TitanEvent<T = Record<string, unknown>> {
  id: string;
  kind: TitanEventKind;
  origin: "desktop" | "mobile" | "server";
  payload: T;
  at: number;
}

const CHANNEL = "titan-sync";
const BC_NAME = "titan-event-bus";

function deviceOrigin(): TitanEvent["origin"] {
  try {
    return /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) ? "mobile" : "desktop";
  } catch { return "desktop"; }
}

function uuid(): string {
  try { return crypto.randomUUID(); } catch { return `${Date.now()}-${Math.random()}`; }
}

let bc: BroadcastChannel | null = null;
function broadcastChannel(): BroadcastChannel | null {
  if (bc) return bc;
  try { bc = new BroadcastChannel(BC_NAME); } catch { bc = null; }
  return bc;
}

const localListeners = new Set<(e: TitanEvent) => void>();
const seen = new Set<string>();

function deliverLocal(e: TitanEvent) {
  if (seen.has(e.id)) return;
  seen.add(e.id);
  if (seen.size > 2000) seen.clear();
  localListeners.forEach(l => { try { l(e); } catch { /* noop */ } });
  try { window.dispatchEvent(new CustomEvent(`titan:${e.kind}`, { detail: e })); } catch { /* SSR */ }
}

/** Emite evento e propaga imediatamente em todas as camadas. */
export async function emitTitanEvent<T extends Record<string, unknown>>(
  kind: TitanEventKind, payload: T
): Promise<TitanEvent<T>> {
  const evt: TitanEvent<T> = { id: uuid(), kind, origin: deviceOrigin(), payload, at: Date.now() };
  deliverLocal(evt as TitanEvent);

  // Outras abas / PWA no mesmo device
  try { broadcastChannel()?.postMessage(evt); } catch { /* noop */ }

  // Servidor + WebSocket (Realtime broadcast) → mobile e desktop
  try {
    const ch = supabase.channel(CHANNEL);
    await ch.send({ type: "broadcast", event: kind, payload: evt });
    supabase.removeChannel(ch);
  } catch { /* resiliente — a fila durável reenvia */ }

  return evt;
}

/** Assina eventos (local + outras abas + realtime). */
export function onTitanEvent(fn: (e: TitanEvent) => void): () => void {
  localListeners.add(fn);
  const ch = broadcastChannel();
  const handler = (m: MessageEvent) => { if (m.data?.id) deliverLocal(m.data as TitanEvent); };
  ch?.addEventListener("message", handler);

  let rt: ReturnType<typeof supabase.channel> | null = null;
  try {
    rt = supabase.channel(`${CHANNEL}-in-${uuid().slice(0, 8)}`)
      .on("broadcast", { event: "*" }, (msg: any) => {
        const e = msg?.payload as TitanEvent | undefined;
        if (e?.id) deliverLocal(e);
      })
      .subscribe();
  } catch { rt = null; }

  return () => {
    localListeners.delete(fn);
    ch?.removeEventListener("message", handler);
    if (rt) supabase.removeChannel(rt);
  };
}
