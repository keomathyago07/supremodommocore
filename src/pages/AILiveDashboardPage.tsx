import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AI_SPECIALISTS, LOTTERIES, getBrasiliaTime, formatBrasiliaHour, getTodaysLotteries } from '@/lib/lotteryConstants';
import {
  Brain, Activity, Cpu, Zap, Target, TrendingUp, Eye, Sparkles, Clock,
  BarChart3, Bug, Search, Shield, Flame, Snowflake, GitBranch, Layers
} from 'lucide-react';

// ─── Types ───
interface AIWorker {
  name: string;
  category: string;
  lottery: string;
  task: string;
  progress: number;
  cycles: number;
  patternsFound: number;
  accuracy: number;
  status: 'training' | 'analyzing' | 'optimizing' | 'idle';
  lastDiscovery: string;
}

interface CategoryStats {
  name: string;
  icon: typeof Brain;
  color: string;
  count: number;
  avgAccuracy: number;
  totalPatterns: number;
  totalCycles: number;
}

// ─── Constants ───
const CATEGORIES = [
  { name: 'Neural Networks', range: [0, 20], icon: Brain, color: 'text-primary' },
  { name: 'Statistical Analysis', range: [20, 40], icon: BarChart3, color: 'text-secondary' },
  { name: 'Optimization', range: [40, 70], icon: Zap, color: 'text-success' },
  { name: 'Deep Learning', range: [70, 100], icon: Layers, color: 'text-warning' },
  { name: 'Meta-Heuristics', range: [100, 135], icon: GitBranch, color: 'text-primary' },
  { name: 'Advanced Optimization', range: [135, 155], icon: Cpu, color: 'text-secondary' },
];

const TASKS = [
  'Frequência temporal', 'Gap analysis', 'Correlação cruzada', 'Hot/Cold mapping',
  'Cluster detection', 'Bayesian update', 'Markov transitions', 'Neural training',
  'Genetic evolution', 'Swarm optimization', 'Entropy scanning', 'Pattern locking',
  'Backpropagation', 'Weight tuning', 'Feature extraction', 'Anomaly detection',
  'Sequence prediction', 'Distribution fitting', 'Cross-validation', 'Ensemble voting',
];

const STATUSES: AIWorker['status'][] = ['training', 'analyzing', 'optimizing', 'idle'];
const STATUS_COLORS: Record<string, string> = {
  training: 'text-primary', analyzing: 'text-secondary', optimizing: 'text-success', idle: 'text-muted-foreground'
};
const STATUS_LABELS: Record<string, string> = {
  training: 'TREINANDO', analyzing: 'ANALISANDO', optimizing: 'OTIMIZANDO', idle: 'STANDBY'
};

// ─── Worker Generator ───
function generateWorkers(): AIWorker[] {
  const todayLotteries = getTodaysLotteries();
  const lotteries = todayLotteries.length > 0 ? todayLotteries : LOTTERIES;

  return AI_SPECIALISTS.map((name, i) => {
    const catIdx = CATEGORIES.findIndex(c => i >= c.range[0] && i < c.range[1]);
    return {
      name,
      category: CATEGORIES[catIdx]?.name || 'Advanced',
      lottery: lotteries[Math.floor(Math.random() * lotteries.length)].name,
      task: TASKS[Math.floor(Math.random() * TASKS.length)],
      progress: 15 + Math.random() * 85,
      cycles: Math.floor(500 + Math.random() * 10000),
      patternsFound: Math.floor(Math.random() * 80),
      accuracy: 85 + Math.random() * 15,
      status: STATUSES[Math.floor(Math.random() * 3)] as AIWorker['status'], // rarely idle
      lastDiscovery: `Padrão #${Math.floor(Math.random() * 9999)}`,
    };
  });
}

// ─── Sub-Components ───
const StatCard = ({ label, value, icon: Icon, color }: { label: string; value: string; icon: typeof Brain; color: string }) => (
  <div className="glass rounded-xl p-4">
    <div className="flex items-center gap-2 mb-1">
      <Icon className={`w-4 h-4 ${color}`} />
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
    <p className={`text-2xl lg:text-3xl font-mono font-bold ${color}`}>{value}</p>
  </div>
);

