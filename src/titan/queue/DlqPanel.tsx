// ============================================================
// DlqPanel.tsx — Tela de mensagens na DLQ com motivo do erro,
// reprocessar / descartar (com auditoria) e reprocessamento
// idempotente de um concurso específico.
// ============================================================
import { useEffect, useMemo, useState } from "react";
import { durableQueue, DeadLetter } from "./durableQueue";
import { enqueueReprocessoConcurso, registerQueueHandlers } from "./handlers";

const BRT = (v: number | string) =>
  new Date(v).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

const LOTERIAS = ["megasena","quina","lotofacil","lotomania","timemania","duplasena","diadesorte","supersete","maismilionaria"];

const card: React.CSSProperties = {
  padding: 10, borderRadius: 8, background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
};
const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 6, color: "#e2e8f0", fontSize: 10, padding: "6px 8px", fontFamily: "inherit",
};
const btn: React.CSSProperties = {
  background: "rgba(0,212,255,0.12)", border: "1px solid rgba(0,212,255,0.3)",
  color: "#00d4ff", borderRadius: 7, fontSize: 10, fontWeight: 700, padding: "6px 10px", cursor: "pointer",
};
const btnDanger: React.CSSProperties = {
  ...btn, background: "rgba(255,68,68,0.12)", borderColor: "rgba(255,68,68,0.3)", color: "#ff6b6b",
};

