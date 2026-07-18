// Painel de logs em tempo real do scheduler de backtest
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type LogRow = {
  id: string;
  schedule_id: string | null;
  run_id: string | null;
  nivel: string;
  mensagem: string;
  duracao_ms: number | null;
  tentativa: number | null;
  contexto: any;
  created_at: string;
};

const BRT = (s: string) => new Date(s).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

export function BacktestRunLogsPanel() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [nivel, setNivel] = useState<string>("ALL");
  const [q, setQ] = useState("");

  async function refresh() {
    const { data } = await supabase.from("titan_backtest_run_logs" as any)
      .select("*").order("created_at", { ascending: false }).limit(300);
    setLogs((data ?? []) as any);
  }

  useEffect(() => {
    refresh();
    const ch = supabase.channel("bt-logs")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "titan_backtest_run_logs" },
        (payload) => setLogs(prev => [payload.new as LogRow, ...prev].slice(0, 500)))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = useMemo(() => logs.filter(l =>
    (nivel === "ALL" || l.nivel === nivel) &&
    (!q || l.mensagem?.toLowerCase().includes(q.toLowerCase()))
  ), [logs, nivel, q]);

  const color = (n: string) => n === "ERROR" ? "#ff6b6b" : n === "WARN" ? "#ffaa00" : "#00d4ff";

  return (
    <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(0,212,255,0.25)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#00d4ff", textTransform: "uppercase", letterSpacing: 0.5 }}>
          📜 Logs do Scheduler ({filtered.length}/{logs.length})
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <select value={nivel} onChange={e => setNivel(e.target.value)}
            style={{ padding: "4px 8px", borderRadius: 6, fontSize: 10, background: "rgba(0,0,0,0.4)", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.08)" }}>
            <option value="ALL">Todos</option><option>INFO</option><option>WARN</option><option>ERROR</option>
          </select>
          <input placeholder="filtrar…" value={q} onChange={e => setQ(e.target.value)}
            style={{ padding: "4px 8px", borderRadius: 6, fontSize: 10, background: "rgba(0,0,0,0.4)", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.08)", width: 160 }} />
          <button onClick={refresh} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 10, background: "rgba(0,212,255,0.15)", color: "#00d4ff", border: "1px solid rgba(0,212,255,0.4)", cursor: "pointer" }}>↻</button>
        </div>
      </div>

      <div style={{ maxHeight: 320, overflowY: "auto", fontFamily: "monospace" }}>
        {filtered.length === 0 && <div style={{ fontSize: 10, color: "#475569" }}>Nenhum log ainda.</div>}
        {filtered.map(l => (
          <div key={l.id} style={{ padding: "4px 6px", borderTop: "1px solid rgba(255,255,255,0.04)", fontSize: 10, color: "#cbd5e1" }}>
            <span style={{ color: "#64748b" }}>{BRT(l.created_at)}</span>{" · "}
            <span style={{ color: color(l.nivel), fontWeight: 700 }}>{l.nivel}</span>
            {l.tentativa && l.tentativa > 1 && <span style={{ color: "#ffaa00" }}> [try {l.tentativa}]</span>}
            {typeof l.duracao_ms === "number" && <span style={{ color: "#94a3b8" }}> ({l.duracao_ms}ms)</span>}
            {" — "}<span>{l.mensagem}</span>
            {l.contexto && Object.keys(l.contexto || {}).length > 0 && (
              <details style={{ marginLeft: 8, display: "inline-block" }}>
                <summary style={{ cursor: "pointer", color: "#475569" }}>ctx</summary>
                <pre style={{ fontSize: 9, color: "#94a3b8", margin: 0 }}>{JSON.stringify(l.contexto, null, 2)}</pre>
              </details>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
