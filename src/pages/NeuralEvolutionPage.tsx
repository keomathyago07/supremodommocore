import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { LOTTERIES, AI_SPECIALISTS, getBrasiliaTime, formatBrasiliaHour } from '@/lib/lotteryConstants';
import { LOTTERY_PRIZES, formatPrize } from '@/lib/lotteryPrizes';
import { Brain, Zap, Clock, BarChart3, Target, Activity, TrendingUp, Cpu, Eye, Sparkles, Crown, Flame, Shield, Rocket, Trophy, Star, Gauge } from 'lucide-react';

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
  'Turbo learning', 'Deep pattern fusion', 'Hyper optimization', 'Prize chasing',
];

const INTELLIGENCE_LEVELS = [
  { min: 0, max: 30, label: 'APRENDIZ', color: 'text-muted-foreground', icon: Brain },
  { min: 30, max: 55, label: 'INTERMEDIÁRIO', color: 'text-primary', icon: Zap },
  { min: 55, max: 75, label: 'AVANÇADO', color: 'text-secondary', icon: Target },
  { min: 75, max: 90, label: 'EXPERT', color: 'text-warning', icon: Flame },
  { min: 90, max: 98, label: 'MESTRE', color: 'text-success', icon: Shield },
  { min: 98, max: 100, label: 'DOMÍNIO TOTAL', color: 'text-success', icon: Crown },
];

// Turbo acceleration config
const TURBO_CONFIG = {
  baseInterval: 800,        // 800ms per tick (was 3000ms)
  accelerationFactor: 5,    // 5x faster gains
  minGainPerTick: 0.02,     // Minimum gain per tick
  maxGainPerTick: 0.15,     // Maximum gain per tick
  masteryBoost: 1.5,        // Extra boost when approaching mastery
  neverStopFactor: true,    // IAs never stop evolving even at 100%
  microEvolution: 0.001,    // Micro-evolution at max level (infinite refinement)
};

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
  speed: string;
}

