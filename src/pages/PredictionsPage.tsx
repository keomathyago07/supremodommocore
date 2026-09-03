// ============================================================
// /dashboard/previsoes — Tela de Previsões Inteligentes
// Gráficos de frequência, atraso, momentum e ranking de loterias,
// alimentados pelo cruzamento histórico (public.resultados_sorteios).
// ============================================================
import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Loader2, RefreshCw, Trophy, Brain } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { UNIVERSO, getIntel, rankLoterias, type LoteriaSlug, type LotteryIntel } from "@/lib/historicalIntel";
import PrevisaoIAPanel from "@/components/PrevisaoIAPanel";

const NOMES: Record<LoteriaSlug, string> = {
  megasena: "🍀 Mega-Sena", quina: "🎯 Quina", lotofacil: "🍀 Lotofácil",
  lotomania: "🎲 Lotomania", timemania: "⚽ Timemania", duplasena: "🎰 Dupla Sena",
  diadesorte: "📅 Dia de Sorte", supersete: "7️⃣ Super Sete", maismilionaria: "💎 +Milionária",
};

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-card border border-border rounded-xl p-4 space-y-3">
    <p className="text-xs font-black text-foreground">{title}</p>
    {children}
  </div>
);

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 11,
  color: "hsl(var(--foreground))",
};

const PredictionsPage: React.FC = () => {
  const [loteria, setLoteria] = useState<LoteriaSlug>("megasena");
  const [intel, setIntel] = useState<LotteryIntel | null>(null);
  const [ranking, setRanking] = useState<LotteryIntel[]>([]);
  const [loading, setLoading] = useState(true);
  const [rankLoading, setRankLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getIntel(loteria).then((i) => { if (alive) { setIntel(i); setLoading(false); } })
      .catch(() => { if (alive) { setIntel(null); setLoading(false); } });
    return () => { alive = false; };
  }, [loteria]);

  const carregarRanking = () => {
    setRankLoading(true);
    rankLoterias().then((r) => setRanking(r)).catch(() => setRanking([])).finally(() => setRankLoading(false));
  };
  useEffect(() => { carregarRanking(); }, []);

  const dadosNumeros = useMemo(
    () => (intel?.numeros ?? []).map((n) => ({
      numero: String(n.numero).padStart(2, "0"),
      freq: n.freq,
      atraso: n.atraso,
      momentum: Number((n.momentum * 100).toFixed(1)),
      score: Number((n.score * 100).toFixed(1)),
    })),
    [intel],
  );

  const dadosRanking = useMemo(
    () => ranking.map((r) => ({
      nome: NOMES[r.loteria].replace(/^\S+\s/, ""),
      sinal: Number((r.indicePrevisibilidade * (r.confiabilidadeDados / 100)).toFixed(1)),
      amostras: r.amostras,
    })),
    [ranking],
  );

  return (
    <div className="space-y-5 p-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-xl font-black text-foreground flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" /> Previsões Inteligentes
        </h1>
        <div className="flex items-center gap-2">
          <Select value={loteria} onValueChange={(v) => setLoteria(v as LoteriaSlug)}>
            <SelectTrigger className="h-9 w-[190px] bg-background border-border text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              {(Object.keys(UNIVERSO) as LoteriaSlug[]).map((l) => (
                <SelectItem key={l} value={l} className="text-xs">{NOMES[l]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button onClick={carregarRanking} className="text-muted-foreground hover:text-foreground">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <PrevisaoIAPanel loteria={loteria} qtdSugestoes={3} />

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : !intel ? (
        <div className="bg-card border border-border rounded-xl p-4 text-xs text-muted-foreground">
          Sem histórico no banco para {NOMES[loteria]}. Aguarde a ingestão diária.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title={`Frequência por número · ${intel.amostras} sorteios`}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={dadosNumeros}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="numero" tick={{ fontSize: 9 }} interval={2} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="freq" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Atraso atual (concursos sem sair)">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={dadosNumeros}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="numero" tick={{ fontSize: 9 }} interval={2} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="atraso" radius={[3, 3, 0, 0]}>
                  {dadosNumeros.map((d, i) => (
                    <Cell key={i} fill={d.atraso > 15 ? "hsl(190 90% 55%)" : "hsl(var(--muted-foreground))"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Momentum (recente vs. global, %)">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={dadosNumeros}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="numero" tick={{ fontSize: 9 }} interval={2} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="momentum" radius={[3, 3, 0, 0]}>
                  {dadosNumeros.map((d, i) => (
                    <Cell key={i} fill={d.momentum >= 0 ? "hsl(24 95% 55%)" : "hsl(215 20% 45%)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Tendência histórica (soma e média de atraso)">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={intel.tendencia}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="concurso" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="soma" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="mediaAtraso" stroke="hsl(140 70% 50%)" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      <Card title="🏆 Ranking de loterias por sinal histórico">
        {rankLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dadosRanking} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis type="category" dataKey="nome" width={92} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="sinal" fill="hsl(var(--primary))" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="space-y-1">
              {ranking.map((r, i) => (
                <div key={r.loteria} className="flex items-center justify-between text-[11px] py-1 border-b border-border/50 last:border-0">
                  <span className="flex items-center gap-2 text-foreground">
                    {i === 0 && <Trophy className="w-3.5 h-3.5 text-yellow-400" />}
                    {NOMES[r.loteria]}
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">#{r.ultimoConcurso}</Badge>
                    <span className="text-muted-foreground">{r.amostras} sorteios</span>
                    <span className="font-black text-primary">
                      {(r.indicePrevisibilidade * (r.confiabilidadeDados / 100)).toFixed(1)}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default PredictionsPage;
