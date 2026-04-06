// src/pages/MinhaApostaPage.tsx
// ============================================================
// VERSÃO 3 — Cards com todos campos especiais
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle, Clock, Trash2, Trophy, Calendar,
  Loader2, RefreshCw, Send, Plus, Bot, User,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { CONFIG_LOTERIAS, type LoteriaNome, useGerarJogo } from '@/hooks/useGerarJogo';

interface ApostaPendente {
  id: string;
  loteria: string;
  numeros: number[];
  numeros_invertido?: number[] | null;
  colunas_supersete?: Record<string, number> | null;
  mes_da_sorte?: string | null;
  time_timemania?: string | null;
  trevos_maismilionaria?: number[] | null;
  tipo_jogo?: string | null;
  dominancia: number;
  precisao: number;
  score_qualidade?: number;
  status: string;
  horario_envio: string;
  criterios_atendidos?: any;
}

interface ApostaConfirmada {
  id: string;
  loteria: string;
  numeros: number[];
  numeros_invertido?: number[] | null;
  colunas_supersete?: Record<string, number> | null;
  mes_da_sorte?: string | null;
  time_timemania?: string | null;
  trevos_maismilionaria?: number[] | null;
  tipo_jogo?: string | null;
  dominancia: number;
  precisao: number;
  status_verificacao: string;
  horario_confirmacao: string;
  pontos_acertados?: number | null;
  valor_premio?: number | null;
  descricao_faixa?: string | null;
  numeros_sorteados?: number[] | null;
}

