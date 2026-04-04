import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Lock, Unlock, Save, RotateCcw, ChevronDown, ChevronUp, Cpu, Zap, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { LOTERIAS_CONFIG, ConfigLoteria, useIAGerador } from "@/hooks/useIAGerador";

const STORAGE_KEY = "supremo_ia_config_v2";

function carregarConfig(): Record<string, ConfigLoteria> {
  try { const saved = localStorage.getItem(STORAGE_KEY); if (saved) return { ...LOTERIAS_CONFIG, ...JSON.parse(saved) }; } catch {}
  return { ...LOTERIAS_CONFIG };
}

function salvarConfig(cfg: Record<string, ConfigLoteria>) { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); }

function CampoSlider({ label, value, min, max, step = 1, onChange, locked, unidade = "", cor = "text-primary" }:
  { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; locked: boolean; unidade?: string; cor?: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={`text-xs font-bold ${cor}`}>{value}{unidade}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} disabled={locked} onValueChange={([v]) => onChange(v)}
        className={locked ? "opacity-40 cursor-not-allowed" : ""} />
    </div>
  );
}

function PainelLoteria({ cfg, original, onChange }: { cfg: ConfigLoteria; original: ConfigLoteria; onChange: (patch: Partial<ConfigLoteria>) => void }) {
  const [aberto, setAberto] = useState(false);
  const [travado, setTravado] = useState(true);
  const { gerarJogo, isLoading } = useIAGerador();
  const temAlteracao = JSON.stringify(cfg) !== JSON.stringify(original);

  return (
    <div className={`bg-card border rounded-xl overflow-hidden transition-colors ${temAlteracao ? "border-primary/50" : "border-border"}`}>
      <button className="w-full flex items-center justify-between p-4 text-left" onClick={() => setAberto((v) => !v)}>
        <div className="flex items-center gap-3">
          <Badge className="text-xs font-semibold px-3 py-1 bg-primary/15 text-primary border-primary/20">{cfg.nome}</Badge>
          <div className="flex gap-3 text-xs">
            <span className="text-emerald-400">Dom ≥ {cfg.minDominancia}%</span>
            <span className="text-blue-400">Prec ≥ {cfg.minPrecisao}%</span>
            <span className="text-muted-foreground">{cfg.qtd} números</span>
          </div>
        </div>
        {aberto ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      <AnimatePresence>
        {aberto && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            <div className="px-4 pb-4 space-y-5 border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">{travado ? <Lock className="w-4 h-4 text-yellow-500" /> : <Unlock className="w-4 h-4 text-emerald-400" />}
                  <span className="text-sm text-muted-foreground">{travado ? "Travados" : "Desbloqueados"}</span></div>
                <Switch checked={!travado} onCheckedChange={(v) => setTravado(!v)} />
              </div>
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Padrões mínimos</p>
                <CampoSlider label="Dominância mínima (%)" value={cfg.minDominancia} min={100} max={600} onChange={(v) => onChange({ minDominancia: v })} locked={travado} cor="text-emerald-400" />
                <CampoSlider label="Precisão mínima (%)" value={cfg.minPrecisao} min={50} max={500} onChange={(v) => onChange({ minPrecisao: v })} locked={travado} cor="text-blue-400" />
              </div>
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Soma</p>
                <CampoSlider label="Soma mínima" value={cfg.somaMin} min={0} max={cfg.somaMax - 1} onChange={(v) => onChange({ somaMin: v })} locked={travado} />
                <CampoSlider label="Soma máxima" value={cfg.somaMax} min={cfg.somaMin + 1} max={cfg.max * cfg.qtd} onChange={(v) => onChange({ somaMax: v })} locked={travado} />
              </div>
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Distribuição</p>
                <CampoSlider label="Máx. pares" value={cfg.maxPares} min={0} max={cfg.qtd} onChange={(v) => onChange({ maxPares: v })} locked={travado} />
                <CampoSlider label="Máx. ímpares" value={cfg.maxImpares} min={0} max={cfg.qtd} onChange={(v) => onChange({ maxImpares: v })} locked={travado} />
                <CampoSlider label="Máx. primos" value={cfg.maxPrimos} min={0} max={cfg.qtd} onChange={(v) => onChange({ maxPrimos: v })} locked={travado} />
                <CampoSlider label="Máx. consecutivos" value={cfg.maxConsecutivos} min={1} max={cfg.qtd} onChange={(v) => onChange({ maxConsecutivos: v })} locked={travado} />
                <CampoSlider label="Máx. mesma dezena" value={cfg.maxMesmaDezena} min={1} max={cfg.qtd} onChange={(v) => onChange({ maxMesmaDezena: v })} locked={travado} />
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" onClick={() => gerarJogo(cfg.nome)} disabled={isLoading} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Zap className="w-3.5 h-3.5 mr-1.5" />Gerar jogo agora
                </Button>
                <Button size="sm" variant="outline" onClick={() => onChange({ ...original })} title="Restaurar"><RotateCcw className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ConfiguracaoIAPage() {
  const [configs, setConfigs] = useState<Record<string, ConfigLoteria>>(carregarConfig);
  const { gerarTodas, isLoading } = useIAGerador();

  function atualizar(loteria: string, patch: Partial<ConfigLoteria>) { setConfigs((prev) => ({ ...prev, [loteria]: { ...prev[loteria], ...patch } })); }
  function handleSalvar() { salvarConfig(configs); toast.success("Configurações salvas!"); }
  function handleRestaurar() { setConfigs({ ...LOTERIAS_CONFIG }); localStorage.removeItem(STORAGE_KEY); toast.info("Configurações restauradas."); }
  const temAlteracoes = JSON.stringify(configs) !== JSON.stringify(LOTERIAS_CONFIG);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Cpu className="w-6 h-6 text-primary" />
          <div><h1 className="text-xl font-bold text-foreground">Configuração da IA</h1><p className="text-sm text-muted-foreground">Parâmetros travados por loteria</p></div>
        </div>
        <div className="flex gap-2">
          {temAlteracoes && <Button size="sm" variant="outline" onClick={handleRestaurar}><RotateCcw className="w-3.5 h-3.5 mr-1" />Restaurar</Button>}
          <Button size="sm" onClick={handleSalvar} className="bg-primary hover:bg-primary/90 text-primary-foreground"><Save className="w-3.5 h-3.5 mr-1" />Salvar</Button>
        </div>
      </div>

      <button onClick={() => gerarTodas()} disabled={isLoading}
        className="w-full flex items-center justify-center gap-3 py-4 rounded-xl bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30 hover:border-primary/60 transition-all group">
        <Play className={`w-5 h-5 text-primary ${isLoading ? "animate-spin" : "group-hover:scale-110 transition-transform"}`} />
        <span className="font-semibold text-primary">{isLoading ? "Gerando jogos..." : "Gerar jogos para TODAS as loterias"}</span>
      </button>

      <div className="space-y-3">
        {Object.keys(LOTERIAS_CONFIG).map((loteria) => (
          <PainelLoteria key={loteria} cfg={configs[loteria]} original={LOTERIAS_CONFIG[loteria]} onChange={(patch) => atualizar(loteria, patch)} />
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl p-4 space-y-2">
        <div className="flex items-center gap-2"><Settings className="w-4 h-4 text-primary" /><p className="text-sm font-semibold text-primary">Como funciona</p></div>
        <div className="text-xs text-muted-foreground space-y-1.5">
          <p>• Analisa os últimos 100 sorteios de cada loteria</p>
          <p>• Gera até 3 candidatos e escolhe o de maior dominância</p>
          <p>• Só aceita jogos que passem em TODOS os critérios</p>
          <p>• Jogos gerados vão para <strong className="text-foreground">Minha Aposta</strong> para confirmação</p>
          <p>• Após confirmação, verificação automática às 21h</p>
        </div>
      </div>
    </div>
  );
}
