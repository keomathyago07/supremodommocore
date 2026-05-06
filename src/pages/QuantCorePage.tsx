// 🏦 Página Quant Core — visualiza decisão de risco/ROI por loteria
import { useEffect, useMemo, useState } from "react";
import { useGodEye } from "@/hooks/useGodEye";
import {
  riskEngine, getEpsilon, saveModelVersion, selectBestModel, mutateConfig,
  type DecisaoRisco,
} from "@/engine/quantCore";
import { gerarHistorico, LOTERIAS_CONFIG, type LoteriaNome } from "@/engine/godCore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const corAcao: Record<DecisaoRisco["acao"], string> = {
  BET: "bg-emerald-500",
  NO_BET: "bg-amber-500",
  STOP: "bg-red-500",
};

export default function QuantCorePage() {
  const { pipelines, TODAS_LOTERIAS, rodarTodas, resumo } = useGodEye("megasena");
  const [tick, setTick] = useState(0);
  useEffect(() => { const i = setInterval(() => setTick(t => t + 1), 3000); return () => clearInterval(i); }, []);

  const failRate = resumo.total > 0 ? resumo.error / resumo.total : 0;

  const decisoes = useMemo(() => {
    return TODAS_LOTERIAS.map((l: LoteriaNome) => {
      const p = pipelines?.[l];
      const cfg = LOTERIAS_CONFIG[l];
      const ensemble = p?.ensemble?.length ? p.ensemble : Array.from({ length: cfg.qtd }, (_, i) => cfg.min + i);
      const hist = gerarHistorico(p?.dadosAPI?.numeros ?? ensemble, cfg, 60);
      const r = riskEngine(l, ensemble, hist, p?.score ?? 0, failRate);
      return { loteria: l, ensemble, decisao: r };
    });
  }, [pipelines, tick, failRate, TODAS_LOTERIAS]);

  const best = selectBestModel();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">🏦 Quant Core v17.0</h1>
          <p className="text-muted-foreground text-sm">
            Decisão profissional baseada em ROI, entropia, Monte Carlo & meta-AI ·
            ε={getEpsilon().toFixed(3)} · fail-rate={(failRate * 100).toFixed(1)}%
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={rodarTodas}>▶ Re-executar Triple Engine</Button>
          <Button
            variant="outline"
            onClick={() => {
              const cur = best?.config ?? { lr: 0.001, hidden: 256, dropout: 0.3 };
              const novo = mutateConfig(cur);
              saveModelVersion("evolved-" + Date.now(), novo, Math.random() * 100);
            }}
          >
            🧬 Evoluir Modelo
          </Button>
        </div>
      </div>

      {best && (
        <Card>
          <CardHeader><CardTitle>🏆 Melhor Modelo Atual</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <div>Nome: <span className="font-mono">{best.name}</span></div>
            <div>Score: <span className="text-emerald-500">{best.score.toFixed(2)}</span></div>
            <div>Config: <span className="font-mono text-xs">{JSON.stringify(best.config)}</span></div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {decisoes.map(({ loteria, ensemble, decisao }) => {
          const cfg = LOTERIAS_CONFIG[loteria];
          return (
            <Card key={loteria}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">{cfg.emoji} {cfg.nome}</CardTitle>
                <Badge className={corAcao[decisao.acao]}>{decisao.acao}</Badge>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex flex-wrap gap-1">
                  {ensemble.slice(0, cfg.qtd).map(n => (
                    <span key={n} className="font-mono bg-primary/10 border border-primary/30 rounded px-2 py-0.5">
                      {String(n).padStart(2, "0")}
                    </span>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground">{decisao.motivo}</div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <div>Estratégia: <b>{decisao.estrategia}</b></div>
                  <div>Score: <b className="text-emerald-500">{decisao.scoreFinal.toFixed(1)}</b></div>
                  <div>ROI sim: <b>{decisao.metricas.roi.toFixed(2)}</b></div>
                  <div>EV: <b>R$ {decisao.metricas.ev.toFixed(2)}</b></div>
                  <div>Win-rate: <b>{(decisao.metricas.winRate * 100).toFixed(1)}%</b></div>
                  <div>Entropia: <b>{decisao.metricas.entropia.toFixed(2)}</b></div>
                  <div>Momentum: <b>{decisao.metricas.momentum.toFixed(2)}</b></div>
                  <div>Bankroll: <b>{(decisao.bankrollPct * 100).toFixed(2)}%</b></div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
