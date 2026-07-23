// ============================================================
// TitanCoreDashboard.tsx — Dashboard Ultra Avançado
// TitanDommoCore 9.0 · 38 Módulos · 22 Engines · 24 Fases
// ============================================================

import React, { useState, useEffect, useRef } from "react";
import { useTitanCore } from "./titanCoreStore";
import { TitanConfirmTab } from "./TitanConfirmTab";
import { TitanBacktestTab } from "./TitanBacktestTab";
import { OperationalPanel } from "./OperationalPanel";
import { SystemState } from "./titanCore.types";

const STATE_META: Record<SystemState, { label: string; color: string; icon: string }> = {
  BOOT:           { label: "Inicializando",    color: "#00d4ff", icon: "⚡" },
  SELF_CHECK:     { label: "Self-Check",        color: "#aa00ff", icon: "🔍" },
  TRAINING:       { label: "Treinando",         color: "#ff9800", icon: "🎓" },
  GENERATING:     { label: "Gerando",           color: "#ff6b00", icon: "🔮" },
  AWAITING_DRAW:  { label: "Aguard. Sorteio",   color: "#ffaa00", icon: "⏳" },
  CHECKING:       { label: "Conferindo",        color: "#00d4ff", icon: "🔍" },
  LEARNING:       { label: "Aprendendo",        color: "#aa00ff", icon: "📚" },
  EVOLVING:       { label: "Evoluindo",         color: "#ff00ff", icon: "🧬" },
  SELF_REBUILDING:{ label: "Reconstruindo",     color: "#ff4444", icon: "🏗️" },
  PATCHING:       { label: "Aplicando Patch",   color: "#00ff88", icon: "🩹" },
  OPERATIONAL:    { label: "Operacional",       color: "#00ff88", icon: "✅" },
  STANDBY:        { label: "Standby",           color: "#475569", icon: "💤" },
};

const LAYER_COLORS: Record<string,string> = {
  core:"#00d4ff", ia:"#aa00ff", bet:"#ff9800",
  check:"#00ff88", sync:"#ffaa00", evolution:"#ff00ff",
};

type Tab = "overview"|"operational"|"pipeline"|"engines"|"modules"|"evolution"|"confirm"|"backtest"|"log";

