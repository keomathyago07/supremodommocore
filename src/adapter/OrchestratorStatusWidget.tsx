// ============================================================
// OrchestratorStatusWidget.tsx
// Widget compacto que você pode embutir em QUALQUER página
// do seu programa para mostrar o status do orquestrador.
//
// USO:
// import { OrchestratorStatusWidget } from "./orchestrator/OrchestratorStatusWidget";
// <OrchestratorStatusWidget />
// ============================================================

import React, { useState } from "react";
import { useOrchestratorAdapter } from "./orchestratorAdapterStore";

interface WidgetProps {
  /** Exibir compacto (só ícones) ou expandido */
  compact?: boolean;
  /** Mostrar botão para ir à página do orquestrador */
  showLink?: boolean;
  linkPath?: string;
}

export function OrchestratorStatusWidget({
  compact = false,
  showLink = true,
  linkPath = "/orquestrador",
}: WidgetProps) {
  const { isOnline, nucleusStatus: ns, metrics, logs, isInGenerationWindow, isInCheckingWindow } = useOrchestratorAdapter();
  const [expanded, setExpanded] = useState(false);

  const lastPrize = logs.slice().reverse().find(l => l.level === "success" && l.message.includes("PREMIAÇÃO"));
  const lastLog = logs[logs.length - 1];
  const activeRatio = ns.totalIAs > 0 ? Math.round((ns.activeIAs / ns.totalIAs) * 100) : 0;
  const inGen = isInGenerationWindow();
  const inCheck = isInCheckingWindow();

  if (compact) {
    return (
      <button
        onClick={() => setExpanded(!expanded)}
        title="Orquestrador Master"
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "5px 10px", borderRadius: 20, border: "1px solid",
          background: isOnline ? "rgba(0,255,136,0.08)" : "rgba(255,255,255,0.04)",
          borderColor: isOnline ? "rgba(0,255,136,0.2)" : "rgba(255,255,255,0.08)",
          cursor: "pointer", fontFamily: "monospace",
        }}
      >
        <span style={{
          width: 7, height: 7, borderRadius: "50%",
          background: isOnline ? "#00ff88" : "#334155",
          boxShadow: isOnline ? "0 0 6px #00ff88" : "none",
          display: "inline-block",
          animation: isOnline ? "pulse 1.5s infinite" : "none",
        }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: isOnline ? "#00ff88" : "#475569" }}>
          🤖 {ns.totalIAs.toLocaleString()} IAs
        </span>
        {inGen && <span style={{ fontSize: 8, color: "#ff9800" }}>● GER</span>}
        {inCheck && <span style={{ fontSize: 8, color: "#00d4ff" }}>● CONF</span>}
        {metrics.totalPrizesDetected > 0 && (
          <span style={{ fontSize: 8, color: "#00ff88", fontWeight: 800 }}>
            🏆{metrics.totalPrizesDetected}
          </span>
        )}
      </button>
    );
  }

  return (
    <div style={{
      padding: "12px 14px", borderRadius: 12,
      background: "linear-gradient(135deg, rgba(0,212,255,0.04), rgba(170,0,255,0.05))",
      border: `1px solid ${isOnline ? "rgba(0,255,136,0.15)" : "rgba(255,255,255,0.07)"}`,
      fontFamily: "monospace",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>🤖</span>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#e2e8f0" }}>
              Orquestrador Master
            </div>
            <div style={{ fontSize: 9, color: "#334155" }}>
              {ns.totalIAs.toLocaleString()} IAs · {isOnline ? "Conectado" : "Offline"}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {isOnline && (
            <span style={{
              width: 7, height: 7, borderRadius: "50%",
              background: "#00ff88", boxShadow: "0 0 8px #00ff88",
              display: "inline-block", animation: "pulse 1.5s infinite",
            }} />
          )}
          {showLink && (
            <a href={linkPath} style={{
              fontSize: 9, padding: "2px 8px", borderRadius: 8,
              background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.2)",
              color: "#00d4ff", textDecoration: "none", fontWeight: 700,
            }}>
              Abrir →
            </a>
          )}
        </div>
      </div>

      {/* Stats rápidos */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, marginBottom: 10 }}>
        <MiniKPI label="IAs Ativas" val={`${ns.activeIAs.toLocaleString()}`}
          sub={`${activeRatio}%`} c={activeRatio > 50 ? "#00ff88" : "#ffaa00"} />
        <MiniKPI label="Precisão" val={`${ns.ensembleAccuracy.toFixed(1)}%`}
          sub="ensemble" c="#00d4ff" />
        <MiniKPI label="Prêmios" val={String(metrics.totalPrizesDetected)}
          sub={`R$${metrics.totalEarningsTracked > 0 ? metrics.totalEarningsTracked.toLocaleString("pt-BR") : "0"}`}
          c="#ffaa00" />
      </div>

      {/* Janelas ativas */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        {inGen && <WindowChip label="Geração ativa" c="#ff9800" />}
        {inCheck && <WindowChip label="Conferência ativa" c="#00d4ff" />}
        {!inGen && !inCheck && (
          <WindowChip label="Aguardando janela" c="#334155" />
        )}
      </div>

      {/* Tarefa atual */}
      {ns.currentTask && (
        <div style={{
          padding: "6px 10px", borderRadius: 6, marginBottom: 8,
          background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.12)",
          fontSize: 10, color: "#00d4ff",
        }}>
          ⚙️ {ns.currentTask}
        </div>
      )}

      {/* Última premiação */}
      {lastPrize && (
        <div style={{
          padding: "6px 10px", borderRadius: 6, marginBottom: 8,
          background: "rgba(0,255,136,0.06)", border: "1px solid rgba(0,255,136,0.15)",
          fontSize: 10, color: "#00ff88",
        }}>
          {lastPrize.message.slice(0, 80)}
        </div>
      )}

      {/* Último log */}
      {lastLog && (
        <div style={{ fontSize: 9, color: "#334155" }}>
          {new Date(lastLog.ts).toLocaleTimeString("pt-BR")} — {lastLog.message.slice(0, 60)}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%,100%{opacity:1;transform:scale(1)}
          50%{opacity:.5;transform:scale(1.2)}
        }
      `}</style>
    </div>
  );
}

function MiniKPI({ label, val, sub, c }: { label: string; val: string; sub: string; c: string }) {
  return (
    <div style={{
      textAlign: "center", padding: "6px 4px", borderRadius: 8,
      background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.04)",
    }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: c }}>{val}</div>
      <div style={{ fontSize: 8, color: "#475569", marginTop: 1 }}>{label}</div>
      <div style={{ fontSize: 8, color: "#334155" }}>{sub}</div>
    </div>
  );
}

function WindowChip({ label, c }: { label: string; c: string }) {
  return (
    <span style={{
      fontSize: 9, padding: "2px 8px", borderRadius: 10,
      background: `${c}12`, border: `1px solid ${c}30`,
      color: c, fontWeight: 700,
    }}>
      ● {label}
    </span>
  );
}
