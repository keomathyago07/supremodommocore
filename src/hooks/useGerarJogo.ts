// src/hooks/useGerarJogo.ts
// ============================================================
// VERSÃO 3 ULTRA — Todas loterias com campos especiais:
// Lotomania (duplo), Dupla Sena (2 sorteios), Super Sete (colunas),
// Dia de Sorte (mês), Timemania (time), Mais Milionária (trevos)
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const TIMES_TIMEMANIA = [
  'Flamengo','Fluminense','Vasco','Botafogo','Palmeiras','Corinthians',
  'São Paulo','Santos','Grêmio','Internacional','Cruzeiro','Atlético-MG',
  'Athletico-PR','Bahia','Fortaleza','Ceará','Sport','Náutico',
  'América-MG','Goiás','Coritiba','Avaí','Chapecoense','Ponte Preta',
  'Vitória','Bragantino','Juventude','Cuiabá','ABC','Sampaio Corrêa',
  'Paysandu','Remo','Confiança','Botafogo-PB','Guarani','CRB',
  'Tombense','Operário','Londrina','Ituano','Manaus','Ferroviária',
  'Figueirense','Criciúma','Novorizontino','Altos','São José','CSA',
];

export const MESES_SORTE = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
];

export const CONFIG_LOTERIAS = {
  megasena: {
    nome: 'Mega-Sena', slug: 'megasena', qtd: 6, min: 1, max: 60,
    custo: 5.00, emoji: '🟢', cor: '#00a651', dias: [2,4,6],
    tipo: 'simples' as const,
    faixas: { 6:'Sena', 5:'Quina', 4:'Quadra' } as Record<number, string>,
    minAcertos: 4,
    descricao: '6 números de 1 a 60',
    somaMin: 100, somaMax: 260, maxPares: 4, maxImpares: 4, maxPrimos: 4, maxConsecutivos: 3,
  },
  quina: {
    nome: 'Quina', slug: 'quina', qtd: 5, min: 1, max: 80,
    custo: 2.50, emoji: '🟣', cor: '#6633cc', dias: [1,2,3,4,5,6],
    tipo: 'simples' as const,
    faixas: { 5:'Quina', 4:'Quadra', 3:'Terno', 2:'Duque' } as Record<number, string>,
    minAcertos: 2,
    descricao: '5 números de 1 a 80',
    somaMin: 80, somaMax: 280, maxPares: 4, maxImpares: 4, maxPrimos: 3, maxConsecutivos: 3,
  },
  lotofacil: {
    nome: 'Lotofácil', slug: 'lotofacil', qtd: 15, min: 1, max: 25,
    custo: 3.00, emoji: '🟤', cor: '#930089', dias: [1,2,3,4,5,6],
    tipo: 'simples' as const,
    faixas: { 15:'15 pontos', 14:'14 pontos', 13:'13 pontos', 12:'12 pontos', 11:'11 pontos' } as Record<number, string>,
    minAcertos: 11,
    descricao: '15 números de 1 a 25',
    somaMin: 150, somaMax: 240, maxPares: 9, maxImpares: 9, maxPrimos: 10, maxConsecutivos: 5,
  },
  lotomania: {
    nome: 'Lotomania', slug: 'lotomania', qtd: 50, min: 0, max: 99,
    custo: 3.00, emoji: '🟠', cor: '#f68e1e', dias: [1,3,5],
    tipo: 'duplo' as const,
    faixas: { 20:'20 pontos', 19:'19 pontos', 18:'18 pontos', 17:'17 pontos', 16:'16 pontos', 15:'15 pontos', 0:'0 pontos (especial)' } as Record<number, string>,
    minAcertos: 15,
    descricao: '50 números de 00 a 99 • Jogo duplo (50+50)',
    somaMin: 2000, somaMax: 3000, maxPares: 30, maxImpares: 30, maxPrimos: 20, maxConsecutivos: 8,
  },
  duplasena: {
    nome: 'Dupla Sena', slug: 'duplasena', qtd: 6, min: 1, max: 50,
    custo: 2.50, emoji: '🔴', cor: '#cc3333', dias: [2,4,6],
    tipo: 'duplo_sorteio' as const,
    faixas: { 6:'Sena', 5:'Quina', 4:'Quadra', 3:'Terno' } as Record<number, string>,
    minAcertos: 3,
    descricao: '6 números de 1 a 50 • 2 sorteios por concurso',
    somaMin: 60, somaMax: 200, maxPares: 4, maxImpares: 4, maxPrimos: 4, maxConsecutivos: 3,
  },
  supersete: {
    nome: 'Super Sete', slug: 'supersete', qtd: 7, min: 0, max: 9,
    custo: 2.50, emoji: '🟡', cor: '#f7941d', dias: [3,6],
    tipo: 'colunas' as const,
    faixas: { 7:'7 colunas', 6:'6 colunas', 5:'5 colunas', 4:'4 colunas', 3:'3 colunas' } as Record<number, string>,
    minAcertos: 3,
    descricao: '1 número por coluna (7 colunas de 0 a 9)',
    somaMin: 10, somaMax: 50, maxPares: 5, maxImpares: 5, maxPrimos: 4, maxConsecutivos: 3,
  },
  timemania: {
    nome: 'Timemania', slug: 'timemania', qtd: 10, min: 1, max: 80,
    custo: 3.50, emoji: '⚽', cor: '#009933', dias: [2,4,6],
    tipo: 'time' as const,
    faixas: { 7:'7 pontos', 6:'6 pontos', 5:'5 pontos', 4:'4 pontos', 3:'3 pontos' } as Record<number, string>,
    minAcertos: 3,
    descricao: '10 números de 1 a 80 + Time do Coração',
    somaMin: 150, somaMax: 550, maxPares: 6, maxImpares: 6, maxPrimos: 6, maxConsecutivos: 4,
  },
  diadesorte: {
    nome: 'Dia de Sorte', slug: 'diadesorte', qtd: 7, min: 1, max: 31,
    custo: 2.50, emoji: '🍀', cor: '#00cc66', dias: [2,4,6],
    tipo: 'mes' as const,
    faixas: { 7:'7 pontos', 6:'6 pontos', 5:'5 pontos', 4:'4 pontos' } as Record<number, string>,
    minAcertos: 4,
    descricao: '7 números de 1 a 31 + Mês da Sorte',
    somaMin: 50, somaMax: 160, maxPares: 5, maxImpares: 5, maxPrimos: 4, maxConsecutivos: 3,
  },
  maismilionaria: {
    nome: '+Milionária', slug: 'maismilionaria', qtd: 6, min: 1, max: 50,
    custo: 6.00, emoji: '💎', cor: '#9b59b6', dias: [3,6],
    tipo: 'trevos' as const,
    faixas: { 6:'6 acertos', 5:'5 acertos', 4:'4 acertos', 3:'3 acertos', 2:'2 acertos' } as Record<number, string>,
    minAcertos: 2,
    descricao: '6 números de 1 a 50 + 2 Trevos de 1 a 6',
    somaMin: 60, somaMax: 200, maxPares: 4, maxImpares: 4, maxPrimos: 4, maxConsecutivos: 3,
  },
} as const;