export function TitanCoreDashboard() {
  const titan = useTitanCore();
  const [tab, setTab] = useState<Tab>("overview");
  const [booting, setBooting] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tab==="log" && logRef.current)
      logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [titan.logs, tab]);

  const sm = STATE_META[titan.systemState] ?? STATE_META.STANDBY;
  const health = titan.getSystemHealth();
  const acc = titan.getEnsembleAccuracy();
  const onlineCount = titan.modules.filter(m=>m.status==="online"||m.status==="processing").length;
  const activeEngines = titan.engines.filter(e=>e.status==="active"||e.status==="training").length;

  async function handleBoot() {
    setBooting(true);
    await titan.boot();
    setBooting(false);
  }

  const TABS: {id:Tab;icon:string;label:string}[] = [
    {id:"overview",    icon:"📊", label:"Overview"},
    {id:"operational", icon:"🛰️", label:"Operacional"},
    {id:"pipeline",    icon:"🔮", label:"Pipeline"},
    {id:"engines",   icon:"🧠", label:"22 Engines"},
    {id:"modules",   icon:"⚙️",  label:"38 Módulos"},
    {id:"evolution", icon:"🧬", label:"Evolução"},
    {id:"confirm",   icon:"🎟️", label:"Confirmados"},
    {id:"backtest",  icon:"🧪", label:"Backtest"},
    {id:"log",       icon:"📋", label:"Log"},
  ];

  return (
    <div style={{fontFamily:"'JetBrains Mono','Courier New',monospace",background:"transparent",color:"#e2e8f0"}}>
      <div style={{
        padding:"16px",borderRadius:14,marginBottom:12,
        background:"linear-gradient(135deg,rgba(0,212,255,0.06),rgba(170,0,255,0.08),rgba(0,255,136,0.04))",
        border:`1px solid ${sm.color}22`,
      }}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{
              width:46,height:46,borderRadius:12,fontSize:24,
              display:"flex",alignItems:"center",justifyContent:"center",
              background:`linear-gradient(135deg,rgba(0,212,255,0.15),rgba(170,0,255,0.2))`,
              border:"1px solid rgba(0,212,255,0.3)",
              boxShadow:"0 0 20px rgba(0,212,255,0.15)",
            }}>⚛️</div>
            <div>
              <div style={{fontSize:14,fontWeight:800,color:"#e2e8f0",letterSpacing:0.5}}>TitanDommoCore 9.0</div>
              <div style={{fontSize:9,color:"#475569",marginTop:2}}>Motor Quantitativo V9 ULTRA · Auto-Evolutivo</div>
              <div style={{fontSize:8,color:"#334155",marginTop:1}}>38 Módulos · 22 Engines · Pipeline 24 Fases · PatchTST+STL-ETS+Mamba+QAOA</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <StateBadge state={titan.systemState}/>
            {titan.isOnline && (
              <span style={{
                width:8,height:8,borderRadius:"50%",
                background:"#00ff88",boxShadow:"0 0 8px #00ff88",
                display:"inline-block",animation:"pulse 1.5s infinite",
              }}/>
            )}
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:8}}>
          <KPI v={`${acc.toFixed(1)}%`} l="Precisão" c={acc>=90?"#00ff88":acc>=75?"#00d4ff":"#ffaa00"}/>
          <KPI v={`${health}%`} l="Saúde" c={health>=90?"#00ff88":"#ffaa00"}/>
          <KPI v={`${onlineCount}/38`} l="Módulos" c="#00d4ff"/>
          <KPI v={`${activeEngines}/22`} l="Engines" c="#aa00ff"/>
          <KPI v={String(titan.metrics.generationNumber)} l="Geração" c="#ff00ff"/>
          <KPI v={String(titan.metrics.totalPrizesWon)} l="Prêmios" c="#ffaa00"/>
        </div>
      </div>

      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
        {!titan.isOnline ? (
          <Btn icon="🚀" label={booting?"Inicializando...":"Boot TitanCore"} onClick={handleBoot} disabled={booting} primary/>
        ) : (
          <Btn icon="⏹" label="Shutdown" onClick={titan.shutdown} danger/>
        )}
        <Btn icon="🎓" label="Treinar 22 Engines" onClick={titan.trainAllEngines} disabled={!titan.isOnline}/>
        <Btn icon="🔮" label="Gerar Jogos" onClick={titan.triggerGeneration} disabled={!titan.isOnline}/>
        <Btn icon="🧬" label="Evoluir" onClick={titan.runEvolutionCycle} disabled={!titan.isOnline}/>
        <Btn icon="🏗️" label="Self-Rebuild" onClick={titan.selfRebuild} disabled={!titan.isOnline}/>
        <Btn icon="🩹" label="Patch" onClick={titan.applyPatch} disabled={!titan.isOnline}/>
      </div>

      <div style={{
        display:"flex",gap:2,background:"rgba(255,255,255,0.02)",
        border:"1px solid rgba(255,255,255,0.05)",borderRadius:10,
        padding:3,marginBottom:12,overflowX:"auto",
      }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            flex:1,minWidth:70,padding:"6px 6px",borderRadius:7,
            border:"none",cursor:"pointer",fontSize:9,fontWeight:700,
            fontFamily:"inherit",whiteSpace:"nowrap",transition:"all .15s",
            background:tab===t.id?"rgba(0,212,255,0.12)":"transparent",
            color:tab===t.id?"#00d4ff":"#475569",
          }}>{t.icon} {t.label}</button>
        ))}
      </div>

      {tab==="overview"    && <OverviewTab titan={titan} />}
      {tab==="operational" && <OperationalPanel />}
      {tab==="pipeline"    && <PipelineTab titan={titan} />}
      {tab==="engines"   && <EnginesTab titan={titan} />}
      {tab==="modules"   && <ModulesTab titan={titan} />}
      {tab==="evolution" && <EvolutionTab titan={titan} />}
      {tab==="confirm"   && <TitanConfirmTab />}
      {tab==="backtest"  && <TitanBacktestTab />}
      {tab==="log"       && <LogTab titan={titan} logRef={logRef} />}

      <style>{`
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.3)}}
      `}</style>
    </div>
  );
}

