// ============================================================
// IngestMonitorCard.tsx — Monitoramento do agendamento real
// "atlas-ingest-diario-noturno": execuções, concursos coletados,
// falhas e atrasos por loteria. Exibido na aba SLA/Filas.
// ============================================================
import { useCallback, useEffect, useState } from "react";
import { fetchIngestSnapshot, dispararIngestManual, IngestSnapshot, IngestSev, INGEST_SLA } from "./ingestMonitor";

const SEV_COLOR: Record<IngestSev, string> = {
  ok: "#00ff88", warn: "#ffaa00", error: "#ff6b6b", critical: "#ff2222",
};

const NOMES: Record<string, string> = {
  megasena: "Mega-Sena", quina: "Quina", lotofacil: "Lotofácil", lotomania: "Lotomania",
  timemania: "Timemania", duplasena: "Dupla Sena", diadesorte: "Dia de Sorte",
  supersete: "Super Sete", maismilionaria: "+Milionária",
};

function fmtHora(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export function IngestMonitorCard() {
  const [snap, setSnap] = useState<IngestSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const s = await fetchIngestSnapshot();
      setSnap(s);
    } catch { /* mantém último snapshot */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const it = setInterval(() => void load(), 60_000);
    return () => clearInterval(it);
  }, [load]);

  async function manual() {
    setBusy(true); setMsg(null);
    const r = await dispararIngestManual();
    setMsg(r.ok ? "✅ Ingestão disparada — aguardando gravação no banco." : `❌ ${r.erro}`);
    setTimeout(() => void load(), 4_000);
    setBusy(false);
  }

  const c = snap ? SEV_COLOR[snap.sev] : "#475569";

  return (
    <div style={{ padding: 10, borderRadius: 10, background: "rgba(255,255,255,0.02)", border: `1px solid ${c}33` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, gap: 8, flexWrap: "wrap" }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: c }}>🛰️ INGESTÃO NOTURNA · atlas-ingest-diario-noturno</div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => void load()} style={btn("#00d4ff")}>🔄 Atualizar</button>
          <button onClick={() => void manual()} disabled={busy} style={{ ...btn("#aa00ff"), opacity: busy ? 0.5 : 1 }}>
            {busy ? "⏳ Executando..." : "⚡ Ingerir agora"}
          </button>
        </div>
      </div>

      {loading && !snap ? (
        <div style={{ fontSize: 9, color: "#475569" }}>Consultando ambiente real...</div>
      ) : !snap ? (
        <div style={{ fontSize: 9, color: "#ff6b6b" }}>Não foi possível ler o estado da ingestão.</div>
      ) : (
        <>
          <div style={{ fontSize: 9, color: "#cbd5e1", marginBottom: 8 }}>{snap.diagnostico}</div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(108px,1fr))", gap: 6, marginBottom: 8 }}>
            <Mini l="Execuções" v={String(snap.runsTotal)} c="#00d4ff" s={`status ${snap.lastStatus ?? "n/d"}`} />
            <Mini l="Última execução" v={snap.atrasoMin == null ? "—" : `${snap.atrasoMin} min`} c={snap.atrasoMin != null && snap.dentroDaJanela && snap.atrasoMin >= INGEST_SLA.atrasoWarnMin ? "#ffaa00" : "#00ff88"} s={fmtHora(snap.lastRunAt)} />
            <Mini l="Concursos no ciclo" v={String(snap.inseridos)} c="#00ff88" s={`backfill ${snap.backfill}`} />
            <Mini l="Falhas" v={String(snap.falhas)} c={snap.falhas ? "#ff6b6b" : "#00ff88"} s="último ciclo" />
            <Mini l="Base histórica" v={String(snap.totalColetado)} c="#aa00ff" s={`${snap.loterias.length} loterias`} />
            <Mini l="Janela cron" v={snap.dentroDaJanela ? "ATIVA" : "FORA"} c={snap.dentroDaJanela ? "#00ff88" : "#64748b"} s="20h–00h BRT" />
            <Mini l="Job" v={snap.paused ? "PAUSADO" : "ATIVO"} c={snap.paused ? "#ff2222" : "#00ff88"} s={snap.pauseReason ?? "single-flight lease"} />
          </div>

          {msg && <div style={{ fontSize: 9, color: msg.startsWith("✅") ? "#00ff88" : "#ff6b6b", marginBottom: 6 }}>{msg}</div>}

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9 }}>
              <thead>
                <tr style={{ color: "#64748b", textAlign: "left" }}>
                  <th style={{ padding: 4 }}>Loteria</th>
                  <th style={{ padding: 4 }}>Último concurso</th>
                  <th style={{ padding: 4 }}>Apuração</th>
                  <th style={{ padding: 4 }}>Atraso</th>
                  <th style={{ padding: 4 }}>Sorteio hoje</th>
                  <th style={{ padding: 4 }}>Histórico</th>
                  <th style={{ padding: 4 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {snap.loterias.map(l => (
                  <tr key={l.loteria} style={{ borderTop: "1px solid rgba(255,255,255,0.06)", color: "#cbd5e1" }}>
                    <td style={{ padding: 4, fontWeight: 700 }}>{NOMES[l.loteria] ?? l.loteria}</td>
                    <td style={{ padding: 4 }}>#{l.ultimoConcurso}</td>
                    <td style={{ padding: 4 }}>{l.ultimaData || "—"}</td>
                    <td style={{ padding: 4, color: l.atrasoDias >= INGEST_SLA.atrasoDiasWarn ? "#ffaa00" : "#94a3b8" }}>{l.atrasoDias}d</td>
                    <td style={{ padding: 4, color: l.esperadoHoje ? "#00d4ff" : "#475569" }}>{l.esperadoHoje ? "sim" : "não"}</td>
                    <td style={{ padding: 4 }}>{l.totalHistorico}</td>
                    <td style={{ padding: 4, color: SEV_COLOR[l.sev], fontWeight: 800 }}>
                      {l.faltando ? "PENDENTE" : l.sev.toUpperCase()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Mini({ l, v, c, s }: { l: string; v: string; c: string; s?: string }) {
  return (
    <div style={{ padding: 8, borderRadius: 8, background: "rgba(0,0,0,0.3)", border: `1px solid ${c}28` }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: c }}>{v}</div>
      <div style={{ fontSize: 8, color: "#94a3b8", marginTop: 1 }}>{l}</div>
      {s && <div style={{ fontSize: 7, color: "#475569" }}>{s}</div>}
    </div>
  );
}

function btn(color: string): React.CSSProperties {
  return {
    background: `${color}1a`, border: `1px solid ${color}44`, color,
    borderRadius: 6, fontSize: 9, fontWeight: 700, padding: "4px 8px",
    cursor: "pointer", fontFamily: "inherit",
  };
}
