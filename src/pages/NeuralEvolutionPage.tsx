import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LOTTERIES, AI_SPECIALISTS, getBrasiliaTime, formatBrasiliaHour } from '@/lib/lotteryConstants';
import { Brain, Zap, Clock, BarChart3, Target, Activity, TrendingUp, Cpu, Eye, Sparkles } from 'lucide-react';

const ACTIVE_MOTORS = [
  'MABSelector', 'DiffusionModel', 'PPOAgent', 'LFNeural15', 'TM10PickPro',
  'MegaPairAnalyzer', 'PredictionFusion', 'TMNeural10', 'MegaGapHunter', 'DSCorrelation',
  'BayesianNet', 'MarkovChain', 'NeuralFreq', 'TemporalGAN', 'CertusV2',
  'EntropyScanner', 'CorrelationNet', 'ReinforceLearner', 'AdaptiveFilter', 'EnsembleVoter',
];

interface AIWorkStatus {
  name: string;
  lottery: string;
  task: string;
  progress: number;
  cycles: number;
  patternsFound: number;
}

const TASKS = [
  'Frequência temporal', 'Gap analysis', 'Correlação cruzada', 'Hot/Cold mapping',
  'Cluster detection', 'Bayesian update', 'Markov transitions', 'Neural training',
  'Genetic evolution', 'Swarm optimization', 'Entropy scanning', 'Pattern locking',
];

function generateWorkStatuses(): AIWorkStatus[] {
  return AI_SPECIALISTS.slice(0, 24).map(name => ({
    name,
    lottery: LOTTERIES[Math.floor(Math.random() * LOTTERIES.length)].name,
    task: TASKS[Math.floor(Math.random() * TASKS.length)],
    progress: 20 + Math.random() * 80,
    cycles: Math.floor(100 + Math.random() * 5000),
    patternsFound: Math.floor(Math.random() * 50),
  }));
}

const NeuralEvolutionPage = () => {
  const [time, setTime] = useState(getBrasiliaTime());
  const [cycles, setCycles] = useState(1166);
  const [hours, setHours] = useState(0.97);
  const [patterns, setPatterns] = useState(109);
  const [domination, setDomination] = useState<Record<string, number>>({});
  const [workStatuses, setWorkStatuses] = useState<AIWorkStatus[]>(generateWorkStatuses());

  useEffect(() => {
    const interval = setInterval(() => setTime(getBrasiliaTime()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Simulate continuous learning - never retrocede
  useEffect(() => {
    const init: Record<string, number> = {};
    LOTTERIES.forEach(l => {
      init[l.id] = 49 + Math.random() * 3;
    });
    setDomination(init);

    const interval = setInterval(() => {
      setCycles(c => c + 1);
      setHours(h => parseFloat((h + 0.01).toFixed(2)));
      setPatterns(p => p + (Math.random() > 0.7 ? 1 : 0));
      setDomination(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => {
          const gain = Math.random() * 0.05;
          next[k] = Math.min(100, next[k] + gain);
        });
        return next;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Refresh work statuses
  useEffect(() => {
    const interval = setInterval(() => setWorkStatuses(generateWorkStatuses()), 5000);
    return () => clearInterval(interval);
  }, []);

  const avgDomination = Object.values(domination).length > 0
    ? (Object.values(domination).reduce((a, b) => a + b, 0) / Object.values(domination).length)
    : 50;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Brain className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Neural Evolution Engine</h1>
            <p className="text-muted-foreground text-sm">Auto-aprendizado 24/7 — Nunca para, sempre evolui — Gate: 100%</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 glass px-4 py-2 rounded-lg">
            <Clock className="w-4 h-4 text-primary" />
            <span className="font-mono text-sm text-primary">{formatBrasiliaHour(time)}</span>
            <span className="text-xs text-muted-foreground">BRT</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success/10 border border-success/30">
            <Activity className="w-4 h-4 text-success animate-pulse" />
            <span className="text-xs font-display font-bold text-success tracking-wider">LEARNING</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Ciclos Completos', value: cycles.toLocaleString('pt-BR'), icon: Zap, color: 'text-secondary' },
          { label: 'Horas de Análise', value: hours.toFixed(2), icon: Clock, color: 'text-primary' },
          { label: 'Padrões Descobertos', value: patterns.toString(), icon: Target, color: 'text-success' },
          { label: 'Domínio Médio', value: `${avgDomination.toFixed(2)}%`, icon: TrendingUp, color: 'text-warning' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass rounded-xl p-5"
          >
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
            <p className={`text-3xl font-mono font-bold ${stat.color}`}>{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* AI Work Monitor - The detailed panel */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Eye className="w-5 h-5 text-secondary" />
            <h2 className="text-lg font-display font-semibold">IAs Estudando, Trabalhando e Evoluindo</h2>
          </div>
          <span className="text-xs px-2 py-1 rounded-full bg-success/10 text-success font-mono animate-pulse">● LIVE</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto">
          {workStatuses.map((ws, i) => (
            <motion.div
              key={`${ws.name}-${i}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              className="bg-muted/20 rounded-lg p-3 border border-border/50 hover:border-primary/30 transition-all"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono text-primary font-bold">{ws.name}</span>
                <Sparkles className="w-3 h-3 text-warning animate-pulse" />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {ws.task} — <span className="text-foreground font-medium">{ws.lottery}</span>
              </p>
              <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden mt-2">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
                  initial={{ width: '0%' }}
                  animate={{ width: `${ws.progress}%` }}
                  transition={{ duration: 2 }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-muted-foreground">{ws.cycles} ciclos</span>
                <span className="text-[10px] text-success">{ws.patternsFound} padrões</span>
                <span className="text-[10px] text-primary">{ws.progress.toFixed(1)}%</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Active Motors */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <Cpu className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-display font-semibold">Motores Ativos Agora</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {ACTIVE_MOTORS.map((motor) => (
            <span
              key={motor}
              className="text-xs px-3 py-1.5 rounded-lg font-mono bg-muted/50 border border-border text-primary hover:bg-primary/10 transition-all cursor-default"
            >
              {motor}
            </span>
          ))}
        </div>
      </div>

      {/* Domination Bars */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-display font-semibold">Domínio por Loteria (Nunca Retrocede)</h2>
        </div>
        <div className="space-y-3">
          {LOTTERIES.map((lottery) => {
            const pct = domination[lottery.id] || 50;
            return (
              <div key={lottery.id} className="flex items-center gap-4">
                <div className="flex items-center gap-2 w-32 shrink-0">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: lottery.color }} />
                  <span className="text-sm text-foreground font-medium truncate">{lottery.name}</span>
                </div>
                <div className="flex-1 h-5 bg-muted/40 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: lottery.color }}
                    initial={{ width: '0%' }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 1 }}
                  />
                </div>
                <span className="text-sm font-mono w-16 text-right" style={{ color: lottery.color }}>
                  {pct.toFixed(2)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default NeuralEvolutionPage;
