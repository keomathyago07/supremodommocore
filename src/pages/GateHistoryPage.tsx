import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAutoAnalysis } from '@/hooks/useAutoAnalysis';
import { supabase } from '@/integrations/supabase/client';
import { LOTTERIES, formatBrasiliaTime, formatBrasiliaHour, TIMEMANIA_TEAMS, generateSpecialNumbers, generateTeam } from '@/lib/lotteryConstants';
import { LOTTERY_PRIZES } from '@/lib/lotteryPrizes';
import { confirmGateAndCreateBet } from '@/lib/gatePersistence';
import { History, Zap, Shield, CheckCircle, Loader2, Clock, DollarSign, Send, BarChart3, Target, Brain, Bell, Clover } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface GateEntry {
  id: string;
  lottery: string;
  concurso: number;
  confidence: number;
  numbers: number[];
  gate_status: string;
  found_at: string;
}

const GateHistoryPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const auto = useAutoAnalysis();
  const [entries, setEntries] = useState<GateEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<string | null>(null);

  const loadEntries = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('gate_history')
      .select('*')
      .eq('user_id', user.id)
      .order('found_at', { ascending: false }) as any;
    setEntries(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadEntries();
    const channel = supabase
      .channel('gate_history_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gate_history' }, () => {
        loadEntries();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const confirmBet = async (entry: GateEntry) => {
    if (!user) return;
    setConfirming(entry.id);
    const result = await confirmGateAndCreateBet({
      userId: user.id,
      lottery: entry.lottery,
      concurso: entry.concurso,
      confidence: entry.confidence,
      numbers: entry.numbers,
      foundAt: entry.found_at,
    });
    if (result.error) {
      toast.error('Erro ao confirmar: ' + result.error);
    } else if (result.alreadyConfirmed) {
      toast.info('Aposta já confirmada anteriormente!');
      await loadEntries();
      setTimeout(() => navigate('/dashboard/results'), 1000);
    } else {
      toast.success('✅ Aposta confirmada, salva no banco e sincronizada!', { duration: 5000 });
      await loadEntries();
      setTimeout(() => navigate('/dashboard/results'), 1500);
    }
    setConfirming(null);
  };

  const details = auto.analysisDetails;
  const detailsList = Object.values(details).sort((a, b) => b.gatesReached - a.gatesReached);

  const notifs = auto.notifications || [];
  const unread = notifs.filter(n => !n.read);

  // Get special info for a gate entry
  const getSpecialInfo = (entry: GateEntry) => {
    const lottery = LOTTERIES.find(l => l.id === entry.lottery);
    const delivered = auto.deliveredNumbers.find(d => d.lotteryId === entry.lottery && d.concurso === entry.concurso);
    if (delivered) {
      return { specialNumbers: delivered.specialNumbers, team: delivered.team };
    }
    const detail = details[entry.lottery];
    if (detail?.bestSpecialNumbers?.length) {
      return { specialNumbers: detail.bestSpecialNumbers, team: detail.bestTeam };
    }
    if (lottery?.hasSpecial) {
      const seed = entry.id.charCodeAt(0) + entry.id.charCodeAt(1);
      const specials: number[] = [];
      for (let i = 0; i < (lottery.specialCount || 2); i++) {
        specials.push(((seed + i * 7) % (lottery.specialMax || 6)) + 1);
      }
      return { specialNumbers: [...new Set(specials)].sort((a, b) => a - b), team: null };
    }
    if (lottery?.hasTeam) {
      const seed = entry.id.charCodeAt(0) + entry.id.charCodeAt(2);
      return { specialNumbers: undefined, team: TIMEMANIA_TEAMS[seed % TIMEMANIA_TEAMS.length] };
    }
    return { specialNumbers: undefined, team: null };
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-display font-bold">Histórico de Gates</h1>
      <p className="text-muted-foreground text-sm">Todos os jogos que atingiram os requisitos configurados — Confirme para salvar a aposta</p>

      {/* Notifications Panel */}
      {notifs.length > 0 && (
        <div className="glass rounded-xl p-4 border border-primary/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <span className="font-display font-semibold text-sm">Notificações ({unread.length} não lidas)</span>
            </div>
            <div className="flex items-center gap-3">
              {unread.length > 0 && (
                <button onClick={() => auto.markAllNotificationsRead()} className="text-xs text-primary hover:underline font-semibold">
                  ✓ Marcar todas como lidas
                </button>
              )}
              {notifs.length > 0 && (
                <button onClick={() => auto.clearNotifications()} className="text-xs text-destructive hover:underline">
                  🗑 Limpar
                </button>
              )}
            </div>
          </div>
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
            {notifs.slice(0, 50).map(n => (
              <div key={n.id} className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs transition-all ${
                n.read ? 'bg-muted/10 text-muted-foreground opacity-60' : 'bg-primary/5 border border-primary/20 text-foreground'
              }`}>
                <span className="flex-1">{n.read ? '✓ ' : '🔔 '}{n.message}</span>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-[10px] text-muted-foreground font-mono">{new Date(n.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                  {!n.read && (
                    <button onClick={() => auto.markNotificationRead(n.id)} className="text-[10px] px-2 py-0.5 rounded bg-primary/20 text-primary hover:bg-primary/30 font-bold">
                      ✓ Lida
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delivery Schedule Info */}
      <div className="glass rounded-xl p-4 border border-secondary/20">
        <div className="flex items-center gap-3 mb-3">
          <Send className="w-5 h-5 text-secondary" />
          <span className="font-display font-semibold text-secondary">Envio programado às {auto.numberDeliveryTime}h</span>
          {auto.deliveryTriggered && (
            <span className="text-xs px-2 py-1 rounded-full bg-success/20 text-success animate-pulse font-mono">✅ ENVIADO HOJE</span>
          )}
        </div>
        {auto.deliveredNumbers.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-semibold">📩 Números entregues hoje (salvos em Minhas Apostas):</p>
            {auto.deliveredNumbers.map((d, i) => {
              const lottery = LOTTERIES.find(l => l.id === d.lotteryId);
              return (
                <div key={i} className="bg-muted/30 rounded-lg p-3 flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-sm" style={{ color: lottery?.color }}>{d.lotteryName}</span>
                    <span className="text-xs font-mono text-muted-foreground">#{d.concurso}</span>
                    <span className="text-xs text-secondary font-mono">{d.confidence.toFixed(1)}%</span>
                    <span className="text-xs text-muted-foreground">Prêmio: {d.prizeTarget}</span>
                    {d.savedToGate && <span className="text-xs text-success">✅ Gate</span>}
                    {d.savedToBets && <span className="text-xs text-primary">✅ Aposta</span>}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {d.numbers.map(n => (
                      <span key={n} className="w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs border" style={{ borderColor: lottery?.color, color: lottery?.color }}>
                        {n.toString().padStart(2, '0')}
                      </span>
                    ))}
                  </div>
                  {/* Trevos */}
                  {d.specialNumbers && d.specialNumbers.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Clover className="w-3 h-3 text-success" />
                      <span className="text-xs text-success font-semibold">Trevos:</span>
                      {d.specialNumbers.map((t, idx) => (
                        <span key={idx} className="w-6 h-6 rounded-md flex items-center justify-center font-mono text-xs font-bold bg-success/20 text-success border border-success/30">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Team */}
                  {d.team && (
                    <div className="flex items-center gap-2">
                      <Shield className="w-3 h-3 text-primary" />
                      <span className="text-xs text-primary font-semibold">Time: ⚽ {d.team}</span>
                    </div>
                  )}
                  <span className="text-xs text-muted-foreground">Dom: {d.domination.toFixed(1)}% | Prec: {d.precision.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Per-Lottery Analysis Summary */}
      {detailsList.length > 0 && (
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-5 h-5 text-primary" />
            <span className="font-display font-semibold text-sm">Análise Global por Loteria (Hoje)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {detailsList.map(d => {
              const lottery = LOTTERIES.find(l => l.id === d.lotteryId);
              return (
                <div key={d.lotteryId} className="bg-muted/20 rounded-lg p-3 border border-border/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-display font-bold text-sm" style={{ color: lottery?.color }}>{d.lotteryName}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                      d.status === 'delivered' ? 'bg-success/20 text-success' :
                      d.status === 'gate_found' ? 'bg-secondary/20 text-secondary' :
                      d.status === 'ready' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                    }`}>
                      {d.status === 'delivered' ? '📩 ENVIADO' : d.status === 'gate_found' ? '🎯 GATE' : d.status === 'ready' ? '✅ PRONTO' : '🔄 ESTUDANDO'}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <div className="flex gap-3">
                      <span>Gates: <strong className="text-secondary">{d.gatesReached}</strong></span>
                      <span>Ciclos: <strong className="text-primary">{d.cyclesCompleted}</strong></span>
                    </div>
                    <div className="flex gap-3">
                      <span>Dom: <strong className="text-foreground">{d.domination.toFixed(1)}%</strong></span>
                      <span>Prec: <strong className="text-foreground">{d.precision.toFixed(1)}%</strong></span>
                    </div>
                    <div>Prêmio: <strong className="text-secondary">{d.prizeTarget}</strong></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Gate History List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhum gate encontrado ainda.</p>
          <p className="text-sm text-muted-foreground/60">Execute análises para que as IAs encontrem padrões.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, i) => {
            const lottery = LOTTERIES.find((l) => l.id === entry.lottery);
            const prize = LOTTERY_PRIZES[entry.lottery];
            const detail = details[entry.lottery];
            const isApproved = entry.gate_status === 'APPROVED';
            const isPending = entry.gate_status === 'PENDING';
            const { specialNumbers, team } = getSpecialInfo(entry);
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`glass rounded-xl p-5 ${isPending ? 'border border-warning/30' : ''}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-success" />
                    <span className="font-display font-semibold" style={{ color: lottery?.color }}>
                      {lottery?.name}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">#{entry.concurso}</span>
                    {prize && (
                      <span className="flex items-center gap-1 text-xs text-secondary font-display">
                        <DollarSign className="w-3 h-3" />
                        {prize.estimatedPrize}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-secondary" />
                    <span className="font-display font-bold text-secondary">{Number(entry.confidence).toFixed(3)}%</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                      isApproved ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning animate-pulse'
                    }`}>
                      {entry.gate_status}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {entry.numbers.map((n) => (
                    <span key={n} className="w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs border" style={{ borderColor: lottery?.color, color: lottery?.color }}>
                      {n.toString().padStart(2, '0')}
                    </span>
                  ))}
                </div>

                {/* Trevos */}
                {specialNumbers && specialNumbers.length > 0 && (
                  <div className="flex items-center gap-2 mb-2">
                    <Clover className="w-4 h-4 text-success" />
                    <span className="text-xs font-display font-semibold text-success">Trevos:</span>
                    {specialNumbers.map((t, idx) => (
                      <span key={idx} className="w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold bg-success/20 border border-success/40 text-success">
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                {/* Team */}
                {team && (
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-primary" />
                    <span className="text-xs font-display font-semibold text-primary">Time:</span>
                    <span className="text-sm font-bold text-foreground bg-primary/10 px-3 py-1 rounded-lg border border-primary/20">
                      ⚽ {team}
                    </span>
                  </div>
                )}

                {/* Detail row */}
                {detail && (
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-2 bg-muted/20 rounded-lg px-3 py-1.5">
                    <span>Gates: <strong className="text-secondary">{detail.gatesReached}</strong></span>
                    <span>Ciclos: <strong className="text-primary">{detail.cyclesCompleted}</strong></span>
                    <span>Dom: <strong>{detail.domination.toFixed(1)}%</strong></span>
                    <span>Prec: <strong>{detail.precision.toFixed(1)}%</strong></span>
                    <span>Padrões: <strong>{detail.patternsLocked}</strong></span>
                  </div>
                )}
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatBrasiliaTime(new Date(entry.found_at))} — {formatBrasiliaHour(new Date(entry.found_at))}
                  </p>
                  {isApproved ? (
                    <span className="flex items-center gap-1.5 text-xs font-display font-semibold text-success bg-success/10 px-3 py-1.5 rounded-lg">
                      <CheckCircle className="w-4 h-4" /> APOSTA CONFIRMADA
                    </span>
                  ) : (
                    <button
                      onClick={() => confirmBet(entry)}
                      disabled={confirming === entry.id}
                      className="flex items-center gap-2 bg-gradient-to-r from-secondary to-warning text-background font-display font-bold px-4 py-2 rounded-lg hover:opacity-90 transition-all disabled:opacity-50 text-sm"
                    >
                      {confirming === entry.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                      {confirming === entry.id ? 'CONFIRMANDO...' : 'CONFIRMAR APOSTA'}
                    </button>
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

export default GateHistoryPage;