function OverviewTab({titan}:any) {
  const acc = titan.getEnsembleAccuracy();
  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <Box c="#00d4ff" title="⚙️ Estado do Sistema">
        <Row l="Versão" v={titan.version}/>
        <Row l="Estado" v={STATE_META[titan.systemState as SystemState]?.label ?? titan.systemState}/>
        <Row l="Fase pipeline" v={titan.pipelineHealth.activePhase ?? "—"}/>
        <Row l="Fases concluídas" v={String(titan.pipelineHealth.completedPhases)}/>
        <Row l="Modo pipeline" v={titan.config.pipelineMode.toUpperCase()}/>
        <Row l="Ensemble strategy" v={titan.config.ensembleStrategy.toUpperCase()}/>
      </Box>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <Box c="#aa00ff" title="🏆 Desempenho">
          <Row l="Precisão ensemble" v={`${acc}%`} hl/>
          <Row l="Pico de precisão" v={`${titan.metrics.peakAccuracy}%`} hl/>
          <Row l="Previsões" v={String(titan.metrics.totalPredictions)}/>
          <Row l="Prêmios" v={String(titan.metrics.totalPrizesWon)} hl/>
          <Row l="Ganhos" v={`R$ ${titan.metrics.totalEarnings.toLocaleString("pt-BR")}`} hl/>
          <Row l="Taxa de acerto" v={`${titan.metrics.winRate}%`} hl/>
        </Box>
        <Box c="#ff00ff" title="🧬 Auto-Evolução">
          <Row l="Geração" v={String(titan.metrics.generationNumber)} hl/>
          <Row l="Eventos" v={String(titan.metrics.totalEvolutionEvents)}/>
          <Row l="Self-rebuilds" v={String(titan.metrics.totalSelfRebuilds)}/>
          <Row l="Patches" v={String(titan.metrics.totalPatches)}/>
          <Row l="Uptime" v={`${titan.metrics.uptimePercent}%`} hl/>
          <Row l="Última evolução" v={titan.metrics.lastEvolutionAt ? new Date(titan.metrics.lastEvolutionAt).toLocaleTimeString("pt-BR") : "—"}/>
        </Box>
      </div>
    </div>
  );
}

function PipelineTab({titan}:any) {
  const phases = [
    "P01_DATA_INGESTION","P02_TEMPORAL_DECOMPOSITION","P03_STL_ETS_ANALYSIS",
    "P04_PATCHTST_ENCODING","P05_MAMBA_STATE_SPACE","P06_QAOA_QUANTUM_OPT",
    "P07_FREQUENCY_MATRIX","P08_DELAY_PROBABILITY","P09_COMBINATORIAL_SCAN",
    "P10_PATTERN_DETECTION","P11_ENSEMBLE_FUSION","P12_CONFIDENCE_SCORING",
    "P13_PRIZE_TIER_FOCUS","P14_CANDIDATE_GENERATION","P15_CROSS_VALIDATION",
    "P16_RISK_ASSESSMENT","P17_OPTIMIZATION_LOOP","P18_FINAL_SELECTION",
    "P19_CONSENSUS_CHECK","P20_OUTPUT_FORMATTING","P21_PERSISTENCE",
    "P22_SYNC_BROADCAST","P23_LEARNING_UPDATE","P24_SELF_EVOLUTION",
  ];
  const active = titan.pipelineHealth.activePhase;
  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
        {phases.map((p,i)=>{
          const isActive = p===active;
          const isDone = !isActive && titan.pipelineHealth.completedPhases > i && titan.pipelineHealth.lastFullRun;
          return (
            <div key={p} style={{
              padding:"8px 10px",borderRadius:8,display:"flex",alignItems:"center",gap:8,
              background:isActive?"rgba(0,212,255,0.08)":isDone?"rgba(0,255,136,0.04)":"rgba(255,255,255,0.02)",
              border:`1px solid ${isActive?"rgba(0,212,255,0.3)":isDone?"rgba(0,255,136,0.12)":"rgba(255,255,255,0.05)"}`,
            }}>
              <span style={{
                width:20,height:20,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:9,fontWeight:800,
                background:isActive?"rgba(0,212,255,0.2)":isDone?"rgba(0,255,136,0.15)":"rgba(255,255,255,0.04)",
                border:`1px solid ${isActive?"#00d4ff":isDone?"#00ff88":"rgba(255,255,255,0.08)"}`,
                color:isActive?"#00d4ff":isDone?"#00ff88":"#334155",
              }}>{isDone?"✓":i+1}</span>
              <div style={{fontSize:9,fontWeight:700,color:isActive?"#00d4ff":isDone?"#00ff88":"#475569"}}>{p}</div>
            </div>
          );
        })}
      </div>
      <button onClick={titan.runFullPipeline} disabled={!titan.isOnline} style={{
        width:"100%",marginTop:12,padding:"10px",borderRadius:10,border:"none",
        cursor:titan.isOnline?"pointer":"not-allowed",opacity:titan.isOnline?1:0.4,
        background:"linear-gradient(135deg,rgba(0,212,255,0.2),rgba(170,0,255,0.2))",
        color:"#00d4ff",fontSize:11,fontWeight:800,fontFamily:"inherit",
      }}>▶ Executar Pipeline Completo (24 Fases)</button>
    </div>
  );
}

