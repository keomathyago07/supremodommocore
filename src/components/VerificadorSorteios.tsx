// src/components/VerificadorSorteios.tsx
// ============================================================
// VERSÃO 3 — Verificação automática às 21h BRT
// Todas as loterias com campos especiais
// ============================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  CheckCircle, Clock, Trophy, RefreshCw,
  AlertTriangle, Zap, Shield
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CONFIG_LOTERIAS, type LoteriaNome } from '@/hooks/useGerarJogo';

const SLUGS: Record<LoteriaNome, string> = {
  megasena: 'megasena', quina: 'quina', lotofacil: 'lotofacil',
  lotomania: 'lotomania', duplasena: 'duplasena', supersete: 'supersete',
  timemania: 'timemania', diadesorte: 'diadesorte', maismilionaria: 'maismilionaria',
};

interface RespostaCaixa {
  numero: number;
  dezenas: string[];
  dezenas2Sorteio?: string[];
  timCoracao?: string;
  nomeTimeCoracao?: string;
  mesSorte?: string;
  trevos?: string[];
  dataApuracao: string;
  numeroConcurso: number;
  acumulado: boolean;
  premiacoes?: Array<{ descricao: string; faixa: number; ganhadores: number; valorPremio: number }>;
}

async function buscarResultadoCaixa(loteria: LoteriaNome): Promise<RespostaCaixa | null> {
  const slug = SLUGS[loteria];
  const urls = [
    `https://servicebus2.caixa.gov.br/portaldeloterias/api/${slug}/`,
    `https://api.guidi.dev.br/loteria/${slug}/ultimo`,
  ];
  for (const url of urls) {
    try {
      const r = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
      if (r.ok) return await r.json();
    } catch { /* next */ }
  }
  return null;
}

function calcAcertos(apostados: number[], sorteados: number[]): number {
  const s = new Set(sorteados.map(Number));
  return apostados.filter(n => s.has(n)).length;
}

function faixaPremio(loteria: LoteriaNome, qtd: number): string | null {
  const faixas: Record<string, Record<number, string>> = {
    megasena: { 6: 'Sena', 5: 'Quina', 4: 'Quadra' },
    quina: { 5: 'Quina', 4: 'Quadra', 3: 'Terno', 2: 'Duque' },
    lotofacil: { 15: '15 pontos', 14: '14 pontos', 13: '13 pontos', 12: '12 pontos', 11: '11 pontos' },
    lotomania: { 20: '20 pontos', 19: '19 pontos', 18: '18 pontos', 17: '17 pontos', 16: '16 pontos', 15: '15 pontos', 0: '0 pontos' },
    duplasena: { 6: 'Sena', 5: 'Quina', 4: 'Quadra', 3: 'Terno' },
    supersete: { 7: '7 colunas', 6: '6 colunas', 5: '5 colunas', 4: '4 colunas', 3: '3 colunas' },
    timemania: { 7: '7 pontos', 6: '6 pontos', 5: '5 pontos', 4: '4 pontos', 3: '3 pontos' },
    diadesorte: { 7: '7 pontos', 6: '6 pontos', 5: '5 pontos', 4: '4 pontos' },
    maismilionaria: { 6: '6 acertos', 5: '5 acertos', 4: '4 acertos', 3: '3 acertos', 2: '2 acertos' },
  };
  return faixas[loteria]?.[qtd] ?? null;
}

interface Conferencia {
  loteria: LoteriaNome;
  concurso: number;
  data_sorteio: string;
  acertos1: number;
  faixa1: string | null;
  acertos2?: number;
  faixa2?: string | null;
  premiado: boolean;
  dentroPadrao: boolean;
  timeAcertou?: boolean;
  mesAcertou?: boolean;
  trevosAcertados?: number;
}

