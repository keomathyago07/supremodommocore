import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { LOTTERIES, formatBrasiliaTime, formatBrasiliaHour } from '@/lib/lotteryConstants';
import { History, Zap, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

interface GateEntry {
  id: string;
  lottery: string;
  concurso: number;
  confidence: number;
  numbers: number[];
  gate_status: string;
  found_at: string;
}

const GateHistoryPage = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<GateEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('gate_history')
      .select('*')
      .order('found_at', { ascending: false })
      .then(({ data }: any) => {
        setEntries(data || []);
        setLoading(false);
      });
  }, [user]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-display font-bold">Histórico de Gates</h1>
      <p className="text-muted-foreground text-sm">Gates encontrados automaticamente pelas IAs — Horário de Brasília</p>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhum gate encontrado ainda.</p>
          <p className="text-sm text-muted-foreground/60">Execute análises para que as IAs encontrem padrões.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, i) => {
            const lottery = LOTTERIES.find((l) => l.id === entry.lottery);
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass rounded-xl p-5"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-success" />
                    <span className="font-display font-semibold" style={{ color: lottery?.color }}>
                      {lottery?.name}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">#{entry.concurso}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-secondary" />
                    <span className="font-display font-bold text-secondary">{Number(entry.confidence).toFixed(3)}%</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success font-mono">
                      {entry.gate_status}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {entry.numbers.map((n) => (
                    <span
                      key={n}
                      className="w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs border"
                      style={{ borderColor: lottery?.color, color: lottery?.color }}
                    >
                      {n.toString().padStart(2, '0')}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Encontrado: {formatBrasiliaTime(new Date(entry.found_at))} — {formatBrasiliaHour(new Date(entry.found_at))}
                </p>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GateHistoryPage;
