// ============================================================
// AutoCheckerPanel.tsx — Conferidor Automático com resultado detalhado
// Insira os números sorteados → o sistema confere tudo automaticamente
// ============================================================

import React, { useState } from "react";
import { useOrchestratorStore } from "../store/orchestratorStore";
import { useBetStore } from "../store/betStore";
import { getTodayLotteries } from "../data/dailyScheduler";

export function AutoCheckerPanel() {
  const { tasks, submitResult, phase } = useOrchestratorStore();
  const { bets } = useBetStore();

  const todayLotteries = getTodayLotteries();
  const confirmedTasks = tasks.filter(
    (t) => t.phase === "confirmed" || t.phase === "checking" || t.phase === "done"
  );

  const todayStr = new Date().toISOString().split("T")[0];
  const todayBets = bets.filter((b) => b.drawDate === todayStr);

  if (confirmedTasks.length === 0) {
    return (
      <div className="p-6 rounded-xl border border-white/10 bg-white/3 text-center space-y-2">
        <div className="text-3xl">🔍</div>
        <div className="text-sm font-semibold text-gray-400">
          Conferidor automático
        </div>
        <div className="text-xs text-gray-600">
          Gere e confirme seus jogos na aba "Jogos do Dia" primeiro.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Banner */}
      <div className="p-3 rounded-xl bg-gradient-to-r from-cyan-900/30 to-purple-900/20 border border-cyan-500/15 text-xs text-gray-400">
        🤖 Insira os números sorteados abaixo. A IA confere automaticamente e
        exibe o resultado detalhado de cada aposta.
      </div>

      {confirmedTasks.map((task) => {
        const lottery = todayLotteries.find((l) => l.id === task.lotteryId);
        const bet = todayBets.find((b) => b.id === task.betId);
        const isDone = task.phase === "done";

        return (
          <LotteryCheckerCard
            key={task.id}
            task={task}
            lottery={lottery}
            bet={bet}
            isDone={isDone}
            onSubmit={(numbers, extras) =>
              submitResult(task.lotteryId, numbers, extras)
            }
          />
        );
      })}

      {/* Resumo total */}
      {confirmedTasks.some((t) => t.phase === "done") && (
        <TotalSummary bets={todayBets} />
      )}
    </div>
  );
}