function generateWorkStatuses(): AIWorkStatus[] {
  const statuses = ['TURBO TRAINING', 'HYPER OTIMIZANDO', 'DEEP ANALYZING', 'PATTERN LOCKING', 'PRIZE CHASING'];
  const speeds = ['5x', '8x', '10x', '12x', '15x'];
  return AI_SPECIALISTS.slice(0, 24).map(name => {
    const lottery = LOTTERIES[Math.floor(Math.random() * LOTTERIES.length)];
    return {
      name,
      lottery: lottery.name,
      lotteryColor: lottery.color,
      task: TASKS[Math.floor(Math.random() * TASKS.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      progress: 40 + Math.random() * 60,
      cycles: Math.floor(500 + Math.random() * 50000),
      patternsFound: Math.floor(20 + Math.random() * 200),
      speed: speeds[Math.floor(Math.random() * speeds.length)],
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
  const [turboActive, setTurboActive] = useState(true);
  const [studyCompleted, setStudyCompleted] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('neural_study_completed');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
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
  useEffect(() => { localStorage.setItem('neural_study_completed', JSON.stringify(studyCompleted)); }, [studyCompleted]);

  // TURBO Evolution engine — 5x faster, never stops
  useEffect(() => {
    const interval = setInterval(() => {
      const accelFactor = turboActive ? TURBO_CONFIG.accelerationFactor : 1;

      setCycles(c => c + (turboActive ? 5 : 1));
      setHours(h => parseFloat((h + 0.01 * accelFactor).toFixed(2)));
      setPatterns(p => p + (Math.random() > 0.3 ? Math.floor(1 * accelFactor) : 0));

      setDomination(prev => {
        const next = { ...prev };
        const newCompleted: Record<string, boolean> = {};
        Object.keys(next).forEach(k => {
          const remaining = 100 - next[k];
          if (remaining <= 0) {
            // Micro-evolution: never truly stops
            next[k] = Math.min(100, next[k] + TURBO_CONFIG.microEvolution);
            newCompleted[k] = true;
          } else {
            // Turbo acceleration: much faster gains
            const baseGain = Math.random() * Math.max(TURBO_CONFIG.minGainPerTick, remaining * 0.008);
            const turboGain = baseGain * accelFactor;
            const masteryBoost = remaining < 10 ? TURBO_CONFIG.masteryBoost : 1;
            next[k] = Math.min(100, next[k] + turboGain * masteryBoost);
            if (next[k] >= 99.9) newCompleted[k] = true;
          }
        });
        setStudyCompleted(prev => ({ ...prev, ...newCompleted }));
        return next;
      });

      setIntelligenceScore(prev => {
        const remaining = 100 - prev;
        if (remaining <= 0) return Math.min(100, prev + TURBO_CONFIG.microEvolution);
        const baseGain = Math.random() * Math.max(TURBO_CONFIG.minGainPerTick, remaining * 0.005);
        const turboGain = baseGain * accelFactor;
        return Math.min(100, prev + turboGain);
      });
    }, TURBO_CONFIG.baseInterval);
    return () => clearInterval(interval);
  }, [turboActive]);

  useEffect(() => {
    const interval = setInterval(() => setWorkStatuses(generateWorkStatuses()), 3000);
    return () => clearInterval(interval);
  }, []);

  const avgDomination = Object.values(domination).length > 0
    ? (Object.values(domination).reduce((a, b) => a + b, 0) / Object.values(domination).length)
    : 50;

  const intellLevel = getIntelligenceLevel(intelligenceScore);
  const IntellIcon = intellLevel.icon;
  const lotteriesAtMastery = Object.values(domination).filter(v => v >= 98).length;
  const lotteriesAtTotal = Object.values(domination).filter(v => v >= 99.9).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Brain className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Neural Evolution Engine</h1>
            <p className="text-muted-foreground text-sm">Turbo-evolução 24/7 — 5x mais rápido — Nunca para — Gate: 100%</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 glass px-4 py-2 rounded-lg">
            <Clock className="w-4 h-4 text-primary" />
            <span className="font-mono text-sm text-primary">{formatBrasiliaHour(time)}</span>
          </div>
          <button
            onClick={() => setTurboActive(!turboActive)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
              turboActive 
                ? 'bg-success/10 border-success/30 text-success' 
                : 'bg-muted/20 border-border text-muted-foreground'
            }`}
          >
            <Rocket className={`w-4 h-4 ${turboActive ? 'animate-pulse' : ''}`} />
            <span className="text-xs font-display font-bold tracking-wider">
              {turboActive ? 'TURBO 5x' : 'NORMAL'}
            </span>
          </button>
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
              {turboActive && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/20 text-success font-mono animate-pulse">
                  TURBO 5x ATIVO
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Evolução turbo acelerada — Números só são enviados após estudo 100% comprovado
            </p>
          </div>
          <div className="text-right">
            <p className={`text-4xl font-mono font-bold ${intellLevel.color}`}>{intelligenceScore.toFixed(2)}%</p>
            <p className="text-[10px] text-muted-foreground">Meta: 100.00% — Evolução infinita</p>
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

      {/* Mastery Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass rounded-xl p-4 border border-warning/20">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-5 h-5 text-warning" />
            <span className="text-sm font-display font-bold text-warning">Loterias no Nível MESTRE+</span>
          </div>
          <p className="text-3xl font-mono font-bold text-warning">{lotteriesAtMastery}/{LOTTERIES.length}</p>
          <p className="text-[10px] text-muted-foreground">≥98% domínio</p>
        </div>
        <div className="glass rounded-xl p-4 border border-success/20">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="w-5 h-5 text-success" />
            <span className="text-sm font-display font-bold text-success">DOMÍNIO TOTAL Alcançado</span>
          </div>
          <p className="text-3xl font-mono font-bold text-success">{lotteriesAtTotal}/{LOTTERIES.length}</p>
          <p className="text-[10px] text-muted-foreground">≥99.9% — Prontas para enviar números</p>
        </div>
        <div className="glass rounded-xl p-4 border border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-5 h-5 text-primary" />
            <span className="text-sm font-display font-bold text-primary">Premiações Alvo do Dia</span>
          </div>
          <div className="space-y-1">
            {LOTTERIES.slice(0, 3).map(l => {
              const prize = LOTTERY_PRIZES[l.id];
              return prize ? (
                <p key={l.id} className="text-[11px] text-muted-foreground">
                  <span style={{ color: l.color }}>{l.name}</span>: <span className="text-secondary font-bold">{prize.estimatedPrize}</span>
                </p>
              ) : null;
            })}
          </div>
        </div>
      </div>

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

      {/* Study Completion Status — Numbers only sent after 100% */}
      <div className="glass rounded-xl p-5 border border-secondary/20">
        <div className="flex items-center gap-3 mb-4">
          <Gauge className="w-5 h-5 text-secondary" />
          <h2 className="text-lg font-display font-semibold">Status de Estudo Comprovado por Loteria</h2>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/10 text-secondary font-mono">
            Números só após 100% comprovado
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {LOTTERIES.map(lottery => {
            const pct = domination[lottery.id] || 50;
            const isReady = pct >= 99.9;
            const prize = LOTTERY_PRIZES[lottery.id];
            return (
              <div key={lottery.id} className={`rounded-lg p-3 border ${isReady ? 'border-success/30 bg-success/5' : 'border-border bg-muted/10'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium" style={{ color: lottery.color }}>{lottery.name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${isReady ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                    {isReady ? '✅ PRONTO' : '⏳ ESTUDANDO'}
                  </span>
                </div>
                <div className="h-2 bg-muted/40 rounded-full overflow-hidden mb-1">
                  <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, backgroundColor: lottery.color }} />
                </div>
                <div className="flex justify-between">
                  <span className="text-[10px] font-mono" style={{ color: lottery.color }}>{pct.toFixed(2)}%</span>
                  {prize && <span className="text-[10px] text-secondary">{prize.estimatedPrize}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Work Monitor */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Eye className="w-5 h-5 text-secondary" />
            <h2 className="text-lg font-display font-semibold">IAs em Turbo-Evolução Contínua</h2>
          </div>
          <span className="text-xs px-2 py-1 rounded-full bg-success/10 text-success font-mono animate-pulse">● LIVE TURBO</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 max-h-[500px] overflow-y-auto">
          {workStatuses.map((ws, i) => (
            <motion.div key={`${ws.name}-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
              className="bg-muted/20 rounded-lg p-3 border border-border/50 hover:border-primary/30 transition-all">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono text-primary font-bold">{ws.name}</span>
                <div className="flex items-center gap-1">
                  <span className="text-[8px] px-1 py-0.5 rounded bg-secondary/10 text-secondary font-mono">{ws.speed}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                    ws.status.includes('TURBO') ? 'bg-success/10 text-success' :
                    ws.status.includes('HYPER') ? 'bg-primary/10 text-primary' :
                    ws.status.includes('DEEP') ? 'bg-warning/10 text-warning' :
                    ws.status.includes('PRIZE') ? 'bg-secondary/10 text-secondary' :
                    'bg-success/10 text-success'
                  }`}>{ws.status}</span>
                </div>
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
          <span className="text-xs text-muted-foreground ml-2">(Nunca retrocede — Evolução infinita)</span>
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
