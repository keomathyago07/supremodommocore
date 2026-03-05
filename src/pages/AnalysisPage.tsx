import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LOTTERIES, AI_SPECIALISTS, getBrasiliaTime, formatBrasiliaHour, formatBrasiliaDate, type LotteryConfig } from '@/lib/lotteryConstants';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Brain, Play, CheckCircle, Loader2, Zap, Clock } from 'lucide-react';
import { toast } from 'sonner';

function generateNumbers(config: LotteryConfig): number[] {
  const nums = new Set<number>();
  while (nums.size < config.numbersCount) {
    nums.add(Math.floor(Math.random() * config.maxNumber) + (config.id === 'supersete' ? 0 : 1));
  }
  return Array.from(nums).sort((a, b) => a - b);
}

const AnalysisPage = () => {
  const { user } = useAuth();
  const [selectedLottery, setSelectedLottery] = useState<LotteryConfig>(LOTTERIES[0]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<{ numbers: number[]; confidence: number; concurso: number; specialists: string[] } | null>(null);
  const [time, setTime] = useState(getBrasiliaTime());
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setTime(getBrasiliaTime()), 1000);
    return () => clearInterval(interval);
  }, []);

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    setResult(null);
    // Simulate AI analysis
    await new Promise((r) => setTimeout(r, 2500));
    const numbers = generateNumbers(selectedLottery);
    const confidence = 99.5 + Math.random() * 0.5;
    const usedSpecialists = AI_SPECIALISTS.sort(() => Math.random() - 0.5).slice(0, 20);
    const concurso = 3000 + Math.floor(Math.random() * 100);
    setResult({ numbers, confidence, concurso, specialists: usedSpecialists });
    setIsAnalyzing(false);

    // Auto-save to gate history if confidence >= threshold
    if (user && confidence >= 99.9) {
      await supabase.from('gate_history').insert({
        user_id: user.id,
        lottery: selectedLottery.id,
        concurso,
        confidence: parseFloat(confidence.toFixed(3)),
        numbers,
        gate_status: 'APPROVED',
        found_at: new Date().toISOString(),
      } as any);
      toast.success(`GATE APPROVED — ${selectedLottery.name} — ${confidence.toFixed(3)}%`);
    }
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
      toast.success('Aposta confirmada e salva no banco de dados!');
    }
    setConfirming(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">Análise de Loterias</h1>
        <div className="flex items-center gap-2 glass px-3 py-1.5 rounded-lg">
          <Clock className="w-4 h-4 text-primary" />
          <span className="font-mono text-sm text-primary">{formatBrasiliaHour(time)}</span>
        </div>
      </div>

      {/* Lottery Selector */}
      <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
        {LOTTERIES.map((l) => (
          <button
            key={l.id}
            onClick={() => { setSelectedLottery(l); setResult(null); }}
            className={`px-3 py-2 rounded-lg text-xs font-display font-semibold transition-all
              ${selectedLottery.id === l.id ? 'glow-primary text-primary-foreground' : 'glass text-foreground hover:border-primary/30'}`}
            style={selectedLottery.id === l.id ? { background: l.color } : {}}
          >
            {l.name}
          </button>
        ))}
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
          </div>
          <button
            onClick={runAnalysis}
            disabled={isAnalyzing}
            className="flex items-center gap-2 gradient-primary text-primary-foreground font-display font-semibold px-6 py-3 rounded-lg glow-primary hover:opacity-90 transition-all disabled:opacity-50"
          >
            {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
            {isAnalyzing ? 'ANALISANDO...' : 'INICIAR ANÁLISE'}
          </button>
        </div>

        {/* Locked Patterns */}
        <div className="mb-6">
          <h3 className="text-sm font-display text-muted-foreground mb-2">Padrões Travados (IA)</h3>
          <div className="flex flex-wrap gap-2">
            {selectedLottery.lockedPatterns.map((p) => (
              <span key={p} className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary font-mono border border-primary/20">
                🔒 {p}
              </span>
            ))}
          </div>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Estes padrões NÃO podem ser alterados. As IAs trabalham exclusivamente com eles.
          </p>
        </div>

        {/* Analysis Progress */}
        {isAnalyzing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2 text-primary">
              <Brain className="w-5 h-5 animate-pulse-glow" />
              <span className="font-display text-sm">IAs processando dados...</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full gradient-primary"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 2.5 }}
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {AI_SPECIALISTS.slice(0, 15).map((ai, i) => (
                <motion.span
                  key={ai}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.15 }}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-primary/5 text-primary/60 font-mono"
                >
                  {ai}
                </motion.span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Result */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-success" />
              <span className="font-display font-bold text-success">GATE APPROVED — {selectedLottery.name}</span>
            </div>

            <div className="glass rounded-lg p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground font-mono">Concurso #{result.concurso}</span>
                <span className="text-lg font-display font-bold text-secondary glow-text-secondary">
                  {result.confidence.toFixed(3)}%
                </span>
              </div>

              <div className="mb-3">
                <p className="text-sm text-muted-foreground mb-2">Números Sugeridos:</p>
                <div className="flex flex-wrap gap-2">
                  {result.numbers.map((n) => (
                    <span
                      key={n}
                      className="w-10 h-10 rounded-full flex items-center justify-center font-mono font-bold text-sm border-2"
                      style={{ borderColor: selectedLottery.color, color: selectedLottery.color }}
                    >
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
                  <span key={ai} className="text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success/70 font-mono">
                    {ai}
                  </span>
                ))}
              </div>
            </div>

            {/* Confirm Bet Button */}
            <button
              onClick={confirmBet}
              disabled={confirming}
              className="w-full flex items-center justify-center gap-2 gradient-gold text-secondary-foreground font-display font-bold py-3 rounded-lg glow-secondary hover:opacity-90 transition-all disabled:opacity-50 text-lg tracking-wider"
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
