import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { LOTTERIES, formatBrasiliaTime, formatBrasiliaHour } from '@/lib/lotteryConstants';
import { LOTTERY_PRIZES } from '@/lib/lotteryPrizes';
import { confirmGateAndCreateBet } from '@/lib/gatePersistence';
import { History, Zap, Shield, CheckCircle, Loader2, Clock, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

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
  const navigate = useNavigate();
  const [entries, setEntries] = useState<GateEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<string | null>(null);

  const loadEntries = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('gate_history')
      .select('*')
      .eq('user_id', user.id)
      .order('found_at', { ascending: false }) as any;
    setEntries(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadEntries();
    // Realtime refresh
    const channel = supabase
      .channel('gate_history_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gate_history' }, () => {
        loadEntries();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const confirmBet = async (entry: GateEntry) => {
    if (!user) return;
    setConfirming(entry.id);

    const result = await confirmGateAndCreateBet({
      userId: user.id,
      lottery: entry.lottery,
      concurso: entry.concurso,
      confidence: entry.confidence,
      numbers: entry.numbers,
      foundAt: entry.found_at,
    });

    if (result.error) {
      toast.error('Erro ao confirmar: ' + result.error);
    } else if (result.alreadyConfirmed) {
      toast.info('Aposta já confirmada anteriormente!');
      await loadEntries();
      setTimeout(() => navigate('/dashboard/results'), 1000);
    } else {
      toast.success('✅ Aposta confirmada, salva no banco e sincronizada! Indo para resultados...', { duration: 5000 });
      await loadEntries();
      setTimeout(() => navigate('/dashboard/results'), 1500);
    }
    setConfirming(null);
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-display font-bold">Histórico de Gates</h1>
      <p className="text-muted-foreground text-sm">Gates encontrados automaticamente pelas IAs — Confirme para salvar a aposta e ir para conferência de resultados</p>

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
            const prize = LOTTERY_PRIZES[entry.lottery];
            const isApproved = entry.gate_status === 'APPROVED';
            const isPending = entry.gate_status === 'PENDING';
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`glass rounded-xl p-5 ${isPending ? 'border border-warning/30' : ''}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-success" />
                    <span className="font-display font-semibold" style={{ color: lottery?.color }}>
                      {lottery?.name}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">#{entry.concurso}</span>
                    {prize && (
                      <span className="flex items-center gap-1 text-xs text-secondary font-display">
                        <DollarSign className="w-3 h-3" />
                        {prize.estimatedPrize}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-secondary" />
                    <span className="font-display font-bold text-secondary">{Number(entry.confidence).toFixed(3)}%</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                      isApproved ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning animate-pulse'
                    }`}>
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
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatBrasiliaTime(new Date(entry.found_at))} — {formatBrasiliaHour(new Date(entry.found_at))}
                  </p>
                  {isApproved ? (
                    <span className="flex items-center gap-1.5 text-xs font-display font-semibold text-success bg-success/10 px-3 py-1.5 rounded-lg">
                      <CheckCircle className="w-4 h-4" /> APOSTA CONFIRMADA
                    </span>
                  ) : (
                    <button
                      onClick={() => confirmBet(entry)}
                      disabled={confirming === entry.id}
                      className="flex items-center gap-2 bg-gradient-to-r from-secondary to-warning text-background font-display font-bold px-4 py-2 rounded-lg hover:opacity-90 transition-all disabled:opacity-50 text-sm"
                    >
                      {confirming === entry.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Zap className="w-4 h-4" />
                      )}
                      {confirming === entry.id ? 'CONFIRMANDO...' : 'CONFIRMAR APOSTA'}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GateHistoryPage;
