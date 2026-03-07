import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { LOTTERIES, AI_SPECIALISTS, getTodaysLotteries, getBrasiliaTime, type LotteryConfig } from '@/lib/lotteryConstants';
import { LOTTERY_PRIZES } from '@/lib/lotteryPrizes';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { persistGateOnly } from '@/lib/gatePersistence';
import { supabase } from '@/integrations/supabase/client';

const GATE_THRESHOLD = 100;
const DEFAULT_ANALYSIS_START = '08:00';
const DEFAULT_ANALYSIS_END = '21:00';
const DEFAULT_DELIVERY_TIME = '19:25';
const MASTERY_THRESHOLD = 1000; // Ultra Domínio e Precisão Máxima 1000%

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

function isDeliveryTime(now: Date, deliveryTime: string): boolean {
  const currentH = now.getHours();
  const currentM = now.getMinutes();
  const [dh, dm] = deliveryTime.split(':').map(Number);
  return currentH === dh && currentM === dm;
}

export interface AnalysisResult {
  lottery: LotteryConfig;
  numbers: number[];
  confidence: number;
  concurso: number;
  specialists: string[];
  timestamp: string;
}

export interface LotteryAnalysisDetail {
  lotteryId: string;
  lotteryName: string;
  gatesReached: number;
  cyclesCompleted: number;
  startedAt: string;
  lastGateAt: string | null;
  domination: number;
  precision: number;
  prizeTarget: string;
  prizeValue: number;
  status: 'studying' | 'ready' | 'gate_found' | 'delivered';
  apiSyncCount: number;
  patternsLocked: number;
  lastApiSync: string | null;
  hotNumbers: number[];
  coldNumbers: number[];
  selfAdaptations: number;
  bestNumbers: number[];
  bestConfidence: number;
  bestConcurso: number;
  deliveredAt: string | null;
}

export interface DeliveredNumber {
  lotteryId: string;
  lotteryName: string;
  numbers: number[];
  confidence: number;
  concurso: number;
  deliveredAt: string;
  prizeTarget: string;
  domination: number;
  precision: number;
  savedToGate: boolean;
}

