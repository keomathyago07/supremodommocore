// ============================================================
// DesvioPrevisaoCard — Desvio entre a previsão histórica e o
// concurso REAL, por loteria e por concurso (walk-forward).
// ============================================================
import React, { useEffect, useState } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Loader2, Crosshair } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { calcularDesvioPrevisao, type DesvioResumo, type LoteriaSlug } from "@/lib/historicalIntel";

const tooltipStyle = {
  background: "hsl(var(--card))", border: "1px solid hsl(var(--border))",
  borderRadius: 8, fontSize: 11, color: "hsl(var(--foreground))",
};

export const DesvioPrevisaoCard: React.FC<{ loteria: LoteriaSlug; janela?: number }> = ({ loteria, janela = 12 }) => {
  const [res, setRes] = useState<DesvioResumo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    calcularDesvioPrevisao(loteria, janela)
      .then((r) => { if (alive) { setRes(r); setLoading(false); } })
      .catch(() => { if (alive) { setRes(null); setLoading(false); } });
    return () => { alive = false; };
  }, [loteria, janela]);

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground">Medindo desvio previsão × concurso real…</span>
      </div>
    );
  }
  if (!res) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 text-xs text-muted-foreground">
        Histórico insuficiente para medir o desvio desta loteria (mínimo 40 concursos no banco).
      </div>
    );
  }

  const dados = res.concursos.map((c) => ({
    concurso: `#${c.concurso}`,
    acertos: c.acertos,
    esperado: c.esperadoAleatorio,
    desvio: c.desvio,
    hitRate: c.hitRate,
  }));

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Crosshair className="w-4 h-4 text-primary" />
        <p className="text-xs font-black text-foreground">
          Desvio previsão × concurso real · últimos {res.concursos.length} concursos
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Mini v={res.mediaAcertos.toFixed(2)} l="Acertos médios" cls="text-primary" />
        <Mini v={res.mediaEsperado.toFixed(2)} l="Esperado por sorte" cls="text-muted-foreground" />
        <Mini v={`${res.ganhoMedio >= 0 ? "+" : ""}${res.ganhoMedio.toFixed(2)}`} l="Ganho do motor"
          cls={res.ganhoMedio >= 0 ? "text-emerald-400" : "text-red-400"} />
        <Mini v={`${res.aderencia.toFixed(1)}%`} l="Aderência" cls="text-blue-400" />
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={dados}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="concurso" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="desvio" radius={[3, 3, 0, 0]}>
            {dados.map((d, i) => (
              <Cell key={i} fill={d.desvio >= 0 ? "hsl(140 70% 50%)" : "hsl(0 75% 60%)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <ResponsiveContainer width="100%" height={170}>
        <LineChart data={dados}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="concurso" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
          <Tooltip contentStyle={tooltipStyle} />
          <Line type="monotone" dataKey="acertos" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="esperado" stroke="hsl(215 20% 55%)" strokeWidth={2} strokeDasharray="4 3" dot={false} />
        </LineChart>
      </ResponsiveContainer>

      <div className="space-y-1 max-h-64 overflow-y-auto">
        {[...res.concursos].reverse().map((c) => (
          <div key={c.concurso} className="text-[10px] border-b border-border/50 last:border-0 py-1.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground">
                Concurso #{c.concurso} {c.data && <span className="text-muted-foreground">· {c.data}</span>}
              </span>
              <span className="flex items-center gap-2">
                <Badge variant="outline" className="text-[9px]">{c.acertos} acertos</Badge>
                <span className={c.desvio >= 0 ? "text-emerald-400 font-black" : "text-red-400 font-black"}>
                  {c.desvio >= 0 ? "+" : ""}{c.desvio.toFixed(2)}
                </span>
                <span className="text-muted-foreground">Δpos {c.desvioMedioPosicional}</span>
              </span>
            </div>
            <div className="flex flex-wrap gap-2 text-muted-foreground">
              <span>Previsto: <span className="text-primary">{c.previsto.map(n => String(n).padStart(2, "0")).join("-")}</span></span>
              <span>Real: <span className="text-foreground">{c.real.map(n => String(n).padStart(2, "0")).join("-")}</span></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Mini = ({ v, l, cls }: { v: string; l: string; cls: string }) => (
  <div className="bg-background/60 border border-border rounded-lg p-2 text-center">
    <div className={`text-base font-black ${cls}`}>{v}</div>
    <div className="text-[9px] text-muted-foreground">{l}</div>
  </div>
);

export default DesvioPrevisaoCard;
