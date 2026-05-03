import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { LOTTERIES } from '@/lib/lotteryConstants';
import { toast } from 'sonner';
import { Loader2, Sparkles, Activity, Network, Atom } from 'lucide-react';

interface UltraResult {
  loteria: string;
  jogo: number[];
  scores: Record<number, number>;
  top10: Array<{ numero: number; score: number; componentes: any }>;
}

const ScoreUltraPage = () => {
  const [loteria, setLoteria] = useState<string>('megasena');
  const [loadingCorr, setLoadingCorr] = useState(false);
  const [loadingScore, setLoadingScore] = useState(false);
  const [result, setResult] = useState<UltraResult | null>(null);

  const rodarCorrelacoes = async () => {
    setLoadingCorr(true);
    try {
      const { data, error } = await supabase.functions.invoke('engine-correlacoes-ciclos', {
        body: { loterias: [loteria] },
      });
      if (error) throw error;
      const r = data?.resultados?.[0];
      if (r?.error) toast.error(`Falha: ${r.error}`);
      else toast.success(`Correlações: ${r?.pares_relevantes ?? 0} pares · Ciclos: ${r?.ciclos_calculados ?? 0} (${r?.ms}ms)`);
    } catch (e: any) {
      toast.error(e.message ?? String(e));
    } finally {
      setLoadingCorr(false);
    }
  };

  const gerarJogo = async () => {
    setLoadingScore(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('engine-score-ultra', {
        body: { loteria },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error ?? 'erro');
      setResult(data);
      toast.success(`Jogo gerado: ${data.jogo.join(' · ')}`);
    } catch (e: any) {
      toast.error(e.message ?? String(e));
    } finally {
      setLoadingScore(false);
    }
  };

  const lot = LOTTERIES.find((l) => l.id === loteria);

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            <Atom className="w-8 h-8 text-primary" />
            Score Ultra v17 — 20 Tecnologias
          </h1>
          <p className="text-muted-foreground mt-1">
            HMM · FFT · Correlações · Genético · TFT · N-BEATS · Deep Ensemble
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">TitanDommoCore v17 SUPREMA</Badge>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" /> Pipeline de Geração
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {LOTTERIES.map((l) => (
              <Button
                key={l.id}
                variant={loteria === l.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLoteria(l.id)}
              >
                {l.name}
              </Button>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <Button onClick={rodarCorrelacoes} disabled={loadingCorr} variant="secondary">
              {loadingCorr ? <Loader2 className="animate-spin" /> : <Network />}
              1. Calcular Correlações + Ciclos FFT
            </Button>
            <Button onClick={gerarJogo} disabled={loadingScore}>
              {loadingScore ? <Loader2 className="animate-spin" /> : <Activity />}
              2. Gerar Jogo Score Ultra
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Jogo Gerado · {lot?.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {result.jogo.map((n) => (
                  <div
                    key={n}
                    className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg"
                  >
                    {String(n).padStart(2, '0')}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top 10 Números por Score Ultra</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {result.top10.map((row) => (
                  <div key={row.numero} className="flex items-center gap-3 p-2 rounded-md bg-muted/50">
                    <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
                      {String(row.numero).padStart(2, '0')}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold">Score: {row.score.toFixed(1)}</div>
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3">
                        <span>freq: {row.componentes?.freq?.toFixed(0)}</span>
                        <span>atraso: {row.componentes?.atraso?.toFixed(0)}</span>
                        <span>ciclo: {row.componentes?.ciclo?.toFixed(0)}</span>
                        <span>regime: {row.componentes?.regime?.toFixed(0)}</span>
                        <span>lift: {row.componentes?.lift?.toFixed(0)}</span>
                        <span>hot: {row.componentes?.hot?.toFixed(0)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default ScoreUltraPage;
