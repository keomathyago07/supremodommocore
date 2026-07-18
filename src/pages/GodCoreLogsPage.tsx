// Tela de logs em tempo real do God Core (heartbeats + eventos)
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const BRT = (s: string) => new Date(s).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

type Event = { id: string; tipo: string; modulo: string | null; severidade: string; mensagem: string; payload: any; created_at: string };
type HB = { id: string; modulo: string; status: string; latencia_ms: number | null; mensagem: string | null; created_at: string };

export default function GodCoreLogsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [hbs, setHbs] = useState<HB[]>([]);
  const [modulo, setModulo] = useState("ALL");
  const [tipo, setTipo] = useState("ALL");
  const [date, setDate] = useState("");

  async function refresh() {
    const [{ data: ev }, { data: hb }] = await Promise.all([
      supabase.from("god_core_events" as any).select("*").order("created_at", { ascending: false }).limit(300),
      supabase.from("god_core_heartbeats" as any).select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    setEvents((ev ?? []) as any); setHbs((hb ?? []) as any);
  }

  useEffect(() => {
    refresh();
    const ch = supabase.channel("god-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "god_core_events" },
        (p) => setEvents(prev => [p.new as Event, ...prev].slice(0, 500)))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "god_core_heartbeats" },
        (p) => setHbs(prev => [p.new as HB, ...prev].slice(0, 300)))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const modulos = useMemo(() => ["ALL", ...Array.from(new Set([...events.map(e => e.modulo), ...hbs.map(h => h.modulo)].filter(Boolean) as string[]))], [events, hbs]);
  const tipos = useMemo(() => ["ALL", ...Array.from(new Set(events.map(e => e.tipo)))], [events]);

  const dayMatch = (iso: string) => !date || iso.startsWith(date);
  const evFiltered = events.filter(e => (modulo === "ALL" || e.modulo === modulo) && (tipo === "ALL" || e.tipo === tipo) && dayMatch(e.created_at));
  const hbFiltered = hbs.filter(h => (modulo === "ALL" || h.modulo === modulo) && dayMatch(h.created_at));

  const sevColor = (s: string) => s === "error" ? "#ff6b6b" : s === "warn" ? "#ffaa00" : s === "success" ? "#00ff88" : "#00d4ff";
  const stColor = (s: string) => s === "OK" ? "#00ff88" : s === "FAIL" ? "#ff6b6b" : s === "RESET" ? "#ffaa00" : "#00d4ff";

  return (
    <div style={{ padding: 16, color: "#e2e8f0", fontFamily: "Rajdhani, sans-serif" }}>
      <h1 style={{ color: "#00d4ff", fontFamily: "Orbitron", fontSize: 20, marginBottom: 12 }}>👁️ God Core · Logs em Tempo Real</h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <select value={modulo} onChange={e => setModulo(e.target.value)} style={sel}>
          {modulos.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={tipo} onChange={e => setTipo(e.target.value)} style={sel}>
          {tipos.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} style={sel} />
        <button onClick={() => { setModulo("ALL"); setTipo("ALL"); setDate(""); }} style={{ ...sel, cursor: "pointer", color: "#00d4ff" }}>Limpar</button>
        <button onClick={refresh} style={{ ...sel, cursor: "pointer", color: "#00ff88" }}>↻ Atualizar</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={box("#00d4ff")}>
          <div style={boxTitle("#00d4ff")}>Eventos ({evFiltered.length})</div>
          <div style={{ maxHeight: 520, overflowY: "auto", fontFamily: "monospace" }}>
            {evFiltered.map(e => (
              <div key={e.id} style={{ padding: 4, borderTop: "1px solid rgba(255,255,255,0.04)", fontSize: 10 }}>
                <span style={{ color: "#64748b" }}>{BRT(e.created_at)}</span>{" "}
                <span style={{ color: sevColor(e.severidade), fontWeight: 700 }}>[{e.tipo}]</span>{" "}
                {e.modulo && <span style={{ color: "#aa00ff" }}>{e.modulo}</span>}{" — "}
                <span style={{ color: "#cbd5e1" }}>{e.mensagem}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={box("#00ff88")}>
          <div style={boxTitle("#00ff88")}>Heartbeats ({hbFiltered.length})</div>
          <div style={{ maxHeight: 520, overflowY: "auto", fontFamily: "monospace" }}>
            {hbFiltered.map(h => (
              <div key={h.id} style={{ padding: 4, borderTop: "1px solid rgba(255,255,255,0.04)", fontSize: 10 }}>
                <span style={{ color: "#64748b" }}>{BRT(h.created_at)}</span>{" "}
                <span style={{ color: "#aa00ff" }}>{h.modulo}</span>{" "}
                <span style={{ color: stColor(h.status), fontWeight: 700 }}>{h.status}</span>{" "}
                {typeof h.latencia_ms === "number" && <span style={{ color: "#94a3b8" }}>{h.latencia_ms}ms</span>}
                {h.mensagem && <span style={{ color: "#cbd5e1" }}> — {h.mensagem}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const sel: React.CSSProperties = { padding: "6px 10px", borderRadius: 6, fontSize: 11, background: "rgba(0,0,0,0.4)", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.08)" };
const box = (c: string): React.CSSProperties => ({ padding: 12, borderRadius: 10, background: "rgba(255,255,255,0.02)", border: `1px solid ${c}40` });
const boxTitle = (c: string): React.CSSProperties => ({ fontSize: 11, fontWeight: 700, color: c, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 });
