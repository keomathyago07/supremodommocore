import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Activity, Trophy, Clock, CheckCircle, TrendingUp, Bell, RefreshCw, Zap, DollarSign, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useIAGerador, LOTERIAS_CONFIG } from "@/hooks/useIAGerador";
import { verificarAgoraManual } from "@/hooks/useVerificacaoSorteios";

function proximoSorteio(diasSorteio: number[], horario: string): string {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const diaAtual = now.getDay();
  const horaAtual = now.getHours() * 60 + now.getMinutes();
  const [hS, mS] = horario.split(":").map(Number);
  const minSorteio = hS * 60 + mS;
  for (let d = 0; d <= 7; d++) {
    const dia = (diaAtual + d) % 7;
    if (diasSorteio.includes(dia)) {
      if (d === 0 && horaAtual >= minSorteio) continue;
      if (d === 0) return `Hoje às ${horario}`;
      if (d === 1) return `Amanhã às ${horario}`;
      return `${diasSemana[dia]} às ${horario}`;
    }
  }
  return "—";
}

interface ResumoLoteria { loteria: string; pendentes: number; confirmadas: number; verificadas: number; premiadas: number; total_liquido: number; }

function useResumo() {
  return useQuery<ResumoLoteria[]>({
    queryKey: ["dashboard-resumo-ia"],
    queryFn: async () => {
      const [{ data: pendentes }, { data: confirmadas }, { data: premios }] = await Promise.all([
        supabase.from("apostas_pendentes" as any).select("loteria, status, horario_envio"),
        supabase.from("apostas_confirmadas" as any).select("loteria, status_verificacao, pontos_acertados"),
        supabase.from("financeiro_premiacoes" as any).select("loteria, valor_liquido"),
      ]);
      const resumo: Record<string, ResumoLoteria> = {};
      for (const nome of Object.keys(LOTERIAS_CONFIG)) {
        resumo[nome] = { loteria: nome, pendentes: 0, confirmadas: 0, verificadas: 0, premiadas: 0, total_liquido: 0 };
      }
      for (const p of (pendentes ?? []) as any[]) { if (resumo[p.loteria] && p.status === "pendente") resumo[p.loteria].pendentes++; }
      for (const c of (confirmadas ?? []) as any[]) {
        if (!resumo[c.loteria]) continue;
        resumo[c.loteria].confirmadas++;
        if (c.status_verificacao === "verificada") { resumo[c.loteria].verificadas++; if ((c.pontos_acertados ?? 0) > 0) resumo[c.loteria].premiadas++; }
      }
      for (const pr of (premios ?? []) as any[]) { if (resumo[pr.loteria]) resumo[pr.loteria].total_liquido += Number(pr.valor_liquido); }
      return Object.values(resumo);
    },
    refetchInterval: 30_000,
  });
}

function CardLoteria({ r }: { r: ResumoLoteria }) {
  const cfg = LOTERIAS_CONFIG[r.loteria];
  const { gerarJogo, isLoading } = useIAGerador();
  if (!cfg) return null;
  const proximo = proximoSorteio(cfg.diasSorteio, cfg.horarioSorteio);

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
      className={`bg-card border rounded-xl p-4 space-y-3 ${r.pendentes > 0 ? "border-primary/40" : "border-border"}`}>
      <div className="flex items-center justify-between">
        <Badge className="text-xs font-semibold px-3 py-1 bg-primary/20 text-primary border-primary/30">{r.loteria}</Badge>
        {r.pendentes > 0 && <span className="flex items-center gap-1 text-[11px] text-yellow-400 bg-yellow-950/30 border border-yellow-800/30 rounded-full px-2 py-0.5"><Bell className="w-2.5 h-2.5" />{r.pendentes}</span>}
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div><p className="text-lg font-bold text-foreground">{r.confirmadas}</p><p className="text-[10px] text-muted-foreground">Confirmadas</p></div>
        <div><p className="text-lg font-bold text-blue-400">{r.verificadas}</p><p className="text-[10px] text-muted-foreground">Verificadas</p></div>
        <div><p className="text-lg font-bold text-emerald-400">{r.premiadas}</p><p className="text-[10px] text-muted-foreground">Premiadas</p></div>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Calendar className="w-3 h-3" /><span>{proximo}</span>
        <span className="ml-auto text-primary">{cfg.qtd} nº · R$ {cfg.custo.toFixed(2)}</span>
      </div>
      {r.total_liquido > 0 && (
        <div className="flex items-center justify-between text-xs bg-emerald-950/20 border border-emerald-900/30 rounded-lg px-2 py-1.5">
          <span className="text-emerald-600">Total prêmios</span>
          <span className="text-emerald-400 font-bold">R$ {r.total_liquido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
        </div>
      )}
      <Button size="sm" onClick={() => gerarJogo(r.loteria)} disabled={isLoading}
        className={`w-full text-xs ${r.pendentes > 0 ? "" : "bg-primary hover:bg-primary/90 text-primary-foreground"}`}
        variant={r.pendentes > 0 ? "outline" : "default"}>
        <Zap className="w-3 h-3 mr-1.5" />{r.pendentes > 0 ? "Gerar novo" : "Gerar jogo IA"}
      </Button>
    </motion.div>
  );
}

