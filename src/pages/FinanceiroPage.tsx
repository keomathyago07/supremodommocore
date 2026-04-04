import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { DollarSign, TrendingUp, CheckCircle, Clock, Trophy, BarChart3, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { verificarAgoraManual } from "@/hooks/useVerificacaoSorteios";

interface Premio {
  id: string;
  loteria: string;
  concurso?: number;
  numeros_apostados: number[];
  numeros_sorteados?: number[];
  acertos: number;
  descricao_faixa?: string;
  valor_bruto: number;
  valor_liquido: number;
  data_lancamento: string;
  status_pagamento: "a_receber" | "recebido" | "cancelado";
}

interface ResumoLoteria {
  loteria: string;
  total_premiadas: number;
  total_bruto: number;
  total_liquido: number;
  a_receber: number;
}

function usePremios() {
  return useQuery<Premio[]>({
    queryKey: ["financeiro-premiacoes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("financeiro_premiacoes" as any).select("*").order("data_lancamento", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Premio[];
    },
    refetchInterval: 60_000,
  });
}

function useResumoLoterias() {
  return useQuery<ResumoLoteria[]>({
    queryKey: ["financeiro-resumo"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vw_financeiro_resumo" as any).select("*");
      if (error) throw error;
      return (data ?? []) as ResumoLoteria[];
    },
  });
}

export default function FinanceiroPage() {
  const { data: premios, isLoading } = usePremios();
  const { data: resumo } = useResumoLoterias();
  const qc = useQueryClient();
  const [verificando, setVerificando] = useState(false);

  const marcarRecebido = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("financeiro_premiacoes" as any).update({ status_pagamento: "recebido" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Prêmio marcado como recebido!");
      qc.invalidateQueries({ queryKey: ["financeiro-premiacoes"] });
      qc.invalidateQueries({ queryKey: ["financeiro-resumo"] });
    },
  });

  const totalBruto = premios?.reduce((s, p) => s + p.valor_bruto, 0) ?? 0;
  const totalLiquido = premios?.reduce((s, p) => s + p.valor_liquido, 0) ?? 0;
  const totalAReceber = premios?.filter((p) => p.status_pagamento === "a_receber").reduce((s, p) => s + p.valor_liquido, 0) ?? 0;
  const totalRecebido = premios?.filter((p) => p.status_pagamento === "recebido").reduce((s, p) => s + p.valor_liquido, 0) ?? 0;

  async function handleVerificarAgora() {
    setVerificando(true);
    try { await verificarAgoraManual(qc); } finally { setVerificando(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <DollarSign className="w-6 h-6 text-emerald-400" />
          <div>
            <h1 className="text-xl font-bold text-foreground">Financeiro</h1>
            <p className="text-sm text-muted-foreground">Prêmios lançados automaticamente</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleVerificarAgora} disabled={verificando}>
          <RefreshCw className={`w-3 h-3 mr-2 ${verificando ? "animate-spin" : ""}`} />Verificar agora
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Total bruto</p>
          <p className="text-2xl font-bold text-foreground">R$ {totalBruto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Total líquido (est. 30% IR)</p>
          <p className="text-2xl font-bold text-emerald-400">R$ {totalLiquido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /><p className="text-xs text-emerald-600">Recebido</p></div>
          <p className="text-xl font-bold text-emerald-400">R$ {totalRecebido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-yellow-950/20 border border-yellow-900/40 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1"><Clock className="w-3.5 h-3.5 text-yellow-400" /><p className="text-xs text-yellow-600">A receber</p></div>
          <p className="text-xl font-bold text-yellow-400">R$ {totalAReceber.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {resumo && resumo.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3"><BarChart3 className="w-4 h-4 text-primary" /><p className="text-sm font-semibold text-primary">Por loteria</p></div>
          <div className="space-y-2">
            {resumo.map((r) => (
              <div key={r.loteria} className="flex items-center justify-between text-sm">
                <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">{r.loteria}</Badge>
                <span className="text-muted-foreground">{r.total_premiadas}x</span>
                <span className="text-emerald-400 font-semibold">R$ {Number(r.total_liquido).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {isLoading ? (
          [1, 2, 3].map((i) => (<div key={i} className="h-32 bg-card rounded-xl animate-pulse" />))
        ) : premios?.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Nenhuma premiação registrada ainda.</p>
            <p className="text-sm mt-1">Prêmios aparecem aqui automaticamente.</p>
          </div>
        ) : (
          premios?.map((premio, idx) => (
            <motion.div key={premio.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
              className="bg-card border border-border rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary/20 text-primary border-primary/30">{premio.loteria}</Badge>
                  {premio.concurso && <span className="text-xs text-muted-foreground">Concurso {premio.concurso}</span>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${premio.status_pagamento === "recebido" ? "text-emerald-400 bg-emerald-950/30 border-emerald-800/30" : "text-yellow-400 bg-yellow-950/30 border-yellow-800/30"}`}>
                  {premio.status_pagamento === "recebido" ? "✓ Recebido" : "⏳ A receber"}
                </span>
              </div>
              <div className="flex gap-2 flex-wrap">
                <span className="text-sm"><span className="text-muted-foreground">Acertos: </span><span className="text-foreground font-bold">{premio.acertos}</span></span>
                {premio.descricao_faixa && (<span className="text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-800/30 rounded px-2 py-0.5">{premio.descricao_faixa}</span>)}
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Apostados:</p>
                <div className="flex flex-wrap gap-1">
                  {premio.numeros_apostados?.map((n) => {
                    const acertou = premio.numeros_sorteados?.includes(n);
                    return (<span key={n} className={`w-7 h-7 flex items-center justify-center rounded-full text-[11px] font-bold ${acertou ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400" : "bg-muted/50 border border-border text-muted-foreground"}`}>{String(n).padStart(2, "0")}</span>);
                  })}
                </div>
              </div>
              <div className="bg-background rounded-lg p-3 grid grid-cols-2 gap-2 text-sm">
                <div><p className="text-xs text-muted-foreground">Valor bruto</p><p className="font-semibold text-foreground">R$ {premio.valor_bruto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p></div>
                <div><p className="text-xs text-muted-foreground">Valor líquido</p><p className="font-bold text-emerald-400">R$ {premio.valor_liquido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p></div>
              </div>
              {premio.status_pagamento === "a_receber" && (
                <Button size="sm" onClick={() => marcarRecebido.mutate(premio.id)} className="w-full bg-emerald-700 hover:bg-emerald-600 text-white">
                  <CheckCircle className="w-3.5 h-3.5 mr-2" />Marcar como recebido
                </Button>
              )}
            </motion.div>
          ))
        )}
      </div>

      {totalBruto > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 text-xs text-muted-foreground">
          <TrendingUp className="w-4 h-4 text-primary inline mr-2" />
          Valor líquido estimado com 30% de desconto tributário.
        </div>
      )}
    </div>
  );
}
