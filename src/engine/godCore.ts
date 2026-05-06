// ================================================================
// 👁️ OLHO DE DEUS — GOD EYE CORE v6.0
// Monitor central que vê, controla e força TUDO no programa
// Injeta diretamente nos estados React via monkey-patch
// Não depende de nenhuma estrutura existente
// ================================================================

export const GOD_EYE_VERSION = "6.0.0";

// ── Configuração das loterias ────────────────────────────────────
export const LOTERIAS_CONFIG = {
  megasena:   { min:1,  max:60,  qtd:6,  nome:"Mega-Sena",    emoji:"🍀" },
  quina:      { min:1,  max:80,  qtd:5,  nome:"Quina",        emoji:"🔵" },
  lotofacil:  { min:1,  max:25,  qtd:15, nome:"Lotofácil",    emoji:"🟢" },
  lotomania:  { min:0,  max:99,  qtd:20, nome:"Lotomania",    emoji:"🟡" },
  timemania:  { min:1,  max:80,  qtd:7,  nome:"Timemania",    emoji:"⚽" },
  duplasena:  { min:1,  max:50,  qtd:6,  nome:"Dupla Sena",   emoji:"🔴" },
  diadesorte: { min:1,  max:31,  qtd:7,  nome:"Dia de Sorte", emoji:"🌸" },
  supersete:  { min:0,  max:9,   qtd:7,  nome:"Super Sete",   emoji:"7️⃣" },
  milionaria: { min:1,  max:50,  qtd:6,  nome:"+Milionária",  emoji:"💎" },
} as const;

export type LoteriaNome = keyof typeof LOTERIAS_CONFIG;
export const TODAS_LOTERIAS = Object.keys(LOTERIAS_CONFIG) as LoteriaNome[];

export const MESES_ANO = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
];

// ── Tipos do sistema ─────────────────────────────────────────────
export type ModelStatus = "idle"|"running"|"done"|"error";
export type PipelineStatus = "idle"|"running"|"done"|"error";

export interface DadosAPI {
  concurso: number;
  data: string;
  numeros: number[];
  mesSorte?: string;
  acumulou?: boolean;
  valorAcumulado?: number;
  fonte: "apiloterias"|"caixa_oficial"|"heroku"|"guidi"|"sintetico";
}

export interface ModeloResultado {
  id: "bilstm"|"mcmc"|"stacking";
  nome: string;
  descricao: string;
  peso: number;
  progresso: number;
  status: ModelStatus;
  numeros: number[];
  confianca: number;
  detalhes: string;
  tempoMs: number;
}

export interface LoteriaPipelineState {
  loteria: LoteriaNome;
  status: PipelineStatus;
  dadosAPI: DadosAPI | null;
  modelos: ModeloResultado[];
  ensemble: number[];
  mesSorte?: string;
  score: number;
  timestampInicio: string;
  timestampFim: string;
  tentativas: number;
  erroMsg?: string;
}

// ── Utilitários ──────────────────────────────────────────────────
export function delay(ms: number) { return new Promise<void>(r => setTimeout(r, ms)); }

export function sortearUnicos(min: number, max: number, qtd: number): number[] {
  const p: number[] = [];
  for (let i = min; i <= max; i++) p.push(i);
  for (let i = p.length-1; i>0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [p[i],p[j]] = [p[j],p[i]];
  }
  return p.slice(0,qtd).sort((a,b)=>a-b);
}

export function gerarHistorico(
  base: number[], cfg: { min:number; max:number; qtd:number }, n=80
): number[][] {
  const hist: number[][] = [base];
  for (let k=0; k<n-1; k++) {
    const pool: number[] = [];
    for (let i=cfg.min; i<=cfg.max; i++) pool.push(i);
    // Variação gaussiana em torno da base
    const var_ = base.map(v => {
      const g = Array.from({length:6},()=>Math.random()).reduce((s,x)=>s+x)/6;
      return Math.max(cfg.min, Math.min(cfg.max, v + Math.round((g-0.5)*10)));
    });
    const u = [...new Set(var_)];
    while (u.length < cfg.qtd) {
      const r = pool[Math.floor(Math.random()*pool.length)];
      if (!u.includes(r)) u.push(r);
    }
    hist.push(u.slice(0,cfg.qtd).sort((a,b)=>a-b));
  }
  return hist;
}

// ── Multi-fonte fetch com 5 tentativas ──────────────────────────
export async function fetchAPIMultiFonte(loteria: LoteriaNome): Promise<DadosAPI> {
  const slug = loteria === "milionaria" ? "+milionaria" : loteria;
  const apiKey = (() => { try { return localStorage.getItem("titan_api_key")||""; } catch { return ""; }})();

  const fontes: Array<{ nome: DadosAPI["fonte"]; fn: ()=>Promise<Response> }> = [
    ...(apiKey ? [{
      nome: "apiloterias" as const,
      fn: ()=>fetch(`https://apiloterias.com.br/app/resultado?token=${apiKey}&loteria=${slug}`,{headers:{Accept:"application/json"}})
    }] : []),
    { nome:"caixa_oficial", fn:()=>fetch(`https://servicebus2.caixa.gov.br/portaldeloterias/api/${slug}`,{headers:{Accept:"application/json"}}) },
    { nome:"heroku",        fn:()=>fetch(`https://loteriascaixa-api.herokuapp.com/api/${slug}/latest`,{headers:{Accept:"application/json"}}) },
    { nome:"guidi",         fn:()=>fetch(`https://api.guidi.dev.br/loteria/${slug}/ultimo`,{headers:{Accept:"application/json"}}) },
  ];

  for (const { nome, fn } of fontes) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(()=>ctrl.abort(), 7000);
      const res = await fn();
      clearTimeout(t);
      if (!res.ok) continue;
      const j = await res.json();
      const nums = (j.listaDezenas??j.dezenasSorteadasOrdemSorteio??j.dezenas??j.numeros??[])
        .map(Number).filter((n:number)=>!isNaN(n));
      if (!nums.length) continue;
      const rawD = j.dataApuracao??j.data??j.dataSorteio??"";
      let data = "";
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(rawD)) data = rawD;
      else if (rawD) { try { data = new Date(rawD).toLocaleDateString("pt-BR"); } catch { data=rawD; } }
      if (!data) data = new Date().toLocaleDateString("pt-BR");
      return {
        concurso: Number(j.numero??j.concurso??0),
        data,
        numeros: nums,
        mesSorte: loteria==="diadesorte" ? (j.nomeMesSorte??j.mesSorte??j.mes_sorte??MESES_ANO[new Date().getMonth()]) : undefined,
        acumulou: Boolean(j.acumulou??j.indicadorConcursoEspecial),
        valorAcumulado: Number(j.valorEstimadoProximoConcurso??j.valorAcumulado??0),
        fonte: nome,
      };
    } catch { continue; }
  }

  // Fallback sintético — programa NUNCA para
  const cfg = LOTERIAS_CONFIG[loteria];
  return {
    concurso: 0,
    data: new Date().toLocaleDateString("pt-BR"),
    numeros: sortearUnicos(cfg.min, cfg.max, cfg.qtd),
    mesSorte: loteria==="diadesorte" ? MESES_ANO[new Date().getMonth()] : undefined,
    fonte: "sintetico",
  };
}
