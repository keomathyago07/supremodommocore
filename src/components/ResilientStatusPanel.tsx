// ============================================================
// ResilientStatusPanel.tsx — Status do Sync + Cliente API resiliente
// Mostra tentativas, endpoint ativo, latência média, últimas falhas,
// status do realtime/sync, fila offline e detecção de conflito.
// ============================================================
import { useEffect, useState } from "react";
import { useResilientStats } from "@/lib/resilientStats";
import { useSyncStore } from "@/store/syncStore";
import { queueSize, queueSnapshot, flush } from "@/lib/offlineQueue";

export function ResilientStatusPanel() {
  const stats = useResilientStats();
  const sync = useSyncStore();
  const [qSize, setQSize] = useState<number>(queueSize());
  const [conflict, setConflict] = useState<{ remoteDevice?: string; actualRemote?: string } | null>(null);

  useEffect(() => {
    const onQ = () => setQSize(queueSize());
    const onConflict = (e: any) => setConflict(e.detail);
    window.addEventListener("offline-queue:changed", onQ);
    window.addEventListener("ias:conflict-detected", onConflict as any);
    return () => {
      window.removeEventListener("offline-queue:changed", onQ);
      window.removeEventListener("ias:conflict-detected", onConflict as any);
    };
  }, []);

  const successRate = stats.totalCalls
    ? Math.round((stats.totalOk / stats.totalCalls) * 100)
    : 0;
  const failures = stats.attempts.filter((a) => !a.ok).slice(0, 5);

  return (
    <div className="mt-6 p-4 rounded-xl border border-cyan-500/15 bg-cyan-500/3 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">
          Status — Sync & Cliente Resiliente
        </h3>
        <p className="text-[10px] text-gray-500 mt-0.5">
          Diagnóstico em tempo real do canal de sync e dos endpoints de loteria
        </p>
      </div>

      {/* Grid de métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Metric label="Sync" value={sync.status} color={sync.status === "online" ? "#22c55e" : sync.status === "syncing" ? "#06b6d4" : "#ef4444"} />
        <Metric label="Dispositivos" value={String(sync.devices.length)} color="#a78bfa" />
        <Metric label="Endpoint ativo" value={stats.activeEndpoint ?? "—"} color="#06b6d4" />
        <Metric label="Latência média" value={`${stats.avgLatencyMs} ms`} color="#facc15" />
        <Metric label="Chamadas" value={String(stats.totalCalls)} color="#94a3b8" />
        <Metric label="Sucesso" value={`${successRate}%`} color={successRate >= 90 ? "#22c55e" : "#facc15"} />
        <Metric label="Tentativas" value={String(stats.totalAttempts)} color="#94a3b8" />
        <Metric label="Fila offline" value={String(qSize)} color={qSize > 0 ? "#facc15" : "#22c55e"} />
      </div>

      {conflict && (
        <div className="p-2 rounded-md border border-yellow-500/30 bg-yellow-500/5 text-[10px] text-yellow-300">
          ⚠️ Conflito detectado: outro dispositivo ({conflict.remoteDevice ?? "?"})
          salvou uma versão mais recente em {conflict.actualRemote}.
          Aplicada a estratégia <b>last-writer-wins</b>.
        </div>
      )}

      {qSize > 0 && (
        <button
          onClick={() => flush()}
          className="text-[10px] px-3 py-1.5 rounded-md border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10"
        >
          🔄 Tentar reenviar fila offline agora ({qSize})
        </button>
      )}

      {failures.length > 0 && (
        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Últimas falhas</div>
          <ul className="space-y-1">
            {failures.map((f, i) => (
              <li
                key={i}
                className="text-[10px] text-red-300 flex justify-between gap-2 border-l-2 border-red-500/40 pl-2"
              >
                <span className="truncate">
                  <b>{f.endpoint}</b> — {f.error ?? "erro"}
                </span>
                <span className="text-gray-500 flex-shrink-0">{f.ts}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
          Últimas {Math.min(8, stats.attempts.length)} chamadas
        </div>
        <div className="space-y-1 max-h-40 overflow-auto">
          {stats.attempts.slice(0, 8).map((a, i) => (
            <div
              key={i}
              className="text-[10px] flex justify-between gap-2 border-b border-white/5 py-1"
            >
              <span className={a.ok ? "text-green-400" : "text-red-400"}>
                {a.ok ? "✓" : "✗"} {a.endpoint}
                {a.concurso ? ` · #${a.concurso}` : ""} · {a.attempts}t
              </span>
              <span className="text-gray-500">
                {a.latencyMs}ms · {a.ts}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="p-2 rounded-lg bg-white/3 border border-white/5">
      <div className="text-[9px] text-gray-500 uppercase tracking-wider">{label}</div>
      <div className="text-xs font-bold mt-0.5 truncate" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
