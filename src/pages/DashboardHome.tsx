import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { LOTTERIES, AI_SPECIALISTS, getBrasiliaTime, formatBrasiliaTime, formatBrasiliaHour } from '@/lib/lotteryConstants';
import { Brain, Zap, Activity, Clock, Target, TrendingUp } from 'lucide-react';

const DashboardHome = () => {
  const [time, setTime] = useState(getBrasiliaTime());

  useEffect(() => {
    const interval = setInterval(() => setTime(getBrasiliaTime()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Painel de Controle</h1>
          <p className="text-muted-foreground">Sistema DommoSupremo — {AI_SPECIALISTS.length} IAs Ativas</p>
        </div>
        <div className="flex items-center gap-2 glass px-4 py-2 rounded-lg">
          <Clock className="w-4 h-4 text-primary" />
          <span className="font-mono text-sm text-primary">{formatBrasiliaHour(time)}</span>
          <span className="text-xs text-muted-foreground">Brasília</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'IAs Ativas', value: AI_SPECIALISTS.length.toString(), icon: Brain, color: 'text-primary' },
          { label: 'Loterias Monitoradas', value: LOTTERIES.length.toString(), icon: Target, color: 'text-secondary' },
          { label: 'Gates Encontrados', value: '—', icon: Zap, color: 'text-success' },
          { label: 'Taxa de Confiança', value: '99.9%', icon: TrendingUp, color: 'text-warning' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass rounded-xl p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
              <Activity className="w-4 h-4 text-muted-foreground animate-pulse-glow" />
            </div>
            <p className="text-2xl font-display font-bold text-foreground">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Lotteries Grid */}
      <div>
        <h2 className="text-lg font-display font-semibold text-foreground mb-4">Loterias Monitoradas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {LOTTERIES.map((lottery, i) => (
            <motion.div
              key={lottery.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="glass rounded-xl p-5 hover:border-primary/30 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-3 h-3 rounded-full animate-pulse-glow"
                  style={{ backgroundColor: lottery.color }}
                />
                <h3 className="font-display font-semibold text-foreground group-hover:text-primary transition-colors">
                  {lottery.name}
                </h3>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">
                  {lottery.numbersCount} números até {lottery.maxNumber}
                </p>
                <p className="text-xs text-muted-foreground">
                  Sorteio: {lottery.drawTime}h (Brasília)
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {lottery.lockedPatterns.slice(0, 2).map((p) => (
                    <span key={p} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono">
                      {p}
                    </span>
                  ))}
                  {lottery.lockedPatterns.length > 2 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      +{lottery.lockedPatterns.length - 2}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* AI Specialists Preview */}
      <div>
        <h2 className="text-lg font-display font-semibold text-foreground mb-4">
          IAs Especialistas ({AI_SPECIALISTS.length} ativas)
        </h2>
        <div className="glass rounded-xl p-5">
          <div className="flex flex-wrap gap-2">
            {AI_SPECIALISTS.slice(0, 30).map((ai) => (
              <span
                key={ai}
                className="text-xs px-2 py-1 rounded-md bg-primary/5 text-primary/70 font-mono hover:bg-primary/15 hover:text-primary transition-all cursor-default"
              >
                {ai}
              </span>
            ))}
            <span className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">
              +{AI_SPECIALISTS.length - 30} mais...
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