export type LoteriaNome = keyof typeof CONFIG_LOTERIAS;

export interface ApostaGerada {
  loteria: LoteriaNome;
  numeros: number[];
  numerosInvertido?: number[];
  colunasSuperSete?: Record<string, number>;
  mesDaSorte?: string;
  timeTimemania?: string;
  trevos?: number[];
  tipoJogo: string;
  dominancia: number;
  precisao: number;
  scoreQualidade: number;
}

// ─── Helpers ──────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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

function gerarNumerosBase(min: number, max: number, qtd: number): number[] {
  const pool = Array.from({ length: max - min + 1 }, (_, i) => i + min);
  return shuffle(pool).slice(0, qtd).sort((a, b) => a - b);
}

function gerarNumerosIA(cfg: typeof CONFIG_LOTERIAS[LoteriaNome]): number[] {
  for (let tentativa = 0; tentativa < 200; tentativa++) {
    const nums = gerarNumerosBase(cfg.min, cfg.max, cfg.qtd);
    const soma = nums.reduce((s, n) => s + n, 0);
    const pares = nums.filter(n => n % 2 === 0).length;
    const impares = nums.length - pares;
    const primos = nums.filter(isPrimo).length;
    const consec = contarConsecutivos(nums);

    if (soma >= cfg.somaMin && soma <= cfg.somaMax &&
        pares <= cfg.maxPares && impares <= cfg.maxImpares &&
        primos <= cfg.maxPrimos && consec <= cfg.maxConsecutivos) {
      return nums;
    }
  }
  return gerarNumerosBase(cfg.min, cfg.max, cfg.qtd);
}

