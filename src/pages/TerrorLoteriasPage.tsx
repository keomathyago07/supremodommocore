// ============================================================
// MainPage.tsx — Página principal completa do Terror das Loterias
// Integra: Orquestrador + Jogos do Dia + Conferidor + Configurações
// Cole em src/pages/MainPage.tsx e adicione à sua rota principal
// ============================================================

import React, { useState, useEffect } from "react";
import { DailyGamesPanel } from "../components/DailyGamesPanel";
import { AutoCheckerPanel } from "../components/AutoCheckerPanel";
import { OrchestratorPanel } from "../components/OrchestratorPanel";
import { IAControlPanel } from "../components/IAControlPanel";
import { LotteryRulesPanel } from "../components/LotteryRulesPanel";
import { SyncPanel } from "../components/SyncPanel";
import { GateHistoryPanel } from "../components/GateHistoryPanel";
import { useBetStore } from "../store/betStore";
import { useOrchestratorStore } from "../store/orchestratorStore";
import { getTodayLotteries } from "../data/dailyScheduler";

type Tab =
  | "orchestrator"
  | "daily"
  | "checker"
  | "gates"
  | "ia"
  | "rules"
  | "sync";

const TABS: { id: Tab; icon: string; label: string; shortLabel: string }[] = [
  { id: "orchestrator", icon: "🤖", label: "Orquestrador", shortLabel: "Orq." },
  { id: "daily", icon: "🎰", label: "Jogos do Dia", shortLabel: "Jogos" },
  { id: "checker", icon: "🔍", label: "Conferidor", shortLabel: "Conf." },
  { id: "gates", icon: "🛡️", label: "Histórico Gates", shortLabel: "Gates" },
  { id: "ia", icon: "🧠", label: "Controle IA", shortLabel: "IA" },
  { id: "rules", icon: "📋", label: "Regras", shortLabel: "Regras" },
  { id: "sync", icon: "🔄", label: "Sync", shortLabel: "Sync" },
];

export default function MainPage() {
  const [tab, setTab] = useState<Tab>("orchestrator");
  const { bets } = useBetStore();
  const { phase, tasks } = useOrchestratorStore();
  const todayLotteries = getTodayLotteries();

  // Badge counts
  const todayStr = new Date().toISOString().split("T")[0];
  const todayBets = bets.filter((b) => b.drawDate === todayStr);
  const prizes = todayBets.filter((b) => b.status === "premiada").length;
  const pending = tasks.filter((t) => t.phase === "awaiting_confirmation").length;
  const awaitingCheck = tasks.filter((t) => t.phase === "confirmed").length;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#080c18", color: "#e2e8f0" }}
    >
      {/* ── Top header ── */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{
          background: "rgba(8,12,24,0.96)",
          borderColor: "rgba(0,212,255,0.1)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
              style={{ background: "linear-gradient(135deg, #00d4ff22, #aa00ff22)", border: "1px solid rgba(0,212,255,0.2)" }}
            >
              🎰
            </div>
            <div>
              <div className="text-sm font-bold text-white leading-tight">
                Terror das Loterias
              </div>
              <div className="text-[9px] text-gray-500 leading-tight">
                Sistema IA Ultra Avançado
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Status da IA */}
            <StatusPill
              label={phase === "idle" ? "Aguardando" : phase.replace("_", " ")}
              color={
                phase === "done"
                  ? "green"
                  : phase === "idle"
                  ? "gray"
                  : "cyan"
              }
            />
            {/* Loterias hoje */}
            <StatusPill label={`${todayLotteries.length} hoje`} color="purple" />
            {/* Premiadas */}
            {prizes > 0 && (
              <StatusPill label={`🏆 ${prizes}`} color="green" />
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-t overflow-x-auto" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          {TABS.map((t) => {
            const badge =
              t.id === "daily"
                ? pending
                : t.id === "checker"
                ? awaitingCheck
                : 0;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="relative flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap flex-shrink-0"
                style={{
                  color: tab === t.id ? "#00d4ff" : "#64748b",
                  borderBottomColor: tab === t.id ? "#00d4ff" : "transparent",
                  background: tab === t.id ? "rgba(0,212,255,0.04)" : "transparent",
                }}
              >
                <span>{t.icon}</span>
                <span className="hidden sm:inline">{t.label}</span>
                <span className="inline sm:hidden">{t.shortLabel}</span>
                {badge > 0 && (
                  <span className="ml-0.5 w-4 h-4 rounded-full bg-yellow-500 text-black text-[9px] font-bold flex items-center justify-center">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* ── Content ── */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-5">
        {tab === "orchestrator" && <OrchestratorPanel />}
        {tab === "daily" && <DailyGamesPanel />}
        {tab === "checker" && <AutoCheckerPanel />}
        {tab === "gates" && <GateHistoryPanel />}
        {tab === "ia" && <IAControlPanel />}
        {tab === "rules" && <LotteryRulesPanel />}
        {tab === "sync" && <SyncPanel />}
      </main>
    </div>
  );
}

function StatusPill({
  label,
  color,
}: {
  label: string;
  color: "green" | "cyan" | "purple" | "yellow" | "gray";
}) {
  const map = {
    green: "bg-green-500/15 text-green-400 border-green-500/25",
    cyan: "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",
    purple: "bg-purple-500/15 text-purple-400 border-purple-500/25",
    yellow: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
    gray: "bg-white/5 text-gray-500 border-white/10",
  };
  return (
    <span className={`text-[9px] px-2 py-0.5 rounded-full border font-semibold ${map[color]}`}>
      {label}
    </span>
  );
}
