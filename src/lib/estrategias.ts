// Estratégias honestas: equilíbrio de jogo, fechamentos e controle de gastos.
import { supabase } from "@/integrations/supabase/client";

export interface Equilibrio {
  ok: boolean;
  soma: number;
  pares: number;
  impares: number;
  maxSeq: number;
  motivos: string[];
}

export interface RegrasEquilibrio {
  somaMin: number; somaMax: number; maxPares: number; maxImpares: number; maxConsecutivos: number;
}

/** Avalia se um jogo foge de padrões comuns (muito jogados) — não altera a chance de acerto. */
export function avaliarEquilibrio(nums: number[], r: RegrasEquilibrio): Equilibrio {
  const s = [...nums].sort((a, b) => a - b);
  const soma = s.reduce((a, b) => a + b, 0);
  const pares = s.filter(n => n % 2 === 0).length;
  const impares = s.length - pares;
  let maxSeq = 1, cur = 1;
  for (let i = 1; i < s.length; i++) { cur = s[i] === s[i - 1] + 1 ? cur + 1 : 1; maxSeq = Math.max(maxSeq, cur); }
  const motivos: string[] = [];
  if (soma < r.somaMin || soma > r.somaMax) motivos.push(`soma ${soma} fora de ${r.somaMin}–${r.somaMax}`);
  if (pares > r.maxPares) motivos.push(`${pares} pares (máx ${r.maxPares})`);
  if (impares > r.maxImpares) motivos.push(`${impares} ímpares (máx ${r.maxImpares})`);
  if (maxSeq > r.maxConsecutivos) motivos.push(`sequência de ${maxSeq} (máx ${r.maxConsecutivos})`);
  const datas = s.filter(n => n <= 31).length;
  if (s.length >= 5 && datas === s.length) motivos.push("só números até 31 (padrão de datas, muito jogado)");
  return { ok: motivos.length === 0, soma, pares, impares, maxSeq, motivos };
}

/** Gera um jogo equilibrado sorteando até respeitar as regras. */
export function gerarEquilibrado(min: number, max: number, qtd: number, r: RegrasEquilibrio, tentativas = 5000): number[] {
  let melhor: number[] = [];
  for (let t = 0; t < tentativas; t++) {
    const pool = Array.from({ length: max - min + 1 }, (_, i) => i + min);
    const jogo: number[] = [];
    while (jogo.length < qtd) jogo.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    jogo.sort((a, b) => a - b);
    melhor = jogo;
    if (avaliarEquilibrio(jogo, r).ok) return jogo;
  }
  return melhor;
}

function combinacoes<T>(arr: T[], k: number): T[][] {
  const out: T[][] = [];
  const rec = (start: number, acc: T[]) => {
    if (acc.length === k) { out.push([...acc]); return; }
    for (let i = start; i < arr.length; i++) { acc.push(arr[i]); rec(i + 1, acc); acc.pop(); }
  };
  rec(0, []);
  return out;
}

export interface Fechamento {
  jogos: number[][];
  garantia: string;
  combinacoesCobertas: number;
}

/**
 * Fechamento por cobertura (guloso): com N dezenas escolhidas e jogos de k dezenas,
 * garante pelo menos `t` acertos em algum jogo SE pelo menos `t` das N dezenas forem sorteadas.
 */
export function gerarFechamento(dezenas: number[], k: number, t: number): Fechamento {
  const base = [...new Set(dezenas)].sort((a, b) => a - b);
  if (base.length < k || t > k || t < 1) return { jogos: [], garantia: "parâmetros inválidos", combinacoesCobertas: 0 };
  if (base.length > 20) return { jogos: [], garantia: "use no máximo 20 dezenas", combinacoesCobertas: 0 };
  const alvos = combinacoes(base, t).map(c => c.join("-"));
  const faltam = new Set(alvos);
  const candidatos = combinacoes(base, k);
  if (candidatos.length > 40000) return { jogos: [], garantia: "combinação grande demais — reduza as dezenas", combinacoesCobertas: 0 };
  const cobre = candidatos.map(c => combinacoes(c, t).map(x => x.join("-")));
  const jogos: number[][] = [];
  while (faltam.size) {
    let best = -1, bestN = 0;
    cobre.forEach((cs, i) => {
      let n = 0; for (const x of cs) if (faltam.has(x)) n++;
      if (n > bestN) { bestN = n; best = i; }
    });
    if (best < 0) break;
    jogos.push(candidatos[best]);
    cobre[best].forEach(x => faltam.delete(x));
  }
  return {
    jogos,
    garantia: `Se ${t} das ${base.length} dezenas forem sorteadas, pelo menos 1 jogo terá ${t} acertos.`,
    combinacoesCobertas: alvos.length,
  };
}

// ---------------- Controle de gastos ----------------
export interface LimitesGasto { diario: number; mensal: number; ativo: boolean }
const LS = "dommo.limites.gasto.v1";
export function lerLimites(): LimitesGasto {
  try { return { diario: 50, mensal: 500, ativo: true, ...JSON.parse(localStorage.getItem(LS) ?? "{}") }; }
  catch { return { diario: 50, mensal: 500, ativo: true }; }
}
export function salvarLimites(l: LimitesGasto) { localStorage.setItem(LS, JSON.stringify(l)); }

export async function gastosAtuais(): Promise<{ hoje: number; mes: number }> {
  const brt = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const inicioMes = new Date(Date.UTC(brt.getFullYear(), brt.getMonth(), 1, 3));
  const inicioDia = new Date(Date.UTC(brt.getFullYear(), brt.getMonth(), brt.getDate(), 3));
  const { data } = await supabase.from("apostas_confirmadas")
    .select("custo_aposta, horario_confirmacao").gte("horario_confirmacao", inicioMes.toISOString());
  let hoje = 0, mes = 0;
  for (const r of (data ?? []) as { custo_aposta: number; horario_confirmacao: string }[]) {
    const v = Number(r.custo_aposta) || 0;
    mes += v;
    if (new Date(r.horario_confirmacao) >= inicioDia) hoje += v;
  }
  return { hoje, mes };
}