const WorkerCard = ({ worker }: { worker: AIWorker }) => (
  <motion.div
    layout
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="bg-muted/20 rounded-lg p-3 border border-border/50 hover:border-primary/40 transition-all group"
  >
    <div className="flex items-center justify-between mb-1">
      <span className="text-xs font-mono text-primary font-bold truncate">{worker.name}</span>
      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${STATUS_COLORS[worker.status]} bg-muted/60`}>
        {STATUS_LABELS[worker.status]}
      </span>
    </div>
    <p className="text-[11px] text-muted-foreground truncate">
      {worker.task} — <span className="text-foreground font-medium">{worker.lottery}</span>
    </p>
    <div className="h-1 bg-muted/40 rounded-full overflow-hidden mt-2">
      <motion.div
        className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
        initial={{ width: '0%' }}
        animate={{ width: `${worker.progress}%` }}
        transition={{ duration: 1.5 }}
      />
    </div>
    <div className="flex justify-between mt-1 text-[10px]">
      <span className="text-muted-foreground">{worker.cycles.toLocaleString('pt-BR')} ciclos</span>
      <span className="text-success">{worker.patternsFound} padrões</span>
      <span className="text-primary font-bold">{worker.accuracy.toFixed(1)}%</span>
    </div>
  </motion.div>
);

const CategorySection = ({ cat, workers }: { cat: typeof CATEGORIES[0]; workers: AIWorker[] }) => {
  const catWorkers = workers.slice(cat.range[0], cat.range[1]);
  const avgAcc = catWorkers.reduce((s, w) => s + w.accuracy, 0) / catWorkers.length;
  const totalPatterns = catWorkers.reduce((s, w) => s + w.patternsFound, 0);
  const activeCount = catWorkers.filter(w => w.status !== 'idle').length;

  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <cat.icon className={`w-5 h-5 ${cat.color}`} />
          <h3 className="font-display font-semibold text-sm">{cat.name}</h3>
          <span className="text-xs text-muted-foreground">({catWorkers.length} IAs)</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-success">{activeCount} ativas</span>
          <span className={cat.color}>{avgAcc.toFixed(1)}% acc</span>
          <span className="text-secondary">{totalPatterns} padrões</span>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
        {catWorkers.map((w) => (
          <WorkerCard key={w.name} worker={w} />
        ))}
      </div>
    </div>
  );
};

// ─── Main Page ───
const AILiveDashboardPage = () => {
  const [time, setTime] = useState(getBrasiliaTime());
  const [workers, setWorkers] = useState<AIWorker[]>(generateWorkers);
  const [totalCycles, setTotalCycles] = useState(0);
  const [totalPatterns, setTotalPatterns] = useState(0);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  // Clock
  useEffect(() => {
    const i = setInterval(() => setTime(getBrasiliaTime()), 1000);
    return () => clearInterval(i);
  }, []);

  // Simulate continuous work
  useEffect(() => {
    const interval = setInterval(() => {
      setWorkers(prev => prev.map(w => ({
        ...w,
        progress: Math.min(100, w.progress + Math.random() * 2),
        cycles: w.cycles + Math.floor(Math.random() * 5),
        patternsFound: w.patternsFound + (Math.random() > 0.85 ? 1 : 0),
        accuracy: Math.min(100, w.accuracy + Math.random() * 0.02),
        task: Math.random() > 0.95 ? TASKS[Math.floor(Math.random() * TASKS.length)] : w.task,
        status: Math.random() > 0.97 ? STATUSES[Math.floor(Math.random() * 3)] as AIWorker['status'] : w.status,
      })));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Aggregate stats
  useEffect(() => {
    setTotalCycles(workers.reduce((s, w) => s + w.cycles, 0));
    setTotalPatterns(workers.reduce((s, w) => s + w.patternsFound, 0));
  }, [workers]);

  const activeCount = workers.filter(w => w.status !== 'idle').length;
  const avgAccuracy = workers.reduce((s, w) => s + w.accuracy, 0) / workers.length;
  const todayLotteries = getTodaysLotteries();

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Eye className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-xl lg:text-2xl font-display font-bold">Painel Neural Live</h1>
            <p className="text-xs text-muted-foreground">
              {AI_SPECIALISTS.length} IAs trabalhando, estudando e evoluindo — 24/7 — Gate: 100%
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="glass px-3 py-1.5 rounded-lg flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span className="font-mono text-xs text-primary">{formatBrasiliaHour(time)}</span>
          </div>
          <div className="px-2.5 py-1.5 rounded-lg bg-success/10 border border-success/30 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-success animate-pulse" />
            <span className="text-[10px] font-display font-bold text-success tracking-widest">ONLINE 24/7</span>
          </div>
        </div>
      </div>

      {/* Today's lotteries */}
      {todayLotteries.length > 0 && (
        <div className="glass rounded-lg p-3 flex items-center gap-2 flex-wrap">
          <Flame className="w-4 h-4 text-secondary shrink-0" />
          <span className="text-xs text-secondary font-semibold">Foco hoje:</span>
          {todayLotteries.map(l => (
            <span key={l.id} className="text-xs px-2 py-0.5 rounded-full font-mono" style={{ backgroundColor: l.color + '20', color: l.color }}>
              {l.name}
            </span>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="IAs Ativas" value={`${activeCount}/${AI_SPECIALISTS.length}`} icon={Brain} color="text-primary" />
        <StatCard label="Ciclos Totais" value={totalCycles.toLocaleString('pt-BR')} icon={Zap} color="text-secondary" />
        <StatCard label="Padrões Descobertos" value={totalPatterns.toLocaleString('pt-BR')} icon={Target} color="text-success" />
        <StatCard label="Precisão Média" value={`${avgAccuracy.toFixed(2)}%`} icon={TrendingUp} color="text-warning" />
        <StatCard label="Loterias Hoje" value={todayLotteries.length.toString()} icon={Flame} color="text-primary" />
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterCategory(null)}
          className={`text-xs px-3 py-1.5 rounded-lg font-display transition-all ${!filterCategory ? 'gradient-primary text-primary-foreground' : 'glass text-muted-foreground hover:text-foreground'}`}
        >
          Todas ({AI_SPECIALISTS.length})
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat.name}
            onClick={() => setFilterCategory(filterCategory === cat.name ? null : cat.name)}
            className={`text-xs px-3 py-1.5 rounded-lg font-display transition-all ${filterCategory === cat.name ? 'gradient-primary text-primary-foreground' : 'glass text-muted-foreground hover:text-foreground'}`}
          >
            {cat.name} ({cat.range[1] - cat.range[0]})
          </button>
        ))}
      </div>

      {/* Live Workers Grid by Category */}
      <div className="space-y-4">
        {CATEGORIES
          .filter(cat => !filterCategory || filterCategory === cat.name)
          .map(cat => (
            <CategorySection key={cat.name} cat={cat} workers={workers} />
          ))
        }
      </div>

      {/* Global Performance Bar */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <Shield className="w-5 h-5 text-success" />
          <h3 className="font-display font-semibold text-sm">Domínio Global por Loteria</h3>
        </div>
        <div className="space-y-2">
          {LOTTERIES.map(lottery => {
            const lotteryWorkers = workers.filter(w => w.lottery === lottery.name);
            const pct = lotteryWorkers.length > 0
              ? lotteryWorkers.reduce((s, w) => s + w.accuracy, 0) / lotteryWorkers.length
              : 90 + Math.random() * 10;
            return (
              <div key={lottery.id} className="flex items-center gap-3">
                <div className="flex items-center gap-2 w-28 shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: lottery.color }} />
                  <span className="text-xs text-foreground truncate">{lottery.name}</span>
                </div>
                <div className="flex-1 h-3 bg-muted/40 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: lottery.color }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 1 }}
                  />
                </div>
                <span className="text-xs font-mono w-14 text-right" style={{ color: lottery.color }}>{pct.toFixed(1)}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AILiveDashboardPage;