function CardConferencia({ c }: { c: Conferencia }) {
  const cfg = CONFIG_LOTERIAS[c.loteria];
  return (
    <div className={`border rounded-xl p-3 space-y-2 ${
      c.premiado ? 'border-amber-500/60 bg-amber-500/5' :
      c.dentroPadrao ? 'border-blue-500/30 bg-blue-500/5' :
      'border-border bg-card'
    }`}>
      {c.premiado && (
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-black text-amber-400">🎉 PREMIADO!</span>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{cfg.emoji}</span>
          <div>
            <p className="text-sm font-bold text-foreground">{cfg.nome}</p>
            <p className="text-[10px] text-muted-foreground">Concurso {c.concurso} • {c.data_sorteio}</p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-xl font-black ${c.premiado ? 'text-amber-400' : 'text-muted-foreground'}`}>
            {c.acertos1}{c.acertos2 !== undefined ? `+${c.acertos2}` : ''}
          </p>
          <p className="text-[9px] text-muted-foreground">acerto(s)</p>
        </div>
      </div>
      <div className="flex items-center gap-2 text-[10px]">
        <span className="text-muted-foreground">{c.faixa1 ?? 'Sem faixa'}</span>
        {c.faixa2 && <span className="text-muted-foreground">+ {c.faixa2}</span>}
        {c.timeAcertou && <span className="text-green-400">⚽ Time ✓</span>}
        {c.mesAcertou && <span className="text-green-400">🗓 Mês ✓</span>}
        {c.trevosAcertados !== undefined && c.trevosAcertados > 0 && (
          <span className="text-purple-400">🍀 {c.trevosAcertados} trevo(s)</span>
        )}
      </div>
      <div className={`flex items-center gap-2 text-[10px] p-2 rounded-lg ${c.dentroPadrao ? 'bg-blue-500/10 text-blue-300' : 'bg-muted/30 text-muted-foreground'}`}>
        <Shield className="w-3 h-3 flex-shrink-0" />
        {c.dentroPadrao ? 'Dentro do padrão — registrada no financeiro' : 'Abaixo do padrão mínimo'}
      </div>
    </div>
  );
}

export function VerificadorSorteios() {
  const [conferencias, setConferencias] = useState<Conferencia[]>([]);
  const [verificando, setVerificando] = useState(false);
  const [autoAtivo, setAutoAtivo] = useState(true);
  const [ultimaVer, setUltimaVer] = useState('');
  const [proximaVer, setProximaVer] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { toast } = useToast();

  function isBRT21h(): boolean {
    const brt = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    return brt.getHours() >= 21 && brt.getHours() <= 23;
  }

  function tempoAteProxima(): string {
    const brt = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const h = brt.getHours();
    if (h < 21) {
      const mins = (21 - h - 1) * 60 + (60 - brt.getMinutes());
      return `${Math.floor(mins / 60)}h ${mins % 60}min`;
    }
    return 'Agora (verificando...)';
  }

  const verificar = useCallback(async () => {
    setVerificando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: apostas } = await supabase
        .from('apostas_confirmadas')
        .select('*')
        .eq('user_id', user.id)
        .eq('status_verificacao', 'aguardando_sorteio');

      if (!apostas?.length) {
        toast({ title: 'Sem apostas', description: 'Nenhuma aposta confirmada para verificar.' });
        return;
      }

      const resultados: Conferencia[] = [];

      for (const ap of apostas) {
        const loteria = ap.loteria as LoteriaNome;
        const cfg = CONFIG_LOTERIAS[loteria];
        if (!cfg) continue;

        const raw = await buscarResultadoCaixa(loteria);
        if (!raw?.dezenas?.length) continue;

        const sor1 = raw.dezenas.map(Number);
        const ac1 = calcAcertos(ap.numeros as number[], sor1);
        const f1 = faixaPremio(loteria, ac1);

        let ac2: number | undefined;
        let f2: string | null | undefined;

        // Dupla Sena: 2 sorteios
        if (loteria === 'duplasena' && raw.dezenas2Sorteio?.length) {
          ac2 = calcAcertos(ap.numeros as number[], raw.dezenas2Sorteio.map(Number));
          f2 = faixaPremio('duplasena', ac2);
        }

        // Lotomania: invertido
        if (loteria === 'lotomania' && (ap as any).numeros_invertido?.length) {
          ac2 = calcAcertos((ap as any).numeros_invertido as number[], sor1);
          f2 = faixaPremio('lotomania', ac2);
        }

        // Especiais
        const timeAcertou = !!(ap as any).time_timemania && (ap as any).time_timemania === (raw.nomeTimeCoracao ?? raw.timCoracao);
        const mesAcertou = !!(ap as any).mes_da_sorte && (ap as any).mes_da_sorte === raw.mesSorte;
        const trevosSort = (raw.trevos ?? []).map(Number);
        const trevosAcertados = (ap as any).trevos_maismilionaria
          ? ((ap as any).trevos_maismilionaria as number[]).filter((t: number) => trevosSort.includes(t)).length
          : undefined;

        const premiado = ac1 >= cfg.minAcertos || (ac2 !== undefined && ac2 >= cfg.minAcertos);
        const dentroPadrao = ac1 >= cfg.minAcertos;

        // Update in DB
        await supabase.from('apostas_confirmadas').update({
          status_verificacao: 'verificada',
          pontos_acertados: ac1,
          numeros_sorteados: sor1,
          concurso_verificado: raw.numero ?? raw.numeroConcurso,
          data_sorteio: raw.dataApuracao,
          descricao_faixa: f1,
        }).eq('id', ap.id);

        // Save to verificacoes_sorteio
        await supabase.from('verificacoes_sorteio' as any).insert({
          user_id: user.id,
          aposta_id: ap.id,
          loteria,
          concurso: raw.numero ?? raw.numeroConcurso,
          data_sorteio: raw.dataApuracao,
          numeros_sorteados: sor1,
          numeros_apostados: ap.numeros,
          acertos_s1: ac1,
          faixa_s1: f1,
          acertos_s2: ac2 ?? 0,
          faixa_s2: f2 ?? null,
          acertos_total: ac1 + (ac2 ?? 0),
          premiado,
          dentro_padrao: dentroPadrao,
          time_coracao: (ap as any).time_timemania ?? null,
          time_acertou: timeAcertou,
          mes_sorte: (ap as any).mes_da_sorte ?? null,
          mes_acertou: mesAcertou,
          trevos_sorteados: trevosSort,
          trevos_acertados: trevosAcertados ?? 0,
          raw_api: raw,
        } as any);

        // Register in financeiro if within pattern
        if (dentroPadrao && f1) {
          await supabase.from('financeiro_premiacoes').insert({
            user_id: user.id,
            aposta_confirmada_id: ap.id,
            loteria,
            concurso: raw.numero ?? raw.numeroConcurso,
            numeros_apostados: ap.numeros as number[],
            numeros_sorteados: sor1,
            acertos: ac1,
            descricao_faixa: f1,
            valor_bruto: 0,
            valor_liquido: 0,
            status_pagamento: 'a_receber',
          });
        }

        resultados.push({
          loteria, concurso: raw.numero ?? raw.numeroConcurso,
          data_sorteio: raw.dataApuracao, acertos1: ac1, faixa1: f1,
          acertos2: ac2, faixa2: f2,
          premiado, dentroPadrao, timeAcertou, mesAcertou, trevosAcertados,
        });

        if (premiado) {
          toast({ title: `🏆 ${cfg.nome} PREMIADO!`, description: `${ac1} acertos` });
        }

        await new Promise(r => setTimeout(r, 1200));
      }

      setConferencias(resultados);
      setUltimaVer(new Date().toLocaleTimeString('pt-BR'));

      const premiados = resultados.filter(r => r.premiado).length;
      toast({
        title: '✅ Verificação concluída',
        description: `${resultados.length} aposta(s) verificadas${premiados > 0 ? ` • ${premiados} premiada(s)!` : ''}`,
      });

      window.dispatchEvent(new CustomEvent('aposta-gerada'));
    } catch (err: any) {
      toast({ title: 'Erro na verificação', description: err.message, variant: 'destructive' });
    } finally {
      setVerificando(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!autoAtivo) return;
    timerRef.current = setInterval(() => {
      setProximaVer(isBRT21h() ? 'Agora' : tempoAteProxima());
      if (isBRT21h() && !verificando) verificar();
    }, 5 * 60_000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [autoAtivo, verificar, verificando]);

  const premiados = conferencias.filter(c => c.premiado);

  return (
    <div className="space-y-4">
      <div className="p-4 bg-card border border-border rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${autoAtivo ? 'bg-green-500/20' : 'bg-muted/30'}`}>
              <Zap className={`w-4 h-4 ${autoAtivo ? 'text-green-400' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Verificação Automática</p>
              <p className="text-[10px] text-muted-foreground">
                {autoAtivo
                  ? isBRT21h() ? '🟢 Ativa — verificando' : `⏳ Próxima: ${proximaVer || tempoAteProxima()}`
                  : '⭕ Desativada'}
              </p>
            </div>
          </div>
          <button onClick={() => setAutoAtivo(v => !v)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${autoAtivo ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'bg-muted/30 border-border text-muted-foreground'}`}>
            {autoAtivo ? '● ON' : '○ OFF'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div className="bg-muted/20 rounded-lg p-2">
            <p className="text-muted-foreground">Última verificação</p>
            <p className="text-foreground font-bold">{ultimaVer || '—'}</p>
          </div>
          <div className="bg-muted/20 rounded-lg p-2">
            <p className="text-muted-foreground">Sorteios a partir de</p>
            <p className="text-foreground font-bold">21h00 BRT</p>
          </div>
        </div>

        {!isBRT21h() && (
          <div className="flex items-center gap-2 p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <Clock className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
            <p className="text-[10px] text-blue-300">
              Verificação automática inicia às 21h (BRT) e repete a cada 5 minutos até 23h59.
            </p>
          </div>
        )}

        <button onClick={verificar} disabled={verificando}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-bold transition-all">
          <RefreshCw className={`w-3.5 h-3.5 ${verificando ? 'animate-spin' : ''}`} />
          {verificando ? 'Verificando...' : 'Verificar Agora'}
        </button>
      </div>

      {premiados.length > 0 && (
        <div className="p-4 bg-amber-500/10 border-2 border-amber-500/50 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h3 className="font-black text-amber-400">Total Premiado</h3>
          </div>
          <p className="text-xs text-muted-foreground">{premiados.length} aposta(s) premiada(s)</p>
        </div>
      )}

      {conferencias.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            Conferências ({conferencias.length})
          </h3>
          {conferencias.map((c, i) => <CardConferencia key={i} c={c} />)}
        </div>
      ) : !verificando && (
        <div className="text-center py-10">
          <AlertTriangle className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Nenhuma verificação ainda</p>
          <p className="text-muted-foreground/60 text-xs mt-1">Verificação automática às 21h (BRT)</p>
        </div>
      )}
    </div>
  );
}

export default VerificadorSorteios;
