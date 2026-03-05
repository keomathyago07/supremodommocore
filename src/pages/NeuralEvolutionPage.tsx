import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { LOTTERIES, AI_SPECIALISTS, getBrasiliaTime, formatBrasiliaHour } from '@/lib/lotteryConstants';
import { Brain, Zap, Clock, BarChart3, Target, Activity, TrendingUp, Cpu } from 'lucide-react';

const ACTIVE_MOTORS = [
  'MABSelector', 'DiffusionModel', 'PPOAgent', 'LFNeural15', 'TM10PickPro',
  'MegaPairAnalyzer', 'PredictionFusion', 'TMNeural10', 'MegaGapHunter', 'DSCorrelation',
  'BayesianNet', 'MarkovChain', 'NeuralFreq', 'TemporalGAN', 'CertusV2',
  'EntropyScanner', 'CorrelationNet', 'ReinforceLearner', 'AdaptiveFilter', 'EnsembleVoter',
];

const NeuralEvolutionPage = () => {
  const [time, setTime] = useState(getBrasiliaTime());
  const [cycles, setCycles] = useState(1166);
  const [hours, setHours] = useState(0.97);
  const [patterns, setPatterns] = useState(109);
  const [domination, setDomination] = useState<Record<string, number>>({});

  useEffect(() => {
    const interval = setInterval(() => setTime(getBrasiliaTime()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Simulate continuous learning
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
          // Always evolve forward, never retrocede
          const gain = Math.random() * 0.05;
          next[k] = Math.min(100, next[k] + gain);
        });
        return next;
      });
    }, 3000);
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
            <p className="text-muted-foreground text-sm">Sistema exclusivo de auto-aprendizado 24/7 — Nunca para, sempre evolui</p>
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

      {/* AI Specialists Working */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <Brain className="w-5 h-5 text-secondary" />
          <h2 className="text-lg font-display font-semibold">
            Especialistas em Operação ({AI_SPECIALISTS.length})
          </h2>
        </div>
        <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
          {AI_SPECIALISTS.map((ai) => (
            <span
              key={ai}
              className="text-[10px] px-1.5 py-0.5 rounded bg-primary/5 text-primary/60 font-mono hover:bg-primary/15 hover:text-primary transition-all"
            >
              {ai}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NeuralEvolutionPage;
