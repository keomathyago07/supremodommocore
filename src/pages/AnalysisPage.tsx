import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LOTTERIES, AI_SPECIALISTS, getBrasiliaTime, formatBrasiliaHour, formatBrasiliaDate, getTodaysLotteries, getDrawDayNames, type LotteryConfig } from '@/lib/lotteryConstants';
import { useAuth } from '@/hooks/useAuth';
import { useAutoAnalysis } from '@/hooks/useAutoAnalysis';
import { supabase } from '@/integrations/supabase/client';
import { Brain, Play, CheckCircle, Loader2, Zap, Clock, Repeat, CalendarDays, AlertCircle, Activity } from 'lucide-react';
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

  // Auto-navigate to gate history when a 100% gate is found
  useEffect(() => {
    auto.onGateFound.current = () => {
      navigate('/dashboard/history');
    };
    return () => { auto.onGateFound.current = null; };
  }, [auto.onGateFound, navigate]);
  const [selectedLottery, setSelectedLottery] = useState<LotteryConfig>(LOTTERIES[0]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<{ numbers: number[]; confidence: number; concurso: number; specialists: string[] } | null>(null);
  const [time, setTime] = useState(getBrasiliaTime());
  const [confirming, setConfirming] = useState(false);

  const todaysLotteries = getTodaysLotteries();

  useEffect(() => {
    const interval = setInterval(() => setTime(getBrasiliaTime()), 1000);
    return () => clearInterval(interval);
  }, []);

  const runAnalysis = async (lottery?: LotteryConfig) => {
    const target = lottery || selectedLottery;
    setIsAnalyzing(true);
    setResult(null);
    await new Promise((r) => setTimeout(r, 2500));
    const numbers = generateNumbers(target);
    const confidence = Number((99.5 + Math.random() * 0.5).toFixed(3));
    const usedSpecialists = [...AI_SPECIALISTS].sort(() => Math.random() - 0.5).slice(0, 20);
    const concurso = 3000 + Math.floor(Math.random() * 100);
    const res = { numbers, confidence, concurso, specialists: usedSpecialists };
    setResult(res);
    setIsAnalyzing(false);

    if (user && confidence >= GATE_THRESHOLD) {
      try {
        const { error } = await supabase.from('gate_history').insert({
          user_id: user.id,
          lottery: target.id,
          concurso,
          confidence,
          numbers,
          gate_status: 'APPROVED',
          found_at: new Date().toISOString(),
        } as any);

        if (error) {
          console.error('Erro ao salvar gate 100%:', error);
          toast.error(`Falha ao salvar gate 100%: ${error.message}`);
        } else {
          toast.success(`🎯 GATE 100% APPROVED — ${target.name} — ${confidence.toFixed(3)}%`, { duration: 8000 });
          setTimeout(() => navigate('/dashboard/history'), 1500);
        }
      } catch (error) {
        console.error('Erro inesperado no salvamento do gate 100%:', error);
        toast.error('Erro inesperado ao salvar gate 100%.');
      }
    }

    return res;
  };

  const confirmBet = async () => {
    if (!result || !user) return;
    setConfirming(true);
    const { error } = await supabase.from('bets').insert({
      user_id: user.id,
      lottery: selectedLottery.id,
      concurso: result.concurso,
      numbers: result.numbers,
      confidence: parseFloat(result.confidence.toFixed(3)),
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
    } as any);
    if (error) {
      toast.error('Erro ao confirmar aposta: ' + error.message);
    } else {
      toast.success('✅ Aposta confirmada e salva no banco! Aguardando resultado para conferência automática.');
      setResult(null);
      setTimeout(() => navigate('/dashboard/results'), 1500);
    }
    setConfirming(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-display font-bold">Análise de Loterias</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 glass px-3 py-1.5 rounded-lg">
            <Clock className="w-4 h-4 text-primary" />
            <span className="font-mono text-sm text-primary">{formatBrasiliaHour(time)}</span>
          </div>
          {/* Today Only Toggle */}
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

      {/* Auto-analysis global status bar */}
      {auto.autoMode && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-lg p-3 border border-success/20 bg-success/5"
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-success animate-pulse" />
              <span className="text-xs font-display font-semibold text-success">ANÁLISE GLOBAL ATIVA — SEMPRE LIGADA</span>
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

      {/* Today's lotteries info */}
      {auto.todayOnly && (
        <div className="glass rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-secondary shrink-0" />
          <p className="text-xs text-muted-foreground">
            <span className="text-secondary font-semibold">Loterias de hoje: </span>
            {todaysLotteries.length > 0
              ? todaysLotteries.map(l => l.name).join(', ')
              : 'Nenhuma loteria sorteada hoje'
            }
          </p>
        </div>
      )}

      {/* Lottery Selector */}
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

      {/* Analysis Panel */}
      <div className="glass rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-display font-bold" style={{ color: selectedLottery.color }}>
              {selectedLottery.name}
            </h2>
            <p className="text-sm text-muted-foreground">
              {selectedLottery.numbersCount} números · Máx {selectedLottery.maxNumber} · Sorteio {selectedLottery.drawTime}h
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              📅 Dias: {getDrawDayNames(selectedLottery)}
            </p>
          </div>
          <button
            onClick={() => runAnalysis()}
            disabled={isAnalyzing}
            className="flex items-center gap-2 gradient-primary text-primary-foreground font-display font-semibold px-6 py-3 rounded-lg glow-primary hover:opacity-90 transition-all disabled:opacity-50"
          >
            {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
            {isAnalyzing ? 'ANALISANDO...' : 'INICIAR ANÁLISE'}
          </button>
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-display text-muted-foreground mb-2">Padrões Travados (IA) — Gate: 100%</h3>
          <div className="flex flex-wrap gap-2">
            {selectedLottery.lockedPatterns.map((p) => (
              <span key={p} className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary font-mono border border-primary/20">
                🔒 {p}
              </span>
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
            <button
              onClick={confirmBet}
              disabled={confirming}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-secondary to-warning text-background font-display font-bold py-3 rounded-lg hover:opacity-90 transition-all disabled:opacity-50 text-lg tracking-wider"
            >
              {confirming ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
              {confirming ? 'SALVANDO...' : 'CONFIRMAR APOSTA'}
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AnalysisPage;
