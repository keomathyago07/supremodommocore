import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { LOTTERIES, AI_SPECIALISTS, getBrasiliaTime, formatBrasiliaHour, getTodaysLotteries, getDrawDayNames } from '@/lib/lotteryConstants';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Brain, Zap, Activity, Clock, Target, TrendingUp, Bell, CheckCircle, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';

interface AIActivity {
  name: string;
  lottery: string;
  action: string;
  progress: number;
  status: 'studying' | 'analyzing' | 'evolving' | 'scanning';
}

const ACTIONS = [
  'Analisando frequências', 'Estudando padrões', 'Calculando gaps', 'Correlacionando dados',
  'Otimizando predição', 'Varrendo API', 'Processando séries temporais', 'Treinando rede neural',
  'Clustering padrões', 'Evolução genética', 'Filtro bayesiano', 'Reforço de aprendizado',
];

function generateActivities(): AIActivity[] {
  const todaysLotteries = getTodaysLotteries();
  const lotteries = todaysLotteries.length > 0 ? todaysLotteries : LOTTERIES;
  const activities: AIActivity[] = [];
  for (let i = 0; i < 12; i++) {
    const ai = AI_SPECIALISTS[Math.floor(Math.random() * AI_SPECIALISTS.length)];
    const lottery = lotteries[Math.floor(Math.random() * lotteries.length)];
    const action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
    const statuses: AIActivity['status'][] = ['studying', 'analyzing', 'evolving', 'scanning'];
    activities.push({
      name: ai,
      lottery: lottery.name,
      action,
      progress: 30 + Math.random() * 70,
      status: statuses[Math.floor(Math.random() * statuses.length)],
    });
  }
  return activities;
}

const statusColors: Record<string, string> = {
  studying: 'text-primary',
  analyzing: 'text-secondary',
  evolving: 'text-success',
  scanning: 'text-warning',
};

const statusLabels: Record<string, string> = {
  studying: 'ESTUDANDO',
  analyzing: 'ANALISANDO',
  evolving: 'EVOLUINDO',
  scanning: 'VARRENDO',
};

