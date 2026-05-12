// ============================================================
// SyncPanel.tsx — Painel de Sincronização em Tempo Real
// ============================================================
import { useEffect, useState } from "react";
import { useSyncStore, SyncConfig } from "@/store/syncStore";

export function SyncPanel() {
  const { status, config, devices, log, lastSync, updateConfig, forceSync, addLog, initBroadcastListener } = useSyncStore();
  const [showLog, setShowLog] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const cleanup = initBroadcastListener();
    addLog("Listener de sincronização iniciado", "success");
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleForceSync() {
    setSyncing(true);
    await forceSync();
    setSyncing(false);
  }

  const statusColors: Record<string, string> = {
    online: "text-green-400",
    syncing: "text-yellow-400",
    offline: "text-red-400",
    conflict: "text-orange-400",
  };
  const statusDots: Record<string, string> = {
    online: "bg-green-400",
    syncing: "bg-yellow-400",
    offline: "bg-red-400",
    conflict: "bg-orange-400",
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between p-3 bg-green-500/5 border border-green-500/20 rounded-xl">
        <div>
          <div className="text-sm font-semibold text-white">Sincronização em Tempo Real</div>
          <div className="text-[11px] text-gray-400 mt-0.5">Automática — sem intervenção humana necessária</div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full animate-pulse ${statusDots[status]}`} />
          <span className={`text-xs font-bold ${statusColors[status]}`}>{status.toUpperCase()}</span>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-2">Dispositivos conectados</h3>
        <div className="space-y-2">
          {devices.map((device) => (
            <div key={device.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${device.type === "mobile" ? "bg-green-500/10" : "bg-cyan-500/10"}`}>
                  {device.type === "mobile" ? "📱" : "🖥️"}
                </div>
                <div>
                  <div className="text-xs font-medium text-white">{device.name}</div>
                  <div className="text-[10px] text-gray-500">Último sync: {device.lastSeen.toLocaleTimeString("pt-BR")}</div>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/25 font-semibold">● ONLINE</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-2">Configurações de sincronização</h3>
        <div className="space-y-2">
          <SyncToggle label="Sincronização automática contínua" sub="Sem necessidade de ação manual" value={config.autoSync} onChange={(v) => updateConfig({ autoSync: v })} />
          <SyncToggle label="Sync ao salvar configurações de IA" sub="Propaga nível e metas imediatamente" value={config.syncOnSave} onChange={(v) => updateConfig({ syncOnSave: v })} />
          <SyncToggle label="Sync de regras das loterias" sub="Atualiza critérios de premiação em todos os apps" value={config.syncLotteryRules} onChange={(v) => updateConfig({ syncLotteryRules: v })} />
          <SyncToggle label="Sync de apostas e resultados" sub="Conferência em tempo real em todos os dispositivos" value={config.syncBets} onChange={(v) => updateConfig({ syncBets: v })} />
          <SyncToggle label="Resolução de conflito: último a salvar vence" sub="Alterações mais recentes têm prioridade" value={config.lastWriterWins} onChange={(v) => updateConfig({ lastWriterWins: v })} />
          <SyncToggle label="Sync offline — fila automática" sub="Aguarda conexão e sincroniza ao voltar" value={config.offlineQueue} onChange={(v) => updateConfig({ offlineQueue: v })} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-400 mb-1.5 block">Protocolo de sincronização</label>
          <select value={config.protocol} onChange={(e) => updateConfig({ protocol: e.target.value as SyncConfig["protocol"] })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white">
            <option value="websocket">WebSocket (tempo real)</option>
            <option value="sse">SSE (Server-Sent Events)</option>
            <option value="polling">Polling inteligente</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1.5 block">Intervalo de heartbeat</label>
          <select value={config.heartbeatIntervalMs} onChange={(e) => updateConfig({ heartbeatIntervalMs: Number(e.target.value) })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white">
            <option value={5000}>5 segundos</option>
            <option value={10000}>10 segundos</option>
            <option value={30000}>30 segundos</option>
          </select>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={handleForceSync} disabled={syncing} className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
          {syncing ? "⏳ Sincronizando..." : "🔄 Forçar sincronização agora"}
        </button>
        <button onClick={() => setShowLog(!showLog)} className="px-4 py-2.5 rounded-lg border border-white/10 text-gray-400 text-sm hover:text-white hover:border-cyan-400/30 transition-all">📋 Log</button>
      </div>

      {showLog && (
        <div className="bg-black/30 rounded-xl p-3 max-h-36 overflow-y-auto space-y-1">
          {log.slice(-30).reverse().map((entry, i) => (
            <div key={i} className="flex gap-2 text-[10px]">
              <span className="text-gray-600 flex-shrink-0">{entry.timestamp.toLocaleTimeString("pt-BR")}</span>
              <span className={entry.type === "success" ? "text-green-400" : entry.type === "warn" ? "text-yellow-400" : entry.type === "error" ? "text-red-400" : "text-gray-400"}>{entry.message}</span>
            </div>
          ))}
        </div>
      )}

      {lastSync && (
        <p className="text-center text-xs text-green-400">✅ Última sincronização: {lastSync.toLocaleString("pt-BR")}</p>
      )}
    </div>
  );
}

function SyncToggle({ label, sub, value, onChange }: { label: string; sub: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl">
      <div>
        <div className="text-xs text-white">{label}</div>
        <div className="text-[10px] text-gray-500 mt-0.5">{sub}</div>
      </div>
      <button onClick={() => onChange(!value)} className={`w-9 h-5 rounded-full border transition-all duration-200 relative flex-shrink-0 ${value ? "bg-green-500/25 border-green-500/50" : "bg-white/5 border-white/10"}`}>
        <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full transition-all duration-200 ${value ? "left-[calc(100%-18px)] bg-green-400" : "left-0.5 bg-gray-500"}`} />
      </button>
    </div>
  );
}
