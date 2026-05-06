// ================================================================
// 👁️ OLHO DE DEUS — PAINEL SUPREMO v6.0
// Monitor visual completo de todos os módulos do programa
// Substitui o Painel Triple Engine V14 travado
// ================================================================

import { useGodEye } from "../hooks/useGodEye";
import { LoteriaNome, LOTERIAS_CONFIG, ModeloResultado, LoteriaPipelineState } from "../engine/godCore";

// ── Paleta visual ────────────────────────────────────────────────
const C = {
  bg:      "#020617",
  panel:   "#0a0f1a",
  card:    "#0f172a",
  border:  "#1e293b",
  green:   "#22c55e",
  yellow:  "#f59e0b",
  blue:    "#38bdf8",
  purple:  "#a78bfa",
  red:     "#ef4444",
  text:    "#e2e8f0",
  muted:   "#475569",
  faint:   "#1e293b",
};

const STATUS_COR: Record<string, string> = {
  idle:"#334155", running:C.yellow, done:C.green, error:C.red,
};
const STATUS_LABEL: Record<string, string> = {
  idle:"AGUARDANDO", running:"RODANDO ⚙️", done:"✅ CONCLUÍDO", error:"❌ ERRO",
};

// ── Componentes base ─────────────────────────────────────────────
function Barra({ pct, cor, h=7 }: { pct:number; cor:string; h?:number }) {
  return (
    <div style={{ background:C.faint, borderRadius:99, height:h, overflow:"hidden" }}>
      <div style={{
        width:`${Math.min(100,pct)}%`, height:"100%", borderRadius:99,
        background:`linear-gradient(90deg,${cor},${cor}99)`,
        transition:"width 0.4s ease",
        boxShadow: pct>0 ? `0 0 8px ${cor}66` : "none",
      }}/>
    </div>
  );
}

function Num({ n, cor=C.green }: { n:number; cor?:string }) {
  return (
    <span style={{
      background:`${cor}15`, color:cor, border:`1px solid ${cor}44`,
      borderRadius:7, padding:"4px 9px", fontSize:13, fontWeight:"bold",
      fontFamily:"monospace", display:"inline-block",
    }}>{String(n).padStart(2,"0")}</span>
  );
}

function Tag({ text, cor }: { text:string; cor:string }) {
  return (
    <span style={{
      background:`${cor}18`, color:cor, border:`1px solid ${cor}44`,
      borderRadius:12, padding:"2px 10px", fontSize:10, fontWeight:"bold",
    }}>{text}</span>
  );
}

