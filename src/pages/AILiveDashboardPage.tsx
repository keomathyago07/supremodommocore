import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AI_SPECIALISTS, LOTTERIES, getBrasiliaTime, formatBrasiliaHour, getTodaysLotteries } from '@/lib/lotteryConstants';
import { LOTTERY_PRIZES, formatPrize } from '@/lib/lotteryPrizes';
import { useAutoAnalysis } from '@/hooks/useAutoAnalysis';
import {
  Brain, Activity, Cpu, Zap, Target, TrendingUp, Eye, Clock,
  BarChart3, Shield, Flame, Layers, GitBranch, Rocket, Trophy, Crown, Gauge,
  RefreshCw, Wifi, Database, ArrowUpCircle, Sparkles
} from 'lucide-react';

interface AIWorker {
  name: string;
  category: string;
  lottery: string;
  lotteryColor: string;
  task: string;
  progress: number;
  cycles: number;
  patternsFound: number;
  accuracy: number;
  status: 'training' | 'analyzing' | 'optimizing' | 'turbo_100x';
  lastDiscovery: string;
}

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
  'Turbo learning 100x', 'Infinite evolution ∞', 'Prize hunt max', 'API sync adapt',
];

const STATUSES: AIWorker['status'][] = ['training', 'analyzing', 'optimizing', 'turbo_100x'];
const STATUS_COLORS: Record<string, string> = {
  training: 'text-primary', analyzing: 'text-secondary', optimizing: 'text-success', turbo_100x: 'text-success'
};
const STATUS_LABELS: Record<string, string> = {
  training: 'TREINANDO', analyzing: 'ANALISANDO', optimizing: 'OTIMIZANDO', turbo_100x: 'TURBO 100x'
};

function generateWorkers(): AIWorker[] {
  const todayLotteries = getTodaysLotteries();
  const lotteries = todayLotteries.length > 0 ? todayLotteries : LOTTERIES;
  return AI_SPECIALISTS.map((name, i) => {
    const catIdx = CATEGORIES.findIndex(c => i >= c.range[0] && i < c.range[1]);
    const lottery = lotteries[Math.floor(Math.random() * lotteries.length)];
    return {
      name,
      category: CATEGORIES[catIdx]?.name || 'Advanced',
      lottery: lottery.name,
      lotteryColor: lottery.color,
      task: TASKS[Math.floor(Math.random() * TASKS.length)],
      progress: 15 + Math.random() * 85,
      cycles: Math.floor(1000 + Math.random() * 50000),
      patternsFound: Math.floor(Math.random() * 200),
      accuracy: 90 + Math.random() * 10,
      status: STATUSES[Math.floor(Math.random() * STATUSES.length)],
      lastDiscovery: `Padrão #${Math.floor(Math.random() * 9999)}`,
    };
  });
}

const StatCard = ({ label, value, icon: Icon, color, sub }: { label: string; value: string; icon: typeof Brain; color: string; sub?: string }) => (
  <div className="glass rounded-xl p-4">
    <div className="flex items-center gap-2 mb-1">
      <Icon className={`w-4 h-4 ${color}`} />
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
    <p className={`text-2xl lg:text-3xl font-mono font-bold ${color}`}>{value}</p>
    {sub && <p className="text-[9px] text-muted-foreground mt-0.5">{sub}</p>}
  </div>
);

