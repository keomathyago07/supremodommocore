import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ConfigLoteria {
  nome: string;
  slug: string;
  qtd: number;
  min: number;
  max: number;
  minDominancia: number;
  minPrecisao: number;
  somaMin: number;
  somaMax: number;
  maxPares: number;
  maxImpares: number;
  maxPrimos: number;
  maxConsecutivos: number;
  maxMesmaDezena: number;
  diasSorteio: number[];
  horarioSorteio: string;
  custo: number;
}

export const LOTERIAS_CONFIG: Record<string, ConfigLoteria> = {
  Quina: {
    nome: "Quina", slug: "quina", qtd: 5, min: 1, max: 80,
    minDominancia: 370, minPrecisao: 238, somaMin: 100, somaMax: 260,
    maxPares: 3, maxImpares: 4, maxPrimos: 3, maxConsecutivos: 2, maxMesmaDezena: 2,
    diasSorteio: [2, 4, 6], horarioSorteio: "20:00", custo: 2.5,
  },
  Lotomania: {
    nome: "Lotomania", slug: "lotomania", qtd: 50, min: 0, max: 99,
    minDominancia: 390, minPrecisao: 248, somaMin: 2000, somaMax: 2800,
    maxPares: 28, maxImpares: 28, maxPrimos: 16, maxConsecutivos: 6, maxMesmaDezena: 6,
    diasSorteio: [1, 3, 5], horarioSorteio: "20:00", custo: 3.0,
  },
  "Lotofácil": {
    nome: "Lotofácil", slug: "lotofacil", qtd: 15, min: 1, max: 25,
    minDominancia: 375, minPrecisao: 245, somaMin: 170, somaMax: 230,
    maxPares: 8, maxImpares: 9, maxPrimos: 6, maxConsecutivos: 3, maxMesmaDezena: 5,
    diasSorteio: [1, 2, 3, 4, 5, 6], horarioSorteio: "20:00", custo: 3.0,
  },
  "Super Sete": {
    nome: "Super Sete", slug: "supersete", qtd: 7, min: 0, max: 9,
    minDominancia: 370, minPrecisao: 240, somaMin: 20, somaMax: 50,
    maxPares: 4, maxImpares: 4, maxPrimos: 4, maxConsecutivos: 3, maxMesmaDezena: 7,
    diasSorteio: [3], horarioSorteio: "20:00", custo: 2.5,
  },
  "Dupla Sena": {
    nome: "Dupla Sena", slug: "duplasena", qtd: 6, min: 1, max: 50,
    minDominancia: 445, minPrecisao: 232, somaMin: 100, somaMax: 200,
    maxPares: 4, maxImpares: 4, maxPrimos: 3, maxConsecutivos: 2, maxMesmaDezena: 2,
    diasSorteio: [1, 4], horarioSorteio: "20:00", custo: 2.5,
  },
  "Megasena": {
    nome: "Megasena", slug: "megasena", qtd: 6, min: 1, max: 60,
    minDominancia: 400, minPrecisao: 240, somaMin: 120, somaMax: 240,
    maxPares: 4, maxImpares: 4, maxPrimos: 3, maxConsecutivos: 2, maxMesmaDezena: 2,
    diasSorteio: [2, 4, 6], horarioSorteio: "20:00", custo: 5.0,
  },
  "Dia de Sorte": {
    nome: "Dia de Sorte", slug: "diadesorte", qtd: 7, min: 1, max: 31,
    minDominancia: 360, minPrecisao: 230, somaMin: 80, somaMax: 160,
    maxPares: 4, maxImpares: 5, maxPrimos: 4, maxConsecutivos: 3, maxMesmaDezena: 3,
    diasSorteio: [2, 4, 6], horarioSorteio: "20:00", custo: 2.5,
  },
  "Timemania": {
    nome: "Timemania", slug: "timemania", qtd: 10, min: 1, max: 80,
    minDominancia: 380, minPrecisao: 235, somaMin: 200, somaMax: 500,
    maxPares: 6, maxImpares: 6, maxPrimos: 5, maxConsecutivos: 3, maxMesmaDezena: 3,
    diasSorteio: [2, 4, 6], horarioSorteio: "20:00", custo: 3.5,
  },
  "+Milionária": {
    nome: "+Milionária", slug: "maismilionaria", qtd: 6, min: 1, max: 50,
    minDominancia: 420, minPrecisao: 240, somaMin: 100, somaMax: 200,
    maxPares: 4, maxImpares: 4, maxPrimos: 3, maxConsecutivos: 2, maxMesmaDezena: 2,
    diasSorteio: [3, 6], horarioSorteio: "20:00", custo: 6.0,
  },
};

