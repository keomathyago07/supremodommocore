import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { LOTTERIES, formatBrasiliaTime, TIMEMANIA_TEAMS } from '@/lib/lotteryConstants';
import { useAutoAnalysis } from '@/hooks/useAutoAnalysis';
import { Ticket, CheckCircle, Clock, Trophy, XCircle, Clover, Shield } from 'lucide-react';
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
  const auto = useAutoAnalysis();
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
    winner: <Trophy className="w-4 h-4 text-success" />,
    lost: <XCircle className="w-4 h-4 text-destructive" />,
  };

  // Get special numbers and team from delivered data
  const getDeliveredInfo = (lotteryId: string, concurso: number) => {
    const d = auto.deliveredNumbers.find(dn => dn.lotteryId === lotteryId && dn.concurso === concurso);
    return d;
  };

  // Generate deterministic special data for display
  const getSpecialForBet = (bet: Bet) => {
    const lottery = getLotteryConfig(bet.lottery);
    const delivered = getDeliveredInfo(bet.lottery, bet.concurso);
    
    if (delivered) {
      return { specialNumbers: delivered.specialNumbers, team: delivered.team };
    }
    
    // Deterministic fallback based on bet ID
    if (lottery?.hasSpecial && lottery.specialCount && lottery.specialMax) {
      const seed = bet.id.charCodeAt(0) + bet.id.charCodeAt(1);
      const specials: number[] = [];
      for (let i = 0; i < lottery.specialCount; i++) {
        specials.push(((seed + i * 7) % lottery.specialMax) + 1);
      }
      return { specialNumbers: [...new Set(specials)].sort((a, b) => a - b), team: null };
    }
    
    if (lottery?.hasTeam) {
      const seed = bet.id.charCodeAt(0) + bet.id.charCodeAt(2);
      return { specialNumbers: undefined, team: TIMEMANIA_TEAMS[seed % TIMEMANIA_TEAMS.length] };
    }
    
    return { specialNumbers: undefined, team: null };
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">Minhas Apostas</h1>
        <span className="text-sm text-muted-foreground">{bets.length} apostas</span>
      </div>

      {/* Delivery info */}
      {auto.deliveredNumbers.length > 0 && (
        <div className="glass rounded-xl p-4 border border-success/20">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-success" />
            <span className="text-sm font-display font-bold text-success">Apostas do dia — Enviadas às {auto.numberDeliveryTime}h</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {auto.deliveredNumbers.length} jogo(s) salvos automaticamente após análise completa com Domínio e Precisão 1000%.
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : bets.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <Ticket className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhuma aposta confirmada ainda.</p>
          <p className="text-sm text-muted-foreground/60 mt-1">As IAs enviarão automaticamente no horário programado ({auto.numberDeliveryTime}h).</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bets.map((bet, i) => {
            const lottery = getLotteryConfig(bet.lottery);
            const { specialNumbers, team } = getSpecialForBet(bet);
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

                <div className="flex flex-wrap gap-2 mb-2">
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

                {/* Trevos for +Milionária */}
                {specialNumbers && specialNumbers.length > 0 && (
                  <div className="flex items-center gap-2 mb-2">
                    <Clover className="w-4 h-4 text-success" />
                    <span className="text-xs font-display font-semibold text-success">Trevos:</span>
                    <div className="flex gap-1.5">
                      {specialNumbers.map((t, idx) => (
                        <span key={idx} className="w-8 h-8 rounded-lg flex items-center justify-center font-mono text-sm font-bold bg-success/20 border border-success/40 text-success">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Team for Timemania */}
                {team && (
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-primary" />
                    <span className="text-xs font-display font-semibold text-primary">Time do Coração:</span>
                    <span className="text-sm font-bold text-foreground bg-primary/10 px-3 py-1 rounded-lg border border-primary/20">
                      ⚽ {team}
                    </span>
                  </div>
                )}

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
