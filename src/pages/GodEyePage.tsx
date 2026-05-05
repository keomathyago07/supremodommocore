// 👁️ OLHO DE DEUS — Painel IASV60+ GOD CORE
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Zap, RotateCcw, AlertTriangle, Activity, Database, Cpu } from "lucide-react";
import { useGodCore } from "@/hooks/useGodCore";

const StatusBadge = ({ s }: { s: string }) => {
  const color =
    s === "RUNNING" || s === "OK" ? "bg-green-500/20 text-green-400 border-green-500/40"
    : s === "FAIL" ? "bg-red-500/20 text-red-400 border-red-500/40"
    : s === "RESET" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/40"
    : "bg-muted text-muted-foreground";
  return <Badge variant="outline" className={color}>{s}</Badge>;
};

export default function GodEyePage() {
  const { state, forcePipeline, fullReset, restartIngest, restartModels, restartPipeline } = useGodCore(true);

  const lotsCount = state.last_data ? Object.keys(state.last_data).length : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Eye className="w-8 h-8 text-primary glow-primary" />
        <div>
          <h1 className="font-display text-2xl font-bold tracking-wider glow-text-primary">
            IASV60+ GOD CORE — OLHO DE DEUS
          </h1>
          <p className="text-sm text-muted-foreground">Anti-trava real • Auto-recuperação • Fallback infinito</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><Database className="w-4 h-4 text-primary" /><span className="text-sm">Ingest</span></div>
            <StatusBadge s={state.ingest} />
          </div>
          <p className="text-xs text-muted-foreground">{lotsCount} loterias carregadas</p>
        </Card>
        <Card className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><Activity className="w-4 h-4 text-primary" /><span className="text-sm">Pipeline</span></div>
            <StatusBadge s={state.pipeline} />
          </div>
          <p className="text-xs text-muted-foreground">Ciclos: {state.cycles}</p>
        </Card>
        <Card className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><Cpu className="w-4 h-4 text-primary" /><span className="text-sm">Modelos</span></div>
            <StatusBadge s={state.models} />
          </div>
          <p className="text-xs text-muted-foreground">
            {state.fallback_active ? "⚠️ Fallback ativo" : "Modelos completos"}
          </p>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" /> Falhas acumuladas
          </h2>
          <Badge variant={state.fail_count > 3 ? "destructive" : "outline"}>{state.fail_count}</Badge>
        </div>
        {state.last_error && <p className="text-xs text-red-400 mb-2">Último erro: {state.last_error}</p>}
        <p className="text-xs text-muted-foreground">
          Última execução: {state.last_run_at ?? "nunca"}
        </p>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button onClick={forcePipeline} className="gap-2"><Zap className="w-4 h-4" /> Forçar Pipeline</Button>
        <Button variant="outline" onClick={restartIngest}>Restart Ingest</Button>
        <Button variant="outline" onClick={restartModels}>Restart Modelos</Button>
        <Button variant="outline" onClick={restartPipeline}>Restart Pipeline</Button>
        <Button variant="destructive" onClick={fullReset} className="gap-2">
          <RotateCcw className="w-4 h-4" /> RESET TOTAL
        </Button>
      </div>

      {state.last_data && (
        <Card className="p-4">
          <h2 className="font-semibold mb-2">📡 Última ingestão</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            {Object.entries(state.last_data).map(([lot, payload]: [string, any]) => (
              <div key={lot} className="bg-muted/30 p-2 rounded border border-border">
                <div className="font-bold text-primary uppercase">{lot}</div>
                <div>Concurso: {payload.concurso ?? "—"}</div>
                <div>Fonte: {payload.source ?? "—"}</div>
                <div className="truncate">Nº: {(payload.numeros ?? []).join(", ")}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
