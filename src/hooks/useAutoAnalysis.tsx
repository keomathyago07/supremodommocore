import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { LOTTERIES, AI_SPECIALISTS, getTodaysLotteries, getBrasiliaTime, type LotteryConfig } from '@/lib/lotteryConstants';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { persistGateOnly } from '@/lib/gatePersistence';

const GATE_THRESHOLD = 100;
const DEFAULT_ANALYSIS_START = '08:00';
const DEFAULT_ANALYSIS_END = '21:00';

type EngineMode = 'analysis' | 'study';

function generateNumbers(config: LotteryConfig): number[] {
  const nums = new Set<number>();
  while (nums.size < config.numbersCount) {
    nums.add(Math.floor(Math.random() * config.maxNumber) + (config.id === 'supersete' ? 0 : 1));
  }
  return Array.from(nums).sort((a, b) => a - b);
}

function generateConfidence(): number {
  if (Math.random() < 0.35) return 100;
  return Number((99.5 + Math.random() * 0.499).toFixed(3));
}

function parseTimeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;
  return hours * 60 + minutes;
}

function isInsideWindow(now: Date, start: string, end: string): boolean {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = parseTimeToMinutes(start);
  const endMinutes = parseTimeToMinutes(end);
  if (startMinutes === endMinutes) return true;
  if (startMinutes < endMinutes) return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
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
  analysisStartTime: string;
  setAnalysisStartTime: (value: string) => void;
  analysisEndTime: string;
  setAnalysisEndTime: (value: string) => void;
  engineMode: EngineMode;
  isInsideAnalysisWindow: boolean;
  currentLottery: LotteryConfig | null;
  isAnalyzing: boolean;
  lastResults: AnalysisResult[];
  registerResult: (result: AnalysisResult) => void;
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
  const [analysisStartTime, setAnalysisStartTime] = useState(() => {
    try { return localStorage.getItem('auto_analysis_start_time') || DEFAULT_ANALYSIS_START; } catch { return DEFAULT_ANALYSIS_START; }
  });
  const [analysisEndTime, setAnalysisEndTime] = useState(() => {
    try { return localStorage.getItem('auto_analysis_end_time') || DEFAULT_ANALYSIS_END; } catch { return DEFAULT_ANALYSIS_END; }
  });
  const [engineMode, setEngineMode] = useState<EngineMode>('analysis');
  const [isInsideAnalysisWindow, setIsInsideAnalysisWindow] = useState(true);
  const [currentLottery, setCurrentLottery] = useState<LotteryConfig | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastResults, setLastResults] = useState<AnalysisResult[]>(() => {
    try {
      const raw = localStorage.getItem('auto_analysis_last_results');
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  });
  const [cycleCount, setCycleCount] = useState(() => {
    try { return Number(localStorage.getItem('auto_analysis_cycle_count')) || 0; } catch { return 0; }
  });
  const [gatesFound, setGatesFound] = useState(() => {
    try { return Number(localStorage.getItem('auto_analysis_gates_found')) || 0; } catch { return 0; }
  });
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const runningRef = useRef(false);
  const onGateFound = useRef<(() => void) | null>(null);

  const registerResult = useCallback((result: AnalysisResult) => {
    setLastResults(prev => [result, ...prev].slice(0, 80));
  }, []);

  useEffect(() => { localStorage.setItem('auto_analysis_on', String(autoMode)); }, [autoMode]);
  useEffect(() => { localStorage.setItem('auto_analysis_today', String(todayOnly)); }, [todayOnly]);
  useEffect(() => { localStorage.setItem('auto_analysis_start_time', analysisStartTime); }, [analysisStartTime]);
  useEffect(() => { localStorage.setItem('auto_analysis_end_time', analysisEndTime); }, [analysisEndTime]);
  useEffect(() => { localStorage.setItem('auto_analysis_last_results', JSON.stringify(lastResults)); }, [lastResults]);
  useEffect(() => { localStorage.setItem('auto_analysis_cycle_count', String(cycleCount)); }, [cycleCount]);
  useEffect(() => { localStorage.setItem('auto_analysis_gates_found', String(gatesFound)); }, [gatesFound]);

  const runCycle = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;

    const now = getBrasiliaTime();
    const insideWindow = isInsideWindow(now, analysisStartTime, analysisEndTime);
    setIsInsideAnalysisWindow(insideWindow);
    setEngineMode(insideWindow ? 'analysis' : 'study');

    const lotteries = todayOnly ? getTodaysLotteries() : LOTTERIES;
    if (lotteries.length === 0) {
      setCurrentLottery(null);
      setIsAnalyzing(false);
      runningRef.current = false;
      return;
    }

    for (const lottery of lotteries) {
      setCurrentLottery(lottery);
      setIsAnalyzing(true);
      await new Promise(r => setTimeout(r, 2200));

      const numbers = generateNumbers(lottery);
      const confidence = generateConfidence();
      const usedSpecialists = [...AI_SPECIALISTS].sort(() => Math.random() - 0.5).slice(0, 20);
      const concurso = 3000 + Math.floor(Math.random() * 100);

      const result: AnalysisResult = {
        lottery, numbers, confidence, concurso,
        specialists: usedSpecialists,
        timestamp: new Date().toISOString(),
      };

      registerResult(result);
      setIsAnalyzing(false);

      if (user && confidence >= GATE_THRESHOLD) {
        if (!insideWindow) {
          toast.info(`Modo estudo ativo: padrão 100% detectado em ${lottery.name}, aguardando horário de análise.`);
        } else {
          // Only save to gate_history with PENDING status — NO auto-confirm
          const persistResult = await persistGateOnly({
            userId: user.id,
            lottery: lottery.id,
            concurso, confidence, numbers,
            foundAt: new Date().toISOString(),
          });

          if (persistResult.error) {
            console.error('Erro ao salvar gate:', persistResult.error);
            toast.error(`Falha ao salvar gate: ${persistResult.error}`);
          } else if (persistResult.gateInserted) {
            setGatesFound(g => g + 1);
            toast.success(`🔔 GATE 100% — ${lottery.name} — Aguardando confirmação do admin!`, { duration: 8000 });
            onGateFound.current?.();
          }
        }
      }

      await new Promise(r => setTimeout(r, insideWindow ? 2500 : 1500));
    }

    setCycleCount(c => c + 1);
    runningRef.current = false;
  }, [analysisStartTime, analysisEndTime, todayOnly, user, registerResult]);

  useEffect(() => {
    if (autoRef.current) clearInterval(autoRef.current);
    if (autoMode) {
      runCycle();
      const lotteries = todayOnly ? getTodaysLotteries() : LOTTERIES;
      const interval = Math.max(lotteries.length * 5500, 20000);
      autoRef.current = setInterval(runCycle, interval);
    } else {
      runningRef.current = false;
      setCurrentLottery(null);
      setIsAnalyzing(false);
    }
    return () => { if (autoRef.current) clearInterval(autoRef.current); };
  }, [autoMode, todayOnly, analysisStartTime, analysisEndTime, runCycle]);

  return (
    <AutoAnalysisContext.Provider value={{
      autoMode, setAutoMode, todayOnly, setTodayOnly,
      analysisStartTime, setAnalysisStartTime, analysisEndTime, setAnalysisEndTime,
      engineMode, isInsideAnalysisWindow, currentLottery, isAnalyzing,
      lastResults, registerResult, cycleCount, gatesFound, onGateFound,
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
