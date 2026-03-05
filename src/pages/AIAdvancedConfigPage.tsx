import { useState } from 'react';
import { motion } from 'framer-motion';
import { Cpu, Brain, Zap, Activity, BarChart3, Layers, RefreshCw, Users, Settings } from 'lucide-react';

const AI_MODELS = [
  { name: 'BayesianNet', desc: 'Redes Bayesianas', icon: BarChart3, active: true },
  { name: 'MarkovChain', desc: 'Cadeias de Markov', icon: Zap, active: true },
  { name: 'NeuralFreq', desc: 'Redes Neurais de Frequência', icon: Brain, active: true },
  { name: 'TemporalGAN', desc: 'GAN Temporal', icon: Activity, active: true },
  { name: 'CertusV2', desc: 'Ensemble Certus v2', icon: Cpu, active: true },
];

const ANALYSIS_WEIGHTS = [
  { name: 'Frequência', value: 100 },
  { name: 'Padrões', value: 100 },
  { name: 'Recência', value: 100 },
  { name: 'Lacunas', value: 100 },
];

const SMART_RESOURCES = [
  { name: 'Re-treino automático após cada sorteio', desc: 'IA aprende com cada resultado novo', enabled: true },
  { name: 'Threshold adaptativo de confiança', desc: 'Ajusta automaticamente o critério 0.999 baseado no histórico', enabled: true },
  { name: 'Consenso multi-modelo', desc: 'Requer que múltiplos modelos concordem antes de sugerir', enabled: true },
  { name: 'Memória persistente evolutiva', desc: 'Dados de aprendizado nunca são apagados ou reiniciados', enabled: true },
  { name: 'Varredura completa de API', desc: 'Identifica todos os padrões, estatísticas, números quentes/frios', enabled: true },
  { name: 'Especialistas por loteria', desc: 'Cada loteria tem IAs dedicadas que estudam exclusivamente seus padrões', enabled: true },
];

const AIAdvancedConfigPage = () => {
  const [weights, setWeights] = useState(ANALYSIS_WEIGHTS);
  const [resources, setResources] = useState(SMART_RESOURCES);

  const updateWeight = (index: number, value: number) => {
    setWeights(prev => prev.map((w, i) => i === index ? { ...w, value } : w));
  };

  const toggleResource = (index: number) => {
    setResources(prev => prev.map((r, i) => i === index ? { ...r, enabled: !r.enabled } : r));
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Settings className="w-8 h-8 text-primary" />
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-display font-bold">Configuração Avançada de IA</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary/20 text-secondary font-display font-bold">SUPER AI</span>
          </div>
          <p className="text-muted-foreground text-sm">
            Configure os modelos de IA e pesos para maximizar a precisão das previsões. Todos os modelos trabalham em conjunto para encontrar os melhores números.
          </p>
        </div>
      </div>

      {/* Active Models */}
      <div>
        <h2 className="text-sm font-display font-bold text-muted-foreground tracking-wider mb-3">MODELOS ATIVOS</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {AI_MODELS.map((model, i) => (
            <motion.div
              key={model.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass rounded-xl p-4 border-l-2 border-l-primary"
            >
              <div className="flex items-center gap-2 mb-1">
                <model.icon className="w-4 h-4 text-primary" />
                <span className="font-display font-bold text-primary text-sm">{model.name}</span>
              </div>
              <p className="text-xs text-muted-foreground">{model.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Analysis Weights */}
      <div>
        <h2 className="text-sm font-display font-bold text-muted-foreground tracking-wider mb-3">PESOS DE ANÁLISE (%)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {weights.map((w, i) => (
            <div key={w.name} className="glass rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-foreground">{w.name}</span>
                <span className="text-sm font-display font-bold text-primary">{w.value}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={w.value}
                onChange={(e) => updateWeight(i, parseInt(e.target.value))}
                className="w-full accent-primary h-1.5"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Smart Resources */}
      <div>
        <h2 className="text-sm font-display font-bold text-muted-foreground tracking-wider mb-3">RECURSOS INTELIGENTES</h2>
        <div className="space-y-3">
          {resources.map((r, i) => (
            <motion.div
              key={r.name}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              className={`flex items-center justify-between p-4 rounded-xl border ${r.enabled ? 'border-success/30 bg-success/5' : 'border-border bg-muted/20'}`}
            >
              <div>
                <p className="text-sm font-semibold text-foreground">{r.name}</p>
                <p className="text-xs text-muted-foreground">{r.desc}</p>
              </div>
              <button
                onClick={() => toggleResource(i)}
                className={`w-12 h-6 rounded-full transition-all shrink-0 ${r.enabled ? 'bg-success' : 'bg-muted'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-foreground transition-transform ${r.enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AIAdvancedConfigPage;
