import { useState, useEffect } from 'react';
import { LOTTERIES, getBrasiliaTime, formatBrasiliaHour, getTodaysLotteries, AI_SPECIALISTS } from '@/lib/lotteryConstants';
import { LOTTERY_PRIZES } from '@/lib/lotteryPrizes';
import { useAutoAnalysis } from '@/hooks/useAutoAnalysis';
import {
  Brain, Activity, Cpu, BarChart3, Zap, Database, Target, TrendingUp,
  Layers, Gauge, Clock, RefreshCw, CheckCircle, AlertCircle, Sigma,
  GitBranch, Workflow, Bot, Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';

const PIPELINE_STAGES = [
  { id: 'atlas', name: 'Atlas Ingest', icon: Database, desc: 'Ingestão de dados via API + fallback multi-fonte' },
  { id: 'norm', name: 'Normalization', icon: Layers, desc: 'Padronização, ordenação e classificação' },
  { id: 'feat', name: 'Feature Engineering', icon: Sigma, desc: 'Frequência, atraso, variância, entropia, kurtosis' },
  { id: 'certus', name: 'Certus Engine v4', icon: Brain, desc: 'Score: freq + delay + trend + gap + entropia' },
  { id: 'pattern', name: 'Pattern Detection', icon: Target, desc: 'Sequências, clusters, par/ímpar, alto/baixo' },
  { id: 'corr', name: 'Correlation Engine', icon: TrendingUp, desc: 'Matriz de correlação, pares/trincas frequentes' },
  { id: 'temporal', name: 'Temporal Analysis', icon: Clock, desc: 'Tendência, sazonalidade, ciclos de retorno' },
  { id: 'sim', name: 'Simulation Engine', icon: Activity, desc: 'Monte Carlo: 100K → 10M+ sorteios simulados' },
  { id: 'ml', name: 'Machine Learning', icon: Bot, desc: 'XGBoost, LSTM, RF, GBM, MLP, Bayesian' },
  { id: 'decision', name: 'Decision Engine', icon: GitBranch, desc: 'Seleção inteligente do top pool + diversidade' },
  { id: 'opt', name: 'Optimization', icon: Gauge, desc: 'Genetic Algorithm, Simulated Annealing, PSO' },
  { id: 'filter', name: 'Filtering Engine', icon: AlertCircle, desc: 'Eliminar combinações fracas e redundantes' },
  { id: 'backtest', name: 'Backtesting Engine', icon: RefreshCw, desc: 'Simulação retrospectiva, taxa de acerto' },
  { id: 'score', name: 'Global Scoring', icon: Zap, desc: 'Score final = Certus + ML + Tendência + IA' },
  { id: 'report', name: 'Auto-Learning', icon: Sparkles, desc: 'Adaptação de pesos + relatório final' },
];

const DOMMO_MODULES = [
  { name: 'Atlas Ingest', desc: 'Multi-fonte: APILoterias + Caixa + Fallback', status: 'ATIVO' },
  { name: 'Certus Engine v4', desc: 'Cérebro estatístico: freq + delay + trend + gap + entropia', status: 'ATIVO' },
  { name: 'Decision Engine', desc: 'Geração inteligente com pool dinâmico', status: 'ATIVO' },
  { name: 'Global Scoring', desc: 'Classificação ALTA/MÉDIA/BAIXA por confiança', status: 'ATIVO' },
  { name: 'Auto-Learning', desc: 'Ajuste automático de pesos por performance', status: 'ATIVO' },
  { name: 'Chat Orchestrator', desc: 'Controle por linguagem natural (agressivo/conservador)', status: 'ATIVO' },
];

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
    }, 2000);
    return () => clearInterval(interval);
  }, [auto.autoMode]);

  const todaysLotteries = getTodaysLotteries();
  const details = auto.analysisDetails;
  const detailsList = Object.values(details).sort((a, b) => b.gatesReached - a.gatesReached);

  const totalGates = detailsList.reduce((s, d) => s + d.gatesReached, 0);
  const totalCycles = detailsList.reduce((s, d) => s + d.cyclesCompleted, 0);
  const avgDomination = detailsList.length > 0 ? detailsList.reduce((s, d) => s + d.domination, 0) / detailsList.length : 0;

  const activeSpecialists = auto.autoMode ? AI_SPECIALISTS.length : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Cpu className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-display font-bold">Motor Analítico DOMMO CORE</h1>
            <p className="text-xs text-muted-foreground">Atlas Ingest + Certus v4 + Decision Engine + Auto-Learning</p>
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
            {auto.autoMode ? '⚡ ATIVO 24/7' : '⏸ PARADO'}
          </span>
        </div>
      </div>

      {/* DOMMO CORE Modules */}
      <div className="glass rounded-xl p-5 border border-secondary/20">
        <div className="flex items-center gap-3 mb-4">
          <Workflow className="w-5 h-5 text-secondary" />
          <h2 className="font-display font-bold">DOMMO CORE — Módulos Ativos</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {DOMMO_MODULES.map((mod, i) => (
            <motion.div key={mod.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="rounded-lg p-3 border border-secondary/20 bg-secondary/5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-display font-bold text-secondary">{mod.name}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-success/20 text-success font-mono">{mod.status}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">{mod.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Global Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'IAs Ativas', value: activeSpecialists.toString(), icon: Brain, color: 'text-primary' },
          { label: 'Gates Encontrados', value: totalGates.toString(), icon: Target, color: 'text-secondary' },
          { label: 'Ciclos Completos', value: totalCycles.toString(), icon: RefreshCw, color: 'text-success' },
          { label: 'Dominação Média', value: `${avgDomination.toFixed(1)}%`, icon: Gauge, color: 'text-warning' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
            <p className={`text-2xl font-display font-bold ${stat.color}`}>{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* 15-Stage Pipeline */}
      <div className="glass rounded-xl p-5 border border-primary/20">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="w-5 h-5 text-primary" />
          <h2 className="font-display font-bold">Pipeline Analítico — 15 Etapas DOMMO CORE</h2>
          <span className="text-xs text-muted-foreground font-mono ml-auto">
            Etapa ativa: {PIPELINE_STAGES[activeStage]?.name}
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
                  <stage.icon className={`w-4 h-4 ${isActive ? 'text-primary' : isPast ? 'text-success' : 'text-muted-foreground'}`} />
                  <span className={`text-[11px] font-display font-bold ${isActive ? 'text-primary' : isPast ? 'text-success' : 'text-foreground'}`}>
                    {stage.name}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight">{stage.desc}</p>
                <div className="flex items-center gap-1 mt-1.5">
                  <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-primary animate-pulse' : isPast ? 'bg-success' : 'bg-muted'}`} />
                  <span className="text-[9px] font-mono text-muted-foreground">
                    {isActive ? 'PROCESSANDO' : isPast ? 'COMPLETO' : 'AGUARDANDO'}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Per-Lottery Detailed Engine Status */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="w-5 h-5 text-secondary" />
          <h2 className="font-display font-bold">Status por Loteria</h2>
          <span className="text-xs text-muted-foreground ml-auto">{detailsList.length} loterias monitoradas</span>
        </div>
        {detailsList.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Ative o modo AUTO para iniciar o motor analítico DOMMO CORE.</p>
        ) : (
          <div className="space-y-2">
            {detailsList.map((d, i) => {
              const lottery = LOTTERIES.find(l => l.id === d.lotteryId);
              const isToday = todaysLotteries.some(t => t.id === d.lotteryId);
              return (
                <motion.div key={d.lotteryId} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className={`rounded-lg p-4 border ${isToday ? 'border-primary/30 bg-primary/5' : 'border-border/30 bg-muted/10'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: lottery?.color }} />
                      <span className="font-display font-bold text-sm" style={{ color: lottery?.color }}>{d.lotteryName}</span>
                      {isToday && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-success/20 text-success font-mono">HOJE</span>}
                      {lottery?.hasDualGame && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-warning/20 text-warning font-mono">JOGO DUPLO</span>}
                      {lottery?.hasDualDraw && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-destructive/20 text-destructive font-mono">2 SORTEIOS</span>}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                      d.status === 'delivered' ? 'bg-success/20 text-success' :
                      d.status === 'gate_found' ? 'bg-secondary/20 text-secondary' :
                      d.status === 'ready' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                    }`}>
                      {d.status === 'delivered' ? '📩 ENVIADO' : d.status === 'gate_found' ? '🎯 GATE' : d.status === 'ready' ? '✅ PRONTO' : '🔄 ESTUDANDO'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
                    <div>
                      <span>Gates</span>
                      <p className="font-bold text-secondary text-lg">{d.gatesReached}</p>
                    </div>
                    <div>
                      <span>Ciclos</span>
                      <p className="font-bold text-primary text-lg">{d.cyclesCompleted}</p>
                    </div>
                    <div>
                      <span>Domínio</span>
                      <p className="font-bold text-foreground text-lg">{d.domination.toFixed(1)}%</p>
                    </div>
                    <div>
                      <span>Precisão</span>
                      <p className="font-bold text-foreground text-lg">{d.precision.toFixed(1)}%</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2 text-[10px] text-muted-foreground">
                    <span className="px-1.5 py-0.5 rounded bg-muted/30">Padrões: {d.patternsLocked}</span>
                    <span className="px-1.5 py-0.5 rounded bg-muted/30">Adaptações: {d.selfAdaptations}</span>
                    <span className="px-1.5 py-0.5 rounded bg-muted/30">API Sync: {d.apiSyncCount}</span>
                    <span className="px-1.5 py-0.5 rounded bg-muted/30">Prêmio: {d.prizeTarget}</span>
                    {d.bestNumbers?.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                        Best: [{d.bestNumbers.slice(0, 4).join(',')}{d.bestNumbers.length > 4 ? '...' : ''}] ({d.bestConfidence.toFixed(1)}%)
                      </span>
                    )}
                  </div>
                  {d.hotNumbers?.length > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] text-destructive font-mono">🔥 Hot:</span>
                      {d.hotNumbers.slice(0, 5).map((n, idx) => (
                        <span key={idx} className="w-5 h-5 rounded-full flex items-center justify-center font-mono text-[9px] bg-destructive/10 text-destructive border border-destructive/20">{n}</span>
                      ))}
                      <span className="text-[10px] text-primary font-mono ml-2">❄ Cold:</span>
                      {(d.coldNumbers || []).slice(0, 5).map((n, idx) => (
                        <span key={idx} className="w-5 h-5 rounded-full flex items-center justify-center font-mono text-[9px] bg-primary/10 text-primary border border-primary/20">{n}</span>
                      ))}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Specialists Grid */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <Brain className="w-5 h-5 text-primary" />
          <h2 className="font-display font-bold">170+ Especialistas IA Ativos</h2>
        </div>
        <div className="flex flex-wrap gap-1.5 max-h-[200px] overflow-y-auto">
          {AI_SPECIALISTS.slice(0, 80).map((name, i) => (
            <span key={i} className={`text-[9px] px-2 py-0.5 rounded-full font-mono ${
              auto.autoMode ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-muted/30 text-muted-foreground'
            }`}>
              {name}
            </span>
          ))}
          {AI_SPECIALISTS.length > 80 && (
            <span className="text-[9px] px-2 py-0.5 rounded-full font-mono bg-secondary/10 text-secondary">
              +{AI_SPECIALISTS.length - 80} mais...
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticalEnginePage;
