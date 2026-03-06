import { useState, useEffect, useRef } from 'react';
import { LOTTERIES, type LotteryConfig, getBrasiliaTime, formatBrasiliaHour, formatBrasiliaTime, getTodaysLotteries } from '@/lib/lotteryConstants';
import { LOTTERY_PRIZES, formatPrize, getTotalPrizesToday } from '@/lib/lotteryPrizes';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, RefreshCw, Loader2, Bell, BellOff, CheckCircle, Clock, AlertCircle, DollarSign, TrendingUp, BarChart3, Save, Database } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface ResultData {
  numero_concurso: number;
  data_concurso: string;
  dezenas: string[];
  premiacao: any[];
}

interface SavedCheck {
  id: string;
  lottery: string;
  concurso: number;
  hits: number;
  matched_numbers: number[];
  bet_numbers: number[];
  draw_numbers: number[];
  prize_tier: string | null;
  prize_value: number;
  premiacao: any;
  checked_at: string;
  data_concurso: string | null;
}

const ResultsPage = () => {
  const { user } = useAuth();
  const [selectedLottery, setSelectedLottery] = useState<LotteryConfig>(LOTTERIES[0]);
  const [result, setResult] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoCheck, setAutoCheck] = useState(false);
  const [allMatchResults, setAllMatchResults] = useState<Array<{
    betId: string;
    hits: number;
    numbers: number[];
    matched: number[];
    prize: string;
    prizeValue: number;
    savedToDB: boolean;
  }>>([]);
  const [savedChecks, setSavedChecks] = useState<SavedCheck[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [time, setTime] = useState(getBrasiliaTime());
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const todaysLotteries = getTodaysLotteries();
  const totalPrizeToday = getTotalPrizesToday(todaysLotteries.map(l => l.id));

  useEffect(() => {
    const i = setInterval(() => setTime(getBrasiliaTime()), 1000);
    return () => clearInterval(i);
  }, []);

  // Load saved checks from DB
  useEffect(() => {
    if (!user) return;
    loadSavedChecks();
  }, [user]);

  const loadSavedChecks = async () => {
    if (!user) return;
    setLoadingSaved(true);
    const { data, error } = await supabase
      .from('result_checks')
      .select('*')
      .eq('user_id', user.id)
      .order('checked_at', { ascending: false })
      .limit(50) as any;
    if (!error && data) setSavedChecks(data);
    setLoadingSaved(false);
  };

  const fetchResult = async (lottery?: LotteryConfig) => {
    const target = lottery || selectedLottery;
    setLoading(true);
    setResult(null);
    setAllMatchResults([]);
    try {
      const res = await fetch(`https://apiloterias.com.br/app/v2/resultado?loteria=${target.apiName}&token=demo`);
      if (res.ok) {
        const data = await res.json();
        setResult(data);
        if (user && data.dezenas) {
          await compareWithBets(target, data);
        }
      } else {
        toast.error('Não foi possível buscar resultados. Configure sua API.');
      }
    } catch {
      toast.error('Erro de rede ao buscar resultados.');
    }
    setLoading(false);
  };

  const compareWithBets = async (lottery: LotteryConfig, resultData: ResultData) => {
    if (!user) return;
    try {
      const { data: bets } = await supabase
        .from('bets')
        .select('*')
        .eq('user_id', user.id)
        .eq('lottery', lottery.id)
        .eq('status', 'confirmed');

      if (!bets || bets.length === 0) return;

      const drawnNumbers = resultData.dezenas.map(d => parseInt(d));
      const results: typeof allMatchResults = [];

      for (const bet of bets) {
        const betNumbers = bet.numbers as number[];
        const matched = betNumbers.filter(n => drawnNumbers.includes(n));
        const hits = matched.length;

        // Determine prize tier and value
        const { tier, value } = calculatePrizeTier(lottery, hits, resultData.premiacao);

        // Update bet in database
        await supabase
          .from('bets')
          .update({
            draw_numbers: drawnNumbers,
            hits,
            checked_at: new Date().toISOString(),
            status: hits >= 3 ? 'winner' : 'checked',
            prize_amount: value,
          } as any)
          .eq('id', bet.id);

        // Save detailed result_check to DB
        let savedToDB = false;
        const { error: checkError } = await supabase.from('result_checks').upsert({
          user_id: user.id,
          lottery: lottery.id,
          concurso: resultData.numero_concurso,
          data_concurso: resultData.data_concurso,
          draw_numbers: drawnNumbers,
          bet_numbers: betNumbers,
          hits,
          matched_numbers: matched,
          prize_tier: tier,
          prize_value: value,
          total_winners: resultData.premiacao?.reduce((s: number, p: any) => s + (p.ganhadores || p.numero_ganhadores || 0), 0) || 0,
          premiacao: resultData.premiacao || [],
          checked_at: new Date().toISOString(),
        } as any, { onConflict: 'user_id,lottery,concurso' });

        if (!checkError) {
          savedToDB = true;
        } else {
          console.error('Erro ao salvar resultado detalhado:', checkError);
        }

        results.push({
          betId: bet.id,
          hits,
          numbers: betNumbers,
          matched,
          prize: tier,
          prizeValue: value,
          savedToDB,
        });

        if (hits > 0) {
          toast.success(
            `🎯 ${lottery.name} #${resultData.numero_concurso}: ${hits} acerto(s)! ${tier}${value > 0 ? ` — ${formatPrize(value)}` : ''}`,
            { duration: 15000 }
          );
        }
      }

      setAllMatchResults(results);
      await loadSavedChecks();
    } catch (e) {
      console.error('Erro ao comparar apostas:', e);
    }
  };

  const calculatePrizeTier = (lottery: LotteryConfig, hits: number, premiacao: any[]): { tier: string; value: number } => {
    if (hits >= lottery.numbersCount) {
      const mainPrize = premiacao?.[0];
      return {
        tier: '💰 PRÊMIO PRINCIPAL!',
        value: parseFloat(String(mainPrize?.valorPremio || mainPrize?.valor_premio || 0).replace(/[^\d,.]/g, '').replace(',', '.')) || 0,
      };
    }
    if (hits >= lottery.numbersCount - 1) {
      const secondPrize = premiacao?.[1];
      return {
        tier: '🥈 Prêmio Secundário!',
        value: parseFloat(String(secondPrize?.valorPremio || secondPrize?.valor_premio || 0).replace(/[^\d,.]/g, '').replace(',', '.')) || 0,
      };
    }
    if (hits >= lottery.numbersCount - 2) {
      const thirdPrize = premiacao?.[2];
      return {
        tier: '🥉 Prêmio Terciário!',
        value: parseFloat(String(thirdPrize?.valorPremio || thirdPrize?.valor_premio || 0).replace(/[^\d,.]/g, '').replace(',', '.')) || 0,
      };
    }
    if (hits >= 3) {
      return { tier: `🎯 ${hits} acerto(s) — Prêmio menor`, value: 0 };
    }
    return { tier: `${hits} acerto(s)`, value: 0 };
  };

  // Auto-check every 5 min after 21h
  useEffect(() => {
    if (autoCheck) {
      const runAutoCheck = async () => {
        const now = getBrasiliaTime();
        if (now.getHours() >= 21) {
          for (const lottery of todaysLotteries) {
            setSelectedLottery(lottery);
            await fetchResult(lottery);
            await new Promise(r => setTimeout(r, 2000));
          }
        }
      };
      runAutoCheck();
      autoRef.current = setInterval(runAutoCheck, 5 * 60 * 1000);
    } else {
      if (autoRef.current) clearInterval(autoRef.current);
    }
    return () => { if (autoRef.current) clearInterval(autoRef.current); };
  }, [autoCheck, user]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-display font-bold">Resultados das Loterias</h1>
        <div className="flex items-center gap-3">
          <div className="glass px-3 py-1.5 rounded-lg flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <span className="font-mono text-sm text-primary">{formatBrasiliaHour(time)}</span>
          </div>
          <button
            onClick={() => setAutoCheck(!autoCheck)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg font-display font-semibold text-xs transition-all ${
              autoCheck ? 'bg-success/20 text-success border border-success/30' : 'glass text-muted-foreground'
            }`}
          >
            {autoCheck ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            {autoCheck ? 'AUTO ✓' : 'AUTO OFF'}
          </button>
        </div>
      </div>

      {autoCheck && (
        <div className="glass rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-success shrink-0" />
          <p className="text-xs text-muted-foreground">
            Verificação automática ativa — Após 21h, busca resultados a cada 5 min, compara com apostas e salva tudo no banco.
          </p>
        </div>
      )}

      {/* Prize Dashboard */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-5 border border-secondary/20">
        <div className="flex items-center gap-3 mb-3">
          <DollarSign className="w-6 h-6 text-secondary" />
          <h2 className="font-display font-bold text-foreground">Premiações do Dia</h2>
          <div className="ml-auto text-right">
            <p className="font-display font-bold text-secondary text-lg">{formatPrize(totalPrizeToday)}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
          {todaysLotteries.map(l => {
            const prize = LOTTERY_PRIZES[l.id];
            return (
              <div key={l.id} className="rounded-lg p-2 border border-border/40 bg-muted/10 text-center">
                <span className="text-[10px] font-display font-semibold" style={{ color: l.color }}>{l.name}</span>
                <p className="font-display font-bold text-xs text-foreground">{prize?.estimatedPrize || '---'}</p>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Lottery Selector */}
      <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
        {LOTTERIES.map((l) => {
          const isToday = todaysLotteries.some(t => t.id === l.id);
          return (
            <button
              key={l.id}
              onClick={() => { setSelectedLottery(l); setResult(null); setAllMatchResults([]); }}
              className={`px-3 py-2 rounded-lg text-xs font-display font-semibold transition-all relative
                ${selectedLottery.id === l.id ? 'text-primary-foreground' : 'glass text-foreground hover:border-primary/30'}`}
              style={selectedLottery.id === l.id ? { background: l.color } : {}}
            >
              {l.name}
              {isToday && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-success animate-pulse" />}
            </button>
          );
        })}
      </div>

      {/* Result Card */}
      <div className="glass rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-display font-bold" style={{ color: selectedLottery.color }}>{selectedLottery.name}</h2>
            {LOTTERY_PRIZES[selectedLottery.id] && (
              <p className="text-sm text-secondary font-display">Prêmio: {LOTTERY_PRIZES[selectedLottery.id].estimatedPrize}</p>
            )}
          </div>
          <button
            onClick={() => fetchResult()}
            disabled={loading}
            className="flex items-center gap-2 gradient-primary text-primary-foreground font-display px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Buscar Resultado
          </button>
        </div>

        {result ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex items-center gap-3">
              <Trophy className="w-5 h-5 text-secondary" />
              <span className="font-mono text-sm">Concurso #{result.numero_concurso}</span>
              <span className="text-xs text-muted-foreground">{result.data_concurso}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {result.dezenas?.map((n: string) => (
                <span key={n} className="w-12 h-12 rounded-full flex items-center justify-center font-mono font-bold text-lg text-primary-foreground" style={{ backgroundColor: selectedLottery.color }}>
                  {n}
                </span>
              ))}
            </div>

            {/* All Match Results */}
            {allMatchResults.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-success" />
                  <span className="font-display font-bold text-success">Conferência Detalhada — IA Ultra</span>
                </div>
                {allMatchResults.map((mr, idx) => (
                  <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
                    className="glass rounded-lg p-4 border border-success/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-secondary font-bold text-2xl">{mr.hits}</span>
                        <span className="text-sm text-foreground">acerto(s)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-display font-bold text-sm">{mr.prize}</span>
                        {mr.prizeValue > 0 && (
                          <span className="font-display font-bold text-success text-lg">{formatPrize(mr.prizeValue)}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {mr.numbers.map(n => (
                        <span key={n} className={`w-9 h-9 rounded-full flex items-center justify-center font-mono text-sm font-bold border-2 ${
                          mr.matched.includes(n) ? 'bg-success/20 border-success text-success' : 'border-muted text-muted-foreground'
                        }`}>
                          {n.toString().padStart(2, '0')}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {mr.savedToDB ? (
                        <span className="flex items-center gap-1 text-success"><Database className="w-3 h-3" /> Salvo no banco</span>
                      ) : (
                        <span className="flex items-center gap-1 text-warning"><Save className="w-3 h-3" /> Erro ao salvar</span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Premiação da API */}
            {result.premiacao && result.premiacao.length > 0 && (
              <div className="space-y-1.5">
                <h3 className="text-sm font-display font-semibold text-muted-foreground">Premiação Oficial:</h3>
                {result.premiacao.map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-xs bg-muted/20 rounded px-3 py-1.5">
                    <span className="text-foreground">{p.descricao || p.faixa || `Faixa ${i + 1}`}</span>
                    <span className="text-secondary font-mono">{p.valorPremio || p.valor_premio || '—'}</span>
                    <span className="text-muted-foreground">{p.ganhadores || p.numero_ganhadores || 0} ganhador(es)</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        ) : !loading ? (
          <div className="text-center py-10">
            <Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Clique em "Buscar Resultado" para ver o último sorteio.</p>
          </div>
        ) : null}
      </div>

      {/* Saved Results History */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h2 className="font-display font-bold text-foreground">Histórico de Conferências (Banco de Dados)</h2>
          <button onClick={loadSavedChecks} className="ml-auto text-xs text-primary hover:underline">
            <RefreshCw className="w-3 h-3 inline mr-1" />Atualizar
          </button>
        </div>
        {loadingSaved ? (
          <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : savedChecks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhuma conferência salva. Busque um resultado para gerar.</p>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {savedChecks.map((sc) => {
              const lottery = LOTTERIES.find(l => l.id === sc.lottery);
              return (
                <div key={sc.id} className="flex items-center justify-between bg-muted/20 rounded-lg px-4 py-3 border border-border/30">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ background: lottery?.color }} />
                    <div>
                      <span className="text-sm font-display font-semibold" style={{ color: lottery?.color }}>{lottery?.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">#{sc.concurso}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-lg font-bold text-secondary">{sc.hits}</p>
                      <p className="text-[10px] text-muted-foreground">acertos</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-display font-bold text-foreground">{sc.prize_tier || '—'}</p>
                    </div>
                    {sc.prize_value > 0 && (
                      <div className="text-center">
                        <p className="text-sm font-display font-bold text-success">{formatPrize(sc.prize_value)}</p>
                        <p className="text-[10px] text-muted-foreground">a receber</p>
                      </div>
                    )}
                    <div className="text-[10px] text-muted-foreground">
                      {formatBrasiliaTime(new Date(sc.checked_at))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsPage;
