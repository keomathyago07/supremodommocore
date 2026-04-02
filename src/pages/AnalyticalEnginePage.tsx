import { useState, useEffect } from 'react';
import { LOTTERIES, getBrasiliaTime, formatBrasiliaHour, getTodaysLotteries, AI_SPECIALISTS } from '@/lib/lotteryConstants';
import { LOTTERY_PRIZES } from '@/lib/lotteryPrizes';
import { useAutoAnalysis } from '@/hooks/useAutoAnalysis';
import { ALL_ENGINES, DOMMO_CONFIG, LOTTERY_SPECIALISTS } from '@/lib/dommoCore';
import {
  Brain, Activity, Cpu, BarChart3, Zap, Database, Target, TrendingUp,
  Layers, Gauge, Clock, RefreshCw, CheckCircle, AlertCircle, Sigma,
  GitBranch, Workflow, Bot, Sparkles, Shield, Atom, Waves, Search,
  Network, Binary, Radar, Flame, Eye
} from 'lucide-react';
import { motion } from 'framer-motion';

const PIPELINE_STAGES = [
  { id: 'atlas', name: 'Atlas Ingest', icon: Database, desc: 'Ingestão multi-fonte com auto-healing e retry' },
  { id: 'norm', name: 'Normalization', icon: Layers, desc: 'Padronização, ordenação, classificação por faixas' },
  { id: 'feat', name: 'Feature Engineering', icon: Sigma, desc: 'Frequência, atraso, variância, entropia, kurtosis, skewness' },
  { id: 'certus', name: 'Certus Engine v4', icon: Brain, desc: 'Score: freq + recentFreq + delay + trend + gap + entropia' },
  { id: 'attention', name: 'Attention-LSTM', icon: Eye, desc: 'Multi-escala: 10/30/100 sorteios com Self-Attention' },
  { id: 'transformer', name: 'Transformer Temporal', icon: Network, desc: 'Positional Encoding + 8 cabeças de atenção' },
  { id: 'monte_carlo', name: 'Monte Carlo Avançado', icon: Activity, desc: 'Simulação ponderada: 100K+ sorteios sintéticos' },
  { id: 'ensemble', name: 'ARIMA+XGBoost', icon: GitBranch, desc: 'Ensemble: AR(3) + Gradient Boosting 3 árvores' },
  { id: 'hmm', name: 'HMM-Neural', icon: Radar, desc: '7 regimes ocultos: Baixos/Altos/Balanceado/Soma/Extremos' },
  { id: 'markov', name: 'Markov 2ª Ordem', icon: Waves, desc: 'Cadeia de transição: padrões de retorno/skip/continuação' },
  { id: 'bayesian', name: 'Bayesiano CDM', icon: Shield, desc: 'Dirichlet-Multinomial: prior + posterior adaptativo' },
  { id: 'fourier', name: 'Análise de Fourier', icon: Binary, desc: 'Detecção de ciclos dominantes por número' },
  { id: 'memory', name: 'Memória Contextual', icon: Search, desc: 'Busca vetorial: 10 sorteios mais similares + predição' },
  { id: 'stacking', name: 'Deep Stacking 5L', icon: Flame, desc: 'Meta-learner: RF + XGB + MLP + Platt Calibration' },
  { id: 'qaoa', name: 'QAOA Optimizer', icon: Atom, desc: 'QUBO + Gibbs Sampling + Mixer Layer — ótimo global' },
];

