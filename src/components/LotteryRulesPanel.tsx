// ============================================================
// LotteryRulesPanel.tsx — Painel de Regras das Loterias
// ============================================================
import { useLotteryRulesStore } from "@/store/lotteryRulesStore";
import { useSyncStore } from "@/store/syncStore";

export function LotteryRulesPanel() {
  const { rules, toggleTier, enableAll, disableAll, save, reset, lastSaved } = useLotteryRulesStore();
  const { broadcastChange, addLog } = useSyncStore();

  function handleSave() {
    save();
    broadcastChange("lottery_rules", { rules, savedAt: new Date().toISOString() });
    addLog("Regras de premiação salvas e sincronizadas", "success");
  }

  return (
    <div className="space-y-4">
      <div className="bg-cyan-500/5 border border-cyan-500/15 rounded-lg p-3 text-xs text-gray-400">
        ⚙️ Apenas apostas que atendam às faixas habilitadas abaixo serão marcadas como{" "}
        <span className="text-green-400 font-semibold">Premiada</span>. Apostas fora dos critérios ficam como{" "}
        <span className="text-yellow-400">Aguardando</span>.
      </div>

      {rules.map((lottery) => (
        <div key={lottery.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: lottery.color }} />
              <span className="text-sm font-semibold" style={{ color: lottery.color }}>{lottery.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => enableAll(lottery.id)} className="text-[10px] px-2 py-0.5 rounded border border-green-500/30 text-green-400 hover:bg-green-500/10 transition-colors">Todos</button>
              <button onClick={() => disableAll(lottery.id)} className="text-[10px] px-2 py-0.5 rounded border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors">Nenhum</button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-3">
            {lottery.drawDays.map((day) => (
              <span key={day} className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">{day}</span>
            ))}
          </div>

          <div className="space-y-1.5">
            {lottery.prizeTiers.map((tier) => (
              <div key={tier.id} className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${tier.enabled ? "bg-green-500/5 border border-green-500/15" : "bg-white/2 border border-transparent"}`}>
                <span className={`text-xs ${tier.enabled ? "text-green-400" : "text-gray-500"}`}>{tier.description}</span>
                <Toggle on={tier.enabled} onChange={() => toggleTier(lottery.id, tier.id)} />
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="flex gap-3">
        <button onClick={handleSave} className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity">
          💾 Salvar regras das loterias
        </button>
        <button onClick={reset} className="px-4 py-2.5 rounded-lg border border-white/10 text-gray-400 text-sm hover:text-white hover:border-cyan-400/30 transition-all">
          ↺ Restaurar
        </button>
      </div>

      {lastSaved && (
        <p className="text-center text-xs text-green-400">
          ✅ Salvo em {new Date(lastSaved).toLocaleString("pt-BR")} — aplicado ao sistema de conferência
        </p>
      )}
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} className={`w-9 h-5 rounded-full border transition-all duration-200 relative flex-shrink-0 ${on ? "bg-green-500/25 border-green-500/50" : "bg-white/5 border-white/10"}`}>
      <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full transition-all duration-200 ${on ? "left-[calc(100%-18px)] bg-green-400" : "left-0.5 bg-gray-500"}`} />
    </button>
  );
}
