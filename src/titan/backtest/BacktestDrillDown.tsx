// Drill-down modal: mostra concursos usados e acertos/erros por IA
import type { BacktestResult } from "@/titan/engines/backtest";
import { exportBacktestRoundsCsv } from "./exportCsv";
import { exportBacktestDrillPdf } from "./exportPdf";

export function BacktestDrillDown({
  result, onClose,
}: { result: BacktestResult; onClose: () => void }) {
  const rounds = result.rounds ?? [];
  const hits = rounds.filter(r => r.acertos >= 3);
  const totalPremio = rounds.reduce((s, r) => s + r.premio, 0);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
        zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 1100, maxHeight: "90vh", overflowY: "auto",
          background: "linear-gradient(135deg,#0a0f1c,#0f1524)",
          border: "1px solid rgba(0,212,255,0.35)", borderRadius: 12, padding: 20,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#00d4ff" }}>
              🔬 Drill-Down · {result.loteria.toUpperCase()} · {result.algoritmo}
            </div>
            <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
              {result.iaEngine} · {rounds.length} concursos · Hit ≥3: {hits.length} · Prêmio simulado R$ {totalPremio.toLocaleString("pt-BR")}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => exportBacktestRoundsCsv(result)} style={btn("#00ff88")}>⬇ CSV</button>
            <button onClick={() => exportBacktestDrillPdf(result)} style={btn("#aa00ff")}>⬇ PDF</button>
            <button onClick={onClose} style={btn("#ff6b6b")}>✕ Fechar</button>
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
          <thead>
            <tr style={{ color: "#475569", textAlign: "left", position: "sticky", top: 0, background: "#0a0f1c" }}>
              <th style={th}>#</th>
              <th style={th}>Concurso</th>
              <th style={th}>Data</th>
              <th style={th}>Sorteados</th>
              <th style={th}>Previstos IA</th>
              <th style={th}>Acertos</th>
              <th style={th}>Prêmio</th>
              <th style={th}>Confiança</th>
            </tr>
          </thead>
          <tbody>
            {rounds.map((r, i) => {
              const setSort = new Set(r.sorteados);
              const acertados = r.previstos.filter(n => setSort.has(n));
              const perdidos = r.previstos.filter(n => !setSort.has(n));
              return (
                <tr key={r.concurso} style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                  <td style={td}>{i + 1}</td>
                  <td style={{ ...td, color: "#00d4ff", fontWeight: 700 }}>{r.concurso}</td>
                  <td style={td}>{r.data}</td>
                  <td style={td}>{r.sorteados.join(" ")}</td>
                  <td style={td}>
                    <span style={{ color: "#00ff88" }}>{acertados.join(" ")}</span>
                    {perdidos.length > 0 && (
                      <> · <span style={{ color: "#ff6b6b", opacity: 0.7 }}>{perdidos.join(" ")}</span></>
                    )}
                  </td>
                  <td style={{ ...td, color: r.acertos >= 3 ? "#00ff88" : "#94a3b8", fontWeight: 700 }}>{r.acertos}</td>
                  <td style={{ ...td, color: r.premio > 0 ? "#ffaa00" : "#475569" }}>
                    {r.premio > 0 ? `R$ ${r.premio.toLocaleString("pt-BR")}` : "—"}
                  </td>
                  <td style={td}>{(r.confidence * 100).toFixed(0)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th: React.CSSProperties = { padding: "6px 4px", fontSize: 9, fontWeight: 700 };
const td: React.CSSProperties = { padding: "5px 4px", fontSize: 10, color: "#cbd5e1" };
const btn = (c: string): React.CSSProperties => ({
  padding: "6px 12px", borderRadius: 6, border: `1px solid ${c}55`,
  background: `${c}18`, color: c, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
});