function EnginesTab({titan}:any) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      {titan.engines.map((e:any)=>(
        <div key={e.id} style={{padding:"10px 12px",borderRadius:10,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
            <div>
              <div style={{fontSize:11,fontWeight:800,color:"#e2e8f0"}}>{e.shortName}</div>
              <div style={{fontSize:8,color:"#475569"}}>{e.description}</div>
            </div>
            <span style={{fontSize:13,fontWeight:800,color:"#00d4ff"}}>{e.accuracy.toFixed(1)}%</span>
          </div>
          <div style={{height:3,borderRadius:2,background:"rgba(255,255,255,0.05)",overflow:"hidden"}}>
            <div style={{height:"100%",width:`${e.accuracy}%`,background:e.accuracy>=90?"#00ff88":"#00d4ff"}}/>
          </div>
        </div>
      ))}
    </div>
  );
}

function ModulesTab({titan}:any) {
  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
      {titan.modules.map((m:any)=>(
        <div key={m.id} style={{
          padding:"8px 10px",borderRadius:8,background:"rgba(255,255,255,0.02)",
          border:`1px solid ${(LAYER_COLORS[m.layer]??"#334155")}28`,
        }}>
          <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:3}}>
            <span style={{fontSize:14}}>{m.icon}</span>
            <span style={{fontSize:9,fontWeight:700,color:"#94a3b8"}}>{m.name}</span>
          </div>
          <div style={{height:2,borderRadius:1,background:"rgba(255,255,255,0.04)",overflow:"hidden"}}>
            <div style={{height:"100%",width:`${m.health}%`,background:m.health>=90?"#00ff88":"#ffaa00"}}/>
          </div>
        </div>
      ))}
    </div>
  );
}

function EvolutionTab({titan}:any) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
        <BigStat l="Geração" v={String(titan.metrics.generationNumber)} c="#ff00ff"/>
        <BigStat l="Eventos" v={String(titan.metrics.totalEvolutionEvents)} c="#aa00ff"/>
        <BigStat l="Patches" v={String(titan.metrics.totalPatches)} c="#00d4ff"/>
        <BigStat l="Rebuilds" v={String(titan.metrics.totalSelfRebuilds)} c="#ff4444"/>
        <BigStat l="Precisão" v={`${titan.metrics.ensembleAccuracy.toFixed(1)}%`} c="#00ff88"/>
        <BigStat l="Pico" v={`${titan.metrics.peakAccuracy.toFixed(1)}%`} c="#ffaa00"/>
      </div>
      <Box c="#ff00ff" title="📜 Histórico">
        {[...titan.evolutionEvents].reverse().slice(0,20).map((ev:any)=>(
          <div key={ev.id} style={{padding:"7px 8px",borderRadius:6,marginBottom:4,background:"rgba(0,255,136,0.04)"}}>
            <div style={{fontSize:9,fontWeight:700,color:"#00ff88"}}>{ev.type.toUpperCase()}</div>
            <div style={{fontSize:9,color:"#64748b"}}>{ev.description}</div>
          </div>
        ))}
      </Box>
    </div>
  );
}