const DOMMO_MODULES = [
  { name: 'Atlas Ingest v2', desc: 'Multi-fonte com auto-healing, retry exponencial e fallback', status: 'ATIVO', category: 'core' },
  { name: 'Certus Engine v4', desc: 'Score: freq + recentFreq + delay + trend + gap + entropia + variance', status: 'ATIVO', category: 'core' },
  { name: 'Attention-LSTM', desc: 'Multi-escala (3 cabeças): curto/médio/longo prazo com softmax', status: 'ATIVO', category: 'ml' },
  { name: 'Transformer Temporal', desc: 'Self-Attention com Positional Encoding sinusoidal', status: 'ATIVO', category: 'ml' },
  { name: 'Monte Carlo Avançado', desc: 'Simulação ponderada com amostragem inteligente (100K+)', status: 'ATIVO', category: 'ml' },
  { name: 'Ensemble ARIMA+XGB', desc: 'AutoRegression AR(3) + Gradient Boosting com 3 árvores', status: 'ATIVO', category: 'ml' },
  { name: 'HMM-Neural (7 Regimes)', desc: 'Detecção de estados ocultos: Baixos/Altos/Soma/Extremos/Central', status: 'ATIVO', category: 'advanced' },
  { name: 'Markov 2ª Ordem', desc: 'Padrões: retorno após ausência, continuação, skip', status: 'ATIVO', category: 'advanced' },
  { name: 'Bayesiano CDM', desc: 'Compound-Dirichlet-Multinomial com prior adaptativo', status: 'ATIVO', category: 'advanced' },
  { name: 'Fourier Analysis', desc: 'Detecção de ciclos dominantes e previsão por fase', status: 'ATIVO', category: 'advanced' },
  { name: 'QAOA-Inspired', desc: 'Otimizador quântico clássico: QUBO + Gibbs + Mixer', status: 'ATIVO', category: 'optimization' },
  { name: 'Deep Stacking 5L', desc: 'Meta-learner: Raw→RF→XGB→MLP→Platt Calibration', status: 'ATIVO', category: 'ml' },
  { name: 'Aggregate Predictor', desc: 'Soma/Paridade/Spread/Dezenas — filtro inteligente', status: 'ATIVO', category: 'advanced' },
  { name: 'Memória Contextual', desc: 'Embedding vetorial + busca de vizinhos + predição por analogia', status: 'ATIVO', category: 'advanced' },
  { name: 'Wheeling System', desc: 'Cobertura combinatória: covering design greedy', status: 'ATIVO', category: 'optimization' },
  { name: 'Auto-Learning v2', desc: 'Ajuste dinâmico de pesos por performance de cada engine', status: 'ATIVO', category: 'core' },
  { name: 'Chat Orchestrator', desc: 'Controle por linguagem natural com comandos inteligentes', status: 'ATIVO', category: 'core' },
];

const categoryColors: Record<string, string> = {
  core: 'text-primary border-primary/20 bg-primary/5',
  ml: 'text-secondary border-secondary/20 bg-secondary/5',
  advanced: 'text-warning border-warning/20 bg-warning/5',
  optimization: 'text-success border-success/20 bg-success/5',
};

const categoryLabels: Record<string, string> = {
  core: 'NÚCLEO',
  ml: 'MACHINE LEARNING',
  advanced: 'AVANÇADO',
  optimization: 'OTIMIZAÇÃO',
};

