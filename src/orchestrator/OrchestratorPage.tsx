// ============================================================
// OrchestratorPage.tsx
// Página completa do Orquestrador Master para o Lovable
// Adicione à rota /orquestrador no seu App.tsx
// ============================================================

import React from "react";
import { MasterOrchestratorDashboard } from "./MasterOrchestratorDashboard";
import { useOrchestratorAutoLoop } from "./useOrchestratorAutoLoop";
import { useMasterOrchestrator } from "./masterOrchestratorStore";

export default function OrchestratorPage() {
  // Ativa o loop automático — sem intervenção humana
  const loopStatus = useOrchestratorAutoLoop({
    bootOnMount: true,
    checkIntervalMs: 60_000,
  });

  const { isRunning, phase, logs } = useMasterOrchestrator();
  const recentWins = logs.filter(l => l.level === "success" && l.message.includes("PREMIADA")).length;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #06090f 0%, #080c18 60%, #060a14 100%)",
      padding: "0 0 40px",
    }}>
      {/* ── Top bar ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(6,9,15,0.95)",
        borderBottom: "1px solid rgba(0,212,255,0.08)",
        backdropFilter: "blur(12px)",
        padding: "10px 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>🤖</span>
          <div>
            <div style={{
              fontSize: 13, fontWeight: 800, color: "#e2e8f0",
              fontFamily: "'JetBrains Mono', monospace", letterSpacing: 0.3,
            }}>
              ORQUESTRADOR MASTER
            </div>
            <div style={{ fontSize: 9, color: "#334155", fontFamily: "monospace" }}>
              Terror das Loterias — Sistema IA Ultra Avançado
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Indicador de janela ativa */}
          {loopStatus.isInGenerationWindow && (
            <WindowTag label="Geração ativa" color="#ff9800" />
          )}
          {loopStatus.isInCheckingWindow && (
            <WindowTag label="Conferência ativa" color="#00ff88" />
          )}
          {loopStatus.isInTrainingWindow && (
            <WindowTag label="Treino ativo" color="#aa00ff" />
          )}

          {/* Status geral */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "5px 10px", borderRadius: 20,
            background: isRunning ? "rgba(0,255,136,0.1)" : "rgba(255,255,255,0.05)",
            border: `1px solid ${isRunning ? "rgba(0,255,136,0.25)" : "rgba(255,255,255,0.08)"}`,
          }}>
            {isRunning && (
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: "#00ff88", animation: "pulse 1.5s infinite",
                display: "inline-block",
                boxShadow: "0 0 6px #00ff88",
              }} />
            )}
            <span style={{
              fontSize: 10, fontWeight: 700,
              color: isRunning ? "#00ff88" : "#475569",
              fontFamily: "monospace",
            }}>
              {isRunning ? "ONLINE" : "OFFLINE"}
            </span>
          </div>

          {/* Contador de premiações na sessão */}
          {recentWins > 0 && (
            <div style={{
              padding: "5px 10px", borderRadius: 20,
              background: "rgba(0,255,136,0.15)",
              border: "1px solid rgba(0,255,136,0.3)",
              fontSize: 10, fontWeight: 800, color: "#00ff88",
              fontFamily: "monospace",
            }}>
              🏆 {recentWins} premiação{recentWins > 1 ? "ões" : ""}
            </div>
          )}
        </div>
      </div>

      {/* ── Conteúdo principal ── */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "16px 16px 0" }}>
        {/* Banner de aviso se offline */}
        {!isRunning && (
          <div style={{
            marginBottom: 14, padding: "10px 14px", borderRadius: 10,
            background: "rgba(255,170,0,0.08)",
            border: "1px solid rgba(255,170,0,0.2)",
            fontSize: 11, color: "#ffaa00",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            ⚠️ Orquestrador offline. Clique em <strong>"Iniciar Orquestrador"</strong> para ativar o gerenciamento automático completo.
          </div>
        )}

        {/* Dashboard principal */}
        <MasterOrchestratorDashboard />
      </div>

      {/* Animação pulse global */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.15); }
        }
      `}</style>
    </div>
  );
}

function WindowTag({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      fontSize: 9, padding: "3px 8px", borderRadius: 20, fontWeight: 700,
      background: color + "15", border: `1px solid ${color}33`, color,
      display: "flex", alignItems: "center", gap: 4,
      fontFamily: "monospace",
      animation: "pulse 2s infinite",
    }}>
      ● {label}
    </span>
  );
}
