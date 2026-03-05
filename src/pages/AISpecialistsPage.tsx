import { AI_SPECIALISTS, LOTTERIES } from '@/lib/lotteryConstants';
import { Bot, Brain, Cpu, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

const categories = [
  { name: 'Neural Networks', range: [0, 20], icon: Brain, color: 'text-primary' },
  { name: 'Statistical Analysis', range: [20, 40], icon: Cpu, color: 'text-secondary' },
  { name: 'Optimization', range: [40, 70], icon: Zap, color: 'text-success' },
  { name: 'Deep Learning', range: [70, 100], icon: Bot, color: 'text-warning' },
  { name: 'Meta-Heuristics', range: [100, 135], icon: Brain, color: 'text-primary' },
  { name: 'Advanced Optimization', range: [135, 155], icon: Cpu, color: 'text-secondary' },
];

const AISpecialistsPage = () => {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">IAs Especialistas</h1>
        <p className="text-muted-foreground text-sm">
          {AI_SPECIALISTS.length} IAs ativas trabalhando 24/7 — Cada loteria tem seus especialistas dedicados
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-3xl font-display font-bold text-primary">{AI_SPECIALISTS.length}</p>
          <p className="text-sm text-muted-foreground">IAs Totais</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-3xl font-display font-bold text-secondary">{LOTTERIES.length}</p>
          <p className="text-sm text-muted-foreground">Loterias Cobertas</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-3xl font-display font-bold text-success">{categories.length}</p>
          <p className="text-sm text-muted-foreground">Categorias de IA</p>
        </div>
      </div>

      {/* Categories */}
      {categories.map((cat, ci) => (
        <motion.div
          key={cat.name}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: ci * 0.1 }}
          className="glass rounded-xl p-5"
        >
          <div className="flex items-center gap-3 mb-3">
            <cat.icon className={`w-5 h-5 ${cat.color}`} />
            <h2 className="font-display font-semibold">{cat.name}</h2>
            <span className="text-xs text-muted-foreground">
              ({cat.range[1] - cat.range[0]} IAs)
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {AI_SPECIALISTS.slice(cat.range[0], cat.range[1]).map((ai, i) => (
              <motion.span
                key={ai}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: ci * 0.1 + i * 0.02 }}
                className="text-xs px-2 py-1 rounded-md bg-primary/5 text-foreground/70 font-mono hover:bg-primary/15 hover:text-primary transition-all cursor-default"
              >
                {ai}
              </motion.span>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default AISpecialistsPage;