function LogTab({titan,logRef}:any) {
  return (
    <div ref={logRef} style={{
      background:"rgba(0,0,0,0.5)",borderRadius:10,
      border:"1px solid rgba(255,255,255,0.05)",
      padding:10,height:360,overflowY:"auto",
    }}>
      {titan.logs.slice(-300).map((l:any)=>(
        <div key={l.id} style={{display:"flex",gap:6,marginBottom:2,fontSize:9,lineHeight:1.6}}>
          <span style={{color:"#1e293b",fontSize:8}}>{new Date(l.ts).toLocaleTimeString("pt-BR")}</span>
          <span style={{color:"#94a3b8"}}>{l.message}</span>
        </div>
      ))}
    </div>
  );
}

function KPI({v,l,c}:{v:string;l:string;c:string}) {
  return (
    <div style={{background:"rgba(0,0,0,0.3)",borderRadius:8,padding:"8px 6px",textAlign:"center",border:`1px solid ${c}28`}}>
      <div style={{fontSize:14,fontWeight:800,color:c}}>{v}</div>
      <div style={{fontSize:8,color:"#334155",marginTop:1}}>{l}</div>
    </div>
  );
}

function Btn({icon,label,onClick,disabled,primary,danger}:any) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding:"7px 12px",borderRadius:8,border:"1px solid",cursor:disabled?"not-allowed":"pointer",
      fontSize:10,fontWeight:700,fontFamily:"inherit",opacity:disabled?0.4:1,
      display:"flex",alignItems:"center",gap:5,whiteSpace:"nowrap",
      background:primary?"linear-gradient(135deg,rgba(0,212,255,0.2),rgba(170,0,255,0.2))":danger?"rgba(255,68,68,0.08)":"rgba(255,255,255,0.04)",
      borderColor:primary?"rgba(0,212,255,0.4)":danger?"rgba(255,68,68,0.3)":"rgba(255,255,255,0.1)",
      color:primary?"#00d4ff":danger?"#ff6b6b":"#94a3b8",
    }}>{icon} {label}</button>
  );
}

function StateBadge({state}:{state:SystemState}) {
  const m = STATE_META[state] ?? STATE_META.STANDBY;
  return (
    <span style={{
      fontSize:9,padding:"3px 10px",borderRadius:20,fontWeight:700,
      background:m.color+"28",border:`1px solid ${m.color}55`,color:m.color,
      display:"inline-flex",alignItems:"center",gap:4,
    }}>{m.icon} {m.label}</span>
  );
}

function Box({title,c,children}:any) {
  return (
    <div style={{padding:"12px 14px",borderRadius:10,background:"rgba(255,255,255,0.02)",border:`1px solid ${c}28`}}>
      {title && <div style={{fontSize:10,fontWeight:700,color:c,marginBottom:8,textTransform:"uppercase",letterSpacing:.5}}>{title}</div>}
      {children}
    </div>
  );
}

function Row({l,v,hl}:{l:string;v:string;hl?:boolean}) {
  return (
    <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0",borderBottom:"1px solid rgba(255,255,255,0.03)"}}>
      <span style={{fontSize:9,color:"#475569"}}>{l}</span>
      <span style={{fontSize:9,fontWeight:700,color:hl?"#00ff88":"#94a3b8"}}>{v}</span>
    </div>
  );
}

function BigStat({l,v,c}:{l:string;v:string;c:string}) {
  return (
    <div style={{background:"rgba(0,0,0,0.25)",borderRadius:8,padding:"10px",textAlign:"center",border:`1px solid ${c}28`}}>
      <div style={{fontSize:18,fontWeight:800,color:c}}>{v}</div>
      <div style={{fontSize:8,color:"#334155",marginTop:1}}>{l}</div>
    </div>
  );
}
