import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Filter, CheckCircle2, XCircle, Clock, Trophy, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type StatusVerificacao = "aguardando_sorteio" | "verificada" | "todos";

interface ApostaHistorico {
  id: string;
  loteria: string;
  numeros: number[];
  numeros_sorteados?: number[];
  dominancia: number;
  precisao: number;
  concurso_verificado?: number;
  pontos_acertados?: number;
  valor_premio?: number;
  descricao_faixa?: string;
  status_verificacao: string;
  horario_confirmacao: string;
  data_sorteio?: string;
}

function NumerosAposta({ numeros, sorteados }: { numeros: number[]; sorteados?: number[] }) {
  const setSorteados = new Set((sorteados ?? []).map(Number));
  return (
    <div className="flex flex-wrap gap-1.5">
      {numeros.map((n) => {
        const acertou = setSorteados.size > 0 && setSorteados.has(n);
        return (
          <span key={n} className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold
            ${acertou ? "bg-emerald-500/20 border border-emerald-500/50 text-emerald-400" : "bg-primary/10 border border-primary/20 text-primary"}`}>
            {String(n).padStart(2, "0")}
          </span>
        );
      })}
    </div>
  );
}

function StatusBadge({ status, acertos }: { status: string; acertos?: number }) {
  if (status === "aguardando_sorteio") {
    return (<span className="flex items-center gap-1 text-xs text-yellow-400 bg-yellow-950/30 border border-yellow-800/30 rounded-full px-2 py-0.5"><Clock className="w-3 h-3" />Aguardando</span>);
  }
  if (status === "verificada") {
    const premiou = (acertos ?? 0) > 0;
    return (
      <span className={`flex items-center gap-1 text-xs rounded-full px-2 py-0.5 border ${premiou ? "text-emerald-400 bg-emerald-950/30 border-emerald-800/30" : "text-muted-foreground bg-muted/30 border-border"}`}>
        {premiou ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
        {acertos ?? 0} acerto(s)
      </span>
    );
  }
  return null;
}

function useHistorico(loteria: string, status: StatusVerificacao) {
  return useQuery<ApostaHistorico[]>({
    queryKey: ["historico-gates-v2", loteria, status],
    queryFn: async () => {
      let q = supabase.from("apostas_confirmadas" as any).select("*").order("horario_confirmacao", { ascending: false }).limit(100);
      if (loteria !== "todas") q = q.eq("loteria", loteria);
      if (status !== "todos") q = q.eq("status_verificacao", status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ApostaHistorico[];
    },
    refetchInterval: 60_000,
  });
}

const LOTERIAS = ["todas", "Quina", "Lotomania", "Lotofácil", "Super Sete", "Dupla Sena", "Megasena", "Dia de Sorte", "Timemania", "+Milionária"];

export default function HistoricoGatesPage() {
  const [loteraFiltro, setLoteraFiltro] = useState("todas");
  const [statusFiltro, setStatusFiltro] = useState<StatusVerificacao>("todos");
  const { data, isLoading } = useHistorico(loteraFiltro, statusFiltro);

  const totalVerificadas = data?.filter((a) => a.status_verificacao === "verificada").length ?? 0;
  const totalPremiadas = data?.filter((a) => (a.valor_premio ?? 0) > 0).length ?? 0;
  const valorTotal = data?.reduce((s, a) => s + (a.valor_premio ?? 0), 0) ?? 0;
  const mediaAcertos = data && data.length > 0 ? data.reduce((s, a) => s + (a.pontos_acertados ?? 0), 0) / data.length : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <TrendingUp className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold text-foreground">Histórico de Gates</h1>
          <p className="text-sm text-muted-foreground">Todos os jogos que atenderam os critérios</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total", value: data?.length ?? 0, color: "text-foreground" },
          { label: "Verificadas", value: totalVerificadas, color: "text-blue-400" },
          { label: "Premiadas", value: totalPremiadas, color: "text-emerald-400" },
          { label: "Média acertos", value: mediaAcertos.toFixed(1), color: "text-primary" },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-3 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {valorTotal > 0 && (
        <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-xl p-4 flex items-center gap-3">
          <Trophy className="w-5 h-5 text-emerald-400" />
          <div>
            <p className="text-sm text-emerald-400 font-semibold">Total: R$ {valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-emerald-600">{totalPremiadas} aposta(s) com retorno</p>
          </div>
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <Select value={loteraFiltro} onValueChange={setLoteraFiltro}>
          <SelectTrigger className="w-44 bg-card border-border">
            <Filter className="w-3 h-3 mr-1 text-muted-foreground" /><SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            {LOTERIAS.map((l) => (<SelectItem key={l} value={l}>{l}</SelectItem>))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          {(["todos", "aguardando_sorteio", "verificada"] as StatusVerificacao[]).map((s) => (
            <Button key={s} size="sm" variant={statusFiltro === s ? "default" : "outline"} onClick={() => setStatusFiltro(s)}>
              {s === "todos" ? "Todos" : s === "verificada" ? "Verificadas" : "Aguardando"}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => (<div key={i} className="h-28 bg-card rounded-xl animate-pulse" />))}</div>
      ) : (
        <AnimatePresence>
          {data?.map((aposta, idx) => (
            <motion.div key={aposta.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
              className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary/20 text-primary border-primary/30">{aposta.loteria}</Badge>
                  {aposta.concurso_verificado && <span className="text-xs text-muted-foreground">Concurso {aposta.concurso_verificado}</span>}
                </div>
                <StatusBadge status={aposta.status_verificacao} acertos={aposta.pontos_acertados} />
              </div>
              <NumerosAposta numeros={aposta.numeros} sorteados={aposta.numeros_sorteados} />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Dom: <span className="text-emerald-400">{aposta.dominancia?.toFixed(1)}%</span> · Prec: <span className="text-blue-400">{aposta.precisao?.toFixed(1)}%</span></span>
                <span>{new Date(aposta.horario_confirmacao).toLocaleDateString("pt-BR")}</span>
              </div>
              {(aposta.valor_premio ?? 0) > 0 && (
                <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-lg px-3 py-2 flex items-center justify-between">
                  <span className="text-xs text-emerald-400">{aposta.descricao_faixa}</span>
                  <span className="text-sm font-bold text-emerald-400">R$ {(aposta.valor_premio ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      )}

      {!isLoading && data?.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Nenhum registro encontrado.</p>
        </div>
      )}
    </div>
  );
}