// ── Checker card por loteria ─────────────────────────────────
function LotteryCheckerCard({
  task,
  lottery,
  bet,
  isDone,
  onSubmit,
}: {
  task: any;
  lottery: any;
  bet: any;
  isDone: boolean;
  onSubmit: (numbers: number[], extras?: number[]) => void;
}) {
  const [inputVal, setInputVal] = useState("");
  const [extrasVal, setExtrasVal] = useState("");
  const [error, setError] = useState("");

  function handleSubmit() {
    setError("");
    const nums = inputVal
      .split(/[\s,]+/)
      .map((v) => parseInt(v.trim()))
      .filter((n) => !isNaN(n));

    if (!lottery) return;
    const expected = lottery.numbersToChoose;

    // Lotomania tem 20 números sorteados dos 50
    const drawCount = lottery.id === "lotomania" ? 20 : expected;

    if (nums.length !== drawCount) {
      setError(`Insira exatamente ${drawCount} números sorteados.`);
      return;
    }

    let extras: number[] | undefined;
    if (extrasVal.trim()) {
      extras = extrasVal
        .split(/[\s,]+/)
        .map((v) => parseInt(v.trim()))
        .filter((n) => !isNaN(n));
    }

    onSubmit(nums, extras);
  }

  const result = bet?.result;
  const isPremied = bet?.status === "premiada";

  return (
    <div
      className={`rounded-xl border p-4 space-y-4 transition-all ${
        isDone
          ? isPremied
            ? "border-green-500/40 bg-green-500/5"
            : "border-white/10 bg-white/4"
          : "border-white/10 bg-white/5"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: lottery?.color ?? "#fff" }}
          />
          <span
            className="text-sm font-bold"
            style={{ color: lottery?.color ?? "#fff" }}
          >
            {task.lotteryName}
          </span>
        </div>
        {isDone ? (
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
              isPremied
                ? "bg-green-500/20 text-green-400 border-green-500/30"
                : "bg-white/5 text-gray-500 border-white/10"
            }`}
          >
            {isPremied ? "🏆 PREMIADA" : "❌ Não premiada"}
          </span>
        ) : (
          <span className="text-[10px] text-yellow-400 border border-yellow-500/25 bg-yellow-500/10 px-2 py-0.5 rounded-full">
            ⏳ Aguardando resultado
          </span>
        )}
      </div>

      {/* Jogo apostado */}
      {bet && (
        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">
            Números apostados
          </div>
          <div className="flex flex-wrap gap-1.5">
            {bet.numbers.map((n: number) => {
              const isHit = result?.drawNumbers?.includes(n);
              return (
                <span
                  key={n}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all"
                  style={{
                    backgroundColor: isHit
                      ? (lottery?.color ?? "#00ff88") + "33"
                      : "rgba(255,255,255,0.05)",
                    border: `1.5px solid ${
                      isHit
                        ? (lottery?.color ?? "#00ff88") + "88"
                        : "rgba(255,255,255,0.1)"
                    }`,
                    color: isHit ? lottery?.color ?? "#00ff88" : "#64748b",
                  }}
                >
                  {String(n).padStart(2, "0")}
                </span>
              );
            })}
            {bet.extras && (
              <div className="flex items-center gap-1 ml-1">
                <span className="text-[10px] text-gray-600">Extras:</span>
                {bet.extras.map((e: number) => (
                  <span
                    key={e}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold bg-orange-500/15 border border-orange-500/30 text-orange-400"
                  >
                    {e}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Input resultado */}
      {!isDone && (
        <div className="space-y-2">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">
            Números sorteados
            {lottery?.id === "lotomania" && " (insira os 20 sorteados)"}
          </div>
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder={
              lottery?.id === "lotomania"
                ? "Ex: 03 07 12 18 21 25 30..."
                : `Ex: ${Array.from({ length: lottery?.id === "lotofacil" ? 15 : 6 }, (_, i) => i + 1).join(" ")}`
            }
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/40"
          />

          {lottery?.extras && (
            <>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">
                {lottery.extras.type === "trevos" ? "Trevos sorteados" : "Mês sorteado (1–12)"}
              </div>
              <input
                type="text"
                value={extrasVal}
                onChange={(e) => setExtrasVal(e.target.value)}
                placeholder={
                  lottery.extras.type === "trevos" ? "Ex: 3 5" : "Ex: 7"
                }
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/40"
              />
            </>
          )}

          {error && (
            <div className="text-[11px] text-red-400">{error}</div>
          )}

          <button
            onClick={handleSubmit}
            className="w-full py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-cyan-600 to-purple-600 text-white hover:opacity-90 transition-opacity"
          >
            🔍 Conferir automaticamente
          </button>
        </div>
      )}

      {/* Resultado detalhado */}
      {isDone && result && (
        <ResultDetail result={result} lottery={lottery} betNumbers={bet?.numbers ?? []} />
      )}
    </div>
  );
}

// ── Resultado detalhado ──────────────────────────────────────
function ResultDetail({ result, lottery, betNumbers }: { result: any; lottery: any; betNumbers: number[] }) {
  const hits = betNumbers.filter((n: number) => result.drawNumbers?.includes(n));
  const misses = betNumbers.filter((n: number) => !result.drawNumbers?.includes(n));

  return (
    <div className="space-y-3 pt-2 border-t border-white/8">
      {/* Números sorteados */}
      <div>
        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">
          Resultado oficial
        </div>
        <div className="flex flex-wrap gap-1.5">
          {result.drawNumbers?.map((n: number) => {
            const isHit = betNumbers.includes(n);
            return (
              <span
                key={n}
                className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold"
                style={{
                  backgroundColor: isHit
                    ? (lottery?.color ?? "#00ff88") + "33"
                    : "rgba(255,255,255,0.04)",
                  border: `1.5px solid ${isHit ? (lottery?.color ?? "#00ff88") + "77" : "rgba(255,255,255,0.08)"}`,
                  color: isHit ? lottery?.color ?? "#00ff88" : "#475569",
                }}
              >
                {String(n).padStart(2, "0")}
              </span>
            );
          })}
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-3 gap-2">
        <StatMini label="Acertos" value={String(result.acertos)} color="#00d4ff" />
        <StatMini label="Erros" value={String(betNumbers.length - result.acertos)} color="#64748b" />
        {result.extrasAcertos !== undefined && (
          <StatMini label="Extras" value={String(result.extrasAcertos)} color="#ff9800" />
        )}
      </div>

      {/* Faixa conquistada */}
      {result.tierId ? (
        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/25 space-y-1">
          <div className="text-xs font-bold text-green-400">🏆 Faixa conquistada</div>
          <div className="text-sm text-white font-semibold">{result.tierDesc}</div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-400">Prêmio estimado</span>
            <span className="text-lg font-bold text-green-400">
              R$ {result.prizeEstimate.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      ) : (
        <div className="p-3 rounded-lg bg-white/4 border border-white/8 text-xs text-gray-500 text-center">
          {result.acertos} acerto{result.acertos !== 1 ? "s" : ""} — não atingiu nenhuma faixa de premiação
        </div>
      )}

      {/* Números certos/errados */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-[10px] text-gray-500 mb-1">✅ Acertou ({hits.length})</div>
          <div className="flex flex-wrap gap-1">
            {hits.map((n) => (
              <span key={n} className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-400 font-mono">
                {String(n).padStart(2, "0")}
              </span>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-gray-500 mb-1">❌ Errou ({misses.length})</div>
          <div className="flex flex-wrap gap-1">
            {misses.map((n) => (
              <span key={n} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-600 font-mono">
                {String(n).padStart(2, "0")}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Resumo total do dia ──────────────────────────────────────
function TotalSummary({ bets }: { bets: any[] }) {
  const todayStr = new Date().toISOString().split("T")[0];
  const checkedBets = bets.filter(
    (b) => b.status === "premiada" || b.status === "nao_premiada"
  );
  const wins = checkedBets.filter((b) => b.status === "premiada");
  const totalPrize = wins.reduce((s, b) => s + (b.result?.prizeEstimate ?? 0), 0);

  return (
    <div className="p-4 rounded-xl border border-cyan-500/20 bg-gradient-to-b from-cyan-900/20 to-purple-900/10 space-y-3">
      <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
        📊 Resumo do dia
      </div>
      <div className="grid grid-cols-3 gap-3">
        <StatMini label="Apostas" value={String(checkedBets.length)} color="#00d4ff" />
        <StatMini label="Premiadas" value={String(wins.length)} color="#00ff88" />
        <StatMini label="Tx. acerto" value={checkedBets.length ? `${Math.round((wins.length / checkedBets.length) * 100)}%` : "—"} color="#aa00ff" />
      </div>
      {totalPrize > 0 && (
        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
          <div className="text-xs text-gray-400 mb-1">Total estimado a receber</div>
          <div className="text-2xl font-bold text-green-400">
            R$ {totalPrize.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatMini({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white/4 rounded-lg p-2.5 text-center">
      <div className="text-base font-bold" style={{ color }}>{value}</div>
      <div className="text-[10px] text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}
