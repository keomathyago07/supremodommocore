// ============================================================
// OrchestratorAdapterPage.tsx
// Página final do Orquestrador Adaptador
// Adicione à rota /orquestrador no seu App.tsx
// ============================================================

import React from "react";
import { OrchestratorAdapterDashboard } from "./OrchestratorAdapterDashboard";
import { NucleusBridge } from "./NucleusBridge";
import { useAdapterAutoLoop } from "./useAdapterAutoLoop";
import { useOrchestratorAdapter } from "./orchestratorAdapterStore";

export default function OrchestratorAdapterPage() {
  // Ativa loop automático baseado em horário
  useAdapterAutoLoop(60_000);

  const { isOnline, metrics, nucleusStatus: ns, logs } = useOrchestratorAdapter();
  const prizes = logs.filter(l => l.level === "success" && l.message.includes("PREMIAÇÃO")).length;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg,#06090f 0%,#080c18 100%)",
      paddingBottom: 40,
    }}>
      {/* Bridge invisível — sempre montada */}
      <NucleusBridge />

      {/* Top bar */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(6,9,15,0.96)",
        borderBottom: "1px solid rgba(0,212,255,0.08)",
        backdropFilter: "blur(12px)",
        padding: "10px 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>🤖</span>
          <div>
            <div style={{
              fontSize: 12, fontWeight: 800, color: "#e2e8f0",
              fontFamily: "'JetBrains Mono',monospace", letterSpacing: 0.5,
            }}>
              ORQUESTRADOR MASTER
            </div>
            <div style={{ fontSize: 9, color: "#1e293b", fontFamily: "monospace" }}>
              {ns.totalIAs.toLocaleString()} IAs · Terror das Loterias
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {prizes > 0 && (
            <span style={{
              fontSize: 10, padding: "4px 10px", borderRadius: 20, fontWeight: 800,
              background: "rgba(0,255,136,0.15)", border: "1px solid rgba(0,255,136,0.3)",
              color: "#00ff88", fontFamily: "monospace",
            }}>
              🏆 {prizes} premiação{prizes > 1 ? "ões" : ""}
            </span>
          )}
          <span style={{
            fontSize: 9, padding: "4px 10px", borderRadius: 20, fontWeight: 700,
            background: isOnline ? "rgba(0,255,136,0.1)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${isOnline ? "rgba(0,255,136,0.25)" : "rgba(255,255,255,0.08)"}`,
            color: isOnline ? "#00ff88" : "#475569",
            display: "flex", alignItems: "center", gap: 5,
            fontFamily: "monospace",
          }}>
            {isOnline && (
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: "#00ff88", display: "inline-block",
                boxShadow: "0 0 6px #00ff88",
                animation: "pulse 1.5s infinite",
              }} />
            )}
            {isOnline ? "ONLINE" : "OFFLINE"}
          </span>
        </div>
      </div>

      {/* Aviso se offline */}
      {!isOnline && (
        <div style={{
          margin: "14px 16px 0",
          padding: "10px 14px", borderRadius: 10,
          background: "rgba(255,170,0,0.07)",
          border: "1px solid rgba(255,170,0,0.2)",
          fontSize: 11, color: "#ffaa00",
          fontFamily: "monospace",
        }}>
          ⚠️ Clique em <strong>"Conectar ao Núcleo"</strong> para iniciar o gerenciamento automático das {ns.totalIAs.toLocaleString()} IAs.
        </div>
      )}

      {/* Dashboard */}
      <div style={{ maxWidth: 720, margin: "14px auto 0", padding: "0 16px" }}>
        <OrchestratorAdapterDashboard />
      </div>

      <style>{`
        @keyframes pulse {
          0%,100%{opacity:1;transform:scale(1)}
          50%{opacity:.5;transform:scale(1.2)}
        }
      `}</style>
    </div>
  );
}
