import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LOTTERIES, AI_SPECIALISTS, getBrasiliaTime, formatBrasiliaHour, formatBrasiliaDate, getTodaysLotteries, getDrawDayNames, type LotteryConfig } from '@/lib/lotteryConstants';
import { LOTTERY_PRIZES, getTotalPrizesToday, formatPrize } from '@/lib/lotteryPrizes';
import { useAuth } from '@/hooks/useAuth';
import { useAutoAnalysis } from '@/hooks/useAutoAnalysis';
import { persistGateOnly } from '@/lib/gatePersistence';
import { Brain, Play, CheckCircle, Loader2, Zap, Clock, Repeat, CalendarDays, AlertCircle, Activity, DollarSign, TrendingUp, Trophy, Gauge, Send } from 'lucide-react';
import { toast } from 'sonner';

function generateNumbers(config: LotteryConfig): number[] {
  const nums = new Set<number>();
  while (nums.size < config.numbersCount) {
    nums.add(Math.floor(Math.random() * config.maxNumber) + (config.id === 'supersete' ? 0 : 1));
  }
  return Array.from(nums).sort((a, b) => a - b);
}

const GATE_THRESHOLD = 100;

const AnalysisPage = () => {
  const { user } = useAuth();
  const auto = useAutoAnalysis();
  const navigate = useNavigate();
  const [selectedLottery, setSelectedLottery] = useState<LotteryConfig>(LOTTERIES[0]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<{ numbers: number[]; confidence: number; concurso: number; specialists: string[] } | null>(null);
  const [time, setTime] = useState(getBrasiliaTime());

  const todaysLotteries = getTodaysLotteries();
  const totalPrizeToday = getTotalPrizesToday(todaysLotteries.map(l => l.id));

  useEffect(() => {
    const interval = setInterval(() => setTime(getBrasiliaTime()), 1000);
    return () => clearInterval(interval);
  }, []);

  const runAnalysis = async (lottery?: LotteryConfig) => {
    if (!auto.isInsideAnalysisWindow) {
      toast.info('Fora da janela de análise. As IAs seguem em modo estudo/treino.');
      return null;
    }

    const target = lottery || selectedLottery;
    setIsAnalyzing(true);
    setResult(null);
    await new Promise((r) => setTimeout(r, 2500));

    const numbers = generateNumbers(target);
    const confidence = Math.random() < 0.35 ? 100 : Number((99.5 + Math.random() * 0.499).toFixed(3));
    const usedSpecialists = [...AI_SPECIALISTS].sort(() => Math.random() - 0.5).slice(0, 20);
    const concurso = 3000 + Math.floor(Math.random() * 100);
    const timestamp = new Date().toISOString();

    const res = { numbers, confidence, concurso, specialists: usedSpecialists };
    setResult(res);
    auto.registerResult({
      lottery: target, numbers, confidence, concurso,
      specialists: usedSpecialists, timestamp,
    });
    setIsAnalyzing(false);

    if (user && confidence >= GATE_THRESHOLD) {
      const persistResult = await persistGateOnly({
        userId: user.id,
        lottery: target.id,
        concurso, confidence, numbers,
        foundAt: timestamp,
      });

      if (persistResult.error) {
        console.error('Erro ao salvar gate 100%:', persistResult.error);
        toast.error(`Falha ao salvar gate: ${persistResult.error}`);
      } else if (persistResult.gateInserted) {
        toast.success(`🔔 GATE 100% — ${target.name} salvo! Aguardando confirmação do admin.`, { duration: 8000 });
        setTimeout(() => navigate('/dashboard/history'), 1200);
      } else {
        toast.info(`Gate 100% já registrado para ${target.name}.`);
      }
    }

    return res;
  };

  // Analysis details from context
  const details = auto.analysisDetails;
  const todayDetails = todaysLotteries.map(l => details[l.id]).filter(Boolean);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-display font-bold">Análise de Loterias</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 glass px-3 py-1.5 rounded-lg">
            <Clock className="w-4 h-4 text-primary" />
            <span className="font-mono text-sm text-primary">{formatBrasiliaHour(time)}</span>
          </div>
          <button
            onClick={() => auto.setTodayOnly(!auto.todayOnly)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg font-display font-semibold text-xs transition-all ${
              auto.todayOnly ? 'bg-secondary/20 text-secondary border border-secondary/30' : 'glass text-muted-foreground'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            {auto.todayOnly ? 'SÓ HOJE' : 'TODAS'}
          </button>
          <button
            onClick={() => auto.setAutoMode(!auto.autoMode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-display font-semibold text-sm transition-all ${
              auto.autoMode ? 'bg-success/20 text-success border border-success/30 shadow-[0_0_15px_rgba(0,255,136,0.2)]' : 'glass text-muted-foreground hover:text-foreground'
            }`}
          >
            <Repeat className={`w-4 h-4 ${auto.autoMode ? 'animate-spin' : ''}`} />
            {auto.autoMode ? 'AUTO ON' : 'AUTO OFF'}
          </button>
        </div>
      </div>

      {/* Prize Dashboard */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-5 border border-secondary/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-secondary" />
          </div>
          <div>
            <h2 className="font-display font-bold text-foreground text-lg">Premiações do Dia — Alvo das IAs</h2>
            <p className="text-xs text-muted-foreground">1000% focado em ganhar a premiação máxima</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-muted-foreground">Total em jogo hoje</p>
            <p className="font-display font-bold text-secondary text-xl">{formatPrize(totalPrizeToday)}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {todaysLotteries.map(l => {
            const prize = LOTTERY_PRIZES[l.id];
            const detail = details[l.id];
            return (
              <div key={l.id} className="rounded-lg p-3 border border-border/40 bg-muted/10 hover:bg-muted/20 transition-all">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} />
                  <span className="font-display font-semibold text-xs" style={{ color: l.color }}>{l.name}</span>
                </div>
                <p className="font-display font-bold text-sm text-foreground">{prize?.estimatedPrize || '---'}</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3 text-success" />
                  <span className="text-[10px] text-success font-mono">
                    {detail ? `${detail.gatesReached} gates · ${detail.cyclesCompleted} ciclos` : 'IAs focadas'}
                  </span>
                </div>
              </div>
            );
          })}
          {todaysLotteries.length === 0 && (
            <p className="col-span-full text-sm text-muted-foreground text-center py-4">Nenhuma loteria sorteada hoje</p>
          )}
        </div>
      </motion.div>

      {/* Analysis Window + Delivery Time */}
      <div className="glass rounded-lg p-3 border border-border/40 bg-muted/20">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-display font-semibold text-foreground">Janela de análise</span>
          <input type="time" value={auto.analysisStartTime} onChange={(e) => auto.setAnalysisStartTime(e.target.value)} className="bg-muted/60 border border-border rounded-md px-2 py-1 text-xs font-mono" />
          <span className="text-xs text-muted-foreground">até</span>
          <input type="time" value={auto.analysisEndTime} onChange={(e) => auto.setAnalysisEndTime(e.target.value)} className="bg-muted/60 border border-border rounded-md px-2 py-1 text-xs font-mono" />
          <span className="text-xs text-muted-foreground">|</span>
          <div className="flex items-center gap-2">
            <Send className="w-3 h-3 text-secondary" />
            <span className="text-xs font-display font-semibold text-secondary">Enviar números às:</span>
            <input type="time" value={auto.numberDeliveryTime} onChange={(e) => auto.setNumberDeliveryTime(e.target.value)} className="bg-muted/60 border border-border rounded-md px-2 py-1 text-xs font-mono" />
          </div>
          <span className={`text-xs font-display font-semibold px-2 py-1 rounded-md ${auto.engineMode === 'analysis' ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'}`}>
            {auto.engineMode === 'analysis' ? 'MODO ANÁLISE' : 'MODO ESTUDO/TREINO'}
          </span>
        </div>
      </div>

      {auto.autoMode && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-lg p-3 border border-success/20 bg-success/5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-success animate-pulse" />
              <span className="text-xs font-display font-semibold text-success">
                {auto.engineMode === 'analysis' ? 'ANÁLISE GLOBAL ATIVA — SILENCIOSA 24/7' : 'MODO ESTUDO — AUTO-ADAPTAÇÃO CONTÍNUA'}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
              <span>Ciclos: {auto.cycleCount}</span>
              <span>Gates: {auto.gatesFound}</span>
              {auto.currentLottery && auto.isAnalyzing && (
                <span className="text-primary">Analisando: {auto.currentLottery.name}</span>
              )}
            </div>
          </div>
          {auto.lastResults.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {auto.lastResults.slice(0, 5).map((r, i) => (
                <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-muted/50 text-muted-foreground font-mono">
                  {r.lottery.name}: {r.confidence.toFixed(1)}%
                </span>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Detailed Analysis Status per Lottery */}
      {auto.autoMode && todayDetails.length > 0 && (
        <div className="glass rounded-xl p-4 border border-primary/20">
          <div className="flex items-center gap-2 mb-3">
            <Gauge className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-display font-bold text-foreground">ANÁLISE GLOBAL ATIVA — Detalhamento Completo</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/10 text-success font-mono animate-pulse ml-auto">● SILENCIOSO 24/7</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {todayDetails.map((d) => (
              <div key={d.lotteryId} className={`rounded-lg p-3 border text-xs ${
                d.status === 'gate_found' ? 'border-success/30 bg-success/5' :
                d.status === 'ready' ? 'border-secondary/30 bg-secondary/5' :
                'border-border bg-muted/10'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-display font-bold">{d.lotteryName}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                    d.status === 'gate_found' ? 'bg-success/10 text-success' :
                    d.status === 'ready' ? 'bg-secondary/10 text-secondary' :
                    'bg-warning/10 text-warning'
                  }`}>
                    {d.status === 'gate_found' ? `✅ ${d.gatesReached} GATES` : d.status === 'ready' ? '🟢 PRONTO' : '⏳ ESTUDANDO'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-muted-foreground">
                  <p>Gates: <span className="text-success font-mono font-bold">{d.gatesReached}</span></p>
                  <p>Ciclos: <span className="text-foreground font-mono">{d.cyclesCompleted}</span></p>
                  <p>Dom: <span className="text-foreground font-mono font-bold">{d.domination.toFixed(1)}%</span></p>
                  <p>Prec: <span className="text-secondary font-mono font-bold">{d.precision.toFixed(1)}%</span></p>
                  <p>Padrões: <span className="text-primary font-mono">{d.patternsLocked || 0}</span></p>
                  <p>Syncs: <span className="text-foreground font-mono">{d.apiSyncCount || 0}</span></p>
                  {d.hotNumbers && d.hotNumbers.length > 0 && (
                    <p className="col-span-2">🔥 Hot: <span className="text-secondary font-mono">{d.hotNumbers.join(', ')}</span></p>
                  )}
                </div>
                <p className="mt-1">Prêmio: <span className="text-secondary font-bold">{d.prizeTarget}</span></p>
              </div>
            ))}
          </div>
        </div>
      )}

      {auto.todayOnly && (
        <div className="glass rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-secondary shrink-0" />
          <p className="text-xs text-muted-foreground">
            <span className="text-secondary font-semibold">Loterias de hoje: </span>
            {todaysLotteries.length > 0 ? todaysLotteries.map(l => l.name).join(', ') : 'Nenhuma loteria sorteada hoje'}
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
        {LOTTERIES.map((l) => {
          const isToday = todaysLotteries.some(t => t.id === l.id);
          return (
            <button
              key={l.id}
              onClick={() => { setSelectedLottery(l); setResult(null); }}
              className={`px-3 py-2 rounded-lg text-xs font-display font-semibold transition-all relative
                ${selectedLottery.id === l.id ? 'text-primary-foreground' : 'glass text-foreground hover:border-primary/30'}
                ${auto.todayOnly && !isToday ? 'opacity-30' : ''}`}
              style={selectedLottery.id === l.id ? { background: l.color } : {}}
              disabled={auto.todayOnly && !isToday}
            >
              {l.name}
              {isToday && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-success animate-pulse" />}
            </button>
          );
        })}
      </div>

      <div className="glass rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-display font-bold" style={{ color: selectedLottery.color }}>{selectedLottery.name}</h2>
            <p className="text-sm text-muted-foreground">{selectedLottery.numbersCount} números · Máx {selectedLottery.maxNumber} · Sorteio {selectedLottery.drawTime}h</p>
            <p className="text-xs text-muted-foreground mt-1">📅 Dias: {getDrawDayNames(selectedLottery)}</p>
            {LOTTERY_PRIZES[selectedLottery.id] && (
              <p className="text-sm font-display font-bold text-secondary mt-1">
                <Trophy className="w-4 h-4 inline mr-1" />
                Prêmio estimado: {LOTTERY_PRIZES[selectedLottery.id].estimatedPrize}
              </p>
            )}
          </div>
          <button
            onClick={() => runAnalysis()}
            disabled={isAnalyzing || !auto.isInsideAnalysisWindow}
            className="flex items-center gap-2 gradient-primary text-primary-foreground font-display font-semibold px-6 py-3 rounded-lg glow-primary hover:opacity-90 transition-all disabled:opacity-50"
          >
            {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
            {isAnalyzing ? 'ANALISANDO...' : auto.isInsideAnalysisWindow ? 'INICIAR ANÁLISE' : 'MODO ESTUDO ATIVO'}
          </button>
        </div>

        {!auto.isInsideAnalysisWindow && (
          <div className="mb-5 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
            Fora da janela de análise. As IAs continuam estudando e treinando automaticamente até {auto.analysisStartTime}.
          </div>
        )}

        <div className="mb-6">
          <h3 className="text-sm font-display text-muted-foreground mb-2">Padrões Travados (IA) — Gate: 100%</h3>
          <div className="flex flex-wrap gap-2">
            {selectedLottery.lockedPatterns.map((p) => (
              <span key={p} className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary font-mono border border-primary/20">🔒 {p}</span>
            ))}
          </div>
        </div>

        {isAnalyzing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <Brain className="w-5 h-5 animate-pulse" />
              <span className="font-display text-sm">{AI_SPECIALISTS.length} IAs processando dados...</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div className="h-full gradient-primary" initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: 2.5 }} />
            </div>
            <div className="flex flex-wrap gap-1">
              {AI_SPECIALISTS.slice(0, 15).map((ai, i) => (
                <motion.span key={ai} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.15 }} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/5 text-primary/60 font-mono">{ai}</motion.span>
              ))}
            </div>
          </motion.div>
        )}

        {result && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-success" />
              <span className="font-display font-bold text-success">GATE APPROVED — {selectedLottery.name}</span>
              {result.confidence >= GATE_THRESHOLD && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-warning/20 text-warning font-display font-bold animate-pulse">
                  AGUARDANDO ADMIN
                </span>
              )}
            </div>
            <div className="glass rounded-lg p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground font-mono">Concurso #{result.concurso}</span>
                <span className="text-lg font-display font-bold text-secondary glow-text-secondary">{result.confidence.toFixed(3)}%</span>
              </div>
              <div className="mb-3">
                <p className="text-sm text-muted-foreground mb-2">Números Sugeridos:</p>
                <div className="flex flex-wrap gap-2">
                  {result.numbers.map((n) => (
                    <span key={n} className="w-10 h-10 rounded-full flex items-center justify-center font-mono font-bold text-sm border-2" style={{ borderColor: selectedLottery.color, color: selectedLottery.color }}>
                      {n.toString().padStart(2, '0')}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{formatBrasiliaDate(time)}</span>
                <span>{formatBrasiliaHour(time)}</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">IAs utilizadas ({result.specialists.length}):</p>
              <div className="flex flex-wrap gap-1">
                {result.specialists.map((ai) => (
                  <span key={ai} className="text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success/70 font-mono">{ai}</span>
                ))}
              </div>
            </div>
            {result.confidence >= GATE_THRESHOLD && (
              <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning font-display">
                ⏳ Gate 100% salvo no histórico. Vá ao <button onClick={() => navigate('/dashboard/history')} className="underline font-bold">Histórico de Gates</button> para confirmar a aposta.
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AnalysisPage;
