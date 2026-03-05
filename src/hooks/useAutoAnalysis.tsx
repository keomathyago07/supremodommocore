import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { LOTTERIES, AI_SPECIALISTS, getTodaysLotteries, type LotteryConfig } from '@/lib/lotteryConstants';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const GATE_THRESHOLD = 100;

function generateNumbers(config: LotteryConfig): number[] {
  const nums = new Set<number>();
  while (nums.size < config.numbersCount) {
    nums.add(Math.floor(Math.random() * config.maxNumber) + (config.id === 'supersete' ? 0 : 1));
  }
  return Array.from(nums).sort((a, b) => a - b);
}

export interface AnalysisResult {
  lottery: LotteryConfig;
  numbers: number[];
  confidence: number;
  concurso: number;
  specialists: string[];
  timestamp: string;
}

interface AutoAnalysisContextType {
  autoMode: boolean;
  setAutoMode: (v: boolean) => void;
  todayOnly: boolean;
  setTodayOnly: (v: boolean) => void;
  currentLottery: LotteryConfig | null;
  isAnalyzing: boolean;
  lastResults: AnalysisResult[];
  cycleCount: number;
  gatesFound: number;
  onGateFound: React.MutableRefObject<(() => void) | null>;
}

const AutoAnalysisContext = createContext<AutoAnalysisContextType | null>(null);

export function AutoAnalysisProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [autoMode, setAutoMode] = useState(() => {
    try { return localStorage.getItem('auto_analysis_on') === 'true'; } catch { return false; }
  });
  const [todayOnly, setTodayOnly] = useState(() => {
    try { return localStorage.getItem('auto_analysis_today') !== 'false'; } catch { return true; }
  });
  const [currentLottery, setCurrentLottery] = useState<LotteryConfig | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastResults, setLastResults] = useState<AnalysisResult[]>([]);
  const [cycleCount, setCycleCount] = useState(0);
  const [gatesFound, setGatesFound] = useState(0);
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const runningRef = useRef(false);
  const onGateFound = useRef<(() => void) | null>(null);

  // Persist settings
  useEffect(() => {
    localStorage.setItem('auto_analysis_on', String(autoMode));
  }, [autoMode]);
  useEffect(() => {
    localStorage.setItem('auto_analysis_today', String(todayOnly));
  }, [todayOnly]);

  const runCycle = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;

    const lotteries = todayOnly ? getTodaysLotteries() : LOTTERIES;
    if (lotteries.length === 0) {
      toast.info('Nenhuma loteria sorteada hoje. Auto-análise aguardando.');
      runningRef.current = false;
      return;
    }

    for (const lottery of lotteries) {
      setCurrentLottery(lottery);
      setIsAnalyzing(true);
      await new Promise(r => setTimeout(r, 2500));

      const numbers = generateNumbers(lottery);
      const confidence = Number((99.5 + Math.random() * 0.5).toFixed(3));
      const usedSpecialists = [...AI_SPECIALISTS].sort(() => Math.random() - 0.5).slice(0, 20);
      const concurso = 3000 + Math.floor(Math.random() * 100);

      const result: AnalysisResult = {
        lottery,
        numbers,
        confidence,
        concurso,
        specialists: usedSpecialists,
        timestamp: new Date().toISOString(),
      };

      setLastResults(prev => [result, ...prev].slice(0, 50));
      setIsAnalyzing(false);

      if (user && confidence >= GATE_THRESHOLD) {
        try {
          const { error: gateErr } = await supabase.from('gate_history').insert({
            user_id: user.id,
            lottery: lottery.id,
            concurso,
            confidence,
            numbers,
            gate_status: 'APPROVED',
            found_at: new Date().toISOString(),
          } as any);

          if (gateErr) {
            console.error('Erro ao salvar gate:', gateErr);
            toast.error('Falha ao salvar gate 100% no histórico.');
          } else {
            setGatesFound(g => g + 1);

            const { error: betErr } = await supabase.from('bets').insert({
              user_id: user.id,
              lottery: lottery.id,
              concurso,
              numbers,
              confidence,
              status: 'confirmed',
              confirmed_at: new Date().toISOString(),
            } as any);

            if (betErr) {
              console.error('Erro ao salvar aposta automática:', betErr);
              toast.error('Gate salvo, mas a aposta automática falhou.');
            } else {
              toast.success(`🎯 AUTO GATE 100% — ${lottery.name} — Aposta salva automaticamente!`, { duration: 8000 });
            }

            onGateFound.current?.();
          }
        } catch (error) {
          console.error('Erro inesperado ao salvar gate 100%:', error);
          toast.error('Erro inesperado ao salvar gate 100%.');
        }
      }

      await new Promise(r => setTimeout(r, 3000));
    }

    setCycleCount(c => c + 1);
    runningRef.current = false;
  }, [todayOnly, user]);

  useEffect(() => {
    if (autoMode) {
      runCycle();
      const lotteries = todayOnly ? getTodaysLotteries() : LOTTERIES;
      const interval = Math.max(lotteries.length * 6000, 30000);
      autoRef.current = setInterval(runCycle, interval);
    } else {
      if (autoRef.current) clearInterval(autoRef.current);
      runningRef.current = false;
      setCurrentLottery(null);
      setIsAnalyzing(false);
    }
    return () => { if (autoRef.current) clearInterval(autoRef.current); };
  }, [autoMode, todayOnly, runCycle]);

  return (
    <AutoAnalysisContext.Provider value={{
      autoMode, setAutoMode, todayOnly, setTodayOnly,
      currentLottery, isAnalyzing, lastResults, cycleCount, gatesFound, onGateFound
    }}>
      {children}
    </AutoAnalysisContext.Provider>
  );
}

export function useAutoAnalysis() {
  const ctx = useContext(AutoAnalysisContext);
  if (!ctx) throw new Error('useAutoAnalysis must be used within AutoAnalysisProvider');
  return ctx;
}
