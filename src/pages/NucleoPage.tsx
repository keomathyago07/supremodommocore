// Núcleo: painel único de sincronia + teste honesto das estratégias contra jogos aleatórios.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Activity, FlaskConical, RefreshCw } from "lucide-react";

const LOT: Record<string, { nome: string; min: number; max: number; qtd: number }> = {
  megasena: { nome: "Mega-Sena", min: 1, max: 60, qtd: 6 },
  quina: { nome: "Quina", min: 1, max: 80, qtd: 5 },
  lotofacil: { nome: "Lotofácil", min: 1, max: 25, qtd: 15 },
  lotomania: { nome: "Lotomania", min: 0, max: 99, qtd: 50 },
  timemania: { nome: "Timemania", min: 1, max: 80, qtd: 10 },
  duplasena: { nome: "Dupla Sena", min: 1, max: 50, qtd: 6 },
  diadesorte: { nome: "Dia de Sorte", min: 1, max: 31, qtd: 7 },
  maismilionaria: { nome: "+Milionária", min: 1, max: 50, qtd: 6 },
};

type Item = { nome: string; ok: boolean | null; detalhe: string };
const fmt = (s?: string | null) => s ? new Date(s).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—";

function aleatorio(min: number, max: number, q: number) {
  const p = Array.from({ length: max - min + 1 }, (_, i) => i + min);
  for (let i = p.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  return p.slice(0, q);
}

type Linha = { loteria: string; testes: number; quentes: number; atrasados: number; aleatorio: number };

function testar(loteria: string, sorteios: number[][]): Linha | null {
  const c = LOT[loteria]; const janela = 50;
  if (sorteios.length < janela + 10) return null;
  let q = 0, a = 0, r = 0, n = 0;
  for (let t = janela; t < sorteios.length; t++) {
    const hist = sorteios.slice(t - janela, t), alvo = new Set(sorteios[t]);
    const freq = new Map<number, number>(), ult = new Map<number, number>();
    hist.forEach((d, i) => d.forEach(x => { freq.set(x, (freq.get(x) ?? 0) + 1); ult.set(x, i); }));
    const nums = Array.from({ length: c.max - c.min + 1 }, (_, i) => i + c.min);
    const quentes = [...nums].sort((x, y) => (freq.get(y) ?? 0) - (freq.get(x) ?? 0)).slice(0, c.qtd);
    const atras = [...nums].sort((x, y) => (ult.get(x) ?? -1) - (ult.get(y) ?? -1)).slice(0, c.qtd);
    let ra = 0; for (let k = 0; k < 20; k++) ra += aleatorio(c.min, c.max, c.qtd).filter(x => alvo.has(x)).length;
    q += quentes.filter(x => alvo.has(x)).length; a += atras.filter(x => alvo.has(x)).length; r += ra / 20; n++;
  }
  return { loteria, testes: n, quentes: q / n, atrasados: a / n, aleatorio: r / n };
}

export default function NucleoPage() {
  const [itens, setItens] = useState<Item[]>([]);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [busy, setBusy] = useState(false);
  const [testando, setTestando] = useState(false);

  const carregar = async () => {
    const [jobs, res, envios, pend] = await Promise.all([
      supabase.from("ingest_jobs").select("job, paused, pause_reason, last_run_at, last_status"),
      supabase.from("resultados_sorteios").select("loteria, concurso, created_at").order("created_at", { ascending: false }).limit(1),
      supabase.from("envio_previsoes_log").select("created_at, status").order("created_at", { ascending: false }).limit(1),
      supabase.from("apostas_confirmadas").select("id", { count: "exact", head: true }).eq("status_verificacao", "aguardando_sorteio"),
    ]);
    const lista: Item[] = (jobs.data ?? []).map((j: any) => ({
      nome: `Tarefa automática: ${j.job}`,
      ok: j.paused ? false : j.last_status ? !/erro|fail/i.test(j.last_status) : null,
      detalhe: j.paused ? `Pausada: ${j.pause_reason ?? ""}` : `Última execução ${fmt(j.last_run_at)} · ${j.last_status ?? "sem registro"}`,
    }));
    const r = res.data?.[0] as any;
    lista.unshift({ nome: "Coleta de resultados oficiais", ok: !!r, detalhe: r ? `Último: ${LOT[r.loteria]?.nome ?? r.loteria} #${r.concurso} em ${fmt(r.created_at)}` : "Nenhum resultado" });
    const e = envios.data?.[0] as any;
    lista.push({ nome: "Envio dos jogos do dia", ok: e ? e.status !== "erro" : null, detalhe: e ? `Último envio ${fmt(e.created_at)} · ${e.status}` : "Nenhum envio ainda — ative o horário em Previsões" });
    lista.push({ nome: "Apostas aguardando conferência", ok: true, detalhe: `${pend.count ?? 0} aposta(s)` });
    setItens(lista);
  };

  useEffect(() => { carregar(); }, []);

  const rodarTudo = async () => {
    setBusy(true);
    const passos = await Promise.allSettled([
      supabase.functions.invoke("sync-e-confere", { body: {} }),
      supabase.functions.invoke("conferidor-v23", { body: {} }),
    ]);
    const falhas = passos.filter(p => p.status === "rejected" || (p.value as any)?.error).length;
    falhas ? toast.warning(`${2 - falhas} de 2 etapas concluídas`) : toast.success("Coleta e conferência executadas");
    await carregar(); setBusy(false);
  };

  const rodarTeste = async () => {
    setTestando(true);
    const out: Linha[] = [];
    for (const l of Object.keys(LOT)) {
      const { data } = await supabase.from("resultados_sorteios").select("concurso, dezenas").eq("loteria", l).order("concurso", { ascending: false }).limit(300);
      const s = (data ?? []).reverse().map((d: any) => (d.dezenas as number[]).map(Number));
      const r = testar(l, s); if (r) out.push(r);
    }
    setLinhas(out); setTestando(false);
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-display font-bold text-primary flex items-center gap-2"><Activity className="w-7 h-7" /> Núcleo</h1>
        <p className="text-sm text-muted-foreground">Situação de todas as partes do programa e um teste honesto das estratégias.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Sincronia</CardTitle>
          <Button onClick={rodarTudo} disabled={busy}><RefreshCw className={`w-4 h-4 mr-2 ${busy ? "animate-spin" : ""}`} />Executar tudo agora</Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {itens.map((i) => (
            <div key={i.nome} className="flex items-center justify-between border-b border-border/40 py-2 text-sm gap-3">
              <div><div className="font-semibold">{i.nome}</div><div className="text-xs text-muted-foreground">{i.detalhe}</div></div>
              <Badge variant={i.ok === false ? "destructive" : "outline"}>{i.ok === null ? "sem dados" : i.ok ? "OK" : "falha"}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><FlaskConical className="w-5 h-5" />Teste das estratégias</CardTitle>
          <Button variant="outline" onClick={rodarTeste} disabled={testando}>{testando ? "Testando..." : "Rodar teste"}</Button>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground text-xs">
            Para cada sorteio passado, cada estratégia escolhe números usando só os 50 sorteios anteriores. Mostramos a média de acertos
            comparada a jogos aleatórios. Diferenças pequenas são acaso: os sorteios são aleatórios.
          </p>
          {linhas.length > 0 && (
            <table className="w-full text-xs">
              <thead><tr className="text-muted-foreground text-left"><th>Loteria</th><th>Testes</th><th>Mais sorteados</th><th>Mais atrasados</th><th>Aleatório</th></tr></thead>
              <tbody>
                {linhas.map(l => (
                  <tr key={l.loteria} className="border-t border-border/40">
                    <td className="py-1.5">{LOT[l.loteria].nome}</td><td>{l.testes}</td>
                    <td>{l.quentes.toFixed(2)}</td><td>{l.atrasados.toFixed(2)}</td><td>{l.aleatorio.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