function Bolinha({ n, cor, acertou }: { n: number; cor: string; acertou?: boolean }) {
  return (
    <span
      className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-black
        ${acertou === true ? 'ring-2 ring-white scale-110' : ''}`}
      style={{ background: acertou !== false ? cor : 'hsl(var(--muted))', color: acertou !== false ? '#000' : 'hsl(var(--muted-foreground))' }}
    >
      {String(n).padStart(2, '0')}
    </span>
  );
}

function SecaoLotomania({ numeros, invertido, cor }: { numeros: number[]; invertido?: number[] | null; cor: string }) {
  const [tab, setTab] = useState<'principal' | 'invertido'>('principal');
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button onClick={() => setTab('principal')}
          className={`text-[10px] px-2 py-1 rounded-full border transition-all ${tab === 'principal' ? 'bg-orange-500/20 border-orange-500/50 text-orange-300' : 'bg-muted/30 border-border text-muted-foreground'}`}>
          Jogo Principal (50)
        </button>
        {invertido && invertido.length > 0 && (
          <button onClick={() => setTab('invertido')}
            className={`text-[10px] px-2 py-1 rounded-full border transition-all ${tab === 'invertido' ? 'bg-orange-500/20 border-orange-500/50 text-orange-300' : 'bg-muted/30 border-border text-muted-foreground'}`}>
            Jogo Invertido (50)
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto pr-1">
        {(tab === 'principal' ? numeros : (invertido ?? [])).map(n => (
          <Bolinha key={n} n={n} cor={cor} />
        ))}
      </div>
    </div>
  );
}

function SecaoSuperSete({ numeros, colunas, cor }: { numeros: number[]; colunas?: Record<string, number> | null; cor: string }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 7 }, (_, i) => i + 1).map(col => (
          <div key={col} className="text-center">
            <div className="text-[9px] text-muted-foreground mb-1">C{col}</div>
            <span className="w-8 h-8 flex items-center justify-center rounded-full text-xs font-black text-black mx-auto" style={{ background: cor }}>
              {colunas?.[`col${col}`] ?? numeros[col - 1] ?? '?'}
            </span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-yellow-400/70">1 número por coluna (0 a 9)</p>
    </div>
  );
}

function CardAposta({
  aposta, tipo, onConfirmar, onRemover, confirmando
}: {
  aposta: ApostaPendente | ApostaConfirmada;
  tipo: 'pendente' | 'confirmada';
  onConfirmar?: (id: string) => void;
  onRemover?: (id: string) => void;
  confirmando?: boolean;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandido, setExpandido] = useState(false);
  const loteria = aposta.loteria as LoteriaNome;
  const cfg = CONFIG_LOTERIAS[loteria];
  if (!cfg) return null;

  const isPendente = tipo === 'pendente';
  const conf = tipo === 'confirmada' ? aposta as ApostaConfirmada : null;

  return (
    <>
      <div className={`bg-card border rounded-xl overflow-hidden transition-all ${
        isPendente ? 'border-border' :
        conf?.pontos_acertados && conf.pontos_acertados > 0 ? 'border-amber-500/60' :
        'border-green-500/40'
      }`}>
        <div className="flex items-center justify-between p-3 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-xl">{cfg.emoji}</span>
            <div>
              <h4 className="text-sm font-bold text-foreground">{cfg.nome}</h4>
              <p className="text-[10px] text-muted-foreground">{cfg.descricao}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {aposta.dominancia > 0 && (
              <div className="text-right">
                <span className="block text-[10px] text-emerald-400">Dom {aposta.dominancia.toFixed(1)}%</span>
                <span className="block text-[10px] text-blue-400">Prec {aposta.precisao.toFixed(1)}%</span>
              </div>
            )}
            <Badge variant="outline" className={`text-[10px] ${isPendente ? 'text-yellow-400 border-yellow-500/50' : 'text-green-400 border-green-500/50'}`}>
              {isPendente ? '⏳ Pendente' : '✓ Confirmada'}
            </Badge>
          </div>
        </div>

        <div className="p-3 space-y-3">
          {loteria === 'lotomania' ? (
            <SecaoLotomania numeros={aposta.numeros} invertido={aposta.numeros_invertido} cor={cfg.cor} />
          ) : loteria === 'supersete' ? (
            <SecaoSuperSete numeros={aposta.numeros} colunas={aposta.colunas_supersete} cor={cfg.cor} />
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {aposta.numeros.map(n => <Bolinha key={n} n={n} cor={cfg.cor} />)}
            </div>
          )}

          {aposta.mes_da_sorte && (
            <div className="flex items-center gap-2 text-xs bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-1.5">
              <span className="text-green-400 font-bold">🗓 Mês da Sorte:</span>
              <span className="text-foreground">{aposta.mes_da_sorte}</span>
            </div>
          )}
          {aposta.time_timemania && (
            <div className="flex items-center gap-2 text-xs bg-green-600/10 border border-green-600/20 rounded-lg px-3 py-1.5">
              <span className="text-green-400 font-bold">⚽ Time:</span>
              <span className="text-foreground">{aposta.time_timemania}</span>
            </div>
          )}
          {aposta.trevos_maismilionaria && aposta.trevos_maismilionaria.length > 0 && (
            <div className="flex items-center gap-3 text-xs bg-purple-500/10 border border-purple-500/20 rounded-lg px-3 py-1.5">
              <span className="text-purple-400 font-bold">🍀 Trevos:</span>
              <div className="flex gap-1.5">
                {aposta.trevos_maismilionaria.map(t => (
                  <span key={t} className="w-7 h-7 flex items-center justify-center rounded-full text-xs font-black text-black" style={{ background: '#9b59b6' }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {conf?.status_verificacao === 'verificada' && conf.numeros_sorteados && (
            <div className={`border rounded-xl p-3 space-y-2 ${conf.valor_premio && conf.valor_premio > 0 ? 'bg-amber-500/10 border-amber-500/40' : 'bg-muted/30 border-border'}`}>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-semibold">Resultado</span>
                {conf.valor_premio && conf.valor_premio > 0 && <Trophy className="w-4 h-4 text-amber-400" />}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-black" style={{ color: cfg.cor }}>{conf.pontos_acertados ?? 0} acerto(s)</span>
                <span className="text-xs text-muted-foreground">{conf.descricao_faixa || 'Não premiado'}</span>
              </div>
              {conf.valor_premio && conf.valor_premio > 0 && (
                <div className="flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2">
                  <span className="text-xs font-bold text-green-400">💰 Prêmio</span>
                  <span className="text-lg font-black text-green-400">R$ {conf.valor_premio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>
          )}

          {isPendente && (
            <button onClick={() => setExpandido(v => !v)}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
              {expandido ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {expandido ? 'Ocultar' : 'Ver'} critérios
            </button>
          )}
          {expandido && isPendente && (
            <div className="bg-muted/20 border border-border rounded-lg p-2 space-y-1">
              <div className="grid grid-cols-2 gap-x-4 text-[10px]">
                <span className="text-muted-foreground">Intervalo:</span>
                <span className="text-foreground">{cfg.min}–{cfg.max}</span>
                <span className="text-muted-foreground">Qtd:</span>
                <span className="text-emerald-400">{aposta.numeros.length} ✓</span>
                <span className="text-muted-foreground">Custo:</span>
                <span className="text-foreground">R$ {cfg.custo.toFixed(2)}</span>
                <span className="text-muted-foreground">Tipo:</span>
                <span className="text-foreground capitalize">{aposta.tipo_jogo ?? 'simples'}</span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>{new Date(isPendente ? (aposta as ApostaPendente).horario_envio : (aposta as ApostaConfirmada).horario_confirmacao).toLocaleString('pt-BR')}</span>
          </div>

          {isPendente && onConfirmar && onRemover && (
            <div className="flex gap-2">
              <Button onClick={() => setDialogOpen(true)} disabled={confirmando}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold h-9 gap-1.5">
                {confirmando
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Confirmando...</>
                  : <><CheckCircle className="w-3.5 h-3.5" />Confirmar Aposta</>}
              </Button>
              <Button onClick={() => onRemover(aposta.id)} variant="outline"
                className="border-destructive/30 text-destructive hover:bg-destructive/10 h-9 px-3">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">{cfg.emoji} Confirmar — {cfg.nome}</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground space-y-1">
              <span className="block">Números: <strong className="text-foreground">{aposta.numeros.slice(0, 15).join(', ')}{aposta.numeros.length > 15 ? '...' : ''}</strong></span>
              {aposta.mes_da_sorte && <span className="block">Mês: <strong className="text-green-400">{aposta.mes_da_sorte}</strong></span>}
              {aposta.time_timemania && <span className="block">Time: <strong className="text-green-400">{aposta.time_timemania}</strong></span>}
              {aposta.trevos_maismilionaria && aposta.trevos_maismilionaria.length > 0 && <span className="block">Trevos: <strong className="text-purple-400">{aposta.trevos_maismilionaria.join(' e ')}</strong></span>}
              {aposta.numeros_invertido && aposta.numeros_invertido.length > 0 && <span className="block text-orange-400">+ Jogo invertido (50 restantes) ✓</span>}
              <span className="block mt-2">Verificação automática às 21h (BRT).</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-muted-foreground">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setDialogOpen(false); onConfirmar?.(aposta.id); }} className="bg-green-600 hover:bg-green-700">✓ Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function MinhaApostaPage() {
  const [pendentes, setPendentes] = useState<ApostaPendente[]>([]);
  const [confirmadas, setConfirmadas] = useState<ApostaConfirmada[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const [modo, setModo] = useState<'automatico' | 'manual'>('automatico');
  const [loteriaManual, setLoteriaManual] = useState<LoteriaNome>('megasena');
  const { gerarJogo, gerando } = useGerarJogo();
  const { toast } = useToast();

  const carregar = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [resPend, resConf] = await Promise.all([
        supabase.from('apostas_pendentes').select('*').eq('user_id', user.id).eq('status', 'pendente').order('horario_envio', { ascending: false }),
        supabase.from('apostas_confirmadas').select('*').eq('user_id', user.id).order('horario_confirmacao', { ascending: false }).limit(50),
      ]);
      setPendentes((resPend.data ?? []) as any);
      setConfirmadas((resConf.data ?? []) as any);
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    carregar();
    const h = () => carregar();
    window.addEventListener('aposta-gerada', h);
    const ch1 = supabase.channel('pend-rt').on('postgres_changes', { event: '*', schema: 'public', table: 'apostas_pendentes' }, carregar).subscribe();
    const ch2 = supabase.channel('conf-rt').on('postgres_changes', { event: '*', schema: 'public', table: 'apostas_confirmadas' }, carregar).subscribe();
    return () => {
      window.removeEventListener('aposta-gerada', h);
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
    };
  }, [carregar]);

  async function confirmarAposta(id: string) {
    setConfirmandoId(id);
    try {
      const { data: ok, error } = await supabase.rpc('confirmar_aposta_ia', { p_aposta_id: id });
      if (error) throw error;
      if (!ok) throw new Error('Aposta não encontrada ou já confirmada.');
      toast({ title: '✅ Confirmada!', description: 'Verificação automática às 21h (BRT).' });
      carregar();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setConfirmandoId(null);
    }
  }

  async function removerAposta(id: string) {
    await supabase.from('apostas_pendentes').delete().eq('id', id);
    setPendentes(p => p.filter(a => a.id !== id));
    toast({ title: 'Removida' });
  }

  return (
    <div className="space-y-5 p-2">
      <h2 className="text-xl font-black text-foreground flex items-center gap-2">🎯 Minha Aposta</h2>

      <div className="flex items-center gap-2 p-1 bg-muted/30 rounded-xl border border-border">
        <button onClick={() => setModo('automatico')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${modo === 'automatico' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
          <Bot className="w-3.5 h-3.5" /> IA Automática
        </button>
        <button onClick={() => setModo('manual')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${modo === 'manual' ? 'bg-orange-600 text-white' : 'text-muted-foreground hover:text-foreground'}`}>
          <User className="w-3.5 h-3.5" /> Gerar Manual
        </button>
      </div>

      {modo === 'automatico' && (
        <div className="flex items-center gap-3 p-3 bg-primary/10 border border-primary/20 rounded-xl">
          <Bot className="w-4 h-4 text-primary flex-shrink-0" />
          <p className="text-xs text-primary/80">A IA gera 1 jogo por loteria às 19:31h BRT. Confirme aqui antes do sorteio.</p>
        </div>
      )}

      {modo === 'manual' && (
        <div className="bg-card border border-border rounded-xl p-3 space-y-3">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-blue-400" />
            <p className="text-xs font-bold text-foreground">Gerar Manualmente</p>
          </div>
          <div className="flex gap-2">
            <Select value={loteriaManual} onValueChange={v => setLoteriaManual(v as LoteriaNome)}>
              <SelectTrigger className="flex-1 h-9 bg-background border-border text-foreground text-xs"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-card border-border">
                {(Object.keys(CONFIG_LOTERIAS) as LoteriaNome[]).map(l => (
                  <SelectItem key={l} value={l} className="text-foreground text-xs">{CONFIG_LOTERIAS[l].emoji} {CONFIG_LOTERIAS[l].nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => gerarJogo(loteriaManual)} disabled={!!gerando} className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 px-4 gap-1.5">
              {gerando === loteriaManual ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Gerar
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-center">
          <div className="text-2xl font-black text-yellow-400">{pendentes.length}</div>
          <div className="text-xs text-muted-foreground">Pendentes</div>
        </div>
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
          <div className="text-2xl font-black text-green-400">{confirmadas.length}</div>
          <div className="text-xs text-muted-foreground">Confirmadas</div>
        </div>
      </div>

      <button onClick={carregar} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <RefreshCw className="w-3 h-3" /> Atualizar
      </button>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <>
          {pendentes.length > 0 && (
            <section>
              <h3 className="text-sm font-bold text-yellow-400 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Aguardando Confirmação ({pendentes.length})
              </h3>
              <div className="space-y-3">
                {pendentes.map(a => <CardAposta key={a.id} aposta={a} tipo="pendente" onConfirmar={confirmarAposta} onRemover={removerAposta} confirmando={confirmandoId === a.id} />)}
              </div>
            </section>
          )}
          {confirmadas.length > 0 && (
            <section>
              <h3 className="text-sm font-bold text-green-400 mb-3 flex items-center gap-2">
                <Send className="w-4 h-4" /> Confirmadas ({confirmadas.length})
              </h3>
              <div className="space-y-3">
                {confirmadas.map(a => <CardAposta key={a.id} aposta={a} tipo="confirmada" />)}
              </div>
            </section>
          )}
          {pendentes.length === 0 && confirmadas.length === 0 && (
            <div className="text-center py-16">
              <Trophy className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Nenhuma aposta ainda</p>
              <p className="text-muted-foreground/60 text-xs mt-1">A IA gera às 19:31h BRT, ou use o modo Manual.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
