import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { LOTTERIES, formatBrasiliaTime } from '@/lib/lotteryConstants';
import { Ticket, CheckCircle, Clock, Trophy, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface Bet {
  id: string;
  lottery: string;
  concurso: number;
  numbers: number[];
  confidence: number;
  status: string;
  hits: number | null;
  prize_amount: number | null;
  draw_numbers: number[] | null;
  confirmed_at: string | null;
  checked_at: string | null;
  created_at: string;
}

const BetsPage = () => {
  const { user } = useAuth();
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadBets();
  }, [user]);

  const loadBets = async () => {
    const { data } = await supabase
      .from('bets')
      .select('*')
      .order('created_at', { ascending: false }) as any;
    setBets(data || []);
    setLoading(false);
  };

  const getLotteryConfig = (id: string) => LOTTERIES.find((l) => l.id === id);

  const statusIcons: Record<string, any> = {
    pending: <Clock className="w-4 h-4 text-warning" />,
    confirmed: <CheckCircle className="w-4 h-4 text-primary" />,
    checked: <Trophy className="w-4 h-4 text-success" />,
    lost: <XCircle className="w-4 h-4 text-destructive" />,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">Minhas Apostas</h1>
        <span className="text-sm text-muted-foreground">{bets.length} apostas</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : bets.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <Ticket className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhuma aposta confirmada ainda.</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Vá em Análise de Loterias para gerar e confirmar apostas.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bets.map((bet, i) => {
            const lottery = getLotteryConfig(bet.lottery);
            return (
              <motion.div
                key={bet.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass rounded-xl p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: lottery?.color }} />
                    <span className="font-display font-semibold">{lottery?.name || bet.lottery}</span>
                    <span className="text-xs text-muted-foreground font-mono">#{bet.concurso}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusIcons[bet.status] || statusIcons.pending}
                    <span className="text-xs text-muted-foreground capitalize">{bet.status}</span>
                    <span className="text-sm font-display font-bold text-secondary">{Number(bet.confidence).toFixed(3)}%</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  {bet.numbers.map((n) => (
                    <span
                      key={n}
                      className="w-9 h-9 rounded-full flex items-center justify-center font-mono text-sm border"
                      style={{ borderColor: lottery?.color, color: lottery?.color }}
                    >
                      {n.toString().padStart(2, '0')}
                    </span>
                  ))}
                </div>

                {bet.hits !== null && (
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-success font-bold">{bet.hits} acertos</span>
                    {bet.prize_amount && (
                      <span className="text-secondary font-bold">
                        R$ {Number(bet.prize_amount).toLocaleString('pt-BR')}
                      </span>
                    )}
                  </div>
                )}

                <p className="text-xs text-muted-foreground mt-2">
                  {bet.confirmed_at ? formatBrasiliaTime(new Date(bet.confirmed_at)) : formatBrasiliaTime(new Date(bet.created_at))}
                </p>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BetsPage;
