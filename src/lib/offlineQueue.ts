// ============================================================
// offlineQueue.ts — Fila offline genérica com retry automático
// - Persistida em localStorage
// - Re-tenta ao voltar online (window 'online' event) e periodicamente
// - Backoff exponencial por item
// ============================================================

export interface QueuedItem<T = any> {
  id: string;
  kind: string;
  payload: T;
  enqueuedAt: number;
  attempts: number;
  nextTryAt: number;
}

type Handler = (payload: any) => Promise<boolean>; // true = sucesso

const KEY = "dommo-offline-queue-v1";
const handlers = new Map<string, Handler>();
let timer: number | null = null;
let started = false;

function load(): QueuedItem[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
  catch { return []; }
}
function save(items: QueuedItem[]) {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* noop */ }
}

export function registerOfflineHandler(kind: string, fn: Handler) {
  handlers.set(kind, fn);
}

export function enqueue<T>(kind: string, payload: T) {
  const items = load();
  // Substitui itens do mesmo kind (last-writer-wins p/ config)
  const filtered = kind === "ia_config" ? items.filter(i => i.kind !== kind) : items;
  filtered.push({
    id: `${kind}_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    kind, payload, enqueuedAt: Date.now(), attempts: 0, nextTryAt: Date.now(),
  });
  save(filtered);
  window.dispatchEvent(new CustomEvent("offline-queue:changed", { detail: { size: filtered.length } }));
  flush().catch(() => {});
}

export function queueSize(): number { return load().length; }
export function queueSnapshot(): QueuedItem[] { return load(); }

export async function flush(): Promise<void> {
  if (!navigator.onLine) return;
  const items = load();
  if (!items.length) return;
  const now = Date.now();
  const remaining: QueuedItem[] = [];
  for (const it of items) {
    if (it.nextTryAt > now) { remaining.push(it); continue; }
    const handler = handlers.get(it.kind);
    if (!handler) { remaining.push(it); continue; }
    try {
      const ok = await handler(it.payload);
      if (!ok) throw new Error("handler returned false");
    } catch {
      it.attempts++;
      it.nextTryAt = now + Math.min(60000, 2000 * Math.pow(2, it.attempts));
      remaining.push(it);
    }
  }
  save(remaining);
  window.dispatchEvent(new CustomEvent("offline-queue:changed", { detail: { size: remaining.length } }));
}

export function startOfflineQueue() {
  if (started) return;
  started = true;
  window.addEventListener("online", () => { flush().catch(() => {}); });
  timer = window.setInterval(() => { flush().catch(() => {}); }, 15000);
  // tenta uma vez no boot
  setTimeout(() => flush().catch(() => {}), 1500);
}

export function stopOfflineQueue() {
  if (timer) { clearInterval(timer); timer = null; }
  started = false;
}
