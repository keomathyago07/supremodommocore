// ============================================================
// OrchestratorPanel.tsx — Painel do Orquestrador Central
// Gerencia e monitora todo o programa de ponta a ponta
// ============================================================

import React, { useState, useEffect, useRef } from "react";
import { useOrchestratorStore } from "../store/orchestratorStore";
import { useBetStore } from "../store/betStore";
import { useIAControlStore } from "../store/iaControlStore";
import { getTodayLotteries } from "../data/dailyScheduler";

const PHASE_LABELS: Record<string, string> = {
  idle: "Aguardando",
  analyzing: "Analisando",
  generating: "Gerando jogos",
  awaiting_confirmation: "Aguardando confirmação",
  confirmed: "Apostas confirmadas",
  awaiting_draw: "Aguardando sorteio",
  checking: "Conferindo",
  done: "Ciclo concluído",
};

const PHASE_COLORS: Record<string, string> = {
  idle: "#64748b",
  analyzing: "#00d4ff",
  generating: "#aa00ff",
  awaiting_confirmation: "#ffaa00",
  confirmed: "#00d4ff",
  awaiting_draw: "#ffaa00",
  checking: "#aa00ff",
  done: "#00ff88",
};

export function OrchestratorPanel() {
  const {
    phase,
    tasks,
    logs,
    stats,
    autoCheckEnabled,
    lastRun,
    toggleAutoCheck,
    reset,
    runDailyCycle,
  } = useOrchestratorStore();

  const { bets, getTotalPrizes, getWinRate } = useBetStore();
  const { activeLevel, getActiveLevelConfig } = useIAControlStore();
  const levelConfig = getActiveLevelConfig();
  const todayLotteries = getTodayLotteries();

  const logRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState<"overview" | "tasks" | "log" | "history">("overview");

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  const todayStr = new Date().toISOString().split("T")[0];
  const todayBets = bets.filter((b) => b.drawDate === todayStr);
  const totalPrize = getTotalPrizes();
  const winRate = getWinRate();

  return (
    <div className="space-y-5">
      {/* ── Status do orquestrador ── */}
      <div className="p-4 rounded-xl border border-purple-500/25 bg-gradient-to-br from-purple-900/20 to-cyan-900/15">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🤖</span>
            <div>
              <div className="text-sm font-bold text-white">Orquestrador Central</div>
              <div className="text-[10px] text-gray-400">Gerenciamento de ponta a ponta</div>
            </div>
          </div>
          <PhaseBadge phase={phase} />
        </div>

        {/* Mini stats */}
        <div className="grid grid-cols-4 gap-2">
          <MiniStat label="Loterias hoje" value={String(todayLotteries.length)} color="#00d4ff" />
          <MiniStat label="Apostas salvas" value={String(todayBets.length)} color="#aa00ff" />
          <MiniStat label="Premiadas" value={String(todayBets.filter(b => b.status === "premiada").length)} color="#00ff88" />
          <MiniStat label="Taxa acerto" value={winRate ? `${winRate}%` : "—"} color="#ffaa00" />
        </div>

        {totalPrize > 0 && (
          <div className="mt-3 p-2.5 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
            <div className="text-[10px] text-gray-400">Total acumulado a receber</div>
            <div className="text-xl font-bold text-green-400 mt-0.5">
              R$ {totalPrize.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
          </div>
        )}
      </div>

      {/* ── IA Status ── */}
      <div className="p-3 rounded-xl border border-white/10 bg-white/4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400 uppercase tracking-wider">Motor de IA ativo</span>
          <span className="text-[10px] font-bold text-purple-400 uppercase">{activeLevel}</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <IAStat label="Precisão" value={`${levelConfig.precision}%`} />
          <IAStat label="Assert." value={`${levelConfig.assertiveness}%`} />
          <IAStat label="Ciclo" value={`${levelConfig.cycleSec}s`} />
          <IAStat label="Ensembles" value={String(levelConfig.ensembles)} />
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-white/4 p-1 rounded-xl border border-white/8">
        {(["overview", "tasks", "log", "history"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setActiveSection(s)}
            className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
              activeSection === s
                ? "bg-white/10 text-white"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {{ overview: "Visão Geral", tasks: "Tarefas", log: "Log", history: "Histórico" }[s]}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {activeSection === "overview" && (
        <div className="space-y-3">
          <PipelineVisual phase={phase} tasks={tasks} />

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl border border-white/10 bg-white/4 space-y-2">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">Configurações</div>
              <SyncRow
                label="Auto-conferência"
                on={autoCheckEnabled}
                onToggle={() => toggleAutoCheck(!autoCheckEnabled)}
              />
              <SyncRow label="Sync multi-device" on={true} onToggle={() => {}} />
              <SyncRow label="Notificações" on={true} onToggle={() => {}} />
            </div>
            <div className="p-3 rounded-xl border border-white/10 bg-white/4 space-y-2">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">Stats globais</div>
              <div className="space-y-1.5">
                <StatRow label="Ciclos rodados" value={String(stats.totalCycles)} />
                <StatRow label="Total apostas" value={String(stats.totalBets)} />
                <StatRow label="Total prêmios" value={String(stats.totalPrizes)} />
                <StatRow
                  label="Ganhos totais"
                  value={`R$ ${stats.totalEarnings.toLocaleString("pt-BR")}`}
                  highlight
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {(phase === "idle" || phase === "done") && (
              <button
                onClick={() => runDailyCycle()}
                className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-purple-600 text-white text-xs font-bold hover:opacity-90 transition-opacity"
              >
                🚀 Iniciar ciclo diário
              </button>
            )}
            <button
              onClick={reset}
              className="px-4 py-2.5 rounded-lg border border-white/10 text-gray-400 text-xs hover:text-white hover:border-red-500/30 transition-all"
            >
              ↺ Reset
            </button>
          </div>
        </div>
      )}

      {/* ── Tasks ── */}
      {activeSection === "tasks" && (
        <div className="space-y-2">
          {tasks.length === 0 ? (
            <div className="text-center text-xs text-gray-500 py-6">
              Nenhuma tarefa ativa. Inicie o ciclo diário.
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-white/4"
              >
                <div>
                  <div className="text-xs font-semibold text-white">{task.lotteryName}</div>
                  {task.betId && (
                    <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                      ID: {task.betId.slice(-8)}
                    </div>
                  )}
                </div>
                <PhaseBadge phase={task.phase} small />
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Log ── */}
      {activeSection === "log" && (
        <div
          ref={logRef}
          className="bg-black/30 rounded-xl border border-white/8 p-3 h-64 overflow-y-auto space-y-1 font-mono"
        >
          {logs.length === 0 ? (
            <div className="text-[10px] text-gray-600 text-center py-4">
              Log vazio. Inicie um ciclo.
            </div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="flex gap-2 text-[10px] leading-relaxed">
                <span className="text-gray-700 flex-shrink-0">
                  {new Date(log.ts).toLocaleTimeString("pt-BR")}
                </span>
                <span
                  className={
                    log.level === "success"
                      ? "text-green-400"
                      : log.level === "ia"
                      ? "text-purple-400"
                      : log.level === "warn"
                      ? "text-yellow-400"
                      : log.level === "error"
                      ? "text-red-400"
                      : "text-gray-400"
                  }
                >
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Histórico ── */}
      {activeSection === "history" && (
        <BetHistory bets={bets} />
      )}
    </div>
  );
}

// ── Pipeline visual ──────────────────────────────────────────
function PipelineVisual({ phase, tasks }: { phase: string; tasks: any[] }) {
  const steps = [
    { id: "analyzing", label: "Analisar" },
    { id: "generating", label: "Gerar" },
    { id: "awaiting_confirmation", label: "Confirmar" },
    { id: "awaiting_draw", label: "Sorteio" },
    { id: "checking", label: "Conferir" },
    { id: "done", label: "Resultado" },
  ];

  const phaseOrder = [
    "idle", "analyzing", "generating", "awaiting_confirmation",
    "confirmed", "awaiting_draw", "checking", "done",
  ];
  const currentIdx = phaseOrder.indexOf(phase);

  return (
    <div className="p-3 rounded-xl border border-white/10 bg-white/4">
      <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-3">
        Pipeline de execução
      </div>
      <div className="flex items-center gap-1">
        {steps.map((step, i) => {
          const stepOrder = phaseOrder.indexOf(step.id);
          const done = currentIdx > stepOrder;
          const active = currentIdx === stepOrder;
          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center gap-1 flex-1">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold transition-all ${
                    done
                      ? "bg-green-500/30 border border-green-500/50 text-green-400"
                      : active
                      ? "bg-cyan-500/30 border border-cyan-500/60 text-cyan-400 animate-pulse"
                      : "bg-white/5 border border-white/10 text-gray-600"
                  }`}
                >
                  {done ? "✓" : i + 1}
                </div>
                <span className={`text-[8px] ${active ? "text-cyan-400" : done ? "text-green-400" : "text-gray-600"}`}>
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className="h-px flex-1 -mt-3 transition-all"
                  style={{
                    background: done ? "rgba(0,255,136,0.4)" : "rgba(255,255,255,0.08)",
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ── Histórico de apostas ─────────────────────────────────────
function BetHistory({ bets }: { bets: any[] }) {
  const sorted = [...bets].sort(
    (a, b) => new Date(b.confirmedAt).getTime() - new Date(a.confirmedAt).getTime()
  );

  if (!sorted.length) {
    return (
      <div className="text-center text-xs text-gray-500 py-6">
        Nenhuma aposta registrada ainda.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sorted.map((bet) => (
        <div
          key={bet.id}
          className={`p-3 rounded-xl border transition-all ${
            bet.status === "premiada"
              ? "border-green-500/30 bg-green-500/5"
              : bet.status === "nao_premiada"
              ? "border-white/8 bg-white/3"
              : "border-yellow-500/20 bg-yellow-500/4"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: bet.lotteryColor }}
              />
              <span className="text-xs font-semibold" style={{ color: bet.lotteryColor }}>
                {bet.lotteryName}
              </span>
              <span className="text-[10px] text-gray-600">{bet.drawDate}</span>
            </div>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                bet.status === "premiada"
                  ? "text-green-400 bg-green-500/15 border-green-500/30"
                  : bet.status === "nao_premiada"
                  ? "text-gray-500 bg-white/5 border-white/10"
                  : "text-yellow-400 bg-yellow-500/10 border-yellow-500/25"
              }`}
            >
              {bet.status === "premiada" ? "🏆 Premiada" : bet.status === "nao_premiada" ? "❌ Não premiada" : "⏳ Aguardando"}
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {bet.numbers.slice(0, 10).map((n: number) => (
              <span
                key={n}
                className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                style={{
                  backgroundColor: bet.result?.drawNumbers?.includes(n)
                    ? bet.lotteryColor + "25"
                    : "rgba(255,255,255,0.04)",
                  color: bet.result?.drawNumbers?.includes(n)
                    ? bet.lotteryColor
                    : "#475569",
                }}
              >
                {String(n).padStart(2, "0")}
              </span>
            ))}
            {bet.numbers.length > 10 && (
              <span className="text-[10px] text-gray-600">+{bet.numbers.length - 10}</span>
            )}
          </div>
          {bet.result?.tierId && (
            <div className="mt-1.5 text-[10px] text-green-400 font-semibold">
              {bet.result.tierDesc} — R$ {bet.result.prizeEstimate.toLocaleString("pt-BR")}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────
function PhaseBadge({ phase, small }: { phase: string; small?: boolean }) {
  const color = PHASE_COLORS[phase] ?? "#64748b";
  return (
    <span
      className={`${small ? "text-[9px] px-1.5 py-0.5" : "text-[10px] px-2 py-0.5"} rounded-full font-bold border`}
      style={{
        color,
        borderColor: color + "40",
        backgroundColor: color + "15",
      }}
    >
      {PHASE_LABELS[phase] ?? phase}
    </span>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white/5 rounded-lg p-2 text-center">
      <div className="text-sm font-bold" style={{ color }}>{value}</div>
      <div className="text-[9px] text-gray-600 mt-0.5">{label}</div>
    </div>
  );
}

function IAStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-xs font-bold text-cyan-400">{value}</div>
      <div className="text-[9px] text-gray-600">{label}</div>
    </div>
  );
}

function SyncRow({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-gray-400">{label}</span>
      <button
        onClick={onToggle}
        className={`w-8 h-4 rounded-full border relative transition-all ${
          on ? "bg-green-500/25 border-green-500/40" : "bg-white/5 border-white/10"
        }`}
      >
        <span
          className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${
            on ? "left-[calc(100%-14px)] bg-green-400" : "left-0.5 bg-gray-600"
          }`}
        />
      </button>
    </div>
  );
}

function StatRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[10px] text-gray-500">{label}</span>
      <span className={`text-[11px] font-semibold ${highlight ? "text-green-400" : "text-white"}`}>
        {value}
      </span>
    </div>
  );
}