const WorkerCard = ({ worker }: { worker: AIWorker }) => (
  <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
    className="bg-muted/20 rounded-lg p-3 border border-border/50 hover:border-primary/40 transition-all">
    <div className="flex items-center justify-between mb-1">
      <span className="text-xs font-mono text-primary font-bold truncate">{worker.name}</span>
      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${STATUS_COLORS[worker.status]} bg-muted/60`}>
        {STATUS_LABELS[worker.status]}
      </span>
    </div>
    <p className="text-[11px] text-muted-foreground truncate">
      {worker.task} — <span className="font-medium" style={{ color: worker.lotteryColor }}>{worker.lottery}</span>
    </p>
    <div className="h-1 bg-muted/40 rounded-full overflow-hidden mt-2">
      <motion.div className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
        initial={{ width: '0%' }} animate={{ width: `${worker.progress}%` }} transition={{ duration: 1.5 }} />
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
  const activeCount = catWorkers.filter(w => w.status !== 'turbo_100x').length;

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
        {catWorkers.map((w) => <WorkerCard key={w.name} worker={w} />)}
      </div>
    </div>
  );
};

const AILiveDashboardPage = () => {
  const auto = useAutoAnalysis();
  const [time, setTime] = useState(getBrasiliaTime());
  const [workers, setWorkers] = useState<AIWorker[]>(generateWorkers);
  const [totalCycles, setTotalCycles] = useState(0);
  const [totalPatterns, setTotalPatterns] = useState(0);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  useEffect(() => {
    const i = setInterval(() => setTime(getBrasiliaTime()), 1000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setWorkers(prev => prev.map(w => ({
        ...w,
        progress: Math.min(100, w.progress + Math.random() * 3),
        cycles: w.cycles + Math.floor(Math.random() * 10),
        patternsFound: w.patternsFound + (Math.random() > 0.8 ? 1 : 0),
        accuracy: Math.min(100, w.accuracy + Math.random() * 0.05),
        task: Math.random() > 0.95 ? TASKS[Math.floor(Math.random() * TASKS.length)] : w.task,
        status: Math.random() > 0.95 ? STATUSES[Math.floor(Math.random() * STATUSES.length)] : w.status,
      })));
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setTotalCycles(workers.reduce((s, w) => s + w.cycles, 0));
    setTotalPatterns(workers.reduce((s, w) => s + w.patternsFound, 0));
  }, [workers]);

  const activeCount = workers.filter(w => w.status !== 'turbo_100x').length;
  const avgAccuracy = workers.reduce((s, w) => s + w.accuracy, 0) / workers.length;
  const todayLotteries = getTodaysLotteries();

  let neuralDom: Record<string, number> = {};
  let neuralPrec: Record<string, number> = {};
  try { neuralDom = JSON.parse(localStorage.getItem('neural_domination') || '{}'); } catch {}
  try { neuralPrec = JSON.parse(localStorage.getItem('neural_precision') || '{}'); } catch {}
  const avgDom = Object.values(neuralDom).length > 0 ? Object.values(neuralDom).reduce((a, b) => a + b, 0) / Object.values(neuralDom).length : 50;
  const avgPrec = Object.values(neuralPrec).length > 0 ? Object.values(neuralPrec).reduce((a, b) => a + b, 0) / Object.values(neuralPrec).length : 85;

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Eye className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-xl lg:text-2xl font-display font-bold">Painel Neural Live — TURBO 100x</h1>
            <p className="text-xs text-muted-foreground">
              {AI_SPECIALISTS.length} IAs · Auto-Adaptação + Sincronização API · Gate: 100%
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="glass px-3 py-1.5 rounded-lg flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span className="font-mono text-xs text-primary">{formatBrasiliaHour(time)}</span>
          </div>
          <div className="px-2.5 py-1.5 rounded-lg bg-success/10 border border-success/30 flex items-center gap-1.5">
            <Rocket className="w-3.5 h-3.5 text-success animate-pulse" />
            <span className="text-[10px] font-display font-bold text-success tracking-widest">TURBO 100x</span>
          </div>
        </div>
      </div>

      {/* API Sync + Self-Adapt Dashboard */}
      <div className="glass rounded-xl p-4 border border-secondary/30 bg-secondary/5">
        <div className="flex items-center gap-3 mb-3">
          <RefreshCw className={`w-5 h-5 text-secondary ${auto.globalApiSyncStatus !== 'SINCRONIZADO' ? 'animate-spin' : ''}`} />
          <h3 className="font-display font-bold text-sm">Dashboard IA — Auto-Adaptação + Sincronização API</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/10 text-success font-mono animate-pulse ml-auto">● LIVE</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="rounded-lg p-3 bg-muted/10 border border-border">
            <div className="flex items-center gap-1.5 mb-1">
              <Wifi className="w-3.5 h-3.5 text-success" />
              <span className="text-[10px] text-muted-foreground">Status API</span>
            </div>
            <p className="text-xs font-mono font-bold text-success">{auto.globalApiSyncStatus}</p>
          </div>
          <div className="rounded-lg p-3 bg-muted/10 border border-border">
            <div className="flex items-center gap-1.5 mb-1">
              <ArrowUpCircle className="w-3.5 h-3.5 text-secondary" />
              <span className="text-[10px] text-muted-foreground">Auto-Adaptações</span>
            </div>
            <p className="text-xs font-mono font-bold text-secondary">{auto.globalSelfAdaptCount.toLocaleString('pt-BR')}</p>
          </div>
          <div className="rounded-lg p-3 bg-muted/10 border border-border">
            <div className="flex items-center gap-1.5 mb-1">
              <Database className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] text-muted-foreground">Gates Salvos DB</span>
            </div>
            <p className="text-xs font-mono font-bold text-primary">{auto.gatesFound}</p>
          </div>
          <div className="rounded-lg p-3 bg-muted/10 border border-border">
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-warning" />
              <span className="text-[10px] text-muted-foreground">Ciclos Globais</span>
            </div>
            <p className="text-xs font-mono font-bold text-warning">{auto.cycleCount.toLocaleString('pt-BR')}</p>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">
          O sistema monitora todos os comportamentos da API, detecta mudanças de padrão e se auto-adapta automaticamente sem intervenção humana.
        </p>
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
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        <StatCard label="IAs Ativas" value={`${activeCount}/${AI_SPECIALISTS.length}`} icon={Brain} color="text-primary" />
        <StatCard label="Ciclos Totais" value={totalCycles.toLocaleString('pt-BR')} icon={Zap} color="text-secondary" />
        <StatCard label="Padrões" value={totalPatterns.toLocaleString('pt-BR')} icon={Target} color="text-success" />
        <StatCard label="Precisão IAs" value={`${avgAccuracy.toFixed(2)}%`} icon={TrendingUp} color="text-warning" />
        <StatCard label="Domínio Global" value={`${avgDom.toFixed(1)}%`} icon={Crown} color="text-success" sub="Meta: 1000%" />
        <StatCard label="Precisão Neural" value={`${avgPrec.toFixed(1)}%`} icon={Gauge} color="text-secondary" sub="Meta: 1000%" />
        <StatCard label="Loterias Hoje" value={todayLotteries.length.toString()} icon={Flame} color="text-primary" />
      </div>

      {/* Detailed per-lottery analysis — ANÁLISE GLOBAL ATIVA */}
      <div className="glass rounded-xl p-5 border border-primary/30">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="w-5 h-5 text-primary animate-pulse" />
          <h3 className="font-display font-bold text-sm">ANÁLISE GLOBAL ATIVA — Detalhamento por Loteria</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/10 text-success font-mono animate-pulse ml-auto">● SILENCIOSO 24/7</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {LOTTERIES.map(lottery => {
            const dom = neuralDom[lottery.id] || 50;
            const prec = neuralPrec[lottery.id] || 85;
            const detail = auto.analysisDetails[lottery.id];
            const prize = LOTTERY_PRIZES[lottery.id];
            const gates = detail?.gatesReached || 0;
            const cyc = detail?.cyclesCompleted || 0;
            const isToday = todayLotteries.some(t => t.id === lottery.id);
            const isReady = dom >= 100 && prec >= 100;
            const patterns = detail?.patternsLocked || 0;
            const syncs = detail?.apiSyncCount || 0;
            const adapts = detail?.selfAdaptations || 0;

            return (
              <div key={lottery.id} className={`rounded-lg p-3 border transition-all ${
                isReady ? 'border-success/40 bg-success/5' :
                isToday ? 'border-secondary/30 bg-secondary/5' :
                'border-border bg-muted/10'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: lottery.color }} />
                    <span className="font-display font-bold text-xs" style={{ color: lottery.color }}>{lottery.name}</span>
                  </div>
                  <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-mono ${
                    isReady ? 'bg-success/10 text-success' : gates > 0 ? 'bg-secondary/10 text-secondary' : 'bg-warning/10 text-warning'
                  }`}>
                    {isReady ? '✅ DOMÍNIO TOTAL' : gates > 0 ? `🔥 ${gates} GATES` : '⏳ ESTUDANDO'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                  <p>Gates: <span className="text-success font-mono font-bold">{gates}</span></p>
                  <p>Ciclos: <span className="text-foreground font-mono">{cyc}</span></p>
                  <p>Dom: <span className="font-mono font-bold" style={{ color: lottery.color }}>{dom.toFixed(1)}%</span></p>
                  <p>Prec: <span className="text-secondary font-mono font-bold">{prec.toFixed(1)}%</span></p>
                  <p>Padrões: <span className="text-primary font-mono">{patterns}</span></p>
                  <p>Syncs: <span className="text-foreground font-mono">{syncs}</span></p>
                  <p>Adaptações: <span className="text-warning font-mono">{adapts}</span></p>
                  {detail?.hotNumbers && detail.hotNumbers.length > 0 && (
                    <p className="col-span-2">🔥 Hot: <span className="text-secondary font-mono">{detail.hotNumbers.join(', ')}</span></p>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-1.5">
                  <Trophy className="w-3 h-3 text-secondary" />
                  <span className="text-[9px] text-secondary font-bold">{prize?.estimatedPrize || '---'}</span>
                </div>
                <div className="h-1 bg-muted/40 rounded-full overflow-hidden mt-1.5">
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, dom)}%`, backgroundColor: lottery.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilterCategory(null)}
          className={`text-xs px-3 py-1.5 rounded-lg font-display transition-all ${!filterCategory ? 'gradient-primary text-primary-foreground' : 'glass text-muted-foreground hover:text-foreground'}`}>
          Todas ({AI_SPECIALISTS.length})
        </button>
        {CATEGORIES.map(cat => (
          <button key={cat.name} onClick={() => setFilterCategory(filterCategory === cat.name ? null : cat.name)}
            className={`text-xs px-3 py-1.5 rounded-lg font-display transition-all ${filterCategory === cat.name ? 'gradient-primary text-primary-foreground' : 'glass text-muted-foreground hover:text-foreground'}`}>
            {cat.name} ({cat.range[1] - cat.range[0]})
          </button>
        ))}
      </div>

      {/* Live Workers Grid */}
      <div className="space-y-4">
        {CATEGORIES.filter(cat => !filterCategory || filterCategory === cat.name).map(cat => (
          <CategorySection key={cat.name} cat={cat} workers={workers} />
        ))}
      </div>

      {/* Neural Domination per Lottery */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <Shield className="w-5 h-5 text-success" />
          <h3 className="font-display font-semibold text-sm">Domínio Neural por Loteria — Meta 1000%</h3>
        </div>
        <div className="space-y-2">
          {LOTTERIES.map(lottery => {
            const dom = neuralDom[lottery.id] || 50;
            return (
              <div key={lottery.id} className="flex items-center gap-3">
                <div className="flex items-center gap-2 w-28 shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: lottery.color }} />
                  <span className="text-xs text-foreground truncate">{lottery.name}</span>
                </div>
                <div className="flex-1 h-3 bg-muted/40 rounded-full overflow-hidden">
                  <motion.div className="h-full rounded-full" style={{ backgroundColor: lottery.color }}
                    animate={{ width: `${Math.min(100, dom)}%` }} transition={{ duration: 1 }} />
                </div>
                <span className="text-xs font-mono w-16 text-right" style={{ color: lottery.color }}>{dom.toFixed(1)}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AILiveDashboardPage;
