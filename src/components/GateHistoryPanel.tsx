// ============================================================
// GateHistoryPanel.tsx — Histórico de Gates (Terror das Loterias v2)
// Mostra cada gate encontrado/salvo com horário de Brasília
// ============================================================
import { useState } from "react";
import { useGateHistoryStore } from "@/store/gateHistoryStore";

export function GateHistoryPanel() {
  const { gates, clear } = useGateHistoryStore();
  const [filter, setFilter] = useState<"all" | "SAVED" | "FOUND" | "REJECTED">("all");

  const list = gates.filter((g) => filter === "all" || g.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">
            Histórico de Gates
          </h3>
          <p className="text-[10px] text-gray-500 mt-0.5">
            Todos os gates encontrados pelas IAs (horário de Brasília)
          </p>
        </div>
        <button
          onClick={clear}
          className="text-[10px] px-2.5 py-1 rounded-md border border-white/10 text-gray-400 hover:text-red-400 hover:border-red-400/30"
        >
          Limpar
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(["all", "FOUND", "SAVED", "REJECTED"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-[10px] px-3 py-1 rounded-full border font-medium transition-all ${
              filter === f
                ? "border-cyan-400 bg-cyan-400/10 text-cyan-300"
                : "border-white/10 text-gray-400 hover:text-white"
            }`}
          >
            {f === "all" ? `Todos (${gates.length})` : `${f} (${gates.filter((g) => g.status === f).length})`}
          </button>
        ))}
      </div>

      {list.length === 0 && (
        <div className="p-6 rounded-xl border border-white/10 bg-white/3 text-center text-xs text-gray-500">
          Nenhum gate registrado ainda. Gere os jogos do dia para popular o histórico.
        </div>
      )}

      <div className="space-y-2">
        {list.map((g) => (
          <div
            key={g.id}
            className="p-3 rounded-lg border bg-white/3 transition-all"
            style={{
              borderColor: g.status === "SAVED" ? "#22c55e44" : g.status === "REJECTED" ? "#ef444444" : g.lotteryColor + "33",
            }}
          >
            <div className="flex items-center justify-between mb-2 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: g.lotteryColor }}
                />
                <span className="text-xs font-semibold truncate" style={{ color: g.lotteryColor }}>
                  {g.lotteryName}
                </span>
                <span className="text-[9px] text-gray-500">• IA {g.iaLevel}</span>
              </div>
              <StatusPill status={g.status} />
            </div>

            <div className="flex flex-wrap gap-1 mb-2">
              {g.numbers.map((n) => (
                <span
                  key={n}
                  className="w-6 h-6 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold flex items-center justify-center text-gray-200"
                >
                  {String(n).padStart(2, "0")}
                </span>
              ))}
              {g.extras?.map((e) => (
                <span
                  key={`x${e}`}
                  className="w-6 h-6 rounded-full bg-orange-500/15 border border-orange-500/30 text-[10px] font-bold flex items-center justify-center text-orange-300"
                >
                  {e}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
              <Row label="Confiança" value={`${g.confidence}%`} />
              <Row label="Concurso" value={g.concurso.slice(0, 12)} />
              <Row label="🔎 Encontrado" value={g.foundAtBRT} />
              {g.savedAtBRT && <Row label="💾 Salvo" value={g.savedAtBRT} />}
              {g.betId && <Row label="Bet ID" value={g.betId.slice(0, 12)} />}
            </div>

            {g.strategies?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {g.strategies.slice(0, 4).map((s) => (
                  <span
                    key={s}
                    className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/8 text-cyan-400 border border-cyan-500/15"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="truncate">
      <span className="text-gray-500">{label}: </span>
      <span className="text-gray-200 font-medium">{value}</span>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    FOUND: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    SAVED: "bg-green-500/15 text-green-400 border-green-500/30",
    APPROVED: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
    REJECTED: "bg-red-500/15 text-red-400 border-red-500/30",
  };
  return (
    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${map[status] ?? map.FOUND}`}>
      {status}
    </span>
  );
}
