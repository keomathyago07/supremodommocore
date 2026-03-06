import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { LOTTERIES, AI_SPECIALISTS, getBrasiliaTime, formatBrasiliaHour } from '@/lib/lotteryConstants';
import { LOTTERY_PRIZES, formatPrize } from '@/lib/lotteryPrizes';
import { Brain, Zap, Clock, BarChart3, Target, Activity, TrendingUp, Cpu, Eye, Sparkles, Crown, Flame, Shield, Rocket } from 'lucide-react';

const ACTIVE_MOTORS = [
  'MABSelector', 'DiffusionModel', 'PPOAgent', 'LFNeural15', 'TM10PickPro',
  'MegaPairAnalyzer', 'PredictionFusion', 'TMNeural10', 'MegaGapHunter', 'DSCorrelation',
  'BayesianNet', 'MarkovChain', 'NeuralFreq', 'TemporalGAN', 'CertusV2',
  'EntropyScanner', 'CorrelationNet', 'ReinforceLearner', 'AdaptiveFilter', 'EnsembleVoter',
];

const TASKS = [
  'Frequência temporal', 'Gap analysis', 'Correlação cruzada', 'Hot/Cold mapping',
  'Cluster detection', 'Bayesian update', 'Markov transitions', 'Neural training',
  'Genetic evolution', 'Swarm optimization', 'Entropy scanning', 'Pattern locking',
  'Sequence prediction', 'Backpropagation', 'Reinforcement cycle', 'Monte Carlo sim',
];

const INTELLIGENCE_LEVELS = [
  { min: 0, max: 30, label: 'APRENDIZ', color: 'text-muted-foreground', icon: Brain },
  { min: 30, max: 55, label: 'INTERMEDIÁRIO', color: 'text-primary', icon: Zap },
  { min: 55, max: 75, label: 'AVANÇADO', color: 'text-secondary', icon: Target },
  { min: 75, max: 90, label: 'EXPERT', color: 'text-warning', icon: Flame },
  { min: 90, max: 98, label: 'MESTRE', color: 'text-success', icon: Shield },
  { min: 98, max: 100, label: 'DOMÍNIO TOTAL', color: 'text-success', icon: Crown },
];

function getIntelligenceLevel(pct: number) {
  return INTELLIGENCE_LEVELS.find(l => pct >= l.min && pct < l.max) || INTELLIGENCE_LEVELS[INTELLIGENCE_LEVELS.length - 1];
}

interface AIWorkStatus {
  name: string;
  lottery: string;
  lotteryColor: string;
  task: string;
  status: string;
  progress: number;
  cycles: number;
  patternsFound: number;
}

