// src/pages/NotificacoesPage.tsx
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Check, CheckCheck, Loader2, RefreshCw, Eye, AlertTriangle, Trophy, Activity } from 'lucide-react';
import { toast } from 'sonner';

interface Notificacao {
  id: string;
  tipo: string;
  titulo: string;
  corpo: string | null;
  prioridade: string | null;
  loteria: string | null;
  loteria_nome: string | null;
  emoji: string | null;
  lido: boolean;
  criado_em: string;
}

const iconForTipo = (t: string) => {
  if (t.includes('watchdog') || t.includes('god')) return <Eye className="w-5 h-5 text-purple-400" />;
  if (t.includes('alerta') || t.includes('atraso')) return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
  if (t.includes('premio') || t.includes('gate')) return <Trophy className="w-5 h-5 text-green-400" />;
  if (t.includes('sync') || t.includes('pipeline')) return <Activity className="w-5 h-5 text-cyan-400" />;
  return <Bell className="w-5 h-5 text-primary" />;
};

const prioridadeBadge = (p: string | null) => {
  if (p === 'critica') return <Badge variant="destructive">CRÍTICA</Badge>;
  if (p === 'alta') return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">ALTA</Badge>;
  if (p === 'baixa') return <Badge variant="outline">BAIXA</Badge>;
  return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">NORMAL</Badge>;
};

export default function NotificacoesPage() {
  const [items, setItems] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'watchdog'>('all');

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('notificacoes')
      .select('*')
      .order('criado_em', { ascending: false })
      .limit(200);
    if (error) toast.error('Erro ao carregar notificações');
    else setItems((data as Notificacao[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const marcarLida = async (id: string) => {
    const { error } = await supabase.from('notificacoes').update({ lido: true }).eq('id', id);
    if (error) return toast.error('Falha ao marcar como lida');
    setItems(prev => prev.map(n => n.id === id ? { ...n, lido: true } : n));
  };

  const marcarTodas = async () => {
    const ids = items.filter(n => !n.lido).map(n => n.id);
    if (!ids.length) return;
    const { error } = await supabase.from('notificacoes').update({ lido: true }).in('id', ids);
    if (error) return toast.error('Falha ao marcar todas');
    setItems(prev => prev.map(n => ({ ...n, lido: true })));
    toast.success(`${ids.length} notificações marcadas como lidas`);
  };

  const filtered = items.filter(n => {
    if (filter === 'unread') return !n.lido;
    if (filter === 'watchdog') return n.tipo.includes('watchdog') || n.tipo.includes('god') || n.tipo.includes('pipeline');
    return true;
  });
  const naoLidas = items.filter(n => !n.lido).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold text-primary glow-text-primary flex items-center gap-2">
            <Bell className="w-8 h-8" /> Notificações
            {naoLidas > 0 && <Badge variant="destructive">{naoLidas} novas</Badge>}
          </h1>
          <p className="text-muted-foreground mt-1">Eventos do sistema, alertas do watchdog e resultados</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={carregar} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />Atualizar
          </Button>
          <Button onClick={marcarTodas} disabled={!naoLidas}>
            <CheckCheck className="w-4 h-4 mr-2" />Marcar todas como lidas
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        {(['all', 'unread', 'watchdog'] as const).map(f => (
          <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)}>
            {f === 'all' ? 'Todas' : f === 'unread' ? 'Não lidas' : 'Watchdog / Pipeline'}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-muted-foreground">Nenhuma notificação.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(n => (
            <Card key={n.id} className={!n.lido ? 'border-primary/40 bg-primary/5' : ''}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="mt-0.5">{iconForTipo(n.tipo)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-foreground">
                      {n.emoji && <span className="mr-1">{n.emoji}</span>}{n.titulo}
                    </span>
                    {prioridadeBadge(n.prioridade)}
                    {!n.lido && <Badge className="bg-primary/20 text-primary border-primary/30">NOVO</Badge>}
                    <Badge variant="outline" className="font-mono text-[10px]">{n.tipo}</Badge>
                  </div>
                  {n.corpo && <div className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{n.corpo}</div>}
                  <div className="text-xs text-muted-foreground mt-2 flex gap-3 flex-wrap">
                    <span>{new Date(n.criado_em).toLocaleString('pt-BR')}</span>
                    {n.loteria_nome && <span>📍 {n.loteria_nome}</span>}
                  </div>
                </div>
                {!n.lido && (
                  <Button size="sm" variant="ghost" onClick={() => marcarLida(n.id)}>
                    <Check className="w-4 h-4 mr-1" />Lida
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
