// src/pages/IASControlPage.tsx
// Controle de Nível de IAS (Inteligência Ultra Avançada)
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Brain, Sparkles, Zap, Infinity as InfinityIcon, Save } from 'lucide-react';
import { toast } from 'sonner';

export type IASLevel = 'normal' | 'avancado' | 'ultra' | 'maxima' | 'infinita';

export interface IASConfig {
  level: IASLevel;
  precisao_meta: number;
  assertividade_meta: number;
  dominancia_meta: number;
  score_minimo: number;
  ciclos_evolucao: number;
  updated_at: string;
}

const PRESETS: Record<IASLevel, Omit<IASConfig, 'updated_at' | 'level'>> = {
  normal:    { precisao_meta: 75,   assertividade_meta: 70,   dominancia_meta: 70,   score_minimo: 60,   ciclos_evolucao: 100 },
  avancado:  { precisao_meta: 88,   assertividade_meta: 85,   dominancia_meta: 85,   score_minimo: 75,   ciclos_evolucao: 500 },
  ultra:     { precisao_meta: 95,   assertividade_meta: 93,   dominancia_meta: 93,   score_minimo: 88,   ciclos_evolucao: 2000 },
  maxima:    { precisao_meta: 99.9, assertividade_meta: 99.5, dominancia_meta: 99.5, score_minimo: 96,   ciclos_evolucao: 10000 },
  infinita:  { precisao_meta: 100,  assertividade_meta: 100,  dominancia_meta: 100,  score_minimo: 99.9, ciclos_evolucao: 999999 },
};

const LEVEL_META: Record<IASLevel, { label: string; icon: any; color: string; desc: string }> = {
  normal:   { label: 'Normal',     icon: Brain,        color: 'text-blue-400',   desc: 'Operação padrão, baixo consumo' },
  avancado: { label: 'Avançado',   icon: Sparkles,     color: 'text-cyan-400',   desc: 'Análises profundas e cruzamento de padrões' },
  ultra:    { label: 'Ultra',      icon: Zap,          color: 'text-purple-400', desc: 'Stack completo: BiLSTM + MCMC + Stacking' },
  maxima:   { label: 'Máxima',     icon: Zap,          color: 'text-orange-400', desc: '1000% Ultra Domínio — gates rigorosos' },
  infinita: { label: 'Infinita ∞', icon: InfinityIcon, color: 'text-pink-400',   desc: 'Evolução contínua sem limite, alvo perfeição' },
};

const STORAGE_KEY = 'ias_config_v1';

export const getIASConfig = (): IASConfig => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { level: 'maxima', ...PRESETS.maxima, updated_at: new Date().toISOString() };
};

export default function IASControlPage() {
  const [cfg, setCfg] = useState<IASConfig>(getIASConfig);
  const [dirty, setDirty] = useState(false);

  useEffect(() => { setDirty(false); }, []);

  const applyPreset = (level: IASLevel) => {
    setCfg({ level, ...PRESETS[level], updated_at: new Date().toISOString() });
    setDirty(true);
  };

  const save = () => {
    const next = { ...cfg, updated_at: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setCfg(next);
    setDirty(false);
    window.dispatchEvent(new CustomEvent('ias:config-changed', { detail: next }));
    toast.success(`IAS aplicada: ${LEVEL_META[cfg.level].label}`);
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-display font-bold text-primary glow-text-primary flex items-center gap-2">
          <Brain className="w-8 h-8" /> Controle de IAS
        </h1>
        <p className="text-muted-foreground mt-1">
          Selecione o nível de Inteligência Ultra-Avançada. As metas de precisão, assertividade e dominância
          são ajustadas automaticamente sem quebrar o restante do sistema.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>Nível de IAS</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {(Object.keys(PRESETS) as IASLevel[]).map((lvl) => {
              const meta = LEVEL_META[lvl];
              const Icon = meta.icon;
              const active = cfg.level === lvl;
              return (
                <button
                  key={lvl}
                  onClick={() => applyPreset(lvl)}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    active ? 'border-primary bg-primary/10 glow-primary' : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Icon className={`w-6 h-6 mb-2 ${meta.color}`} />
                  <div className="font-bold">{meta.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{meta.desc}</div>
                  {active && <Badge className="mt-2" variant="outline">ATIVO</Badge>}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Metas (ajuste fino)</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          {([
            ['precisao_meta', 'Precisão alvo'],
            ['assertividade_meta', 'Assertividade alvo'],
            ['dominancia_meta', 'Dominância alvo'],
            ['score_minimo', 'Score mínimo p/ aprovar gate'],
          ] as const).map(([key, label]) => (
            <div key={key}>
              <div className="flex justify-between mb-2 text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-bold text-primary">{cfg[key].toFixed(1)}%</span>
              </div>
              <Slider
                value={[cfg[key]]}
                min={50} max={100} step={0.1}
                onValueChange={([v]) => { setCfg({ ...cfg, [key]: v }); setDirty(true); }}
              />
            </div>
          ))}
          <div>
            <div className="flex justify-between mb-2 text-sm">
              <span className="text-muted-foreground">Ciclos de evolução</span>
              <span className="font-bold text-primary">{cfg.ciclos_evolucao.toLocaleString('pt-BR')}</span>
            </div>
            <Slider
              value={[Math.min(cfg.ciclos_evolucao, 10000)]}
              min={100} max={10000} step={100}
              onValueChange={([v]) => { setCfg({ ...cfg, ciclos_evolucao: v }); setDirty(true); }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          Última atualização: {new Date(cfg.updated_at).toLocaleString('pt-BR')}
        </div>
        <Button onClick={save} disabled={!dirty} size="lg">
          <Save className="w-4 h-4 mr-2" />Salvar configuração
        </Button>
      </div>
    </div>
  );
}
