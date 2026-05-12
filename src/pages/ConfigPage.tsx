// ============================================================
// ConfigPage.tsx — Configurações Ultra Avançadas (tabs)
// ============================================================
import { useState } from "react";
import { IAControlPanel } from "@/components/IAControlPanel";
import { LotteryRulesPanel } from "@/components/LotteryRulesPanel";
import { SyncPanel } from "@/components/SyncPanel";
import { useIAControlStore } from "@/store/iaControlStore";
import { useSyncStore } from "@/store/syncStore";

type Tab = "ia" | "loterias" | "sync" | "status";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "ia", label: "Controle de IAs", icon: "🧠" },
  { id: "loterias", label: "Regras das Loterias", icon: "🎰" },
  { id: "sync", label: "Sincronização", icon: "🔄" },
  { id: "status", label: "Status", icon: "📊" },
];

export default function ConfigPage() {
  const [activeTab, setActiveTab] = useState<Tab>("ia");
  const { getActiveLevelConfig } = useIAControlStore();
  const { status: syncStatus, devices } = useSyncStore();
  const levelConfig = getActiveLevelConfig();

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      <div
        className="relative px-6 py-8 overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0f1628 0%, #1a0a2e 50%, #0a1628 100%)" }}
      >
        <div className="relative z-10 flex items-center gap-3 flex-wrap">
          <span className="text-3xl">🧠</span>
          <div>
            <h1 className="text-2xl font-bold text-white">Configurações Ultra Avançadas</h1>
            <p className="text-sm text-gray-400 mt-0.5">Sistema IA — O Terror das Loterias</p>
          </div>
          <div className="ml-auto flex items-center gap-2 flex-wrap">
            <StatusPill label={`IA: ${levelConfig.label}`} color="purple" dot />
            <StatusPill label={`Sync: ${syncStatus.toUpperCase()}`} color={syncStatus === "online" ? "green" : "yellow"} dot />
            <StatusPill label={`${devices.length} dispositivo${devices.length !== 1 ? "s" : ""}`} color="cyan" />
          </div>
        </div>
      </div>

      <div className="flex border-b border-white/10 bg-[#0f1628] px-4 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? "text-cyan-400 border-cyan-400 bg-cyan-400/5"
                : "text-gray-500 border-transparent hover:text-gray-300 hover:bg-white/5"
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {activeTab === "ia" && <IAControlPanel />}
        {activeTab === "loterias" && <LotteryRulesPanel />}
        {activeTab === "sync" && <SyncPanel />}
        {activeTab === "status" && <StatusTab />}
      </div>
    </div>
  );
}

function StatusTab() {
  const { getActiveLevelConfig } = useIAControlStore();
  const { devices, log } = useSyncStore();
  const level = getActiveLevelConfig();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Nível IA" value={level.icon} sub={level.label} />
        <StatCard label="Precisão" value={`${level.precision}%`} />
        <StatCard label="Assertividade" value={`${level.assertiveness}%`} />
        <StatCard label="Ciclo" value={level.cycleSec + "s"} />
      </div>

      <div>
        <h3 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-2">Dispositivos ({devices.length})</h3>
        <div className="space-y-2">
          {devices.map((d) => (
            <div key={d.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl text-xs">
              <span className="text-white">{d.name}</span>
              <span className="text-green-400 font-semibold">● ONLINE</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-2">Log recente do sistema</h3>
        <div className="bg-black/30 rounded-xl p-3 space-y-1 max-h-48 overflow-y-auto">
          {log.slice(-20).reverse().map((entry, i) => (
            <div key={i} className="flex gap-2 text-[10px]">
              <span className="text-gray-600 flex-shrink-0">{entry.timestamp.toLocaleTimeString("pt-BR")}</span>
              <span className={entry.type === "success" ? "text-green-400" : entry.type === "warn" ? "text-yellow-400" : entry.type === "error" ? "text-red-400" : "text-gray-400"}>{entry.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
      <div className="text-xl font-bold text-cyan-400">{value}</div>
      <div className="text-[10px] text-gray-500 mt-1">{label}</div>
      {sub && <div className="text-[10px] text-gray-400">{sub}</div>}
    </div>
  );
}

function StatusPill({ label, color, dot }: { label: string; color: "green" | "cyan" | "purple" | "yellow"; dot?: boolean }) {
  const colors = {
    green: "bg-green-500/15 text-green-400 border-green-500/25",
    cyan: "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",
    purple: "bg-purple-500/15 text-purple-400 border-purple-500/25",
    yellow: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
  };
  return (
    <span className={`text-[10px] px-2.5 py-1 rounded-full border font-semibold flex items-center gap-1.5 ${colors[color]}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
      {label}
    </span>
  );
}
