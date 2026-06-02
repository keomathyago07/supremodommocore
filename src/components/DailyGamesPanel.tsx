// ============================================================
// DailyGamesPanel.tsx — Painel de Jogos do Dia
// Gera 1 jogo por loteria que ocorre hoje, fluxo de confirmação
// ============================================================

import React, { useState } from "react";
import { useOrchestratorStore } from "../store/orchestratorStore";
import { useIAControlStore } from "../store/iaControlStore";
import { getTodayLotteries } from "../data/dailyScheduler";

export function DailyGamesPanel() {
  const {
    phase,
    tasks,
    runDailyCycle,
    confirmGame,
    confirmAllGames,
    addLog,
  } = useOrchestratorStore();

  const { activeLevel } = useIAControlStore();
  const [loading, setLoading] = useState(false);

  const todayLotteries = getTodayLotteries();
  const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  const today = new Date();

  async function handleGenerate() {
    setLoading(true);
    await runDailyCycle();
    setLoading(false);
  }

  const pendingCount = tasks.filter((t) => t.phase === "awaiting_confirmation").length;
  const confirmedCount = tasks.filter((t) => t.phase === "confirmed" || t.phase === "done").length;

  return (
    <div className="space-y-5">
      {/* Header do dia */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-purple-900/40 to-cyan-900/30 border border-cyan-500/20">
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-widest mb-1">Hoje</div>
          <div className="text-lg font-bold text-white">
            {dayNames[today.getDay()]}, {today.toLocaleDateString("pt-BR")}
          </div>
          <div className="text-sm text-cyan-400 mt-0.5">
            {todayLotteries.length === 0
              ? "Nenhuma loteria hoje"
              : `${todayLotteries.length} loterias disponíveis`}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500 mb-1">Nível IA ativo</div>
          <div className="text-sm font-bold text-purple-400 uppercase">{activeLevel}</div>
        </div>
      </div>

      {/* Loterias do dia */}
      {todayLotteries.length > 0 && (
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
            Loterias de hoje
          </div>
          <div className="flex flex-wrap gap-2">
            {todayLotteries.map((l) => (
              <span
                key={l.id}
                className="text-xs px-3 py-1 rounded-full border font-medium"
                style={{
                  color: l.color,
                  borderColor: l.color + "44",
                  backgroundColor: l.color + "11",
                }}
              >
                {l.name} • {l.drawTime}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Botão gerar */}
      {(phase === "idle" || phase === "done") && (
        <button
          onClick={handleGenerate}
          disabled={loading || todayLotteries.length === 0}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-purple-600 to-cyan-500 bg-size-200 text-white font-bold text-sm tracking-wide hover:opacity-90 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Gerando jogos com IA...
            </>
          ) : (
            <>🧠 Gerar jogos de hoje com IA</>
          )}
        </button>
      )}

      {/* Fase de análise/geração */}
      {(phase === "analyzing" || phase === "generating") && (
        <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/5 text-center space-y-2">
          <div className="w-8 h-8 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin mx-auto" />
          <div className="text-sm text-purple-300 font-medium">
            {phase === "analyzing"
              ? "🔍 Analisando loterias do dia..."
              : "🧠 Gerando jogos otimizados com ensemble de IAs..."}
          </div>
        </div>
      )}

      {/* Jogos gerados — aguardando confirmação */}
      {tasks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-400 uppercase tracking-wider">
              Jogos gerados ({confirmedCount}/{tasks.length} confirmados)
            </div>
            {pendingCount > 1 && (
              <button
                onClick={confirmAllGames}
                className="text-xs px-3 py-1.5 rounded-lg bg-green-500/15 border border-green-500/30 text-green-400 hover:bg-green-500/25 transition-colors font-medium"
              >
                ✅ Confirmar todos
              </button>
            )}
          </div>

          {tasks.map((task) => {
            const lottery = todayLotteries.find((l) => l.id === task.lotteryId);
            const pred = task.prediction;
            if (!pred) return null;

            const isConfirmed = task.phase === "confirmed" || task.phase === "done";
            const isPending = task.phase === "awaiting_confirmation";

            return (
              <div
                key={task.id}
                className={`rounded-xl border p-4 transition-all ${
                  isConfirmed
                    ? "border-green-500/30 bg-green-500/5"
                    : "border-white/10 bg-white/5"
                }`}
              >
                {/* Loteria header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: lottery?.color ?? "#fff" }}
                    />
                    <span
                      className="text-sm font-bold"
                      style={{ color: lottery?.color ?? "#fff" }}
                    >
                      {task.lotteryName}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      • {lottery?.drawTime}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ConfidenceBadge value={pred.game.confidence} />
                    {isConfirmed ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 font-bold">
                        ✅ CONFIRMADA
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/25">
                        Aguardando
                      </span>
                    )}
                  </div>
                </div>

                {/* Números */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {pred.game.numbers.map((n) => {
                    const isHot = pred.hotNumbers.includes(n);
                    return (
                      <NumberBall
                        key={n}
                        number={n}
                        hot={isHot}
                        color={lottery?.color ?? "#fff"}
                      />
                    );
                  })}
                  {pred.game.extras && pred.game.extras.length > 0 && (
                    <div className="flex items-center gap-1 ml-2">
                      <span className="text-[10px] text-gray-500">+</span>
                      {pred.game.extras.map((e) => (
                        <span
                          key={e}
                          className="w-7 h-7 rounded-full border border-orange-500/40 bg-orange-500/10 flex items-center justify-center text-[10px] font-bold text-orange-400"
                        >
                          {e}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Estratégias */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {pred.game.strategies.map((s) => (
                    <span
                      key={s}
                      className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-500 border border-cyan-500/15"
                    >
                      {s}
                    </span>
                  ))}
                </div>

                {/* Raciocínio da IA (colapsável) */}
                <ReasoningCollapse reasoning={pred.reasoning} />

                {/* Botão confirmar */}
                {isPending && (
                  <button
                    onClick={() => confirmGame(task.lotteryId)}
                    className="mt-3 w-full py-2 rounded-lg text-sm font-semibold transition-all"
                    style={{
                      background: `${lottery?.color ?? "#00d4ff"}22`,
                      border: `1px solid ${lottery?.color ?? "#00d4ff"}44`,
                      color: lottery?.color ?? "#00d4ff",
                    }}
                  >
                    ✅ Confirmar aposta
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Estado aguardando sorteio */}
      {phase === "awaiting_draw" && (
        <div className="p-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 text-center space-y-1">
          <div className="text-2xl">⏳</div>
          <div className="text-sm font-semibold text-cyan-400">
            Apostas confirmadas e salvas!
          </div>
          <div className="text-xs text-gray-400">
            Aguardando os sorteios de hoje. A conferência será automática.
          </div>
        </div>
      )}

      {/* Nenhuma loteria hoje */}
      {todayLotteries.length === 0 && (
        <div className="p-6 rounded-xl border border-white/10 bg-white/3 text-center space-y-2">
          <div className="text-3xl">😴</div>
          <div className="text-sm text-gray-400">
            Nenhuma loteria sorteada hoje. Volte amanhã!
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-componentes ─────────────────────────────────────────

function NumberBall({
  number,
  hot,
  color,
}: {
  number: number;
  hot: boolean;
  color: string;
}) {
  return (
    <span
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
      style={{
        backgroundColor: hot ? color + "33" : "rgba(255,255,255,0.06)",
        border: `1.5px solid ${hot ? color + "88" : "rgba(255,255,255,0.12)"}`,
        color: hot ? color : "#cbd5e1",
        boxShadow: hot ? `0 0 8px ${color}44` : "none",
      }}
    >
      {String(number).padStart(2, "0")}
    </span>
  );
}

function ConfidenceBadge({ value }: { value: number }) {
  const color =
    value >= 95 ? "#00ff88" : value >= 80 ? "#00d4ff" : value >= 65 ? "#ffaa00" : "#ff6b6b";
  return (
    <span
      className="text-[10px] px-2 py-0.5 rounded-full font-bold"
      style={{
        backgroundColor: color + "18",
        border: `1px solid ${color}44`,
        color,
      }}
    >
      IA {value}%
    </span>
  );
}

function ReasoningCollapse({ reasoning }: { reasoning: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1"
      >
        {open ? "▲" : "▼"} Raciocínio da IA
      </button>
      {open && (
        <ul className="mt-2 space-y-1">
          {reasoning.map((r, i) => (
            <li key={i} className="text-[10px] text-gray-400 flex gap-2">
              <span className="text-cyan-600">›</span>
              {r}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