function calcularScore(numeros: number[], min: number, max: number) {
  const meio = (min + max) / 2;
  const altos = numeros.filter(n => n > meio).length;
  const dom = parseFloat(((altos / numeros.length) * 100).toFixed(2));
  const prec = parseFloat((40 + Math.random() * 45).toFixed(2));
  const qual = parseFloat(((dom * 0.4) + (prec * 0.6)).toFixed(2));
  return { dom, prec, qual };
}

// ─── Gerador por loteria ──────────────────────────────────────

export function gerarJogoIA(loteria: LoteriaNome): ApostaGerada {
  const cfg = CONFIG_LOTERIAS[loteria];

  // Simples: Mega, Quina, Lotofácil, Dupla Sena
  if (['megasena','quina','lotofacil','duplasena'].includes(loteria)) {
    const nums = gerarNumerosIA(cfg);
    const { dom, prec, qual } = calcularScore(nums, cfg.min, cfg.max);
    return { loteria, numeros: nums, tipoJogo: cfg.tipo === 'duplo_sorteio' ? 'duplo_sorteio' : 'simples', dominancia: dom, precisao: prec, scoreQualidade: qual };
  }

  // Lotomania — Jogo Duplo (50 + 50 invertidos)
  if (loteria === 'lotomania') {
    const todos = Array.from({ length: 100 }, (_, i) => i);
    const principal = shuffle(todos).slice(0, 50).sort((a, b) => a - b);
    const invertido = todos.filter(n => !principal.includes(n)).sort((a, b) => a - b);
    const { dom, prec, qual } = calcularScore(principal, 0, 99);
    return { loteria, numeros: principal, numerosInvertido: invertido, tipoJogo: 'duplo', dominancia: dom, precisao: prec, scoreQualidade: qual };
  }

  // Super Sete — 1 número por coluna
  if (loteria === 'supersete') {
    const colunas: Record<string, number> = {};
    const numeros: number[] = [];
    for (let col = 1; col <= 7; col++) {
      const n = Math.floor(Math.random() * 10);
      colunas[`col${col}`] = n;
      numeros.push(n);
    }
    const { dom, prec, qual } = calcularScore(numeros, 0, 9);
    return { loteria, numeros, colunasSuperSete: colunas, tipoJogo: 'colunas', dominancia: dom, precisao: prec, scoreQualidade: qual };
  }

  // Timemania — 10 números + Time do Coração
  if (loteria === 'timemania') {
    const nums = gerarNumerosIA(cfg);
    const time = TIMES_TIMEMANIA[Math.floor(Math.random() * TIMES_TIMEMANIA.length)];
    const { dom, prec, qual } = calcularScore(nums, 1, 80);
    return { loteria, numeros: nums, timeTimemania: time, tipoJogo: 'time', dominancia: dom, precisao: prec, scoreQualidade: qual };
  }

  // Dia de Sorte — 7 números + Mês
  if (loteria === 'diadesorte') {
    const nums = gerarNumerosIA(cfg);
    const mes = MESES_SORTE[Math.floor(Math.random() * 12)];
    const { dom, prec, qual } = calcularScore(nums, 1, 31);
    return { loteria, numeros: nums, mesDaSorte: mes, tipoJogo: 'mes', dominancia: dom, precisao: prec, scoreQualidade: qual };
  }

  // +Milionária — 6 números + 2 Trevos
  if (loteria === 'maismilionaria') {
    const nums = gerarNumerosIA(cfg);
    const poolTrevos = shuffle([1,2,3,4,5,6]).slice(0, 2).sort((a, b) => a - b);
    const { dom, prec, qual } = calcularScore(nums, 1, 50);
    return { loteria, numeros: nums, trevos: poolTrevos, tipoJogo: 'trevos', dominancia: dom, precisao: prec, scoreQualidade: qual };
  }

  // Fallback
  const nums = gerarNumerosBase(cfg.min, cfg.max, cfg.qtd);
  const { dom, prec, qual } = calcularScore(nums, cfg.min, cfg.max);
  return { loteria, numeros: nums, tipoJogo: 'simples', dominancia: dom, precisao: prec, scoreQualidade: qual };
}

// ─── Hook: Gerador de jogos ───────────────────────────────────

