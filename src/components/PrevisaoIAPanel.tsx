// ============================================================
// PrevisaoIAPanel — Previsões gerais e por concurso na tela de aposta.
// Lê o cruzamento histórico (banco de sorteios) via historicalIntel e
// exibe números quentes/frios, índice de previsibilidade e sugestões
// de jogos geradas pelo motor histórico (amostragem ponderada).
// ============================================================
import React, { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Sparkles, TrendingUp, Snowflake, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  UNIVERSO, amostrarPonderado, getIntel, getPesosHistoricos,
  type LoteriaSlug, type LotteryIntel,
} from "@/lib/historicalIntel";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  loteria: LoteriaSlug;
  qtdSugestoes?: number;
}

const Bolas = ({ nums, cls }: { nums: number[]; cls: string }) => (
  <div className="flex flex-wrap gap-1">
    {nums.map((n) => (
      <span key={n} className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black ${cls}`}>
        {String(n).padStart(2, "0")}
      </span>
    ))}
  </div>
);

export const PrevisaoIAPanel: React.FC<Props> = ({ loteria, qtdSugestoes = 3 }) => {
  const [intel, setIntel] = useState<LotteryIntel | null>(null);
  const [proximo, setProximo] = useState<number | null>(null);
  const [sugestoes, setSugestoes] = useState<number[][]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    const [i, pc] = await Promise.all([
      getIntel(loteria).catch(() => null),
      supabase.from("proximo_concurso").select("concurso_atual, data_proxima")
        .eq("loteria", loteria).maybeSingle(),
    ]);
    setIntel(i);
    setProximo((pc?.data as { concurso_atual?: number } | null)?.concurso_atual ?? null);
    if (i) {
      const pesos = await getPesosHistoricos(loteria);
      const u = UNIVERSO[loteria];
      setSugestoes(
        Array.from({ length: qtdSugestoes }, () =>
          amostrarPonderado(pesos, u.min, u.max, u.qtd).sort((a, b) => a - b),
        ),
      );
    } else setSugestoes([]);
    setLoading(false);
  }, [loteria, qtdSugestoes]);

  useEffect(() => { void carregar(); }, [carregar]);

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground">Cruzando histórico do banco…</span>
      </div>
    );
  }

  if (!intel) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 text-xs text-muted-foreground">
        Sem histórico suficiente no banco para esta loteria. A ingestão diária irá preencher automaticamente.
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <p className="text-xs font-black text-foreground">Previsão Histórica IA</p>
        </div>
        <button onClick={carregar} className="text-muted-foreground hover:text-foreground">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-2 text-center">
          <div className="text-lg font-black text-primary">{intel.indicePrevisibilidade.toFixed(1)}%</div>
          <div className="text-[10px] text-muted-foreground">Previsibilidade</div>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2 text-center">
          <div className="text-lg font-black text-emerald-400">{intel.confiabilidadeDados.toFixed(0)}%</div>
          <div className="text-[10px] text-muted-foreground">Dados ({intel.amostras})</div>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-2 text-center">
          <div className="text-lg font-black text-blue-400">#{proximo ?? intel.ultimoConcurso + 1}</div>
          <div className="text-[10px] text-muted-foreground">Próx. concurso</div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-orange-400">
          <TrendingUp className="w-3.5 h-3.5" /> Quentes (momentum + score)
        </div>
        <Bolas nums={intel.quentes.slice(0, 10).map((n) => n.numero)}
          cls="bg-orange-500/20 text-orange-300 border border-orange-500/40" />
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-400 pt-1">
          <Snowflake className="w-3.5 h-3.5" /> Frios / atrasados
        </div>
        <Bolas nums={intel.frios.slice(0, 10).map((n) => n.numero)}
          cls="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40" />
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-foreground">
          <Target className="w-3.5 h-3.5 text-primary" /> Sugestões do motor histórico · concurso #{proximo ?? intel.ultimoConcurso + 1}
        </div>
        {sugestoes.map((jogo, i) => (
          <div key={i} className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">J{i + 1}</Badge>
            <Bolas nums={jogo} cls="bg-primary/20 text-primary border border-primary/40" />
          </div>
        ))}
        <Button size="sm" variant="outline" className="text-[11px] h-7" onClick={carregar}>
          Gerar novas sugestões
        </Button>
      </div>

      {intel.paresTop.length > 0 && (
        <p className="text-[10px] text-muted-foreground">
          Pares de maior lift: {intel.paresTop.slice(0, 5).map((p) => p.par).join(" · ")}
        </p>
      )}
    </div>
  );
};

export default PrevisaoIAPanel;