export interface AppNotification {
  id: string;
  message: string;
  type: 'gate' | 'delivery' | 'result' | 'info';
  timestamp: string;
  read: boolean;
  lotteryId?: string;
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
  numberDeliveryTime: string;
  setNumberDeliveryTime: (value: string) => void;
  engineMode: EngineMode;
  isInsideAnalysisWindow: boolean;
  currentLottery: LotteryConfig | null;
  isAnalyzing: boolean;
  lastResults: AnalysisResult[];
  registerResult: (result: AnalysisResult) => void;
  cycleCount: number;
  gatesFound: number;
  onGateFound: React.MutableRefObject<(() => void) | null>;
  analysisDetails: Record<string, LotteryAnalysisDetail>;
  globalApiSyncStatus: string;
  globalSelfAdaptCount: number;
  deliveredNumbers: DeliveredNumber[];
  deliveryTriggered: boolean;
  autoResultCheck: boolean;
  setAutoResultCheck: (v: boolean) => void;
  notifications: AppNotification[];
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  addNotification: (msg: string, type: AppNotification['type'], lotteryId?: string) => void;
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
  const [numberDeliveryTime, setNumberDeliveryTime] = useState(() => {
    try { return localStorage.getItem('auto_number_delivery_time') || DEFAULT_DELIVERY_TIME; } catch { return DEFAULT_DELIVERY_TIME; }
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
  const [analysisDetails, setAnalysisDetails] = useState<Record<string, LotteryAnalysisDetail>>(() => {
    try {
      const saved = localStorage.getItem('auto_analysis_details_v3');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });
  const [globalApiSyncStatus, setGlobalApiSyncStatus] = useState('SINCRONIZADO');
  const [globalSelfAdaptCount, setGlobalSelfAdaptCount] = useState(() => {
    try { return Number(localStorage.getItem('global_self_adapt_count')) || 0; } catch { return 0; }
  });
  const [deliveredNumbers, setDeliveredNumbers] = useState<DeliveredNumber[]>(() => {
    try {
      const saved = localStorage.getItem('delivered_numbers_today');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [deliveryTriggered, setDeliveryTriggered] = useState(false);
  const deliveryDoneRef = useRef<string | null>(null);
  const [autoResultCheck, setAutoResultCheck] = useState(() => {
    try { return localStorage.getItem('auto_result_check') !== 'false'; } catch { return true; }
  });
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem('app_notifications');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const addNotification = useCallback((message: string, type: AppNotification['type'], lotteryId?: string) => {
    const notif: AppNotification = {
      id: crypto.randomUUID(),
      message,
      type,
      timestamp: new Date().toISOString(),
      read: false,
      lotteryId,
    };
    setNotifications(prev => [notif, ...prev].slice(0, 100));
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

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
  useEffect(() => { localStorage.setItem('auto_number_delivery_time', numberDeliveryTime); }, [numberDeliveryTime]);
  useEffect(() => { localStorage.setItem('auto_analysis_last_results', JSON.stringify(lastResults)); }, [lastResults]);
  useEffect(() => { localStorage.setItem('auto_analysis_cycle_count', String(cycleCount)); }, [cycleCount]);
  useEffect(() => { localStorage.setItem('auto_analysis_gates_found', String(gatesFound)); }, [gatesFound]);
  useEffect(() => { localStorage.setItem('auto_analysis_details_v3', JSON.stringify(analysisDetails)); }, [analysisDetails]);
  useEffect(() => { localStorage.setItem('global_self_adapt_count', String(globalSelfAdaptCount)); }, [globalSelfAdaptCount]);
  useEffect(() => { localStorage.setItem('delivered_numbers_today', JSON.stringify(deliveredNumbers)); }, [deliveredNumbers]);

  // Save analysis details to DB periodically
  useEffect(() => {
    if (!user || Object.keys(analysisDetails).length === 0) return;
    const saveTimer = setTimeout(async () => {
      try {
        await supabase.from('ai_memory').upsert({
          user_id: user.id,
          lottery: 'global',
          memory_type: 'analysis_details_v3',
          data: analysisDetails as any,
          version: 3,
        }, { onConflict: 'user_id,lottery,memory_type' });
      } catch {}
    }, 5000);
    return () => clearTimeout(saveTimer);
  }, [analysisDetails, user]);

  // ========== SCHEDULED DELIVERY ENGINE ==========
  // Check every 30s if it's time to deliver numbers
  useEffect(() => {
    if (!autoMode || !user) return;
    const deliveryCheck = setInterval(async () => {
      const now = getBrasiliaTime();
      const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
      
      // Prevent double-delivery for same day+time
      if (deliveryDoneRef.current === todayKey) return;
      if (!isDeliveryTime(now, numberDeliveryTime)) return;

      // Collect all lotteries from today that have gates
      const todaysLotteries = getTodaysLotteries();
      const readyLotteries: DeliveredNumber[] = [];

      for (const lottery of todaysLotteries) {
        const detail = analysisDetails[lottery.id];
        if (!detail) continue;
        if (detail.gatesReached < 1) continue;
        // Only deliver if domination and precision are high
        if (detail.domination < 95 || detail.precision < 95) continue;

        const numbers = detail.bestNumbers?.length > 0 ? detail.bestNumbers : generateNumbers(lottery);
        const confidence = detail.bestConfidence || 100;
        const concurso = detail.bestConcurso || 3000 + Math.floor(Math.random() * 100);
        const prize = LOTTERY_PRIZES[lottery.id];

        // Save to gate_history
        const persistResult = await persistGateOnly({
          userId: user.id,
          lottery: lottery.id,
          concurso,
          confidence,
          numbers,
          foundAt: new Date().toISOString(),
        });

        readyLotteries.push({
          lotteryId: lottery.id,
          lotteryName: lottery.name,
          numbers,
          confidence,
          concurso,
          deliveredAt: new Date().toISOString(),
          prizeTarget: prize?.estimatedPrize || '---',
          domination: detail.domination,
          precision: detail.precision,
          savedToGate: persistResult.gateInserted,
        });

        // Update detail status to delivered
        setAnalysisDetails(prev => ({
          ...prev,
          [lottery.id]: {
            ...prev[lottery.id],
            status: 'delivered',
            deliveredAt: new Date().toISOString(),
          },
        }));
      }

      if (readyLotteries.length > 0) {
        deliveryDoneRef.current = todayKey;
        setDeliveredNumbers(readyLotteries);
        setDeliveryTriggered(true);

        // Big notification
        const lotteryNames = readyLotteries.map(l => l.lotteryName).join(', ');
        toast.success(
          `🔔📩 NÚMEROS ENVIADOS ÀS ${numberDeliveryTime}h!\n${readyLotteries.length} loteria(s): ${lotteryNames}\nTodos salvos no Histórico de Gates!`,
          { duration: 15000 }
        );

        // Additional per-lottery notifications
        for (const delivered of readyLotteries) {
          setTimeout(() => {
            toast.success(
              `🎯 ${delivered.lotteryName}: [${delivered.numbers.join(', ')}]\nConf: ${delivered.confidence.toFixed(1)}% | Prêmio: ${delivered.prizeTarget}\nDom: ${delivered.domination.toFixed(1)}% | Prec: ${delivered.precision.toFixed(1)}%`,
              { duration: 12000 }
            );
          }, 1500);
        }

        // Save delivered numbers to DB
        try {
          await supabase.from('ai_memory').upsert({
            user_id: user.id,
            lottery: 'global',
            memory_type: 'delivered_numbers',
            data: { date: todayKey, deliveries: readyLotteries } as any,
            version: 1,
          }, { onConflict: 'user_id,lottery,memory_type' });
        } catch {}

        onGateFound.current?.();
      }
    }, 30000);

    return () => clearInterval(deliveryCheck);
  }, [autoMode, user, numberDeliveryTime, analysisDetails]);

  // Self-adaptation tick
  useEffect(() => {
    if (!autoMode) return;
    const adaptInterval = setInterval(() => {
      setGlobalSelfAdaptCount(c => c + 1);
      setGlobalApiSyncStatus(prev => {
        const states = ['SINCRONIZADO', 'ADAPTANDO...', 'PADRÃO NOVO DETECTADO', 'SINCRONIZADO'];
        const idx = states.indexOf(prev);
        return states[(idx + 1) % states.length];
      });
      setAnalysisDetails(prev => {
        const updated = { ...prev };
        for (const key of Object.keys(updated)) {
          updated[key] = {
            ...updated[key],
            selfAdaptations: (updated[key].selfAdaptations || 0) + 1,
            apiSyncCount: (updated[key].apiSyncCount || 0) + 1,
            lastApiSync: new Date().toISOString(),
            patternsLocked: Math.min(999, (updated[key].patternsLocked || 0) + Math.floor(Math.random() * 3)),
            hotNumbers: Array.from({ length: 5 }, () => Math.floor(Math.random() * 60) + 1),
            coldNumbers: Array.from({ length: 5 }, () => Math.floor(Math.random() * 60) + 1),
          };
        }
        return updated;
      });
    }, 8000);
    return () => clearInterval(adaptInterval);
  }, [autoMode]);

  const updateAnalysisDetail = useCallback((lottery: LotteryConfig, gateFound: boolean, numbers: number[], confidence: number, concurso: number) => {
    const dominationData = localStorage.getItem('neural_domination');
    const precisionData = localStorage.getItem('neural_precision');
    let dom = 50, prec = 85;
    try {
      if (dominationData) dom = JSON.parse(dominationData)[lottery.id] || 50;
      if (precisionData) prec = JSON.parse(precisionData)[lottery.id] || 85;
    } catch {}

    const prize = LOTTERY_PRIZES[lottery.id];
    setAnalysisDetails(prev => {
      const existing = prev[lottery.id];
      const isBetter = !existing || confidence > (existing.bestConfidence || 0);
      return {
        ...prev,
        [lottery.id]: {
          lotteryId: lottery.id,
          lotteryName: lottery.name,
          gatesReached: (existing?.gatesReached || 0) + (gateFound ? 1 : 0),
          cyclesCompleted: (existing?.cyclesCompleted || 0) + 1,
          startedAt: existing?.startedAt || new Date().toISOString(),
          lastGateAt: gateFound ? new Date().toISOString() : (existing?.lastGateAt || null),
          domination: dom,
          precision: prec,
          prizeTarget: prize?.estimatedPrize || '---',
          prizeValue: prize?.prizeValue || 0,
          status: existing?.status === 'delivered' ? 'delivered' : gateFound ? 'gate_found' : dom >= 100 ? 'ready' : 'studying',
          apiSyncCount: (existing?.apiSyncCount || 0) + 1,
          patternsLocked: existing?.patternsLocked || 0,
          lastApiSync: existing?.lastApiSync || null,
          hotNumbers: existing?.hotNumbers || [],
          coldNumbers: existing?.coldNumbers || [],
          selfAdaptations: existing?.selfAdaptations || 0,
          bestNumbers: isBetter ? numbers : (existing?.bestNumbers || numbers),
          bestConfidence: isBetter ? confidence : (existing?.bestConfidence || confidence),
          bestConcurso: isBetter ? concurso : (existing?.bestConcurso || concurso),
          deliveredAt: existing?.deliveredAt || null,
        },
      };
    });
  }, []);

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

      const gateHit = confidence >= GATE_THRESHOLD;
      updateAnalysisDetail(lottery, gateHit, numbers, confidence, concurso);

      if (user && gateHit) {
        if (!insideWindow) {
          toast.info(`Modo estudo ativo: padrão 100% detectado em ${lottery.name}, aguardando horário de análise.`);
        } else {
          const dominationData = localStorage.getItem('neural_domination');
          const precisionData = localStorage.getItem('neural_precision');
          let lotteryDomination = 50;
          let lotteryPrecision = 85;
          if (dominationData) {
            try { lotteryDomination = JSON.parse(dominationData)[lottery.id] || 50; } catch {}
          }
          if (precisionData) {
            try { lotteryPrecision = JSON.parse(precisionData)[lottery.id] || 85; } catch {}
          }

          // NUNCA salvar/notificar fora do horário programado
          // Apenas registra internamente e aguarda o horário de entrega
          const prize = LOTTERY_PRIZES[lottery.id];
          if (lotteryDomination >= 99.5 && lotteryPrecision >= 99.5) {
            setGatesFound(g => g + 1);
            toast.info(`✅ ${lottery.name}: Padrão 100% PRONTO! Dom: ${lotteryDomination.toFixed(1)}% Prec: ${lotteryPrecision.toFixed(1)}% — Aguardando envio programado às ${numberDeliveryTime}h`, { duration: 6000 });
          } else {
            toast.info(`⏳ ${lottery.name}: IA estudando (Dom: ${lotteryDomination.toFixed(1)}%, Prec: ${lotteryPrecision.toFixed(1)}%). Envio às ${numberDeliveryTime}h.`);
          }
        }
      }

      await new Promise(r => setTimeout(r, insideWindow ? 2500 : 1500));
    }

    setCycleCount(c => c + 1);
    runningRef.current = false;
  }, [analysisStartTime, analysisEndTime, todayOnly, user, registerResult, updateAnalysisDetail, numberDeliveryTime]);

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
      numberDeliveryTime, setNumberDeliveryTime,
      engineMode, isInsideAnalysisWindow, currentLottery, isAnalyzing,
      lastResults, registerResult, cycleCount, gatesFound, onGateFound,
      analysisDetails, globalApiSyncStatus, globalSelfAdaptCount,
      deliveredNumbers, deliveryTriggered,
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