// Comparação entre execuções salvas de backtest
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";

type Run = {
  id: string; created_at: string; loteria: string; ia_engine: string; algoritmo: string;
  hit_rate: number; precisao: number; roi_simulado: number; brier_score: number;
  risk_level: string; garantia_nivel: string; ci_low: number; ci_high: number;
};

const BRT = (s: string) => new Date(s).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

export function TitanBacktestCompareTab() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [metric, setMetric] = useState<"hit_rate" | "precisao" | "roi_simulado" | "brier_score">("precisao");
  const [loteria, setLoteria] = useState<string>("ALL");

  useEffect(() => { (async () => {
    const { data } = await supabase.from("titan_backtest_runs" as any).select("*")
      .order("created_at", { ascending: false }).limit(200);
    setRuns((data ?? []) as any);
  })(); }, []);

  const loterias = useMemo(() => ["ALL", ...Array.from(new Set(runs.map(r => r.loteria)))], [runs]);
  const filtered = useMemo(() => loteria === "ALL" ? runs : runs.filter(r => r.loteria === loteria), [runs, loteria]);

  const chartData = filtered
    .filter(r => selected.size === 0 || selected.has(r.id))
    .slice(0, 40).reverse()
    .map(r => ({ x: new Date(r.created_at).toLocaleDateString("pt-BR"), y: Number(r[metric] ?? 0), label: `${r.loteria}/${r.algoritmo}` }));

  // Best config per (loteria, metric)
  const best = useMemo(() => {
    const map = new Map<string, Run>();
    for (const r of filtered) {
      const key = `${r.loteria}·${metric}`;
      const cur = map.get(key);
      const better = metric === "brier_score" ? (!cur || r[metric] < cur[metric]) : (!cur || r[metric] > cur[metric]);
      if (better) map.set(key, r);
    }
    return Array.from(map.values());
  }, [filtered, metric]);

  const toggle = (id: string) => {
    setSelected(s => {
      const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n;
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ padding: 12, borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(170,0,255,0.25)" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#aa00ff", textTransform: "uppercase" }}>📈 Comparação de Runs</div>
          <select value={metric} onChange={e => setMetric(e.target.value as any)} style={sel}>
            <option value="precisao">Precisão %</option>
            <option value="hit_rate">Hit Rate %</option>
            <option value="roi_simulado">ROI %</option>
            <option value="brier_score">Brier (menor = melhor)</option>
          </select>
          <select value={loteria} onChange={e => setLoteria(e.target.value)} style={sel}>
            {loterias.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <span style={{ fontSize: 10, color: "#64748b" }}>{selected.size} selecionadas</span>
        </div>

        <div style={{ height: 240 }}>
          <ResponsiveContainer>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="x" stroke="#64748b" style={{ fontSize: 10 }} />
              <YAxis stroke="#64748b" style={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "#0b1220", border: "1px solid rgba(170,0,255,0.4)", fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="y" name={metric} stroke="#aa00ff" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ padding: 12, borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(0,255,136,0.25)" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#00ff88", marginBottom: 8, textTransform: "uppercase" }}>
          🏆 Melhores configurações por loteria
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
          <thead><tr style={{ color: "#475569", textAlign: "left" }}>
            <th style={th}>Loteria</th><th style={th}>Algoritmo</th><th style={th}>IA</th>
            <th style={th}>Métrica</th><th style={th}>Data</th>
          </tr></thead>
          <tbody>
            {best.map(r => (
              <tr key={r.id} style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                <td style={td}>{r.loteria}</td>
                <td style={td}>{r.algoritmo}</td>
                <td style={td}>{r.ia_engine}</td>
                <td style={{ ...td, color: "#00ff88", fontWeight: 700 }}>{Number(r[metric]).toFixed(3)}</td>
                <td style={td}>{BRT(r.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ padding: 12, borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#cbd5e1", marginBottom: 8, textTransform: "uppercase" }}>
          Selecione runs ({filtered.length})
        </div>
        <div style={{ maxHeight: 260, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
            <thead><tr style={{ color: "#475569", textAlign: "left" }}>
              <th style={th}>✓</th><th style={th}>Data</th><th style={th}>Loteria</th>
              <th style={th}>Algo</th><th style={th}>Hit%</th><th style={th}>Prec</th>
              <th style={th}>ROI</th><th style={th}>Brier</th>
            </tr></thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} onClick={() => toggle(r.id)} style={{ borderTop: "1px solid rgba(255,255,255,0.04)", cursor: "pointer", background: selected.has(r.id) ? "rgba(170,0,255,0.08)" : "transparent" }}>
                  <td style={td}>{selected.has(r.id) ? "☑" : "☐"}</td>
                  <td style={td}>{BRT(r.created_at)}</td>
                  <td style={td}>{r.loteria}</td>
                  <td style={td}>{r.algoritmo}</td>
                  <td style={td}>{Number(r.hit_rate).toFixed(2)}%</td>
                  <td style={td}>{Number(r.precisao).toFixed(2)}%</td>
                  <td style={{ ...td, color: r.roi_simulado >= 0 ? "#00ff88" : "#ff6b6b" }}>{Number(r.roi_simulado).toFixed(2)}%</td>
                  <td style={td}>{Number(r.brier_score).toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const th: React.CSSProperties = { padding: "6px 4px", fontSize: 9, fontWeight: 700 };
const td: React.CSSProperties = { padding: "6px 4px", fontSize: 10, color: "#cbd5e1" };
const sel: React.CSSProperties = { padding: "4px 8px", borderRadius: 6, fontSize: 10, background: "rgba(0,0,0,0.4)", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.08)" };