export default function DashboardIAPage() {
  const { data: resumo, isLoading, refetch } = useResumo();
  const qc = useQueryClient();
  const [verificando, setVerificando] = useState(false);
  const { gerarTodas, isLoading: gerando } = useIAGerador();

  const totalPendentes = resumo?.reduce((s, r) => s + r.pendentes, 0) ?? 0;
  const totalConfirmadas = resumo?.reduce((s, r) => s + r.confirmadas, 0) ?? 0;
  const totalPremiadas = resumo?.reduce((s, r) => s + r.premiadas, 0) ?? 0;
  const totalLiquido = resumo?.reduce((s, r) => s + r.total_liquido, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-primary" />
          <div><h1 className="text-xl font-bold text-foreground">Dashboard IA</h1><p className="text-sm text-muted-foreground">Status em tempo real</p></div>
        </div>
        <Button size="sm" variant="outline" onClick={() => refetch()}><RefreshCw className="w-3.5 h-3.5" /></Button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { icon: Bell, label: "Pendentes", value: totalPendentes, cor: "text-yellow-400" },
          { icon: CheckCircle, label: "Confirmadas", value: totalConfirmadas, cor: "text-foreground" },
          { icon: TrendingUp, label: "Premiadas", value: totalPremiadas, cor: "text-emerald-400" },
          { icon: DollarSign, label: "Prêmios", value: `R$ ${totalLiquido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, cor: "text-emerald-400" },
        ].map((k) => (
          <div key={k.label} className="bg-card border border-border rounded-xl p-3 text-center">
            <k.icon className={`w-4 h-4 mx-auto mb-1 ${k.cor}`} />
            <p className={`text-xl font-bold ${k.cor}`}>{k.value}</p>
            <p className="text-[10px] text-muted-foreground">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button onClick={() => gerarTodas()} disabled={gerando} className="bg-primary hover:bg-primary/90 text-primary-foreground py-5">
          <Zap className={`w-4 h-4 mr-2 ${gerando ? "animate-spin" : ""}`} />{gerando ? "Gerando..." : "Gerar todos os jogos"}
        </Button>
        <Button onClick={async () => { setVerificando(true); try { await verificarAgoraManual(qc); } finally { setVerificando(false); } }}
          disabled={verificando} variant="outline" className="py-5">
          <RefreshCw className={`w-4 h-4 mr-2 ${verificando ? "animate-spin" : ""}`} />{verificando ? "Verificando..." : "Verificar sorteios"}
        </Button>
      </div>

      <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3">
        <Clock className="w-4 h-4 text-primary flex-shrink-0" />
        <div className="text-xs text-muted-foreground">
          <span className="text-foreground">Verificação automática:</span> ativa entre <span className="text-primary">21h e 23h59</span> (Brasília) — polling a cada 5 minutos.
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{[1,2,3,4,5].map((i) => (<div key={i} className="h-48 bg-card rounded-xl animate-pulse" />))}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{resumo?.map((r) => (<CardLoteria key={r.loteria} r={r} />))}</div>
      )}
    </div>
  );
}
