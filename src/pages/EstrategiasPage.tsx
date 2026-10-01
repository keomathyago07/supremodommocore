import React, { useEffect, useMemo, useState } from "react";
import { Scale, Grid3x3, Wallet, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CONFIG_LOTERIAS } from "@/hooks/useGerarJogo";
import {
  avaliarEquilibrio, gerarEquilibrado, gerarFechamento, lerLimites, salvarLimites, gastosAtuais,
  type RegrasEquilibrio, type LimitesGasto,
} from "@/lib/estrategias";
import { getIntel, type LoteriaSlug } from "@/lib/historicalIntel";

type Lot = keyof typeof CONFIG_LOTERIAS;
const fmt = (n: number[]) => n.map(x => String(x).padStart(2, "0")).join(" - ");
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const Card = ({ icon: I, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) => (
  <div className="bg-card border border-border rounded-xl p-4 space-y-3">
    <p className="text-sm font-black text-foreground flex items-center gap-2"><I className="w-4 h-4 text-primary" />{title}</p>
    {children}
  </div>
);

function regrasDe(l: Lot): RegrasEquilibrio {
  const c = CONFIG_LOTERIAS[l] as unknown as Partial<RegrasEquilibrio> & { qtd: number; min: number; max: number };
  const media = ((c.min + c.max) / 2) * c.qtd;
  return {
    somaMin: c.somaMin ?? Math.round(media * 0.7),
    somaMax: c.somaMax ?? Math.round(media * 1.3),
    maxPares: c.maxPares ?? Math.ceil(c.qtd * 0.7),
    maxImpares: c.maxImpares ?? Math.ceil(c.qtd * 0.7),
    maxConsecutivos: c.maxConsecutivos ?? 3,
  };
}

const EstrategiasPage: React.FC = () => {
  const loterias = (Object.keys(CONFIG_LOTERIAS) as Lot[]).filter(l => !["supersete", "lotomania"].includes(l));
  const [lot, setLot] = useState<Lot>("megasena");
  const cfg = CONFIG_LOTERIAS[lot];
  const regras = useMemo(() => regrasDe(lot), [lot]);

  // Equilíbrio
  const [jogoTxt, setJogoTxt] = useState("");
  const jogo = jogoTxt.split(/[^0-9]+/).filter(Boolean).map(Number);
  const aval = jogo.length === cfg.qtd ? avaliarEquilibrio(jogo, regras) : null;

  // Fechamento
  const [dezTxt, setDezTxt] = useState("");
  const [garantia, setGarantia] = useState(Math.max(2, cfg.qtd - 2));
  const [fech, setFech] = useState<ReturnType<typeof gerarFechamento> | null>(null);
  useEffect(() => { setGarantia(Math.max(2, cfg.qtd - 2)); setFech(null); setJogoTxt(""); setDezTxt(""); }, [lot, cfg.qtd]);

  async function sugerirDezenas() {
    const intel = await getIntel(lot as LoteriaSlug);
    const n = Math.min(20, cfg.qtd + 4);
    if (intel) setDezTxt(intel.quentes.slice(0, n).map(x => x.numero).sort((a, b) => a - b).join(" "));
  }

  // Gastos
  const [lim, setLim] = useState<LimitesGasto>(lerLimites());
  const [gasto, setGasto] = useState({ hoje: 0, mes: 0 });
  useEffect(() => { gastosAtuais().then(setGasto).catch(() => {}); }, []);
  const custoFech = (fech?.jogos.length ?? 0) * cfg.custo;
  const estouraDia = lim.ativo && gasto.hoje + custoFech > lim.diario;
  const estouraMes = lim.ativo && gasto.mes + custoFech > lim.mensal;

  return (
    <div className="space-y-4 p-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-black text-foreground">Estratégias de Jogo</h1>
        <Select value={lot} onValueChange={v => setLot(v as Lot)}>
          <SelectTrigger className="h-9 w-[180px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{loterias.map(l => <SelectItem key={l} value={l} className="text-xs">{CONFIG_LOTERIAS[l].emoji} {CONFIG_LOTERIAS[l].nome}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <p className="text-xs text-muted-foreground">
        Sorteios são aleatórios: nenhuma ferramenta aumenta a chance de acertar. Estas estratégias ajudam a dividir menos o prêmio, a ter garantias reais em grupos de jogos e a controlar quanto você gasta.
      </p>

      <Card icon={Scale} title="Jogo equilibrado">
        <div className="flex gap-2 flex-wrap">
          <Input placeholder={`Digite ${cfg.qtd} números`} value={jogoTxt} onChange={e => setJogoTxt(e.target.value)} className="h-9 text-xs flex-1 min-w-[200px]" />
          <Button size="sm" onClick={() => setJogoTxt(fmt(gerarEquilibrado(cfg.min, cfg.max, cfg.qtd, regras)))}>Gerar equilibrado</Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Regras: soma {regras.somaMin}–{regras.somaMax} · máx {regras.maxPares} pares / {regras.maxImpares} ímpares · sequência até {regras.maxConsecutivos}
        </p>
        {aval && (
          <div className="text-xs space-y-1">
            <div className="flex gap-2 flex-wrap">
              <Badge variant={aval.ok ? "default" : "destructive"}>{aval.ok ? "Equilibrado" : "Padrão comum"}</Badge>
              <Badge variant="outline">Soma {aval.soma}</Badge>
              <Badge variant="outline">{aval.pares}P / {aval.impares}I</Badge>
              <Badge variant="outline">Sequência {aval.maxSeq}</Badge>
            </div>
            {aval.motivos.map(m => <p key={m} className="text-destructive">• {m}</p>)}
          </div>
        )}
        {jogo.length > 0 && jogo.length !== cfg.qtd && <p className="text-[11px] text-muted-foreground">Faltam/ sobram números: {jogo.length}/{cfg.qtd}</p>}
      </Card>

      <Card icon={Grid3x3} title="Fechamento (desdobramento)">
        <div className="flex gap-2 flex-wrap">
          <Input placeholder={`De ${cfg.qtd + 1} a 20 dezenas`} value={dezTxt} onChange={e => setDezTxt(e.target.value)} className="h-9 text-xs flex-1 min-w-[200px]" />
          <Button size="sm" variant="outline" onClick={sugerirDezenas}>Sugerir pelo histórico</Button>
        </div>
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-muted-foreground">Garantir</span>
          <Input type="number" min={2} max={cfg.qtd} value={garantia} onChange={e => setGarantia(Number(e.target.value))} className="h-8 w-16 text-xs" />
          <span className="text-muted-foreground">acertos</span>
          <Button size="sm" onClick={() => setFech(gerarFechamento(dezTxt.split(/[^0-9]+/).filter(Boolean).map(Number).filter(n => n >= cfg.min && n <= cfg.max), cfg.qtd, garantia))}>Gerar fechamento</Button>
        </div>
        {fech && (
          <div className="space-y-2">
            <p className="text-xs text-foreground">{fech.garantia}</p>
            {fech.jogos.length > 0 && (
              <>
                <p className="text-xs text-muted-foreground">{fech.jogos.length} jogos · custo {brl(custoFech)}</p>
                {(estouraDia || estouraMes) && (
                  <p className="text-xs text-destructive flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />Este fechamento passa do seu limite {estouraDia ? "diário" : "mensal"}.</p>
                )}
                <div className="max-h-56 overflow-y-auto space-y-1">
                  {fech.jogos.map((j, i) => <div key={i} className="text-[11px] font-mono text-foreground">{String(i + 1).padStart(2, "0")}. {fmt(j)}</div>)}
                </div>
              </>
            )}
          </div>
        )}
      </Card>

      <Card icon={Wallet} title="Controle de gastos">
        <div className="flex items-center gap-3 flex-wrap text-xs">
          <label className="flex items-center gap-2">Ativo <Switch checked={lim.ativo} onCheckedChange={v => setLim({ ...lim, ativo: v })} /></label>
          <label className="flex items-center gap-1">Diário R$ <Input type="number" value={lim.diario} onChange={e => setLim({ ...lim, diario: Number(e.target.value) })} className="h-8 w-20 text-xs" /></label>
          <label className="flex items-center gap-1">Mensal R$ <Input type="number" value={lim.mensal} onChange={e => setLim({ ...lim, mensal: Number(e.target.value) })} className="h-8 w-24 text-xs" /></label>
          <Button size="sm" onClick={() => salvarLimites(lim)}>Salvar</Button>
        </div>
        {[{ l: "Hoje", v: gasto.hoje, m: lim.diario }, { l: "Este mês", v: gasto.mes, m: lim.mensal }].map(x => {
          const pct = x.m > 0 ? Math.min(100, (x.v / x.m) * 100) : 0;
          return (
            <div key={x.l} className="space-y-1">
              <div className="flex justify-between text-xs"><span>{x.l}</span><span className={pct >= 100 ? "text-destructive font-bold" : "text-muted-foreground"}>{brl(x.v)} de {brl(x.m)}</span></div>
              <div className="h-2 bg-muted rounded"><div className={`h-2 rounded ${pct >= 100 ? "bg-destructive" : pct >= 80 ? "bg-accent" : "bg-primary"}`} style={{ width: `${pct}%` }} /></div>
            </div>
          );
        })}
        {lim.ativo && (gasto.hoje >= lim.diario || gasto.mes >= lim.mensal) && (
          <p className="text-xs text-destructive flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />Você atingiu seu limite de gastos.</p>
        )}
      </Card>
    </div>
  );
};

export default EstrategiasPage;
