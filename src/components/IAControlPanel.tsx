// ============================================================
// IAControlPanel.tsx — Painel de Controle de IAs
// ============================================================
import { useIAControlStore, IA_LEVELS, IALevel } from "@/store/iaControlStore";
import { useSyncStore } from "@/store/syncStore";
import { saveIAConfigToCloud } from "@/lib/iaConfigCloud";
import { toast } from "sonner";

export function IAControlPanel() {
  const { activeLevel, customGoals, lastSaved, setLevel, setCustomGoals, save, reset } = useIAControlStore();
  const { broadcastChange, addLog } = useSyncStore();

  async function handleSave() {
    save();
    broadcastChange("ia_config", { activeLevel, customGoals, savedAt: new Date().toISOString() });
    addLog(`Configuração IA salva — nível ${activeLevel}`, "success");
    window.dispatchEvent(new CustomEvent("ias:config-changed", { detail: { activeLevel, customGoals } }));
    // Persistência real no backend + sync entre dispositivos (mobile/desktop)
    const ok = await saveIAConfigToCloud(activeLevel, customGoals);
    if (ok) toast.success("☁️ Configuração sincronizada em todos os dispositivos");
    else toast.warning("Configuração salva localmente — sync na nuvem indisponível");
  }


  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-3">Nível Operacional das IAs</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {IA_LEVELS.map((level) => (
            <button
              key={level.id}
              onClick={() => setLevel(level.id as IALevel)}
              className={`relative p-4 rounded-xl border text-left transition-all duration-200 hover:-translate-y-0.5 ${
                activeLevel === level.id
                  ? "border-purple-500 bg-purple-500/10 shadow-[0_0_0_1px_rgb(168,85,247,0.5)]"
                  : "border-white/10 bg-white/5 hover:border-cyan-400/30"
              }`}
            >
              {activeLevel === level.id && (
                <span className="absolute top-2 right-2 text-[9px] font-bold px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                  ATIVO
                </span>
              )}
              <div className="text-2xl mb-1">{level.icon}</div>
              <div className="text-sm font-semibold text-white">{level.label}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">{level.description}</div>
              <div className="grid grid-cols-2 gap-1 mt-3">
                <Stat label="Precisão" value={`${level.precision}%`} />
                <Stat label="Assert." value={`${level.assertiveness}%`} />
                <Stat label="Ciclo" value={`${level.cycleSec}s`} />
                <Stat label="Ensembles" value={String(level.ensembles)} />
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-3">Ajuste Fino das Metas</h3>
        <div className="space-y-4">
          <SliderRow label="Meta de Precisão" value={customGoals.precisionGoal} min={50} max={99} onChange={(v) => setCustomGoals({ precisionGoal: v })} />
          <SliderRow label="Meta de Assertividade" value={customGoals.assertivenessGoal} min={50} max={99} onChange={(v) => setCustomGoals({ assertivenessGoal: v })} />
          <SliderRow label="Agressividade do Pipeline" value={customGoals.pipelineAggression} min={10} max={100} onChange={(v) => setCustomGoals({ pipelineAggression: v })} />
          <SliderRow label="Profundidade de Análise" value={customGoals.analysisDepth} min={10} max={100} onChange={(v) => setCustomGoals({ analysisDepth: v })} />
          <SliderRow label="Velocidade de Auto-Evolução" value={customGoals.evolutionSpeed} min={10} max={100} onChange={(v) => setCustomGoals({ evolutionSpeed: v })} />
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={handleSave} className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity">
          💾 Salvar configuração das IAs
        </button>
        <button onClick={reset} className="px-4 py-2.5 rounded-lg border border-white/10 text-gray-400 text-sm hover:text-white hover:border-cyan-400/30 transition-all">
          ↺ Restaurar
        </button>
      </div>

      {lastSaved && (
        <p className="text-center text-xs text-green-400">
          ✅ Salvo em {new Date(lastSaved).toLocaleString("pt-BR")} — sincronizado com todos os dispositivos
        </p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-[10px]">
      <span className="text-gray-500">{label}: </span>
      <span className="text-cyan-400 font-medium">{value}</span>
    </div>
  );
}

function SliderRow({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="text-cyan-400 font-semibold">{value}%</span>
      </div>
      <input type="range" min={min} max={max} step={1} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-cyan-400" />
    </div>
  );
}