const AnalyticalEnginePage = () => {
  const auto = useAutoAnalysis();
  const [time, setTime] = useState(getBrasiliaTime());
  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTime(getBrasiliaTime()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!auto.autoMode) return;
    const interval = setInterval(() => {
      setActiveStage(prev => (prev + 1) % PIPELINE_STAGES.length);
    }, 1500);
    return () => clearInterval(interval);
  }, [auto.autoMode]);

  const todaysLotteries = getTodaysLotteries();
  const details = auto.analysisDetails;
  const detailsList = Object.values(details).sort((a, b) => b.gatesReached - a.gatesReached);

  const totalGates = detailsList.reduce((s, d) => s + d.gatesReached, 0);
  const totalCycles = detailsList.reduce((s, d) => s + d.cyclesCompleted, 0);
  const avgDomination = detailsList.length > 0 ? detailsList.reduce((s, d) => s + d.domination, 0) / detailsList.length : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Cpu className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-display font-bold">DOMMO CORE v7 — Máxima Potência</h1>
            <p className="text-xs text-muted-foreground">
              {ALL_ENGINES.length} Engines | {DOMMO_CONFIG.STACKING_LAYERS} Camadas Stacking | QAOA + Attention-LSTM + Transformer
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="glass px-3 py-1.5 rounded-lg flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <span className="font-mono text-sm text-primary">{formatBrasiliaHour(time)}</span>
          </div>
          <span className={`text-xs px-3 py-1.5 rounded-full font-mono font-bold ${
            auto.autoMode ? 'bg-success/20 text-success animate-pulse' : 'bg-muted text-muted-foreground'
          }`}>
            {auto.autoMode ? '⚡ PIPELINE ATIVO 24/7' : '⏸ PARADO'}
          </span>
        </div>
      </div>

      {/* Global Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Engines Ativos', value: ALL_ENGINES.length.toString(), icon: Cpu, color: 'text-primary' },
          { label: 'IAs Especialistas', value: AI_SPECIALISTS.length.toString(), icon: Brain, color: 'text-secondary' },
          { label: 'Gates Encontrados', value: totalGates.toString(), icon: Target, color: 'text-success' },
          { label: 'Ciclos Completos', value: totalCycles.toString(), icon: RefreshCw, color: 'text-warning' },
          { label: 'Dominação Média', value: `${avgDomination.toFixed(1)}%`, icon: Gauge, color: 'text-destructive' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-[10px] text-muted-foreground">{stat.label}</span>
            </div>
            <p className={`text-2xl font-display font-bold ${stat.color}`}>{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* 17 DOMMO CORE Modules by Category */}
      <div className="glass rounded-xl p-5 border border-secondary/20">
        <div className="flex items-center gap-3 mb-4">
          <Workflow className="w-5 h-5 text-secondary" />
          <h2 className="font-display font-bold">DOMMO CORE v7 — {DOMMO_MODULES.length} Módulos</h2>
          <span className="text-xs text-muted-foreground ml-auto font-mono">{DOMMO_MODULES.filter(m => m.status === 'ATIVO').length}/{DOMMO_MODULES.length} ATIVOS</span>
        </div>
        {['core', 'ml', 'advanced', 'optimization'].map(cat => (
          <div key={cat} className="mb-3">
            <span className="text-[10px] font-mono font-bold text-muted-foreground mb-1 block">{categoryLabels[cat]}</span>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {DOMMO_MODULES.filter(m => m.category === cat).map((mod, i) => (
                <motion.div key={mod.name} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className={`rounded-lg p-3 border ${categoryColors[cat]}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-display font-bold">{mod.name}</span>
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-success/20 text-success font-mono">{mod.status}</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground leading-tight">{mod.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 15-Stage Pipeline */}
      <div className="glass rounded-xl p-5 border border-primary/20">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="w-5 h-5 text-primary" />
          <h2 className="font-display font-bold">Pipeline Analítico — 15 Etapas</h2>
          <span className="text-xs text-muted-foreground font-mono ml-auto">
            {auto.autoMode ? `⚡ ${PIPELINE_STAGES[activeStage]?.name}` : '⏸ Inativo'}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-2">
          {PIPELINE_STAGES.map((stage, i) => {
            const isActive = i === activeStage && auto.autoMode;
            const isPast = i < activeStage && auto.autoMode;
            return (
              <motion.div
                key={stage.id}
                animate={isActive ? { scale: [1, 1.03, 1] } : {}}
                transition={{ duration: 1, repeat: isActive ? Infinity : 0 }}
                className={`rounded-lg p-3 border transition-all ${
                  isActive ? 'border-primary bg-primary/10 ring-1 ring-primary/30' :
                  isPast ? 'border-success/30 bg-success/5' :
                  'border-border/40 bg-muted/10'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <stage.icon className={`w-3.5 h-3.5 ${isActive ? 'text-primary' : isPast ? 'text-success' : 'text-muted-foreground'}`} />
                  <span className={`text-[10px] font-display font-bold ${isActive ? 'text-primary' : isPast ? 'text-success' : 'text-foreground'}`}>
                    {stage.name}
                  </span>
                </div>
                <p className="text-[9px] text-muted-foreground leading-tight">{stage.desc}</p>
                <div className="flex items-center gap-1 mt-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-primary animate-pulse' : isPast ? 'bg-success' : 'bg-muted'}`} />
                  <span className="text-[8px] font-mono text-muted-foreground">
                    {isActive ? 'PROCESSANDO' : isPast ? '✓ OK' : '...'}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Per-Lottery Status */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="w-5 h-5 text-secondary" />
          <h2 className="font-display font-bold">Status por Loteria — Engines em Sincronia</h2>
          <span className="text-xs text-muted-foreground ml-auto">{detailsList.length} loterias</span>
        </div>
        {detailsList.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Ative o modo AUTO para iniciar o pipeline DOMMO CORE v7.</p>
        ) : (
          <div className="space-y-2">
            {detailsList.map((d, i) => {
              const lottery = LOTTERIES.find(l => l.id === d.lotteryId);
              const isToday = todaysLotteries.some(t => t.id === d.lotteryId);
              return (
                <motion.div key={d.lotteryId} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                  className={`rounded-lg p-4 border ${isToday ? 'border-primary/30 bg-primary/5' : 'border-border/30 bg-muted/10'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: lottery?.color }} />
                      <span className="font-display font-bold text-sm" style={{ color: lottery?.color }}>{d.lotteryName}</span>
                      {isToday && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-success/20 text-success font-mono">HOJE</span>}
                      {lottery?.hasDualGame && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-warning/20 text-warning font-mono">DUPLO</span>}
                      {lottery?.hasDualDraw && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-destructive/20 text-destructive font-mono">2 SORT.</span>}
                      {lottery?.hasColumns && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-mono">7 COL.</span>}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                      d.status === 'delivered' ? 'bg-success/20 text-success' :
                      d.status === 'gate_found' ? 'bg-secondary/20 text-secondary' :
                      d.status === 'ready' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                    }`}>
                      {d.status === 'delivered' ? '📩 ENVIADO' : d.status === 'gate_found' ? '🎯 GATE' : d.status === 'ready' ? '✅ PRONTO' : '🔄 ESTUDANDO'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs text-muted-foreground">
                    <div><span>Gates</span><p className="font-bold text-secondary text-lg">{d.gatesReached}</p></div>
                    <div><span>Ciclos</span><p className="font-bold text-primary text-lg">{d.cyclesCompleted}</p></div>
                    <div><span>Domínio</span><p className="font-bold text-foreground text-lg">{d.domination.toFixed(1)}%</p></div>
                    <div><span>Precisão</span><p className="font-bold text-foreground text-lg">{d.precision.toFixed(1)}%</p></div>
                    <div><span>Engines</span><p className="font-bold text-success text-lg">{ALL_ENGINES.length}/15</p></div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2 text-[9px] text-muted-foreground">
                    <span className="px-1.5 py-0.5 rounded bg-muted/30">Padrões: {d.patternsLocked}</span>
                    <span className="px-1.5 py-0.5 rounded bg-muted/30">Adaptações: {d.selfAdaptations}</span>
                    <span className="px-1.5 py-0.5 rounded bg-muted/30">API: {d.apiSyncCount}</span>
                    <span className="px-1.5 py-0.5 rounded bg-muted/30">Prêmio: {d.prizeTarget}</span>
                    {d.bestNumbers?.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                        [{d.bestNumbers.slice(0, 5).join(',')}{d.bestNumbers.length > 5 ? '...' : ''}] ({d.bestConfidence.toFixed(1)}%)
                      </span>
                    )}
                  </div>
                  {d.hotNumbers?.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <span className="text-[9px] text-destructive font-mono">🔥</span>
                      {d.hotNumbers.slice(0, 5).map((n, idx) => (
                        <span key={idx} className="w-5 h-5 rounded-full flex items-center justify-center font-mono text-[8px] bg-destructive/10 text-destructive border border-destructive/20">{n}</span>
                      ))}
                      <span className="text-[9px] text-primary font-mono ml-1">❄</span>
                      {(d.coldNumbers || []).slice(0, 5).map((n, idx) => (
                        <span key={idx} className="w-5 h-5 rounded-full flex items-center justify-center font-mono text-[8px] bg-primary/10 text-primary border border-primary/20">{n}</span>
                      ))}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Specialists */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <Brain className="w-5 h-5 text-primary" />
          <h2 className="font-display font-bold">{AI_SPECIALISTS.length}+ Especialistas IA</h2>
        </div>
        <div className="flex flex-wrap gap-1 max-h-[160px] overflow-y-auto">
          {AI_SPECIALISTS.slice(0, 100).map((name, i) => (
            <span key={i} className={`text-[8px] px-1.5 py-0.5 rounded-full font-mono ${
              auto.autoMode ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-muted/30 text-muted-foreground'
            }`}>
              {name}
            </span>
          ))}
          {AI_SPECIALISTS.length > 100 && (
            <span className="text-[8px] px-2 py-0.5 rounded-full font-mono bg-secondary/10 text-secondary">
              +{AI_SPECIALISTS.length - 100} mais
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticalEnginePage;
