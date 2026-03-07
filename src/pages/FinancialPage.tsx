import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { LOTTERIES, formatBrasiliaTime } from '@/lib/lotteryConstants';
import { formatPrize } from '@/lib/lotteryPrizes';
import { DollarSign, TrendingUp, Trophy, BarChart3, Loader2, RefreshCw, Wallet, PiggyBank } from 'lucide-react';
import { motion } from 'framer-motion';

interface WinRecord {
  id: string;
  lottery: string;
  concurso: number;
  hits: number;
  prize_value: number;
  prize_tier: string | null;
  bet_numbers: number[];
  draw_numbers: number[];
  matched_numbers: number[];
  checked_at: string;
  data_concurso: string | null;
}

interface LotterySummary {
  lotteryId: string;
  lotteryName: string;
  color: string;
  totalWins: number;
  totalPrize: number;
  bestHits: number;
  bestPrize: number;
}

const FinancialPage = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<WinRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRecords = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('result_checks')
      .select('*')
      .eq('user_id', user.id)
      .order('checked_at', { ascending: false })
      .limit(200) as any;
    setRecords(data || []);
    setLoading(false);
  };

  useEffect(() => { loadRecords(); }, [user]);

  const winners = records.filter(r => r.hits >= 3 || r.prize_value > 0);
  const totalEarned = records.reduce((s, r) => s + (r.prize_value || 0), 0);
  const totalWins = winners.length;

  // Per-lottery summary
  const summaries: LotterySummary[] = LOTTERIES.map(l => {
    const lRecords = records.filter(r => r.lottery === l.id);
    const lWins = lRecords.filter(r => r.hits >= 3 || r.prize_value > 0);
    return {
      lotteryId: l.id,
      lotteryName: l.name,
      color: l.color,
      totalWins: lWins.length,
      totalPrize: lRecords.reduce((s, r) => s + (r.prize_value || 0), 0),
      bestHits: lRecords.reduce((max, r) => Math.max(max, r.hits), 0),
      bestPrize: lRecords.reduce((max, r) => Math.max(max, r.prize_value || 0), 0),
    };
  }).filter(s => s.totalWins > 0 || s.totalPrize > 0 || records.some(r => r.lottery === s.lotteryId));

  const activeSummaries = summaries.filter(s => s.totalWins > 0 || s.totalPrize > 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">Sistema Financeiro</h1>
        <button onClick={loadRecords} className="text-xs text-primary hover:underline flex items-center gap-1">
          <RefreshCw className="w-3 h-3" /> Atualizar
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-5 border border-success/20">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Ganho</p>
              <p className="text-2xl font-display font-bold text-success">{formatPrize(totalEarned)}</p>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-xl p-5 border border-secondary/20">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Vitórias</p>
              <p className="text-2xl font-display font-bold text-secondary">{totalWins}</p>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-xl p-5 border border-primary/20">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Conferências</p>
              <p className="text-2xl font-display font-bold text-primary">{records.length}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Per-Lottery Breakdown */}
      {activeSummaries.length > 0 && (
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <PiggyBank className="w-5 h-5 text-secondary" />
            <h2 className="font-display font-bold">Ganhos por Loteria</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeSummaries.map(s => (
              <div key={s.lotteryId} className="rounded-lg p-4 border border-border/40 bg-muted/10">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: s.color }} />
                  <span className="font-display font-bold text-sm" style={{ color: s.color }}>{s.lotteryName}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>
                    <p>Vitórias</p>
                    <p className="text-lg font-bold text-secondary">{s.totalWins}</p>
                  </div>
                  <div>
                    <p>Total Ganho</p>
                    <p className="text-lg font-bold text-success">{formatPrize(s.totalPrize)}</p>
                  </div>
                  <div>
                    <p>Melhor Acerto</p>
                    <p className="font-bold text-foreground">{s.bestHits} pts</p>
                  </div>
                  <div>
                    <p>Maior Prêmio</p>
                    <p className="font-bold text-success">{formatPrize(s.bestPrize)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed History */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h2 className="font-display font-bold">Histórico Detalhado de Conferências</h2>
        </div>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : records.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">Nenhuma conferência registrada ainda.</p>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {records.map((r, i) => {
              const lottery = LOTTERIES.find(l => l.id === r.lottery);
              const isWin = r.hits >= 3 || r.prize_value > 0;
              return (
                <motion.div key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                  className={`rounded-lg p-4 border ${isWin ? 'border-success/30 bg-success/5' : 'border-border/30 bg-muted/10'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ background: lottery?.color }} />
                      <span className="font-display font-semibold text-sm" style={{ color: lottery?.color }}>{lottery?.name}</span>
                      <span className="text-xs font-mono text-muted-foreground">#{r.concurso}</span>
                      {r.data_concurso && <span className="text-xs text-muted-foreground">{r.data_concurso}</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-secondary">{r.hits}</span>
                      <span className="text-xs text-muted-foreground">acertos</span>
                      {r.prize_value > 0 && (
                        <span className="font-display font-bold text-success">{formatPrize(r.prize_value)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-1">
                    {(r.bet_numbers || []).map((n: number) => (
                      <span key={n} className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-[10px] border ${
                        (r.matched_numbers || []).includes(n) ? 'bg-success/20 border-success text-success font-bold' : 'border-muted text-muted-foreground'
                      }`}>
                        {n.toString().padStart(2, '0')}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                    <span>{r.prize_tier || `${r.hits} acerto(s)`}</span>
                    <span>{formatBrasiliaTime(new Date(r.checked_at))}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancialPage;