function generateWorkStatuses(): AIWorkStatus[] {
  const statuses = ['TREINANDO', 'OTIMIZANDO', 'ANALISANDO'];
  return AI_SPECIALISTS.slice(0, 24).map(name => {
    const lottery = LOTTERIES[Math.floor(Math.random() * LOTTERIES.length)];
    return {
      name,
      lottery: lottery.name,
      lotteryColor: lottery.color,
      task: TASKS[Math.floor(Math.random() * TASKS.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      progress: 20 + Math.random() * 80,
      cycles: Math.floor(100 + Math.random() * 10000),
      patternsFound: Math.floor(Math.random() * 80),
    };
  });
}

const NeuralEvolutionPage = () => {
  const [time, setTime] = useState(getBrasiliaTime());
  const [cycles, setCycles] = useState(() => {
    try { return Number(localStorage.getItem('neural_cycles')) || 1166; } catch { return 1166; }
  });
  const [hours, setHours] = useState(() => {
    try { return Number(localStorage.getItem('neural_hours')) || 0.97; } catch { return 0.97; }
  });
  const [patterns, setPatterns] = useState(() => {
    try { return Number(localStorage.getItem('neural_patterns')) || 109; } catch { return 109; }
  });
  const [domination, setDomination] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('neural_domination');
      if (saved) return JSON.parse(saved);
    } catch {}
    const init: Record<string, number> = {};
    LOTTERIES.forEach(l => { init[l.id] = 49 + Math.random() * 3; });
    return init;
  });
  const [workStatuses, setWorkStatuses] = useState<AIWorkStatus[]>(generateWorkStatuses());
  const [intelligenceScore, setIntelligenceScore] = useState(() => {
    try { return Number(localStorage.getItem('neural_intelligence')) || 45; } catch { return 45; }
  });

  useEffect(() => {
    const interval = setInterval(() => setTime(getBrasiliaTime()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Persist state
  useEffect(() => { localStorage.setItem('neural_cycles', String(cycles)); }, [cycles]);
  useEffect(() => { localStorage.setItem('neural_hours', String(hours)); }, [hours]);
  useEffect(() => { localStorage.setItem('neural_patterns', String(patterns)); }, [patterns]);
  useEffect(() => { localStorage.setItem('neural_domination', JSON.stringify(domination)); }, [domination]);
  useEffect(() => { localStorage.setItem('neural_intelligence', String(intelligenceScore)); }, [intelligenceScore]);

  // Evolution engine — never retrocede
  useEffect(() => {
    const interval = setInterval(() => {
      setCycles(c => c + 1);
      setHours(h => parseFloat((h + 0.01).toFixed(2)));
      setPatterns(p => p + (Math.random() > 0.6 ? 1 : 0));
      setDomination(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => {
          // Accelerated learning: faster when lower, slower near 100
          const remaining = 100 - next[k];
          const gain = Math.random() * Math.max(0.01, remaining * 0.003);
          next[k] = Math.min(100, next[k] + gain);
        });
        return next;
      });
      setIntelligenceScore(prev => {
        const remaining = 100 - prev;
        const gain = Math.random() * Math.max(0.005, remaining * 0.002);
        return Math.min(100, prev + gain);
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setWorkStatuses(generateWorkStatuses()), 5000);
    return () => clearInterval(interval);
  }, []);

  const avgDomination = Object.values(domination).length > 0
    ? (Object.values(domination).reduce((a, b) => a + b, 0) / Object.values(domination).length)
    : 50;

  const intellLevel = getIntelligenceLevel(intelligenceScore);
  const IntellIcon = intellLevel.icon;

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
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success/10 border border-success/30">
            <Activity className="w-4 h-4 text-success animate-pulse" />
            <span className="text-xs font-display font-bold text-success tracking-wider">LEARNING</span>
          </div>
        </div>
      </div>

      {/* Intelligence Level Card */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass rounded-xl p-6 border border-primary/30">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
            <IntellIcon className={`w-8 h-8 ${intellLevel.color}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="font-display font-bold text-xl text-foreground">Nível de Inteligência Global</h2>
              <span className={`text-xs px-3 py-1 rounded-full font-display font-bold ${intellLevel.color} bg-muted/30 border border-current/20`}>
                {intellLevel.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">As IAs evoluem continuamente até alcançar domínio total de todas as loterias</p>
          </div>
          <div className="text-right">
            <p className={`text-4xl font-mono font-bold ${intellLevel.color}`}>{intelligenceScore.toFixed(2)}%</p>
            <p className="text-[10px] text-muted-foreground">Meta: 100.00%</p>
          </div>
        </div>
        <div className="h-4 bg-muted/40 rounded-full overflow-hidden">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-primary via-secondary to-success"
            initial={{ width: '0%' }} animate={{ width: `${intelligenceScore}%` }} transition={{ duration: 2 }} />
        </div>
        <div className="flex justify-between mt-2">
          {INTELLIGENCE_LEVELS.map(l => (
            <span key={l.label} className={`text-[9px] ${intelligenceScore >= l.min ? l.color : 'text-muted-foreground/30'}`}>
              {l.label}
            </span>
          ))}
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Ciclos', value: cycles.toLocaleString('pt-BR'), icon: Zap, color: 'text-secondary' },
          { label: 'Horas', value: hours.toFixed(2), icon: Clock, color: 'text-primary' },
          { label: 'Padrões', value: patterns.toString(), icon: Target, color: 'text-success' },
          { label: 'Domínio Médio', value: `${avgDomination.toFixed(2)}%`, icon: TrendingUp, color: 'text-warning' },
          { label: 'IAs Ativas', value: AI_SPECIALISTS.length.toString(), icon: Rocket, color: 'text-primary' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-[10px] text-muted-foreground">{stat.label}</span>
            </div>
            <p className={`text-2xl font-mono font-bold ${stat.color}`}>{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* AI Work Monitor */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Eye className="w-5 h-5 text-secondary" />
            <h2 className="text-lg font-display font-semibold">IAs Estudando, Trabalhando e Evoluindo</h2>
          </div>
          <span className="text-xs px-2 py-1 rounded-full bg-success/10 text-success font-mono animate-pulse">● LIVE</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 max-h-[500px] overflow-y-auto">
          {workStatuses.map((ws, i) => (
            <motion.div key={`${ws.name}-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
              className="bg-muted/20 rounded-lg p-3 border border-border/50 hover:border-primary/30 transition-all">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono text-primary font-bold">{ws.name}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                  ws.status === 'TREINANDO' ? 'bg-warning/10 text-warning' :
                  ws.status === 'OTIMIZANDO' ? 'bg-primary/10 text-primary' :
                  'bg-success/10 text-success'
                }`}>{ws.status}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {ws.task} — <span className="font-medium" style={{ color: ws.lotteryColor }}>{ws.lottery}</span>
              </p>
              <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden mt-2">
                <motion.div className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
                  initial={{ width: '0%' }} animate={{ width: `${ws.progress}%` }} transition={{ duration: 2 }} />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-muted-foreground">{ws.cycles.toLocaleString()} ciclos</span>
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
          {ACTIVE_MOTORS.map(motor => (
            <span key={motor} className="text-xs px-3 py-1.5 rounded-lg font-mono bg-muted/50 border border-border text-primary hover:bg-primary/10 transition-all cursor-default">
              {motor}
            </span>
          ))}
        </div>
      </div>

      {/* Domination Bars per Lottery */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-display font-semibold">Domínio Global por Loteria</h2>
          <span className="text-xs text-muted-foreground ml-2">(Nunca retrocede)</span>
        </div>
        <div className="space-y-3">
          {LOTTERIES.map(lottery => {
            const pct = domination[lottery.id] || 50;
            const prize = LOTTERY_PRIZES[lottery.id];
            const level = getIntelligenceLevel(pct);
            return (
              <div key={lottery.id} className="flex items-center gap-3">
                <div className="flex items-center gap-2 w-28 shrink-0">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: lottery.color }} />
                  <span className="text-sm text-foreground font-medium truncate">{lottery.name}</span>
                </div>
                <div className="flex-1 h-5 bg-muted/40 rounded-full overflow-hidden">
                  <motion.div className="h-full rounded-full" style={{ backgroundColor: lottery.color }}
                    initial={{ width: '0%' }} animate={{ width: `${pct}%` }} transition={{ duration: 1 }} />
                </div>
                <span className="text-sm font-mono w-16 text-right" style={{ color: lottery.color }}>{pct.toFixed(1)}%</span>
                <span className={`text-[9px] w-20 text-center ${level.color}`}>{level.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default NeuralEvolutionPage;
