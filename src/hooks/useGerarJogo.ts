// src/hooks/useGerarJogo.ts
// ============================================================
// GERADOR IA v10 — Usa RPC segura, verifica auth, agendador
// Adaptado para tabelas: apostas_pendentes / apostas_confirmadas
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { LOTERIAS_CONFIG, type ConfigLoteria } from '@/hooks/useIAGerador';

export type LoteriaNome = keyof typeof LOTERIAS_CONFIG;

// ─── Gerador IA com critérios de qualidade ────────────────────
function isPrimo(n: number): boolean {
  if (n < 2) return false;
  for (let i = 2; i <= Math.sqrt(n); i++) if (n % i === 0) return false;
  return true;
}

function contarConsecutivos(numeros: number[]): number {
  const sorted = [...numeros].sort((a, b) => a - b);
  let max = 1, cur = 1;
  for (let i = 1; i < sorted.length; i++) {
    cur = sorted[i] === sorted[i - 1] + 1 ? cur + 1 : 1;
    max = Math.max(max, cur);
  }
  return max;
}

function validarAposta(numeros: number[], cfg: ConfigLoteria): boolean {
  if (numeros.length !== cfg.qtd) return false;
  const sorted = [...numeros].sort((a, b) => a - b);
  if (sorted[0] < cfg.min || sorted[sorted.length - 1] > cfg.max) return false;
  const soma = numeros.reduce((s, n) => s + n, 0);
  if (soma < cfg.somaMin || soma > cfg.somaMax) return false;
  const pares = numeros.filter((n) => n % 2 === 0).length;
  if (pares > cfg.maxPares) return false;
  if (numeros.length - pares > cfg.maxImpares) return false;
  if (numeros.filter(isPrimo).length > cfg.maxPrimos) return false;
  if (contarConsecutivos(numeros) > cfg.maxConsecutivos) return false;
  return true;
}

function gerarNumerosIA(cfg: ConfigLoteria, historico: number[][] = []): number[] | null {
  const pool = Array.from({ length: cfg.max - cfg.min + 1 }, (_, i) => i + cfg.min);
  
  // Build frequency weights from history
  const freq: Record<number, number> = {};
  pool.forEach((n) => (freq[n] = 0));
  for (const sorteio of historico) {
    for (const n of sorteio) {
      if (freq[n] !== undefined) freq[n]++;
    }
  }

  const pesos = pool.map((n) => {
    const f = freq[n] ?? 0;
    const fNorm = historico.length > 0 ? f / historico.length : 0.5;
    return Math.max(fNorm >= 0.3 && fNorm <= 0.7 ? fNorm * 1.4 : fNorm, 0.05);
  });
  const totalPeso = pesos.reduce((s, p) => s + p, 0);
  const pesosNorm = pesos.map((p) => p / totalPeso);

  for (let t = 0; t < 50_000; t++) {
    const selecionados = new Set<number>();
    const numeros: number[] = [];
    for (let i = 0; i < cfg.qtd; i++) {
      let r = Math.random();
      for (let j = 0; j < pool.length; j++) {
        if (selecionados.has(pool[j])) continue;
        r -= pesosNorm[j];
        if (r <= 0) { numeros.push(pool[j]); selecionados.add(pool[j]); break; }
      }
      if (numeros.length <= i) {
        const rest = pool.filter((n) => !selecionados.has(n));
        const pick = rest[Math.floor(Math.random() * rest.length)];
        numeros.push(pick);
        selecionados.add(pick);
      }
    }
    if (validarAposta(numeros, cfg)) {
      return numeros.sort((a, b) => a - b);
    }
  }
  return null;
}

function calcularScore(numeros: number[], cfg: ConfigLoteria, historico: number[][]): { dom: number; prec: number } {
  const range = cfg.max - cfg.min + 1;
  const meio = cfg.min + range / 2;
  const dominantes = numeros.filter((n) => n >= meio).length;
  const dom = (dominantes / numeros.length) * 100 * (cfg.qtd / 5);

  let prec = 200;
  if (historico.length > 0) {
    const freqMap: Record<number, number> = {};
    for (const s of historico) for (const n of s) freqMap[n] = (freqMap[n] ?? 0) + 1;
    const total = historico.length * (historico[0]?.length || 1);
    prec = (numeros.reduce((s, n) => s + (freqMap[n] ?? 0), 0) / total) * 1000;
  }

  return { dom: parseFloat(dom.toFixed(2)), prec: parseFloat(prec.toFixed(2)) };
}

