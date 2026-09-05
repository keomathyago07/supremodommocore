// ============================================================
// AgendaPrevisaoCard — Horário programado das Previsões Inteligentes.
// No horário definido, o motor envia 1 jogo por loteria do dia
// direto para "Minhas Apostas" (sincronia total com o pipeline).
// ============================================================
import React, { useState } from "react";
import { Clock, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  agendaPrevisao, executarEnvioProgramado, loteriasDeHoje, useAgendadorPrevisoes,
} from "@/lib/previsaoAgendada";
import { CONFIG_LOTERIAS } from "@/hooks/useGerarJogo";

export const AgendaPrevisaoCard: React.FC = () => {
  const agenda = useAgendadorPrevisoes();
  const { toast } = useToast();
  const [hora, setHora] = useState(agenda.horario);
  const [busy, setBusy] = useState(false);
  const hoje = loteriasDeHoje();

  function salvar() {
    agendaPrevisao.set({ horario: hora });
    toast({ title: "⏰ Horário salvo", description: `Envio automático às ${hora} (BRT), 1 jogo por loteria do dia.` });
  }

  async function agora() {
    setBusy(true);
    const r = await executarEnvioProgramado();
    toast({ title: r.enviadas.length ? "🔮 Previsões enviadas" : "Nada a enviar", description: r.resumo });
    setBusy(false);
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <p className="text-xs font-black text-foreground">Envio programado para Minhas Apostas</p>
        </div>
        <Switch checked={agenda.ativo} onCheckedChange={(v) => agendaPrevisao.set({ ativo: v })} />
      </div>

      <div className="flex items-end gap-2 flex-wrap">
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground">Horário (BRT)</label>
          <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="h-8 w-[110px] text-xs" />
        </div>
        <Button size="sm" className="h-8 text-[11px]" onClick={salvar}>Salvar horário</Button>
        <Button size="sm" variant="outline" className="h-8 text-[11px]" onClick={agora} disabled={busy}>
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          <span className="ml-1">Enviar agora</span>
        </Button>
      </div>

      <div className="flex flex-wrap gap-1">
        {hoje.length ? hoje.map((l) => (
          <Badge key={l} variant="outline" className="text-[10px]">
            {CONFIG_LOTERIAS[l].emoji} {CONFIG_LOTERIAS[l].nome}
          </Badge>
        )) : <span className="text-[10px] text-muted-foreground">Nenhuma loteria sorteia hoje.</span>}
      </div>

      <p className="text-[10px] text-muted-foreground">
        {agenda.ativo
          ? `Ativo · próximo envio às ${agenda.horario} BRT · 1 jogo por loteria (sem duplicar no mesmo dia).`
          : "Desativado — nenhum envio automático será feito."}
        {agenda.ultimoResumo && <> <br />Último ciclo: {agenda.ultimoResumo}</>}
      </p>
    </div>
  );
};

export default AgendaPrevisaoCard;
