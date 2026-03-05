import { useState } from 'react';
import { LOTTERIES, type LotteryConfig } from '@/lib/lotteryConstants';
import { Trophy, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface ResultData {
  numero_concurso: number;
  data_concurso: string;
  dezenas: string[];
  premiacao: any[];
}

const ResultsPage = () => {
  const [selectedLottery, setSelectedLottery] = useState<LotteryConfig>(LOTTERIES[0]);
  const [result, setResult] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchResult = async () => {
    setLoading(true);
    setResult(null);
    try {
      // Try fetching from a public endpoint (no token needed for latest result)
      const res = await fetch(`https://apiloterias.com.br/app/v2/resultado?loteria=${selectedLottery.apiName}&token=demo`);
      if (res.ok) {
        const data = await res.json();
        setResult(data);
      } else {
        toast.error('Não foi possível buscar resultados. Configure sua API.');
      }
    } catch {
      toast.error('Erro de rede ao buscar resultados.');
    }
    setLoading(false);
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-display font-bold">Resultados das Loterias</h1>

      <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
        {LOTTERIES.map((l) => (
          <button
            key={l.id}
            onClick={() => { setSelectedLottery(l); setResult(null); }}
            className={`px-3 py-2 rounded-lg text-xs font-display font-semibold transition-all
              ${selectedLottery.id === l.id ? 'text-primary-foreground' : 'glass text-foreground hover:border-primary/30'}`}
            style={selectedLottery.id === l.id ? { background: l.color } : {}}
          >
            {l.name}
          </button>
        ))}
      </div>

      <div className="glass rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-display font-bold" style={{ color: selectedLottery.color }}>
            {selectedLottery.name}
          </h2>
          <button
            onClick={fetchResult}
            disabled={loading}
            className="flex items-center gap-2 gradient-primary text-primary-foreground font-display px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Buscar Resultado
          </button>
        </div>

        {result ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex items-center gap-3">
              <Trophy className="w-5 h-5 text-secondary" />
              <span className="font-mono text-sm">Concurso #{result.numero_concurso}</span>
              <span className="text-xs text-muted-foreground">{result.data_concurso}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {result.dezenas?.map((n: string) => (
                <span
                  key={n}
                  className="w-12 h-12 rounded-full flex items-center justify-center font-mono font-bold text-lg"
                  style={{ backgroundColor: selectedLottery.color, color: '#fff' }}
                >
                  {n}
                </span>
              ))}
            </div>
          </motion.div>
        ) : !loading ? (
          <div className="text-center py-10">
            <Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Clique em "Buscar Resultado" para ver o último sorteio.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ResultsPage;
