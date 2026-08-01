// ============================================================
// AuditLogPanel.tsx — Auditoria/Logs com busca por timestamp,
// modalidade, concurso e status + export CSV/PDF.
// ============================================================
import { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { durableQueue } from "./queue/durableQueue";
import { titanPersistence } from "./state/titanPersistence";
import { getAlerts, subscribeAlerts, GuardianAlert } from "./alerts/guardianAlerts";

const BRT = (v: string | number) =>
  new Date(v).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

interface AuditRow {
  id: string;
  at: string;
  tipo: string;
  modulo: string | null;
  severidade: string;
  mensagem: string;
  loteria: string | null;
  concurso: number | null;
}

const LOTERIAS = ["megasena","quina","lotofacil","lotomania","timemania","duplasena","diadesorte","supersete","maismilionaria"];

function extract(msg: string, payload: any) {
  const loteria = LOTERIAS.find(l => (msg ?? "").toLowerCase().includes(l))
    ?? (typeof payload?.loteria === "string" ? payload.loteria : null)
    ?? (typeof payload?.key === "string" ? payload.key.split(":")[0] : null);
  const concursoRaw = payload?.concurso ?? (typeof payload?.key === "string" ? Number(payload.key.split(":")[1]) : NaN);
  const concurso = Number.isFinite(Number(concursoRaw)) ? Number(concursoRaw) : null;
  return { loteria: loteria ?? null, concurso };
}

export function AuditLogPanel() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [loteria, setLoteria] = useState("");
  const [concurso, setConcurso] = useState("");
  const [status, setStatus] = useState("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [alerts, setAlerts] = useState<GuardianAlert[]>(getAlerts());

  useEffect(() => { const un = subscribeAlerts(setAlerts); return () => { un(); }; }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("god_core_events" as any)
        .select("id, created_at, tipo, modulo, severidade, mensagem, payload")
        .order("created_at", { ascending: false })
        .limit(500);
      const mapped: AuditRow[] = ((data ?? []) as any[]).map(e => {
        const x = extract(e.mensagem ?? "", e.payload);
        return {
          id: e.id, at: e.created_at, tipo: e.tipo, modulo: e.modulo,
          severidade: e.severidade, mensagem: e.mensagem, ...x,
        };
      });
      setRows(mapped);
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => rows.filter(r => {
    if (q && !`${r.mensagem} ${r.tipo} ${r.modulo ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (loteria && r.loteria !== loteria) return false;
    if (concurso && String(r.concurso ?? "") !== concurso.trim()) return false;
    if (status && r.severidade !== status) return false;
    const t = new Date(r.at).getTime();
    if (de && t < new Date(de).getTime()) return false;
    if (ate && t > new Date(ate).getTime()) return false;
    return true;
  }), [rows, q, loteria, concurso, status, de, ate]);

  function exportCsv() {
    const esc = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = ["Timestamp BRT","Tipo","Módulo","Severidade","Modalidade","Concurso","Mensagem"];
    const body = filtered.map(r => [BRT(r.at), r.tipo, r.modulo, r.severidade, r.loteria, r.concurso, r.mensagem].map(esc).join(","));
    const blob = new Blob(["\uFEFF" + [header.join(","), ...body].join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `titan-auditoria-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function exportPdf() {
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    doc.setFontSize(14);
    doc.text("TITAN — Auditoria da Conferência", 40, 40);
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Gerado: ${BRT(Date.now())} (BRT) · ${filtered.length} registros`, 40, 56);
    autoTable(doc, {
      startY: 74,
      head: [["Timestamp BRT","Tipo","Módulo","Sev.","Modalidade","Concurso","Mensagem"]],
      body: filtered.map(r => [BRT(r.at), r.tipo, r.modulo ?? "-", r.severidade, r.loteria ?? "-", r.concurso ?? "-", r.mensagem]),
      styles: { fontSize: 7, cellPadding: 3 },
      headStyles: { fillColor: [0, 30, 50], textColor: [0, 212, 255] },
      columnStyles: { 6: { cellWidth: 300 } },
    });
    doc.save(`titan-auditoria-${new Date().toISOString().replace(/[:.]/g, "-")}.pdf`);
  }

  const qs = durableQueue.stats();
  const st = titanPersistence.get();
  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 6, color: "#e2e8f0", fontSize: 10, padding: "6px 8px", fontFamily: "inherit",
  };
  const btn: React.CSSProperties = {
    background: "rgba(0,212,255,0.12)", border: "1px solid rgba(0,212,255,0.3)",
    color: "#00d4ff", borderRadius: 7, fontSize: 10, fontWeight: 700, padding: "6px 12px", cursor: "pointer",
  };

  return (
    <div style={{ fontSize: 11 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 8, marginBottom: 10 }}>
        <div style={{ padding: 10, borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ color: "#94a3b8", fontSize: 9 }}>CICLOS PERSISTIDOS</div>
          <div style={{ color: "#00ff88", fontWeight: 800 }}>{st.cycles}</div>
        </div>
        <div style={{ padding: 10, borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ color: "#94a3b8", fontSize: 9 }}>CONFERÊNCIAS ÚNICAS</div>
          <div style={{ color: "#00d4ff", fontWeight: 800 }}>{st.conferenciasConcluidas.length}</div>
        </div>
        <div style={{ padding: 10, borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ color: "#94a3b8", fontSize: 9 }}>FILA PENDENTE</div>
          <div style={{ color: qs.pending ? "#ffaa00" : "#00ff88", fontWeight: 800 }}>{qs.pending}</div>
        </div>
        <div style={{ padding: 10, borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ color: "#94a3b8", fontSize: 9 }}>DLQ</div>
          <div style={{ color: qs.dead ? "#ff4444" : "#00ff88", fontWeight: 800 }}>{qs.dead}</div>
        </div>
        <div style={{ padding: 10, borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ color: "#94a3b8", fontSize: 9 }}>ALERTAS GUARDIAN</div>
          <div style={{ color: alerts.length ? "#ffaa00" : "#00ff88", fontWeight: 800 }}>{alerts.length}</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        <input style={{ ...inputStyle, flex: 1, minWidth: 160 }} placeholder="🔎 buscar mensagem/tipo/módulo" value={q} onChange={e => setQ(e.target.value)} />
        <select style={inputStyle} value={loteria} onChange={e => setLoteria(e.target.value)}>
          <option value="">Todas modalidades</option>
          {LOTERIAS.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <input style={{ ...inputStyle, width: 110 }} placeholder="Concurso" value={concurso} onChange={e => setConcurso(e.target.value)} />
        <select style={inputStyle} value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">Todos status</option>
          <option value="info">info</option>
          <option value="warn">warn</option>
          <option value="error">error</option>
        </select>
        <input type="datetime-local" style={inputStyle} value={de} onChange={e => setDe(e.target.value)} />
        <input type="datetime-local" style={inputStyle} value={ate} onChange={e => setAte(e.target.value)} />
        <button style={btn} onClick={() => void load()}>{loading ? "..." : "↻ Atualizar"}</button>
        <button style={btn} onClick={exportCsv}>📄 CSV</button>
        <button style={btn} onClick={exportPdf}>📕 PDF</button>
        {qs.dead > 0 && (
          <button style={{ ...btn, background: "rgba(255,68,68,0.12)", borderColor: "rgba(255,68,68,0.3)", color: "#ff6b6b" }}
            onClick={() => durableQueue.requeueDlq()}>♻️ Reprocessar DLQ</button>
        )}
      </div>

      <div style={{ maxHeight: 460, overflow: "auto", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
          <thead>
            <tr style={{ position: "sticky", top: 0, background: "#0b1220", color: "#00d4ff" }}>
              {["Timestamp BRT","Tipo","Módulo","Sev.","Modalidade","Concurso","Mensagem"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "7px 8px", fontSize: 9 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <td style={{ padding: "6px 8px", color: "#94a3b8", whiteSpace: "nowrap" }}>{BRT(r.at)}</td>
                <td style={{ padding: "6px 8px", color: "#cbd5e1" }}>{r.tipo}</td>
                <td style={{ padding: "6px 8px", color: "#94a3b8" }}>{r.modulo ?? "-"}</td>
                <td style={{ padding: "6px 8px", color: r.severidade === "error" ? "#ff6b6b" : r.severidade === "warn" ? "#ffaa00" : "#00ff88" }}>{r.severidade}</td>
                <td style={{ padding: "6px 8px", color: "#00d4ff" }}>{r.loteria ?? "-"}</td>
                <td style={{ padding: "6px 8px", color: "#cbd5e1" }}>{r.concurso ?? "-"}</td>
                <td style={{ padding: "6px 8px", color: "#e2e8f0" }}>{r.mensagem}</td>
              </tr>
            ))}
            {!filtered.length && (
              <tr><td colSpan={7} style={{ padding: 16, textAlign: "center", color: "#475569" }}>
                {loading ? "Carregando auditoria..." : "Nenhum registro para os filtros aplicados."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
