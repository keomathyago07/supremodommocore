import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface GodNotification {
  id: string; titulo: string; mensagem: string; severidade: string; lida: boolean; created_at: string;
}

export function useGodCoreNotifications() {
  const [items, setItems] = useState<GodNotification[]>([]);

  async function refresh() {
    const { data } = await supabase.from("god_core_notifications" as any)
      .select("*").order("created_at", { ascending: false }).limit(50);
    setItems((data ?? []) as any);
  }

  useEffect(() => {
    refresh();
    const ch = supabase.channel("god-notif")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "god_core_notifications" },
        (payload) => {
          const n = payload.new as GodNotification;
          setItems(prev => [n, ...prev].slice(0, 50));
          const style = n.severidade === "error" ? "error" : n.severidade === "warn" ? "warning" : "info";
          (toast as any)[style === "warning" ? "warning" : style]?.(n.titulo, { description: n.mensagem })
            ?? toast(n.titulo, { description: n.mensagem });
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function markRead(id: string) {
    await supabase.from("god_core_notifications" as any).update({ lida: true }).eq("id", id);
    setItems(prev => prev.map(x => x.id === id ? { ...x, lida: true } : x));
  }
  async function markAllRead() {
    const ids = items.filter(i => !i.lida).map(i => i.id);
    if (!ids.length) return;
    await supabase.from("god_core_notifications" as any).update({ lida: true }).in("id", ids);
    setItems(prev => prev.map(x => ({ ...x, lida: true })));
  }

  const unread = items.filter(i => !i.lida).length;
  return { items, unread, markRead, markAllRead, refresh };
}