// ─── Hook principal ───────────────────────────────────────────
export function useGerarJogo() {
  const { toast } = useToast();
  const [gerando, setGerando] = useState<string | null>(null);

  const gerarJogo = useCallback(async (loteria: string): Promise<boolean> => {
    const cfg = LOTERIAS_CONFIG[loteria];
    if (!cfg) { toast({ title: 'Loteria inválida', variant: 'destructive' }); return false; }
    setGerando(loteria);

    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) {
        toast({ title: '⚠️ Não autenticado', description: 'Faça login para gerar apostas.', variant: 'destructive' });
        return false;
      }

      // Fetch history
      const { data: hist } = await supabase
        .from("resultados_sorteios")
        .select("dezenas")
        .eq("loteria", loteria)
        .order("concurso", { ascending: false })
        .limit(100);

      const historico: number[][] = (hist ?? []).map((r: any) => (r.dezenas as number[]).map(Number));

      // Generate best of 3 candidates
      let melhor: number[] | null = null;
      let melhorDom = -Infinity;
      let melhorPrec = 0;

      for (let c = 0; c < 3; c++) {
        const jogo = gerarNumerosIA(cfg, historico);
        if (!jogo) continue;
        const { dom, prec } = calcularScore(jogo, cfg, historico);
        if (dom > melhorDom) { melhor = jogo; melhorDom = dom; melhorPrec = prec; }
      }

      if (!melhor) throw new Error("IA não conseguiu gerar jogo válido.");

      const criterios = [
        { nome: "Qtd. números", valor: String(melhor.length), ok: melhor.length === cfg.qtd },
        { nome: "Soma", valor: String(melhor.reduce((s, n) => s + n, 0)), ok: true },
        { nome: "Dominância", valor: melhorDom.toFixed(1) + "%", ok: melhorDom >= cfg.minDominancia },
        { nome: "Precisão", valor: melhorPrec.toFixed(1) + "%", ok: melhorPrec >= cfg.minPrecisao },
        { nome: "Pares/Ímpares", valor: `${melhor.filter(n => n % 2 === 0).length}/${melhor.filter(n => n % 2 !== 0).length}`, ok: true },
        { nome: "Consecutivos", valor: String(contarConsecutivos(melhor)), ok: contarConsecutivos(melhor) <= cfg.maxConsecutivos },
      ];

      // Try RPC first, fallback to direct insert
      const { error: rpcErr } = await supabase.rpc('inserir_aposta_ia' as any, {
        p_loteria: loteria,
        p_numeros: melhor,
        p_dominancia: melhorDom,
        p_precisao: melhorPrec,
        p_criterios: criterios,
      });

      if (rpcErr) {
        // Fallback: direct insert
        const { error: insertErr } = await supabase.from("apostas_pendentes").insert({
          user_id: user.id,
          loteria,
          numeros: melhor,
          dominancia: parseFloat(melhorDom.toFixed(2)),
          precisao: parseFloat(melhorPrec.toFixed(2)),
          status: "pendente",
          criterios_atendidos: criterios,
        } as any);
        if (insertErr) throw insertErr;
      }

      toast({
        title: `✅ ${cfg.nome} gerado!`,
        description: `${melhor.join(', ')} • Dom: ${melhorDom.toFixed(1)}% • Prec: ${melhorPrec.toFixed(1)}%`,
      });

      window.dispatchEvent(new CustomEvent('aposta-gerada', { detail: { loteria } }));
      return true;
    } catch (err: any) {
      toast({ title: `Erro ao gerar ${cfg.nome}`, description: err?.message || String(err), variant: 'destructive' });
      return false;
    } finally {
      setGerando(null);
    }
  }, [toast]);

  const gerarTodas = useCallback(async (loterias?: string[]) => {
    const lista = loterias ?? Object.keys(LOTERIAS_CONFIG);
    let sucesso = 0;
    for (const loteria of lista) {
      // Check if already exists today
      const hoje = new Date().toISOString().split("T")[0];
      const { data: existe } = await supabase
        .from("apostas_pendentes")
        .select("id")
        .eq("loteria", loteria)
        .eq("status", "pendente")
        .gte("horario_envio", hoje + "T00:00:00Z")
        .maybeSingle();
      if (existe) continue;

      const ok = await gerarJogo(loteria);
      if (ok) sucesso++;
      await new Promise(r => setTimeout(r, 300));
    }
    if (sucesso > 0) {
      toast({ title: `🎯 ${sucesso} jogo(s) gerado(s)`, description: 'Acesse "Minha Aposta" para confirmar.' });
    }
  }, [gerarJogo, toast]);

  return { gerarJogo, gerarTodas, gerando };
}

// ─── Hook: agendador automático (dispara no horário BRT) ─────
export function useAgendadorIA(horario: string = '19:30') {
  const { gerarTodas } = useGerarJogo();
  const ultimaExecucaoRef = useRef<string>('');
  const { toast } = useToast();

  useEffect(() => {
    const intervalo = setInterval(() => {
      const agora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
      const horaAtual = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;
      const chave = `${new Date().toISOString().split('T')[0]}_${horario}`;

      if (horaAtual === horario && ultimaExecucaoRef.current !== chave) {
        ultimaExecucaoRef.current = chave;
        toast({ title: '🤖 IA Iniciando Geração', description: `Horário programado (${horario}h) — gerando apostas...` });
        gerarTodas();
      }
    }, 30_000);
    return () => clearInterval(intervalo);
  }, [horario, gerarTodas, toast]);
}
