import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { LOTTERIES, formatBrasiliaTime, TIMEMANIA_TEAMS } from '@/lib/lotteryConstants';
import { useAutoAnalysis } from '@/hooks/useAutoAnalysis';
import { Ticket, CheckCircle, Clock, Trophy, XCircle, Clover, Shield, Loader2, Layers, GitBranch } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

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
  const [confirming, setConfirming] = useState<string | null>(null);

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

  const confirmBet = async (bet: Bet) => {
    if (!user) return;
    setConfirming(bet.id);
    try {
      const { error } = await supabase
        .from('bets')
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
        } as any)
        .eq('id', bet.id);

      if (error) {
        toast.error('Erro ao confirmar aposta');
      } else {
        toast.success(`✅ Aposta ${getLotteryConfig(bet.lottery)?.name} #${bet.concurso} confirmada e salva no banco!`);
        await loadBets();
      }
    } catch {
      toast.error('Erro ao confirmar aposta');
    }
    setConfirming(null);
  };

  const statusIcons: Record<string, any> = {
    pending: <Clock className="w-4 h-4 text-warning" />,
    confirmed: <CheckCircle className="w-4 h-4 text-primary" />,
    checked: <Trophy className="w-4 h-4 text-success" />,
    winner: <Trophy className="w-4 h-4 text-success" />,
    lost: <XCircle className="w-4 h-4 text-destructive" />,
  };

  const statusLabels: Record<string, string> = {
    pending: 'Pendente',
    confirmed: 'Confirmada',
    checked: 'Conferida',
    winner: 'Ganhadora!',
    lost: 'Sem prêmio',
  };

  const getDeliveredInfo = (lotteryId: string, concurso: number) => {
    return auto.deliveredNumbers.find(dn => dn.lotteryId === lotteryId && dn.concurso === concurso);
  };

  const getSpecialForBet = (bet: Bet) => {
    const lottery = getLotteryConfig(bet.lottery);
    const delivered = getDeliveredInfo(bet.lottery, bet.concurso);
    
    if (delivered) {
      return { specialNumbers: delivered.specialNumbers, team: delivered.team };
    }
    
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

  // Generate complementary numbers for Lotomania (50 not in bet)
  const getComplementaryNumbers = (bet: Bet) => {
    const lottery = getLotteryConfig(bet.lottery);
    if (lottery?.id !== 'lotomania') return null;
    const allNumbers = Array.from({ length: lottery.maxNumber }, (_, i) => i);
    return allNumbers.filter(n => !bet.numbers.includes(n));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">Minhas Apostas</h1>
        <span className="text-sm text-muted-foreground">{bets.length} apostas</span>
      </div>

      {auto.deliveredNumbers.length > 0 && (
        <div className="glass rounded-xl p-4 border border-success/20">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-success" />
            <span className="text-sm font-display font-bold text-success">Apostas do dia — Enviadas às {auto.numberDeliveryTime}h</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {auto.deliveredNumbers.length} jogo(s) salvos automaticamente. Confirme abaixo para validar cada aposta.
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
          <p className="text-muted-foreground">Nenhuma aposta ainda.</p>
          <p className="text-sm text-muted-foreground/60 mt-1">As IAs enviarão automaticamente no horário programado ({auto.numberDeliveryTime}h).</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bets.map((bet, i) => {
            const lottery = getLotteryConfig(bet.lottery);
            const { specialNumbers, team } = getSpecialForBet(bet);
            const isPending = bet.status === 'pending';
            const complementary = getComplementaryNumbers(bet);
            const isDuplaSena = lottery?.hasDualDraw;
            return (
              <motion.div
                key={bet.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`glass rounded-xl p-5 ${isPending ? 'border border-warning/30' : ''}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: lottery?.color }} />
                    <span className="font-display font-semibold">{lottery?.name || bet.lottery}</span>
                    <span className="text-xs text-muted-foreground font-mono">#{bet.concurso}</span>
                    {lottery?.hasDualGame && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-warning/20 text-warning font-mono">JOGO DUPLO</span>
                    )}
                    {isDuplaSena && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-destructive/20 text-destructive font-mono">2 SORTEIOS</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {statusIcons[bet.status] || statusIcons.pending}
                    <span className="text-xs text-muted-foreground">{statusLabels[bet.status] || bet.status}</span>
                    <span className="text-sm font-display font-bold text-secondary">{Number(bet.confidence).toFixed(3)}%</span>
                  </div>
                </div>

                {/* Main numbers */}
                <div className="mb-1">
                  {lottery?.id === 'lotomania' && (
                    <div className="flex items-center gap-2 mb-2">
                      <Layers className="w-4 h-4 text-warning" />
                      <span className="text-xs font-display font-bold text-warning">Jogo 1 — 50 Números Marcados</span>
                    </div>
                  )}
                  {isDuplaSena && (
                    <div className="flex items-center gap-2 mb-2">
                      <GitBranch className="w-4 h-4 text-destructive" />
                      <span className="text-xs font-display font-bold text-destructive">Números (1º e 2º Sorteio)</span>
                    </div>
                  )}
                  {lottery?.hasColumns && (
                    <div className="flex items-center gap-2 mb-2">
                      <Layers className="w-4 h-4 text-success" />
                      <span className="text-xs font-display font-bold text-success">Super Sete — 7 Colunas (0 a 9)</span>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {bet.numbers.map((n, idx) => (
                      <span
                        key={idx}
                        className={`${lottery?.hasColumns ? 'w-10 h-10' : 'w-8 h-8'} rounded-full flex items-center justify-center font-mono text-[11px] border ${
                          bet.draw_numbers?.includes(n) ? 'bg-success/20 border-success text-success font-bold' : ''
                        }`}
                        style={!bet.draw_numbers?.includes(n) ? { borderColor: lottery?.color, color: lottery?.color } : {}}
                      >
                        {lottery?.hasColumns ? (
                          <span className="flex flex-col items-center leading-none">
                            <span className="text-[8px] text-muted-foreground">C{idx + 1}</span>
                            <span className="text-sm font-bold">{n}</span>
                          </span>
                        ) : (
                          n.toString().padStart(2, '0')
                        )}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Lotomania Complementary Game */}
                {complementary && complementary.length > 0 && (
                  <div className="mt-3 bg-warning/5 rounded-lg p-3 border border-warning/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Layers className="w-4 h-4 text-warning" />
                      <span className="text-xs font-display font-bold text-warning">Jogo 2 — 50 Números Complementares (não marcados)</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {complementary.map((n) => (
                        <span
                          key={n}
                          className="w-7 h-7 rounded-full flex items-center justify-center font-mono text-[10px] border border-warning/30 text-warning/80"
                        >
                          {n.toString().padStart(2, '0')}
                        </span>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      Lotomania: Prêmio para 20, 19, 18, 17, 16, 15 ou 0 acertos — Conferência dos dois jogos
                    </p>
                  </div>
                )}

                {/* Dupla Sena info */}
                {isDuplaSena && (
                  <div className="mt-2 bg-destructive/5 rounded-lg p-3 border border-destructive/20">
                    <p className="text-[10px] text-muted-foreground">
                      <strong className="text-destructive">Dupla Sena:</strong> Seus números concorrem nos 2 sorteios do concurso.
                      Prêmio para 3, 4, 5 ou 6 acertos no 1º e/ou 2º sorteio.
                      A conferência é automática para ambos os sorteios após as 21h.
                    </p>
                  </div>
                )}

                {/* Trevos (+Milionária) */}
                {specialNumbers && specialNumbers.length > 0 && (
                  <div className="flex items-center gap-2 mt-2">
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

                {/* Time (Timemania) */}
                {team && (
                  <div className="flex items-center gap-2 mt-2">
                    <Shield className="w-4 h-4 text-primary" />
                    <span className="text-xs font-display font-semibold text-primary">Time do Coração:</span>
                    <span className="text-sm font-bold text-foreground bg-primary/10 px-3 py-1 rounded-lg border border-primary/20">
                      ⚽ {team}
                    </span>
                  </div>
                )}

                {/* Hits & Prize */}
                {bet.hits !== null && (
                  <div className="flex items-center gap-4 text-sm mt-2">
                    <span className="text-success font-bold">{bet.hits} acertos</span>
                    {bet.prize_amount && Number(bet.prize_amount) > 0 && (
                      <span className="text-secondary font-bold">
                        R$ {Number(bet.prize_amount).toLocaleString('pt-BR')}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-muted-foreground">
                    {bet.confirmed_at ? formatBrasiliaTime(new Date(bet.confirmed_at)) : formatBrasiliaTime(new Date(bet.created_at))}
                  </p>

                  {isPending && (
                    <button
                      onClick={() => confirmBet(bet)}
                      disabled={confirming === bet.id}
                      className="flex items-center gap-2 gradient-primary text-primary-foreground font-display font-bold px-5 py-2 rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
                    >
                      {confirming === bet.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      CONFIRMAR APOSTA
                    </button>
                  )}
                  {bet.status === 'confirmed' && (
                    <span className="flex items-center gap-1.5 text-xs font-display font-semibold text-success bg-success/10 px-3 py-1.5 rounded-lg">
                      <CheckCircle className="w-4 h-4" /> CONFIRMADA
                    </span>
                  )}
                  {(bet.status === 'checked' || bet.status === 'winner') && (
                    <span className="flex items-center gap-1.5 text-xs font-display font-semibold text-secondary bg-secondary/10 px-3 py-1.5 rounded-lg">
                      <Trophy className="w-4 h-4" /> CONFERIDA
                    </span>
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

export default BetsPage;