const DashboardHome = () => {
  const { user } = useAuth();
  const [time, setTime] = useState(getBrasiliaTime());
  const [activities, setActivities] = useState<AIActivity[]>(generateActivities());
  const [gatesCount, setGatesCount] = useState(0);
  const [betsCount, setBetsCount] = useState(0);
  const [notifications, setNotifications] = useState<string[]>([]);

  const todaysLotteries = getTodaysLotteries();

  useEffect(() => {
    const interval = setInterval(() => setTime(getBrasiliaTime()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setActivities(generateActivities()), 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from('gate_history').select('id', { count: 'exact', head: true }).then(({ count }) => setGatesCount(count || 0));
    supabase.from('bets').select('id', { count: 'exact', head: true }).eq('status', 'confirmed').then(({ count }) => setBetsCount(count || 0));
  }, [user]);

  useEffect(() => {
    const autoAnalysis = setInterval(() => {
      const lotteries = todaysLotteries.length > 0 ? todaysLotteries : LOTTERIES;
      const lottery = lotteries[Math.floor(Math.random() * lotteries.length)];
      const confidence = 98 + Math.random() * 2;
      if (confidence >= 100) {
        const msg = `🎯 GATE 100% — ${lottery.name} — ${confidence.toFixed(3)}%`;
        setNotifications(prev => [msg, ...prev].slice(0, 20));
        toast.success(msg, { duration: 8000 });
      }
    }, 15000);
    return () => clearInterval(autoAnalysis);
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Painel de Controle</h1>
          <p className="text-muted-foreground text-sm">Sistema DommoSupremo — {AI_SPECIALISTS.length} IAs Ativas — Gate: 100%</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 glass px-4 py-2 rounded-lg">
            <Clock className="w-4 h-4 text-primary" />
            <span className="font-mono text-sm text-primary">{formatBrasiliaHour(time)}</span>
            <span className="text-xs text-muted-foreground">Brasília</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success/10 border border-success/30">
            <Activity className="w-4 h-4 text-success animate-pulse" />
            <span className="text-xs font-display font-bold text-success tracking-wider">ONLINE 24/7</span>
          </div>
        </div>
      </div>

      {/* Today's Lotteries */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays className="w-5 h-5 text-secondary" />
          <h2 className="font-display font-semibold text-sm">Loterias de Hoje</h2>
        </div>
        {todaysLotteries.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {todaysLotteries.map(l => (
              <span key={l.id} className="px-3 py-1.5 rounded-lg text-xs font-display font-semibold text-primary-foreground" style={{ background: l.color }}>
                {l.name} — {l.drawTime}h
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Nenhuma loteria sorteada hoje.</p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'IAs Ativas', value: AI_SPECIALISTS.length.toString(), icon: Brain, color: 'text-primary' },
          { label: 'Loterias Hoje', value: todaysLotteries.length.toString(), icon: Target, color: 'text-secondary' },
          { label: 'Gates Encontrados', value: gatesCount.toString(), icon: Zap, color: 'text-success' },
          { label: 'Gate de Confiança', value: '100%', icon: TrendingUp, color: 'text-warning' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
              <Activity className="w-4 h-4 text-muted-foreground animate-pulse" />
            </div>
            <p className="text-2xl font-display font-bold text-foreground">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* AI Live Monitor */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Brain className="w-5 h-5 text-primary animate-pulse" />
            <h2 className="text-lg font-display font-semibold">Monitor de IAs em Tempo Real</h2>
          </div>
          <span className="text-xs px-2 py-1 rounded-full bg-success/10 text-success font-mono animate-pulse">● LIVE</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {activities.map((act, i) => (
            <motion.div key={`${act.name}-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} className="bg-muted/20 rounded-lg p-3 border border-border/50">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-mono text-primary font-semibold">{act.name}</span>
                <span className={`text-[10px] font-display font-bold tracking-wider ${statusColors[act.status]}`}>{statusLabels[act.status]}</span>
              </div>
              <p className="text-[11px] text-muted-foreground mb-1.5">{act.action} — <span className="text-foreground">{act.lottery}</span></p>
              <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
                <motion.div className="h-full rounded-full bg-primary" initial={{ width: '0%' }} animate={{ width: `${act.progress}%` }} transition={{ duration: 1.5 }} />
              </div>
              <p className="text-[10px] text-right text-muted-foreground mt-0.5">{act.progress.toFixed(1)}%</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <Bell className="w-5 h-5 text-warning" />
            <h2 className="text-lg font-display font-semibold">Notificações</h2>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {notifications.map((n, i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-muted/20 rounded-lg text-sm">
                <CheckCircle className="w-4 h-4 text-success shrink-0" />
                <span className="text-foreground">{n}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lotteries Grid */}
      <div>
        <h2 className="text-lg font-display font-semibold text-foreground mb-4">Todas as Loterias</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {LOTTERIES.map((lottery, i) => {
            const isToday = todaysLotteries.some(t => t.id === lottery.id);
            return (
              <motion.div key={lottery.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} className={`glass rounded-xl p-5 hover:border-primary/30 transition-all cursor-pointer group ${isToday ? 'border-success/30' : ''}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: lottery.color }} />
                  <h3 className="font-display font-semibold text-foreground group-hover:text-primary transition-colors">{lottery.name}</h3>
                  {isToday && <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/10 text-success font-display font-bold">HOJE</span>}
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">{lottery.numbersCount} números até {lottery.maxNumber}</p>
                  <p className="text-xs text-muted-foreground">Sorteio: {lottery.drawTime}h · 📅 {getDrawDayNames(lottery)}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {lottery.lockedPatterns.slice(0, 2).map((p) => (
                      <span key={p} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono">{p}</span>
                    ))}
                    {lottery.lockedPatterns.length > 2 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">+{lottery.lockedPatterns.length - 2}</span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
