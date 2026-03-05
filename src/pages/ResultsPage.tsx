import { useState, useEffect, useRef } from 'react';
import { LOTTERIES, type LotteryConfig, getBrasiliaTime, formatBrasiliaHour, getTodaysLotteries } from '@/lib/lotteryConstants';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, RefreshCw, Loader2, Bell, BellOff, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface ResultData {
  numero_concurso: number;
  data_concurso: string;
  dezenas: string[];
  premiacao: any[];
}

const ResultsPage = () => {
  const { user } = useAuth();
  const [selectedLottery, setSelectedLottery] = useState<LotteryConfig>(LOTTERIES[0]);
  const [result, setResult] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoCheck, setAutoCheck] = useState(false);
  const [matchResults, setMatchResults] = useState<{ hits: number; numbers: number[]; matched: number[]; prize: string } | null>(null);
  const [time, setTime] = useState(getBrasiliaTime());
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const i = setInterval(() => setTime(getBrasiliaTime()), 1000);
    return () => clearInterval(i);
  }, []);

  const fetchResult = async (lottery?: LotteryConfig) => {
    const target = lottery || selectedLottery;
    setLoading(true);
    setResult(null);
    setMatchResults(null);
    try {
      const res = await fetch(`https://apiloterias.com.br/app/v2/resultado?loteria=${target.apiName}&token=demo`);
      if (res.ok) {
        const data = await res.json();
        setResult(data);
        // Auto-compare with user bets
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

      for (const bet of bets) {
        const betNumbers = bet.numbers as number[];
        const matched = betNumbers.filter(n => drawnNumbers.includes(n));
        const hits = matched.length;

        // Update bet in database
        await supabase
          .from('bets')
          .update({
            draw_numbers: drawnNumbers,
            hits,
            checked_at: new Date().toISOString(),
            status: hits >= 3 ? 'winner' : 'checked',
          } as any)
          .eq('id', bet.id);

        if (hits > 0) {
          setMatchResults({
            hits,
            numbers: betNumbers,
            matched,
            prize: hits >= lottery.numbersCount ? '💰 PRÊMIO PRINCIPAL!' :
                   hits >= lottery.numbersCount - 1 ? '🥈 Prêmio Secundário!' :
                   hits >= lottery.numbersCount - 2 ? '🥉 Prêmio Terciário!' :
                   `${hits} acerto(s)`,
          });

          toast.success(
            `🎯 Concurso #${resultData.numero_concurso} — ${lottery.name}: ${hits} acerto(s)!${hits >= lottery.numbersCount - 1 ? ' 🏆 PREMIADO!' : ''}`,
            { duration: 15000 }
          );
        }
      }
    } catch (e) {
      console.error('Erro ao comparar apostas:', e);
    }
  };

  // Auto-check: every 5 minutes after 21h for today's lotteries
  useEffect(() => {
    if (autoCheck) {
      const runAutoCheck = async () => {
        const now = getBrasiliaTime();
        const hour = now.getHours();
        if (hour >= 21) {
          const todayLotteries = getTodaysLotteries();
          for (const lottery of todayLotteries) {
            setSelectedLottery(lottery);
            await fetchResult(lottery);
            await new Promise(r => setTimeout(r, 2000));
          }
        }
      };
      runAutoCheck();
      autoRef.current = setInterval(runAutoCheck, 5 * 60 * 1000); // 5 min
    } else {
      if (autoRef.current) clearInterval(autoRef.current);
    }
    return () => { if (autoRef.current) clearInterval(autoRef.current); };
  }, [autoCheck, user]);

  const todaysLotteries = getTodaysLotteries();

  return (
    <div className="p-6 space-y-6">
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
            Verificação automática ativa — Após 21h, busca resultados a cada 5 min e compara com suas apostas confirmadas.
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
        {LOTTERIES.map((l) => {
          const isToday = todaysLotteries.some(t => t.id === l.id);
          return (
            <button
              key={l.id}
              onClick={() => { setSelectedLottery(l); setResult(null); setMatchResults(null); }}
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

      <div className="glass rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-display font-bold" style={{ color: selectedLottery.color }}>
            {selectedLottery.name}
          </h2>
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
                <span
                  key={n}
                  className="w-12 h-12 rounded-full flex items-center justify-center font-mono font-bold text-lg"
                  style={{ backgroundColor: selectedLottery.color, color: '#fff' }}
                >
                  {n}
                </span>
              ))}
            </div>

            {/* Match Results */}
            {matchResults && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-lg p-4 border border-success/30">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-success" />
                  <span className="font-display font-bold text-success">Conferência Automática</span>
                </div>
                <p className="text-sm text-foreground mb-2">
                  <span className="text-secondary font-bold text-lg">{matchResults.hits}</span> acerto(s) — {matchResults.prize}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {matchResults.numbers.map(n => (
                    <span
                      key={n}
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-mono text-sm font-bold border-2 ${
                        matchResults.matched.includes(n)
                          ? 'bg-success/20 border-success text-success'
                          : 'border-muted text-muted-foreground'
                      }`}
                    >
                      {n.toString().padStart(2, '0')}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Premiação */}
            {result.premiacao && result.premiacao.length > 0 && (
              <div className="space-y-1.5">
                <h3 className="text-sm font-display font-semibold text-muted-foreground">Premiação:</h3>
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
    </div>
  );
};

export default ResultsPage;
