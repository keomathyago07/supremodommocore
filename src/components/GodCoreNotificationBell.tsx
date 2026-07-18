import { useState } from "react";
import { useGodCoreNotifications } from "@/hooks/useGodCoreNotifications";

const BRT = (s: string) => new Date(s).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

export function GodCoreNotificationBell() {
  const { items, unread, markRead, markAllRead } = useGodCoreNotifications();
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ position: "relative", padding: 6, borderRadius: 8, background: "rgba(0,0,0,0.4)", border: "1px solid rgba(0,212,255,0.3)", color: "#00d4ff", cursor: "pointer" }}
        title="Notificações do God Core">
        🔔
        {unread > 0 && (
          <span style={{ position: "absolute", top: -4, right: -4, background: "#ff6b6b", color: "#fff", borderRadius: 10, padding: "0 5px", fontSize: 9, fontWeight: 800 }}>
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div style={{ position: "absolute", right: 0, top: 40, width: 340, maxHeight: 420, overflowY: "auto", background: "#0b1220", border: "1px solid rgba(0,212,255,0.3)", borderRadius: 10, padding: 8, zIndex: 1000 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <b style={{ color: "#00d4ff", fontSize: 11 }}>God Core · Notificações</b>
            <button onClick={markAllRead} style={{ fontSize: 9, padding: "2px 8px", background: "rgba(0,212,255,0.15)", color: "#00d4ff", border: "1px solid rgba(0,212,255,0.4)", borderRadius: 6, cursor: "pointer" }}>marcar todas</button>
          </div>
          {items.length === 0 && <div style={{ fontSize: 10, color: "#475569" }}>Nenhuma notificação.</div>}
          {items.map(n => (
            <div key={n.id} onClick={() => markRead(n.id)}
              style={{ padding: 8, marginBottom: 4, borderRadius: 6, background: n.lida ? "rgba(255,255,255,0.02)" : "rgba(0,212,255,0.08)", border: "1px solid rgba(255,255,255,0.05)", cursor: "pointer" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: n.lida ? "#94a3b8" : "#00d4ff" }}>{n.titulo}</div>
              <div style={{ fontSize: 9, color: "#cbd5e1" }}>{n.mensagem}</div>
              <div style={{ fontSize: 8, color: "#475569", marginTop: 2 }}>{BRT(n.created_at)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
