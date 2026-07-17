// Painel de agendamentos de backtest
import { useEffect, useState } from "react";
import {
  listSchedules, createSchedule, toggleSchedule, deleteSchedule, runSchedule,
  startSchedulerLoop, type BacktestSchedule,
} from "./BacktestScheduler";
import { LOTERIA_CONFIG, PREDICTORS, type LoteriaKey } from "@/titan/engines/backtest";

const BRT = (s: string | null) =>
  s ? new Date(s).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—";

const LOTERIAS = Object.keys(LOTERIA_CONFIG) as LoteriaKey[];
const ALGOS = Object.keys(PREDICTORS);

export function BacktestSchedulerPanel() {
  const [items, setItems] = useState<BacktestSchedule[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState({
    nome: "Diário 09:00",
    loterias: ["megasena", "lotofacil", "quina"] as string[],
    algoritmos: ["ensemble"] as string[],
    ia_engine: "Titan-Ensemble-Quantum",
    window_size: 20,
    max_samples: 300,
    interval_hours: 24,
    ativo: true,
  });

  async function refresh() {
    try { setItems(await listSchedules()); } catch { /* silent */ }
  }

  useEffect(() => { refresh(); startSchedulerLoop(60_000); }, []);

  async function handleCreate() {
    try {
      setBusy("create");
      await createSchedule(form);
      setShowForm(false);
      await refresh();
    } catch (e: any) { alert("Erro: " + (e?.message ?? e)); }
    finally { setBusy(null); }
  }

  async function handleRunNow(s: BacktestSchedule) {
    setBusy(s.id);
    try { await runSchedule(s); await refresh(); }
    finally { setBusy(null); }
  }

  async function handleToggle(s: BacktestSchedule) {
    await toggleSchedule(s.id, !s.ativo); refresh();
  }
  async function handleDelete(s: BacktestSchedule) {
    if (!confirm(`Excluir agendamento "${s.nome}"?`)) return;
    await deleteSchedule(s.id); refresh();
  }

  return (
    <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,170,0,0.25)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#ffaa00", textTransform: "uppercase", letterSpacing: 0.5 }}>
          ⏰ Scheduler de Backtest ({items.length})
        </div>
        <button onClick={() => setShowForm(v => !v)} style={btn("#00d4ff")}>
          {showForm ? "✕ Cancelar" : "+ Novo agendamento"}
        </button>
      </div>

      {showForm && (
        <div style={{ padding: 10, marginBottom: 10, borderRadius: 8, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(0,212,255,0.2)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
            <Field label="Nome">
              <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} style={inp} />
            </Field>
            <Field label={`Intervalo (h): ${form.interval_hours}`}>
              <input type="number" min={1} max={720} value={form.interval_hours}
                onChange={e => setForm({ ...form, interval_hours: Number(e.target.value) })} style={inp} />
            </Field>
            <Field label={`Janela: ${form.window_size} · Amostras: ${form.max_samples}`}>
              <div style={{ display: "flex", gap: 6 }}>
                <input type="number" min={10} max={100} value={form.window_size}
                  onChange={e => setForm({ ...form, window_size: Number(e.target.value) })} style={inp} />
                <input type="number" min={50} max={1000} value={form.max_samples}
                  onChange={e => setForm({ ...form, max_samples: Number(e.target.value) })} style={inp} />
              </div>
            </Field>
          </div>
          <Field label="Loterias">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {LOTERIAS.map(l => (
                <Chip key={l} active={form.loterias.includes(l)}
                  onClick={() => setForm(f => ({ ...f, loterias: f.loterias.includes(l) ? f.loterias.filter(x => x !== l) : [...f.loterias, l] }))}>
                  {l}
                </Chip>
              ))}
            </div>
          </Field>
          <Field label="Algoritmos">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {ALGOS.map(a => (
                <Chip key={a} active={form.algoritmos.includes(a)}
                  onClick={() => setForm(f => ({ ...f, algoritmos: f.algoritmos.includes(a) ? f.algoritmos.filter(x => x !== a) : [...f.algoritmos, a] }))}>
                  {a}
                </Chip>
              ))}
            </div>
          </Field>
          <button onClick={handleCreate} disabled={busy === "create"} style={{ ...btn("#00ff88"), marginTop: 8 }}>
            {busy === "create" ? "Criando..." : "✓ Criar agendamento"}
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <div style={{ fontSize: 10, color: "#475569" }}>Nenhum agendamento configurado.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map(s => (
            <div key={s.id} style={{ padding: 10, borderRadius: 8, background: "rgba(0,0,0,0.25)", border: `1px solid ${s.ativo ? "rgba(0,255,136,0.2)" : "rgba(255,107,107,0.2)"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: s.ativo ? "#00ff88" : "#ff6b6b" }}>
                  {s.ativo ? "●" : "○"} {s.nome}
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => handleRunNow(s)} disabled={busy === s.id} style={btn("#00d4ff")}>
                    {busy === s.id ? "..." : "▶ Rodar agora"}
                  </button>
                  <button onClick={() => handleToggle(s)} style={btn(s.ativo ? "#ffaa00" : "#00ff88")}>
                    {s.ativo ? "Pausar" : "Ativar"}
                  </button>
                  <button onClick={() => handleDelete(s)} style={btn("#ff6b6b")}>✕</button>
                </div>
              </div>
              <div style={{ fontSize: 9, color: "#94a3b8", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                <div>Intervalo: <b style={{ color: "#cbd5e1" }}>{s.interval_hours}h</b></div>
                <div>Execuções: <b style={{ color: "#cbd5e1" }}>{s.execucoes_total}</b></div>
                <div>Última: <b style={{ color: "#cbd5e1" }}>{BRT(s.ultima_execucao)}</b></div>
                <div>Próxima: <b style={{ color: "#00d4ff" }}>{BRT(s.proxima_execucao)}</b></div>
              </div>
              <div style={{ fontSize: 9, color: "#64748b", marginTop: 3 }}>
                {s.loterias.length} loterias · {s.algoritmos.length} algoritmos · {s.ia_engine}
                {s.ultimo_status && <> · status: <b style={{ color: s.ultimo_status === "done" ? "#00ff88" : "#ff6b6b" }}>{s.ultimo_status}</b></>}
              </div>
              {s.ultimo_resumo?.melhores?.length > 0 && (
                <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 3 }}>
                  Top: {s.ultimo_resumo.melhores.map((m: any) => `${m.loteria}/${m.algoritmo} (${m.precisao}%)`).join(" · ")}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const btn = (c: string): React.CSSProperties => ({
  padding: "4px 10px", borderRadius: 6, border: `1px solid ${c}55`,
  background: `${c}18`, color: c, fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
});
const inp: React.CSSProperties = {
  width: "100%", padding: "6px 8px", borderRadius: 6, fontSize: 10,
  background: "rgba(0,0,0,0.4)", color: "#e2e8f0",
  border: "1px solid rgba(255,255,255,0.08)", fontFamily: "inherit",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontSize: 9, color: "#475569", marginBottom: 3, fontWeight: 700, textTransform: "uppercase" }}>{label}</div>
      {children}
    </div>
  );
}
function Chip({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: "3px 8px", borderRadius: 12, fontSize: 9, fontWeight: 700, cursor: "pointer",
      border: `1px solid ${active ? "rgba(0,212,255,0.5)" : "rgba(255,255,255,0.08)"}`,
      background: active ? "rgba(0,212,255,0.15)" : "rgba(255,255,255,0.03)",
      color: active ? "#00d4ff" : "#64748b", fontFamily: "inherit",
    }}>{children}</button>
  );
}