export function useGerarJogo() {
  const { toast } = useToast();
  const [gerando, setGerando] = useState<LoteriaNome | null>(null);

  const salvarAposta = useCallback(async (jogo: ApostaGerada): Promise<string | null> => {
    const cfg = CONFIG_LOTERIAS[jogo.loteria];
    setGerando(jogo.loteria);

    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) throw new Error('Usuário não autenticado.');

      const { data: apostaId, error: rpcErr } = await supabase.rpc('inserir_aposta_ia', {
        p_loteria: jogo.loteria,
        p_numeros: jogo.numeros,
        p_dominancia: jogo.dominancia,
        p_precisao: jogo.precisao,
        p_criterios: JSON.stringify([
          { nome: 'Dominância', valor: jogo.dominancia },
          { nome: 'Precisão', valor: jogo.precisao },
          { nome: 'Score', valor: jogo.scoreQualidade },
        ]),
        p_numeros_invertido: jogo.numerosInvertido ?? null,
        p_colunas_supersete: jogo.colunasSuperSete ?? null,
        p_mes_da_sorte: jogo.mesDaSorte ?? null,
        p_time_timemania: jogo.timeTimemania ?? null,
        p_trevos: jogo.trevos ?? null,
        p_tipo_jogo: jogo.tipoJogo,
        p_score_qualidade: jogo.scoreQualidade,
      } as any);

      if (rpcErr) throw rpcErr;

      window.dispatchEvent(new CustomEvent('aposta-gerada', { detail: { loteria: jogo.loteria } }));
      return apostaId as string;
    } catch (err: any) {
      toast({ title: `Erro — ${cfg.nome}`, description: err.message, variant: 'destructive' });
      return null;
    } finally {
      setGerando(null);
    }
  }, [toast]);

  const gerarJogo = useCallback(async (loteria: LoteriaNome): Promise<boolean> => {
    const cfg = CONFIG_LOTERIAS[loteria];
    const jogo = gerarJogoIA(loteria);
    const id = await salvarAposta(jogo);
    if (!id) return false;

    let desc = jogo.numeros.slice(0, 10).join(', ');
    if (jogo.numeros.length > 10) desc += '...';
    if (jogo.numerosInvertido) desc += ` | +50 invertidos`;
    if (jogo.mesDaSorte) desc += ` | Mês: ${jogo.mesDaSorte}`;
    if (jogo.timeTimemania) desc += ` | Time: ${jogo.timeTimemania}`;
    if (jogo.trevos) desc += ` | Trevos: ${jogo.trevos.join('-')}`;
    if (jogo.colunasSuperSete) {
      desc = Object.entries(jogo.colunasSuperSete).map(([c, n]) => `C${c.replace('col','')}: ${n}`).join(' ');
    }

    toast({ title: `✅ ${cfg.nome} gerado!`, description: desc });
    return true;
  }, [salvarAposta, toast]);

  const gerarTodas = useCallback(async () => {
    const lista = Object.keys(CONFIG_LOTERIAS) as LoteriaNome[];
    let ok = 0;
    for (const l of lista) {
      if (await gerarJogo(l)) ok++;
      await new Promise(r => setTimeout(r, 350));
    }
    toast({ title: `🎯 ${ok}/${lista.length} jogos gerados`, description: 'Confirme em "Minha Aposta".' });
  }, [gerarJogo, toast]);

  return { gerarJogo, gerarTodas, salvarAposta, gerando };
}

// ─── Hook: Agendador automático ───────────────────────────────

export function useAgendadorIA(horario = '19:31') {
  const { gerarTodas } = useGerarJogo();
  const execRef = useRef('');
  const { toast } = useToast();

  useEffect(() => {
    const tick = setInterval(async () => {
      const agora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
      const hh = String(agora.getHours()).padStart(2, '0');
      const mm = String(agora.getMinutes()).padStart(2, '0');
      const horaAtual = `${hh}:${mm}`;
      const chave = `${agora.toISOString().split('T')[0]}_${horario}`;

      if (horaAtual === horario && execRef.current !== chave) {
        execRef.current = chave;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        toast({ title: '🤖 IA — Geração Automática', description: `Horário programado (${horario}h BRT) ativado.` });
        await gerarTodas();
      }
    }, 30_000);

    return () => clearInterval(tick);
  }, [horario, gerarTodas, toast]);
}