function isPrimo(n: number): boolean {
  if (n < 2) return false;
  for (let i = 2; i <= Math.sqrt(n); i++) if (n % i === 0) return false;
  return true;
}

function calcularDominancia(numeros: number[], cfg: ConfigLoteria): number {
  const range = cfg.max - cfg.min + 1;
  const meio = cfg.min + range / 2;
  const dominantes = numeros.filter((n) => n >= meio).length;
  return (dominantes / numeros.length) * 100 * (cfg.qtd / 5);
}

function calcularPrecisao(numeros: number[], historico: number[][]): number {
  if (historico.length === 0) return 200;
  const freq: Record<number, number> = {};
  for (const sorteio of historico) {
    for (const n of sorteio) freq[n] = (freq[n] ?? 0) + 1;
  }
  const total = historico.length * (historico[0]?.length || 1);
  const score = numeros.reduce((s, n) => s + (freq[n] ?? 0), 0);
  return (score / total) * 1000;
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
  const primos = numeros.filter(isPrimo).length;
  if (primos > cfg.maxPrimos) return false;
  if (contarConsecutivos(numeros) > cfg.maxConsecutivos) return false;
  const dezenas: Record<number, number> = {};
  for (const n of numeros) {
    const d = Math.floor(n / 10);
    dezenas[d] = (dezenas[d] ?? 0) + 1;
    if (dezenas[d] > cfg.maxMesmaDezena) return false;
  }
  return true;
}

function gerarJogo(cfg: ConfigLoteria, historico: number[][]): number[] | null {
  const MAX_TENTATIVAS = 50_000;
  const pool = Array.from({ length: cfg.max - cfg.min + 1 }, (_, i) => i + cfg.min);

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
    const score = fNorm >= 0.3 && fNorm <= 0.7 ? fNorm * 1.4 : fNorm;
    return Math.max(score, 0.05);
  });
  const totalPeso = pesos.reduce((s, p) => s + p, 0);
  const pesosNorm = pesos.map((p) => p / totalPeso);

  function selecionar(excluidos: Set<number>): number {
    let r = Math.random();
    for (let i = 0; i < pool.length; i++) {
      if (excluidos.has(pool[i])) continue;
      r -= pesosNorm[i];
      if (r <= 0) return pool[i];
    }
    const restantes = pool.filter((n) => !excluidos.has(n));
    return restantes[Math.floor(Math.random() * restantes.length)];
  }

  for (let t = 0; t < MAX_TENTATIVAS; t++) {
    const selecionados = new Set<number>();
    const numeros: number[] = [];
    for (let i = 0; i < cfg.qtd; i++) {
      const n = selecionar(selecionados);
      numeros.push(n);
      selecionados.add(n);
    }
    if (validarAposta(numeros, cfg)) {
      return numeros.sort((a, b) => a - b);
    }
  }
  return null;
}