export function DlqPanel() {
  const [, setTick] = useState(0);
  const [tipo, setTipo] = useState("");
  const [q, setQ] = useState("");
  const [motivo, setMotivo] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [rLoteria, setRLoteria] = useState("megasena");
  const [rConcurso, setRConcurso] = useState("");
  const [rMotivo, setRMotivo] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [watched, setWatched] = useState<Record<string, { label: string; at: number }>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    registerQueueHandlers();
    const un = durableQueue.subscribe(() => setTick(t => t + 1));
    const iv = setInterval(() => setTick(t => t + 1), 2_000);
    return () => { un(); clearInterval(iv); };
  }, []);

  const stats = durableQueue.stats();
  const dlq = stats.dlq as DeadLetter[];

  /** Estado de reprocessamento derivado das filas: em fila → processando → concluído/erro. */
  type RState = "queued" | "processing" | "done" | "error";
  const reprocessState = (id: string): RState | null => {
    if (!watched[id]) return null;
    const job = stats.jobs.find(j => j.id === id);
    if (job) return job.attempts > 0 ? "processing" : "queued";
    if (dlq.some(d => d.id === id)) return "error";
    return "done";
  };
  const R_META: Record<RState, { label: string; color: string }> = {
    queued:     { label: "⏳ em fila",   color: "#ffaa00" },
    processing: { label: "⚙️ processando", color: "#00d4ff" },
    done:       { label: "✅ concluído", color: "#00ff88" },
    error:      { label: "❌ erro",      color: "#ff6b6b" },
  };

  const watchedList = Object.entries(watched)
    .map(([id, w]) => ({ id, ...w, state: reprocessState(id) }))
    .filter(w => w.state)
    .sort((a, b) => b.at - a.at)
    .slice(0, 12);

  function track(ids: { id: string; label: string }[]) {
    setWatched(prev => {
      const next = { ...prev };
      ids.forEach(({ id, label }) => { next[id] = { label, at: Date.now() }; });
      return next;
    });
  }

  const filtered = useMemo(() => dlq
    .filter(d => !tipo || d.type === tipo)
    .filter(d => !q || `${d.type} ${d.queue} ${d.lastError ?? ""} ${d.traceKey ?? ""}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.deadAt - a.deadAt), [dlq, tipo, q]);

  const tipos = Array.from(new Set(dlq.map(d => d.type)));

  async function reprocess(id?: string) {
    const alvo = id ? filtered.filter(d => d.id === id) : filtered;
    if (!alvo.length) { setMsg("⚠️ Nenhuma mensagem elegível para reprocessamento."); return; }
    setBusy(true);
    try {
      const razao = motivo.trim() || "reprocessamento manual da DLQ (painel institucional)";
      track(alvo.map(d => ({ id: d.id, label: `${d.type} · ${d.traceKey ?? "-"}` })));
      let n = 0;
      if (id) {
        n = await durableQueue.requeueDlq(id, razao);
      } else {
        // lote: reprocessa apenas os itens filtrados, com feedback individual
        for (const d of alvo) n += await durableQueue.requeueDlq(d.id, razao);
      }
      await durableQueue.drain();
      setMsg(`♻️ ${n} mensagem(ns) reenfileirada(s) — motivo auditado: "${razao}".`);
    } catch (err) {
      setMsg(`❌ Falha ao reprocessar: ${(err as Error)?.message ?? String(err)}`);
    } finally { setBusy(false); }
  }
  async function discard(id?: string) {
    const alvo = id ? filtered.filter(d => d.id === id) : filtered;
    if (!alvo.length) { setMsg("⚠️ Nenhuma mensagem elegível para descarte."); return; }
    setBusy(true);
    try {
      const razao = motivo.trim() || "descarte manual da DLQ (painel institucional)";
      let n = 0;
      for (const d of alvo) n += await durableQueue.discardDlq(d.id, razao);
      setMsg(`🗑️ ${n} mensagem(ns) descartada(s) — motivo auditado: "${razao}".`);
    } catch (err) {
      setMsg(`❌ Falha ao descartar: ${(err as Error)?.message ?? String(err)}`);
    } finally { setBusy(false); }
  }
  async function reprocessConcurso() {
    const c = Number(rConcurso);
    if (!rLoteria) { setMsg("⚠️ Selecione a modalidade."); return; }
    if (!Number.isFinite(c) || c <= 0 || !Number.isInteger(c)) {
      setMsg("⚠️ Informe um concurso válido (número inteiro positivo)."); return;
    }
    setBusy(true);
    try {
      const razao = rMotivo.trim() || "reprocessamento solicitado no painel institucional";
      const job = enqueueReprocessoConcurso(rLoteria, c, razao);
      track([{ id: job.id, label: `reprocessar ${rLoteria} #${c}` }]);
      await durableQueue.drain();
      setMsg(`🔁 Reprocessamento idempotente enfileirado para ${rLoteria} #${c} — motivo auditado.`);
    } catch (err) {
      setMsg(`❌ Falha ao enfileirar reprocessamento: ${(err as Error)?.message ?? String(err)}`);
    } finally { setBusy(false); }
  }


  return (
    <div style={{ fontSize: 11 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 8, marginBottom: 10 }}>
        <div style={card}>
          <div style={{ color: "#94a3b8", fontSize: 9 }}>DLQ TOTAL</div>
          <div style={{ color: stats.dead ? "#ff4444" : "#00ff88", fontWeight: 800 }}>{stats.dead}</div>
        </div>
        <div style={card}>
          <div style={{ color: "#94a3b8", fontSize: 9 }}>FILA PENDENTE</div>
          <div style={{ color: stats.pending ? "#ffaa00" : "#00ff88", fontWeight: 800 }}>{stats.pending}</div>
        </div>
        {Object.entries(stats.byTypeDead).map(([t, n]) => (
          <div key={t} style={card}>
            <div style={{ color: "#94a3b8", fontSize: 9 }}>{t.toUpperCase()}</div>
            <div style={{ color: "#ffaa00", fontWeight: 800 }}>{n}</div>
          </div>
        ))}
      </div>

      <div style={{ ...card, marginBottom: 10 }}>
        <div style={{ color: "#00d4ff", fontWeight: 800, fontSize: 10, marginBottom: 6 }}>🔁 REPROCESSAR CONCURSO ESPECÍFICO (IDEMPOTENTE)</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <select style={inputStyle} value={rLoteria} onChange={e => setRLoteria(e.target.value)}>
            {LOTERIAS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <input style={{ ...inputStyle, width: 110 }} placeholder="Concurso" value={rConcurso} onChange={e => setRConcurso(e.target.value)} />
          <input style={{ ...inputStyle, flex: 1, minWidth: 180 }} placeholder="Motivo do reprocessamento (auditoria)" value={rMotivo} onChange={e => setRMotivo(e.target.value)} />
          <button style={{ ...btn, opacity: busy ? 0.5 : 1 }} disabled={busy} onClick={() => void reprocessConcurso()}>
            {busy ? "..." : "Reprocessar"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        <input style={{ ...inputStyle, flex: 1, minWidth: 160 }} placeholder="🔎 buscar erro / tipo / modalidade:concurso" value={q} onChange={e => setQ(e.target.value)} />
        <select style={inputStyle} value={tipo} onChange={e => setTipo(e.target.value)}>
          <option value="">Todos os tipos</option>
          {tipos.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input style={{ ...inputStyle, minWidth: 180 }} placeholder="Motivo (registrado na auditoria)" value={motivo} onChange={e => setMotivo(e.target.value)} />
        <button style={{ ...btn, opacity: busy || !filtered.length ? 0.5 : 1 }} disabled={busy || !filtered.length} onClick={() => void reprocess()}>
          ♻️ Reprocessar lote ({filtered.length})
        </button>
        <button style={{ ...btnDanger, opacity: busy || !filtered.length ? 0.5 : 1 }} disabled={busy || !filtered.length} onClick={() => void discard()}>
          🗑️ Descartar lote ({filtered.length})
        </button>
      </div>

      {msg && (
        <div style={{ ...card, marginBottom: 10, color: msg.startsWith("❌") || msg.startsWith("⚠️") ? "#ffaa00" : "#00ff88", fontSize: 10 }}>{msg}</div>
      )}

      {!!watchedList.length && (
        <div style={{ ...card, marginBottom: 10 }}>
          <div style={{ color: "#00d4ff", fontWeight: 800, fontSize: 10, marginBottom: 6 }}>📡 STATUS DOS REPROCESSAMENTOS</div>
          {watchedList.map(w => {
            const meta = R_META[w.state as RState];
            return (
              <div key={w.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "3px 0", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                <span style={{ color: "#cbd5e1" }}>{w.label}</span>
                <span style={{ color: "#475569", fontSize: 9 }}>{BRT(w.at)}</span>
                <span style={{ color: meta.color, fontWeight: 700, minWidth: 92, textAlign: "right" }}>{meta.label}</span>
              </div>
            );
          })}
        </div>
      )}


      <div style={{ maxHeight: 460, overflow: "auto", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
          <thead>
            <tr style={{ position: "sticky", top: 0, background: "#0b1220", color: "#00d4ff" }}>
              {["Falhou em (BRT)","Fila/Tipo","Modalidade:Concurso","Tentativas","Motivo do erro","Ações"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "7px 8px", fontSize: 9 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(d => (
              <>
                <tr key={d.id} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <td style={{ padding: "6px 8px", color: "#94a3b8", whiteSpace: "nowrap" }}>{BRT(d.deadAt)}</td>
                  <td style={{ padding: "6px 8px", color: "#cbd5e1" }}>{d.queue}/{d.type}</td>
                  <td style={{ padding: "6px 8px", color: "#00d4ff" }}>{d.traceKey ?? "-"}</td>
                  <td style={{ padding: "6px 8px", color: "#ffaa00" }}>{d.attempts}/{d.maxAttempts}</td>
                  <td style={{ padding: "6px 8px", color: "#ff6b6b", maxWidth: 380 }}>{d.lastError ?? "-"}</td>
                  <td style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>
                    <button style={{ ...btn, padding: "3px 7px" }} onClick={() => void reprocess(d.id)}>♻️</button>{" "}
                    <button style={{ ...btnDanger, padding: "3px 7px" }} onClick={() => void discard(d.id)}>🗑️</button>{" "}
                    <button style={{ ...btn, padding: "3px 7px" }} onClick={() => setExpanded(expanded === d.id ? null : d.id)}>🔍</button>
                  </td>
                </tr>
                {expanded === d.id && (
                  <tr key={`${d.id}-detail`}>
                    <td colSpan={6} style={{ padding: 10, background: "rgba(0,0,0,0.25)" }}>
                      <div style={{ color: "#94a3b8", fontSize: 9, marginBottom: 4 }}>TRILHA DE ERROS</div>
                      {d.errors.map((e, i) => (
                        <div key={i} style={{ color: "#ff9e9e", fontSize: 9, fontFamily: "monospace" }}>{e}</div>
                      ))}
                      <div style={{ color: "#94a3b8", fontSize: 9, margin: "6px 0 4px" }}>PAYLOAD</div>
                      <pre style={{ color: "#cbd5e1", fontSize: 9, whiteSpace: "pre-wrap", margin: 0 }}>
                        {JSON.stringify(d.payload, null, 2).slice(0, 2000)}
                      </pre>
                    </td>
                  </tr>
                )}
              </>
            ))}
            {!filtered.length && (
              <tr><td colSpan={6} style={{ padding: 16, textAlign: "center", color: "#475569" }}>
                Nenhuma mensagem na DLQ — filas saudáveis. ✅
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