// ── Card de modelo (BiLSTM / MCMC / Stacking) ───────────────────
function CardModelo({ m, idx }: { m:ModeloResultado; idx:number }) {
  const cor  = STATUS_COR[m.status] ?? C.muted;
  const icos = ["🧠","〰️","📈"];
  const pesos = ["10%","55%","35%"];

  return (
    <div style={{
      background:C.card,
      border:`1px solid ${m.status==="done"?C.green+"44":m.status==="running"?C.yellow+"44":C.border}`,
      borderRadius:12, padding:14, marginBottom:10,
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
        <div style={{ display:"flex", gap:9, alignItems:"center" }}>
          <span style={{ fontSize:18 }}>{icos[idx]}</span>
          <div>
            <div style={{ color:C.text, fontWeight:"bold", fontSize:14 }}>{m.nome}</div>
            <div style={{ color:C.muted, fontSize:11 }}>{m.descricao}</div>
          </div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ color:cor, fontSize:22, fontWeight:"bold",
            textShadow:m.status==="done"?`0 0 14px ${cor}`:"none" }}>
            {m.progresso}%
          </div>
          <Tag text={STATUS_LABEL[m.status]??m.status.toUpperCase()} cor={cor}/>
        </div>
      </div>

      <Barra pct={m.progresso} cor={cor}/>

      <div style={{ display:"flex", justifyContent:"space-between", margin:"6px 0 4px" }}>
        <span style={{ color:C.muted, fontSize:12 }}>Peso V16:</span>
        <span style={{ color:C.green, fontSize:12, fontWeight:"bold" }}>{pesos[idx]}</span>
      </div>

      <div style={{ color: m.status==="running"?C.yellow:C.muted, fontSize:11, lineHeight:1.5 }}>
        {m.detalhes}
      </div>

      {m.numeros?.length > 0 && (
        <div style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${C.border}` }}>
          <div style={{ color:"#334155", fontSize:10, marginBottom:6 }}>NÚMEROS PREDITOS:</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
            {m.numeros.map(n => <Num key={n} n={n}/>)}
          </div>
          <div style={{ color:"#334155", fontSize:10, marginTop:5 }}>
            Confiança: <span style={{ color:C.green }}>{m.confianca}%</span>
            {m.tempoMs>0 && ` · ${m.tempoMs}ms`}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Mini card do mapa geral ──────────────────────────────────────
function MiniCard({ loteria, pipe, ativo, onClick }: {
  loteria:LoteriaNome; pipe:LoteriaPipelineState|null; ativo:boolean; onClick:()=>void
}) {
  const progMedio = pipe
    ? Math.round(pipe.modelos.reduce((s,m)=>s+m.progresso,0)/3)
    : 0;
  const cor = STATUS_COR[pipe?.status ?? "idle"];
  const cfg  = LOTERIAS_CONFIG[loteria];

  return (
    <div onClick={onClick} style={{
      background: ativo ? C.panel : C.bg,
      border:`1px solid ${ativo?cor:cor+"33"}`,
      borderRadius:9, padding:"9px 10px", cursor:"pointer",
      transition:"all 0.2s",
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
        <span style={{ color:C.muted, fontSize:9 }}>{cfg.emoji} {cfg.nome}</span>
        {pipe?.score ? <span style={{ color:C.green, fontSize:9, fontWeight:"bold" }}>{pipe.score}%</span> : null}
      </div>
      <div style={{ color:cor, fontWeight:"bold", fontSize:12, marginBottom:4 }}>
        {pipe?.status==="done" ? `${progMedio}% ✅` : pipe?.status==="running" ? `${progMedio}% ⚙️` : pipe?.status==="error" ? "ERRO ❌" : "..."}
      </div>
      <Barra pct={progMedio} cor={cor} h={4}/>
    </div>
  );
}

// ── PAINEL OLHO DE DEUS PRINCIPAL ───────────────────────────────
export default function GodEyePainel() {
  const {
    pipelines, rodando, autoPipelineAtivo, ultimaExecucao,
    ciclos, progressoGeral, resumo, loteriaAtiva, setLoteriaAtiva,
    pipelineAtivo, rodarLoteria, rodarTodas, TODAS_LOTERIAS,
  } = useGodEye("megasena");

  const modelos = pipelineAtivo?.modelos ?? [
    { id:"bilstm"  as const, nome:"MCD-BiLSTM+BiGRU",   descricao:"MC Dropout · IC 95%",         peso:10, progresso:0, status:"idle" as const, numeros:[], confianca:0, detalhes:"Inicializando God Eye...", tempoMs:0 },
    { id:"mcmc"    as const, nome:"MCMC 4-Chain Copula", descricao:"Metropolis-Hastings · R-hat",  peso:55, progresso:0, status:"idle" as const, numeros:[], confianca:0, detalhes:"Inicializando God Eye...", tempoMs:0 },
    { id:"stacking"as const, nome:"Stacking 5-Layer",    descricao:"Meta-MLP · Platt · Attention", peso:35, progresso:0, status:"idle" as const, numeros:[], confianca:0, detalhes:"Inicializando God Eye...", tempoMs:0 },
  ];

  const ativo       = rodando.length > 0;
  const corPulse    = ativo ? C.yellow : autoPipelineAtivo ? C.green : C.muted;
  const nomeLoteria = LOTERIAS_CONFIG[loteriaAtiva]?.nome ?? loteriaAtiva;

  return (
    <div style={{ fontFamily:"'Courier New',monospace", background:C.bg, minHeight:"100vh", padding:16, color:C.text }}>

      {/* ══ HEADER OLHO DE DEUS ══════════════════════════════════ */}
      <div style={{ marginBottom:18 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:8 }}>
          <div style={{ fontSize:32, filter:"drop-shadow(0 0 12px #38bdf8)" }}>👁️</div>
          <div>
            <h1 style={{ margin:0, fontSize:20, color:C.text, letterSpacing:1 }}>
              OLHO DE DEUS — GOD EYE v6.0
            </h1>
            <div style={{ color:C.muted, fontSize:11 }}>
              Monitor Central · Triple Engine Supremo · Modo AGRESSIVO MÁXIMO
            </div>
          </div>
        </div>

        {/* Status bar */}
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
          <div style={{
            display:"inline-flex", alignItems:"center", gap:7,
            background:`${corPulse}15`, border:`1px solid ${corPulse}`,
            borderRadius:20, padding:"5px 16px", fontSize:12,
          }}>
            <span style={{
              width:8, height:8, borderRadius:"50%", background:corPulse,
              display:"inline-block",
              animation: ativo ? "godpulse 0.7s infinite" : "none",
            }}/>
            <span style={{ color:corPulse, fontWeight:"bold" }}>
              {ativo
                ? `PROCESSANDO ${rodando.length} LOTERIAS...`
                : autoPipelineAtivo
                  ? "AUTO-PIPELINE ATIVO ✓"
                  : "AGUARDANDO"}
            </span>
          </div>
          {ultimaExecucao && (
            <span style={{ color:"#334155", fontSize:10 }}>Último run: {ultimaExecucao}</span>
          )}
          <span style={{ color:"#334155", fontSize:10 }}>Ciclos: {ciclos}</span>
        </div>
      </div>

      {/* ══ PAINEL DE CONTROLE ═══════════════════════════════════ */}
      <div style={{
        background:C.panel, border:`1px solid ${C.border}`,
        borderRadius:12, padding:14, marginBottom:16,
      }}>
        <div style={{ color:C.blue, fontSize:11, fontWeight:"bold", marginBottom:10 }}>
          ⚡ PAINEL DE CONTROLE — SINCRONIA TOTAL
        </div>

        {/* Barra de progresso global */}
        <div style={{ marginBottom:10 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
            <span style={{ color:C.muted, fontSize:11 }}>Progresso Global</span>
            <span style={{ color:C.yellow, fontWeight:"bold", fontSize:11 }}>{progressoGeral}%</span>
          </div>
          <Barra pct={progressoGeral} cor={C.yellow} h={10}/>
        </div>

        {/* Métricas */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:12 }}>
          {[
            { l:"Total",     v:resumo.total,   c:C.muted  },
            { l:"Concluídas",v:resumo.done,    c:C.green  },
            { l:"Rodando",   v:resumo.running, c:C.yellow },
            { l:"Erro",      v:resumo.error,   c:C.red    },
          ].map(({ l, v, c }) => (
            <div key={l} style={{
              background:C.card, border:`1px solid ${c}33`,
              borderRadius:8, padding:"8px 10px", textAlign:"center",
            }}>
              <div style={{ color:c, fontSize:20, fontWeight:"bold" }}>{v}</div>
              <div style={{ color:C.muted, fontSize:9 }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Botões */}
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <button onClick={rodarTodas} style={{
            background:`linear-gradient(135deg,${C.blue},${C.purple})`,
            color:"#fff", border:"none", borderRadius:9,
            padding:"9px 20px", cursor:"pointer", fontWeight:"bold", fontSize:13,
          }}>▶ RODAR TODAS</button>
          <button onClick={()=>rodarLoteria(loteriaAtiva)} style={{
            background:C.card, color:C.blue, border:`1px solid ${C.blue}55`,
            borderRadius:9, padding:"9px 16px", cursor:"pointer", fontWeight:"bold", fontSize:12,
          }}>↺ Rodar {nomeLoteria}</button>
        </div>
      </div>

      {/* ══ SELETOR DE LOTERIA ═══════════════════════════════════ */}
      <div style={{ display:"flex", gap:8, marginBottom:14, alignItems:"center" }}>
        <select value={loteriaAtiva} onChange={e=>setLoteriaAtiva(e.target.value as LoteriaNome)} style={{
          background:C.panel, color:C.text, border:`1px solid ${C.border}`,
          borderRadius:8, padding:"8px 14px", fontSize:13, cursor:"pointer",
        }}>
          {TODAS_LOTERIAS.map(l => (
            <option key={l} value={l}>{LOTERIAS_CONFIG[l].emoji} {LOTERIAS_CONFIG[l].nome}</option>
          ))}
        </select>
        {pipelineAtivo?.dadosAPI && (
          <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:8, padding:"7px 12px", fontSize:11 }}>
            <span style={{ color:C.muted }}>Concurso: </span>
            <span style={{ color:C.text, fontWeight:"bold" }}>{pipelineAtivo.dadosAPI.concurso}</span>
            <span style={{ color:C.muted, marginLeft:10 }}>Data: </span>
            <span style={{ color:C.text }}>{pipelineAtivo.dadosAPI.data}</span>
            <span style={{ color:C.muted, marginLeft:10 }}>Fonte: </span>
            <span style={{ color:C.blue }}>{pipelineAtivo.dadosAPI.fonte}</span>
          </div>
        )}
        {pipelineAtivo?.score ? (
          <div style={{ background:C.panel, border:`1px solid ${C.green}33`, borderRadius:8, padding:"7px 12px", fontSize:12 }}>
            <span style={{ color:C.muted }}>Score: </span>
            <span style={{ color:C.green, fontWeight:"bold" }}>{pipelineAtivo.score}%</span>
          </div>
        ) : null}
      </div>

      {/* ══ TRIPLE ENGINE — 3 MODELOS ════════════════════════════ */}
      <div style={{ marginBottom:4 }}>
        <div style={{ color:C.muted, fontSize:10, marginBottom:10, letterSpacing:1 }}>
          ⚙️ TRIPLE ENGINE — {nomeLoteria.toUpperCase()}
        </div>
        {modelos.map((m, i) => <CardModelo key={m.id} m={m} idx={i}/>)}
      </div>

      {/* ══ ENSEMBLE FINAL ═══════════════════════════════════════ */}
      {pipelineAtivo?.ensemble?.length > 0 && (
        <div style={{
          background:`linear-gradient(135deg,${C.card},${C.panel})`,
          border:`1px solid ${C.green}55`, borderRadius:12, padding:16, marginBottom:16,
        }}>
          <div style={{ color:C.green, fontWeight:"bold", fontSize:15, marginBottom:12 }}>
            🎯 ENSEMBLE FINAL — MODO AGRESSIVO MÁXIMO
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:10 }}>
            {pipelineAtivo.ensemble.map(n => <Num key={n} n={n} cor={C.green}/>)}
          </div>
          {pipelineAtivo.mesSorte && (
            <div style={{ color:C.yellow, fontSize:13, fontWeight:"bold", marginBottom:8 }}>
              🗓️ Mês da Sorte: {pipelineAtivo.mesSorte}
            </div>
          )}
          <div style={{ color:"#334155", fontSize:10 }}>
            Score: <span style={{ color:C.green }}>{pipelineAtivo.score}%</span>
            {" · "}Gerado: {pipelineAtivo.timestampFim}
            {" · "}BiLSTM×10 + MCMC×55 + Stacking×35
          </div>
        </div>
      )}

      {/* ══ MAPA GERAL — TODAS AS LOTERIAS ══════════════════════ */}
      <div style={{
        background:C.panel, border:`1px solid ${C.border}`,
        borderRadius:12, padding:14,
      }}>
        <div style={{ color:C.muted, fontSize:10, marginBottom:10, letterSpacing:1 }}>
          🗺️ MONITOR GLOBAL — TODAS AS LOTERIAS
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:7 }}>
          {TODAS_LOTERIAS.map(l => (
            <MiniCard
              key={l} loteria={l}
              pipe={pipelines?.[l] ?? null}
              ativo={l===loteriaAtiva}
              onClick={()=>setLoteriaAtiva(l)}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes godpulse {
          0%,100%{opacity:1;transform:scale(1)}
          50%{opacity:0.3;transform:scale(1.3)}
        }
      `}</style>
    </div>
  );
}