export function useIAGerador() {
  const qc = useQueryClient();

  const gerarMutation = useMutation({
    mutationFn: async (loteria: string) => {
      const cfg = LOTERIAS_CONFIG[loteria];
      if (!cfg) throw new Error(`Loteria não configurada: ${loteria}`);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: hist } = await supabase
        .from("resultados_sorteios" as any)
        .select("dezenas")
        .eq("loteria", loteria)
        .order("concurso", { ascending: false })
        .limit(100);

      const historico: number[][] = (hist ?? []).map((r: any) =>
        (r.dezenas as number[]).map(Number)
      );

      let melhor: number[] | null = null;
      let melhorDom = -Infinity;
      let melhorPrec = 0;

      for (let c = 0; c < 3; c++) {
        const jogo = gerarJogo(cfg, historico);
        if (!jogo) continue;
        const dom = calcularDominancia(jogo, cfg);
        const prec = calcularPrecisao(jogo, historico);
        if (dom > melhorDom) {
          melhor = jogo;
          melhorDom = dom;
          melhorPrec = prec;
        }
      }

      if (!melhor) throw new Error("IA não conseguiu gerar jogo válido.");

      const { error } = await supabase.from("apostas_pendentes" as any).insert({
        user_id: user.id,
        loteria,
        numeros: melhor,
        dominancia: parseFloat(melhorDom.toFixed(2)),
        precisao: parseFloat(melhorPrec.toFixed(2)),
        status: "pendente",
        criterios_atendidos: [
          { nome: "Qtd. números", valor: String(melhor.length), ok: melhor.length === cfg.qtd },
          { nome: "Soma", valor: String(melhor.reduce((s, n) => s + n, 0)), ok: true },
          { nome: "Dominância", valor: melhorDom.toFixed(1) + "%", ok: melhorDom >= cfg.minDominancia },
          { nome: "Precisão", valor: melhorPrec.toFixed(1) + "%", ok: melhorPrec >= cfg.minPrecisao },
          { nome: "Pares/Ímpares", valor: `${melhor.filter(n => n % 2 === 0).length}/${melhor.filter(n => n % 2 !== 0).length}`, ok: true },
          { nome: "Consecutivos", valor: String(contarConsecutivos(melhor)), ok: contarConsecutivos(melhor) <= cfg.maxConsecutivos },
        ],
      });
      if (error) throw error;

      return { numeros: melhor, dominancia: melhorDom, precisao: melhorPrec, loteria };
    },
    onSuccess: ({ numeros, dominancia, precisao, loteria }) => {
      toast.success(`✅ Jogo gerado — ${loteria}`, {
        description: `${numeros.join(", ")} | Dom: ${dominancia.toFixed(1)}% · Prec: ${precisao.toFixed(1)}%`,
      });
      qc.invalidateQueries({ queryKey: ["apostas-pendentes"] });
    },
    onError: (err) => {
      toast.error("Erro ao gerar jogo", { description: String(err) });
    },
  });

  const gerarTodasMutation = useMutation({
    mutationFn: async () => {
      const resultados = [];
      for (const loteria of Object.keys(LOTERIAS_CONFIG)) {
        try {
          const hoje = new Date().toISOString().split("T")[0];
          const { data: existe } = await supabase
            .from("apostas_pendentes" as any)
            .select("id")
            .eq("loteria", loteria)
            .eq("status", "pendente")
            .gte("horario_envio", hoje + "T00:00:00Z")
            .maybeSingle();

          if (existe) {
            resultados.push({ loteria, status: "ja_existe" });
            continue;
          }

          await gerarMutation.mutateAsync(loteria);
          resultados.push({ loteria, status: "gerada" });
          await new Promise((r) => setTimeout(r, 300));
        } catch (e) {
          resultados.push({ loteria, status: "erro", erro: String(e) });
        }
      }
      return resultados;
    },
    onSuccess: (resultados) => {
      const geradas = resultados.filter((r) => r.status === "gerada").length;
      const erros = resultados.filter((r) => r.status === "erro").length;
      if (geradas > 0) {
        toast.success(`${geradas} jogo(s) gerado(s) pela IA`, {
          description: erros > 0 ? `${erros} falha(s)` : "Acesse Minha Aposta para confirmar",
        });
      }
    },
  });

  return {
    gerarJogo: (loteria: string) => gerarMutation.mutate(loteria),
    gerarTodas: () => gerarTodasMutation.mutate(),
    isLoading: gerarMutation.isPending || gerarTodasMutation.isPending,
    config: LOTERIAS_CONFIG,
  };
}
