// src/pages/MinhasApostasPage.tsx
// Visualização das apostas confirmadas e status da conferência
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Trophy, Clock, CheckCircle2, XCircle, Ticket, Wifi, WifiOff, Activity } from 'lucide-react';
import { toast } from 'sonner';

type RTStatus = 'connecting' | 'connected' | 'processing' | 'failed' | 'disconnected';

const rtBadge = (s: RTStatus, attempt: number) => {
  if (s === 'connected') return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><Wifi className="w-3 h-3 mr-1" />Conectado</Badge>;
  if (s === 'processing') return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30"><Activity className="w-3 h-3 mr-1 animate-pulse" />Processando</Badge>;
  if (s === 'connecting') return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Conectando{attempt > 0 ? ` (tentativa ${attempt})` : ''}</Badge>;
  if (s === 'failed') return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Falhou — retry {attempt}</Badge>;
  return <Badge className="bg-muted text-muted-foreground"><WifiOff className="w-3 h-3 mr-1" />Desconectado</Badge>;
};

interface ApostaConfirmada {
  id: string;
  loteria: string;
  numeros: number[];
  numeros_sorteados?: number[] | null;
  concurso?: number | null;
  concurso_verificado?: number | null;
  data_sorteio?: string | null;
  horario_confirmacao: string;
  status_verificacao: string;
  pontos_acertados?: number | null;
  valor_premio?: number | null;
  descricao_faixa?: string | null;
  mes_da_sorte?: string | null;
  time_timemania?: string | null;
  trevos_maismilionaria?: number[] | null;
}

const statusBadge = (s: string) => {
  if (s === 'verificada') return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle2 className="w-3 h-3 mr-1" />Verificada</Badge>;
  if (s === 'erro_verificacao') return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Erro</Badge>;
  return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" />Aguardando sorteio</Badge>;
};

export default function MinhasApostasPage() {
  const [apostas, setApostas] = useState<ApostaConfirmada[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('apostas_confirmadas')
      .select('*')
      .order('horario_confirmacao', { ascending: false });
    if (error) toast.error('Erro ao carregar apostas');
    else setApostas((data as ApostaConfirmada[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // 🔴 REALTIME: atualiza a tela assim que a conferência grava resultados
  useEffect(() => {
    const channel = supabase
      .channel('apostas-confirmadas-rt')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'apostas_confirmadas' },
        (payload) => {
          setApostas((prev) => {
            const row = (payload.new ?? payload.old) as ApostaConfirmada;
            if (!row?.id) return prev;
            if (payload.eventType === 'DELETE') return prev.filter(a => a.id !== row.id);
            const idx = prev.findIndex(a => a.id === row.id);
            if (idx === -1) return [row as ApostaConfirmada, ...prev];
            const next = [...prev];
            next[idx] = { ...next[idx], ...(payload.new as ApostaConfirmada) };
            if (payload.eventType === 'UPDATE' && (payload.new as ApostaConfirmada).status_verificacao === 'verificada') {
              const v = payload.new as ApostaConfirmada;
              toast.success(`✅ Conferência: ${v.loteria.toUpperCase()} — ${v.pontos_acertados ?? 0} acerto(s)`);
            }
            return next;
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const total = apostas.length;
  const premiadas = apostas.filter(a => (a.pontos_acertados ?? 0) > 0).length;
  const totalPremios = apostas.reduce((s, a) => s + (Number(a.valor_premio) || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-primary glow-text-primary flex items-center gap-2">
            <Ticket className="w-8 h-8" /> Minhas Apostas
          </h1>
          <p className="text-muted-foreground mt-1">Apostas confirmadas e status da conferência automática</p>
        </div>
        <Button onClick={carregar} variant="outline" disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Total de apostas</div><div className="text-3xl font-bold text-primary">{total}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Premiadas</div><div className="text-3xl font-bold text-green-400">{premiadas}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Total prêmios (bruto)</div><div className="text-3xl font-bold text-yellow-400">R$ {totalPremios.toFixed(2)}</div></CardContent></Card>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : apostas.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-muted-foreground">Nenhuma aposta confirmada ainda.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {apostas.map((a) => {
            const acertou = (a.pontos_acertados ?? 0) > 0;
            return (
              <Card key={a.id} className={acertou ? 'border-green-500/40' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg uppercase">{a.loteria}</CardTitle>
                    {statusBadge(a.status_verificacao)}
                  </div>
                  <div className="text-xs text-muted-foreground flex gap-3 flex-wrap">
                    {a.concurso && <span>Concurso #{a.concurso}</span>}
                    {a.data_sorteio && <span>{a.data_sorteio}</span>}
                    <span>Confirmada: {new Date(a.horario_confirmacao).toLocaleString('pt-BR')}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Números apostados</div>
                    <div className="flex flex-wrap gap-1">
                      {a.numeros.map(n => (
                        <span key={n} className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 text-primary flex items-center justify-center text-sm font-bold">
                          {String(n).padStart(2, '0')}
                        </span>
                      ))}
                    </div>
                  </div>

                  {a.trevos_maismilionaria?.length ? (
                    <div className="text-xs"><span className="text-muted-foreground">Trevos: </span><span className="text-primary font-bold">{a.trevos_maismilionaria.join(' • ')}</span></div>
                  ) : null}
                  {a.mes_da_sorte && <div className="text-xs"><span className="text-muted-foreground">Mês: </span><span className="text-primary font-bold">{a.mes_da_sorte}</span></div>}
                  {a.time_timemania && <div className="text-xs"><span className="text-muted-foreground">Time: </span><span className="text-primary font-bold">{a.time_timemania}</span></div>}

                  {a.numeros_sorteados?.length ? (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Sorteados</div>
                      <div className="flex flex-wrap gap-1">
                        {a.numeros_sorteados.map(n => (
                          <span key={n} className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border ${a.numeros.includes(n) ? 'bg-green-500/30 border-green-500 text-green-300' : 'bg-muted border-border text-muted-foreground'}`}>
                            {String(n).padStart(2, '0')}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {a.status_verificacao === 'verificada' && (
                    <div className="border-t border-border pt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Trophy className={`w-5 h-5 ${acertou ? 'text-yellow-400' : 'text-muted-foreground'}`} />
                        <div>
                          <div className="text-sm font-bold">{a.pontos_acertados ?? 0} acertos</div>
                          {a.descricao_faixa && <div className="text-xs text-muted-foreground">{a.descricao_faixa}</div>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Prêmio</div>
                        <div className="text-lg font-bold text-yellow-400">R$ {(Number(a.valor_premio) || 0).toFixed(2)}</div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
