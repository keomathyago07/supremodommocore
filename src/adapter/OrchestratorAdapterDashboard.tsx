// ============================================================
// OrchestratorAdapterDashboard.tsx
// Dashboard do Orquestrador Adaptador — monitora e gerencia
// o núcleo de 700+ IAs já existente no programa
// ============================================================

import React, { useState, useEffect, useRef } from "react";
import { useOrchestratorAdapter } from "./orchestratorAdapterStore";
import { useAdapterAutoLoop } from "./useAdapterAutoLoop";

type Tab = "overview" | "nucleus" | "commands" | "schedule" | "log";

const LEVEL_COLORS: Record<string, string> = {
  system: "#475569", nucleus: "#00d4ff", command: "#aa00ff",
  success: "#00ff88", warn: "#ffaa00", error: "#ff4444", schedule: "#ff9800",
};

export function OrchestratorAdapterDashboard() {
  const adapter = useOrchestratorAdapter();
  const loop = useAdapterAutoLoop(60_000);
  const [tab, setTab] = useState<Tab>("overview");
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tab === "log" && logRef.current)
      logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [adapter.logs, tab]);

  const { nucleusStatus: ns, metrics, config, isOnline } = adapter;
  const activeRatio = ns.totalIAs > 0 ? Math.round((ns.activeIAs / ns.totalIAs) * 100) : 0;
  const trainingRatio = ns.totalIAs > 0 ? Math.round((ns.trainingIAs / ns.totalIAs) * 100) : 0;
  const pendingCmds = adapter.getPendingCommands().length;

  const TABS: { id: Tab; icon: string; label: string }[] = [
    { id: "overview",  icon: "📊", label: "Visão Geral" },
    { id: "nucleus",   icon: "⚛️",  label: "Núcleo" },
    { id: "commands",  icon: "📡", label: `Comandos${pendingCmds > 0 ? ` (${pendingCmds})` : ""}` },
    { id: "schedule",  icon: "⏰", label: "Horários" },
    { id: "log",       icon: "📋", label: "Log" },
  ];

  return (
    <div style={{
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      color: "#e2e8f0",
      background: "transparent",
    }}>
      {/* ── Status bar ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px", borderRadius: 12, marginBottom: 12,
        background: "linear-gradient(135deg, rgba(0,212,255,0.05), rgba(170,0,255,0.07))",
        border: `1px solid ${isOnline ? "rgba(0,255,136,0.2)" : "rgba(255,255,255,0.08)"}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 10, fontSize: 22,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: isOnline ? "rgba(0,255,136,0.1)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${isOnline ? "rgba(0,255,136,0.25)" : "rgba(255,255,255,0.08)"}`,
          }}>🤖</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 0.3 }}>
              Orquestrador Adaptador
            </div>
            <div style={{ fontSize: 9, color: "#475569", marginTop: 1 }}>
              Gerenciamento do Núcleo — {ns.totalIAs.toLocaleString()} IAs
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Janelas ativas */}
          {loop.inTrainWindow  && <WinTag label="Treino"      c="#aa00ff" />}
          {loop.inGenWindow    && <WinTag label="Geração"     c="#ff9800" />}
          {loop.inCheckWindow  && <WinTag label="Conferência" c="#00ff88" />}
          {/* Botão conectar/desconectar */}
          <button
            onClick={() => isOnline ? adapter.disconnect() : adapter.connect()}
            style={{
              padding: "7px 16px", borderRadius: 8, border: "1px solid", cursor: "pointer",
              fontSize: 11, fontWeight: 700, fontFamily: "inherit",
              background: isOnline ? "rgba(255,68,68,0.1)" : "linear-gradient(135deg,rgba(0,212,255,0.2),rgba(170,0,255,0.2))",
              borderColor: isOnline ? "rgba(255,68,68,0.3)" : "rgba(0,212,255,0.4)",
              color: isOnline ? "#ff6b6b" : "#00d4ff",
            }}>
            {isOnline ? "⏹ Desconectar" : "🔗 Conectar ao Núcleo"}
          </button>
        </div>
      </div>

      {/* ── KPIs rápidos ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 12 }}>
        <KPI label="IAs Ativas" val={`${ns.activeIAs.toLocaleString()}`} sub={`${activeRatio}% do núcleo`}
          color={activeRatio > 50 ? "#00ff88" : "#ffaa00"} />
        <KPI label="Em Treino" val={`${ns.trainingIAs.toLocaleString()}`} sub={`${trainingRatio}% do núcleo`}
          color="#aa00ff" />
        <KPI label="Precisão Ensemble" val={`${ns.ensembleAccuracy.toFixed(1)}%`} sub="núcleo completo"
          color="#00d4ff" />
        <KPI label="Premiações" val={String(metrics.totalPrizesDetected)}
          sub={`R$ ${metrics.totalEarningsTracked.toLocaleString("pt-BR")}`} color="#ffaa00" />
      </div>

      {/* ── Tabs ── */}
      <div style={{
        display: "flex", gap: 2, background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10,
        padding: 3, marginBottom: 12, overflowX: "auto",
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, minWidth: 70, padding: "6px 8px", borderRadius: 8,
            border: "none", cursor: "pointer", fontSize: 10, fontWeight: 600,
            fontFamily: "inherit",
            background: tab === t.id ? "rgba(0,212,255,0.12)" : "transparent",
            color: tab === t.id ? "#00d4ff" : "#475569",
            whiteSpace: "nowrap", transition: "all .15s",
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Conteúdo ── */}
      {tab === "overview"  && <OverviewTab adapter={adapter} metrics={metrics} ns={ns} />}
      {tab === "nucleus"   && <NucleusTab adapter={adapter} ns={ns} />}
      {tab === "commands"  && <CommandsTab commands={adapter.commands} />}
      {tab === "schedule"  && <ScheduleTab adapter={adapter} />}
      {tab === "log"       && <LogTab logs={adapter.logs} logRef={logRef} />}
    </div>
  );
}

// ─── Abas ────────────────────────────────────────────────────

function OverviewTab({ adapter, metrics, ns }: any) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Tarefa atual */}
      <Card color={ns.currentTask ? "#00d4ff" : "#334155"}>
        <Row label="Tarefa atual">
          <span style={{ color: ns.currentTask ? "#00d4ff" : "#475569", fontSize: 11 }}>
            {ns.currentTask ?? "Nenhuma — sistema em standby"}
          </span>
        </Row>
        <Row label="Saúde do pipeline">
          <BarSmall val={ns.pipelineHealth} color={ns.pipelineHealth>80?"#00ff88":"#ffaa00"} />
        </Row>
        <Row label="Confiança das previsões">
          <BarSmall val={ns.predictionConfidence} color="#00d4ff" />
        </Row>
        <Row label="Ciclos concluídos hoje"><span style={{color:"#94a3b8"}}>{ns.cyclesCompleted}</span></Row>
        <Row label="Último ciclo">
          <span style={{color:"#64748b",fontSize:10}}>
            {ns.lastCycleAt ? new Date(ns.lastCycleAt).toLocaleTimeString("pt-BR") : "—"}
          </span>
        </Row>
      </Card>

      {/* Métricas do orquestrador */}
      <Card color="#aa00ff">
        <div style={{fontSize:10,color:"#aa00ff",fontWeight:700,marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>
          Métricas do Orquestrador
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
          <MiniBox label="Comandos enviados"   val={metrics.commandsSent} />
          <MiniBox label="Comandos confirmados" val={metrics.commandsAcked} />
          <MiniBox label="Gerações disparadas" val={metrics.generationsTriggered} />
          <MiniBox label="Treinos disparados"  val={metrics.trainingSessionsTriggered} />
          <MiniBox label="Conferências"        val={metrics.checksTriggered} />
          <MiniBox label="Ciclos gerenciados"  val={metrics.cyclesManaged} />
        </div>
        {metrics.uptimeStart && (
          <div style={{fontSize:9,color:"#334155",marginTop:8,textAlign:"center"}}>
            Online desde {new Date(metrics.uptimeStart).toLocaleString("pt-BR")}
          </div>
        )}
      </Card>

      {/* Controles rápidos */}
      <Card color="#ff9800">
        <div style={{fontSize:10,color:"#ff9800",fontWeight:700,marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>
          Ações Rápidas
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
          <ActionBtn icon="🎓" label="Treinar IAs"  color="#aa00ff" onClick={() => adapter.triggerTraining()} />
          <ActionBtn icon="🔮" label="Gerar Jogos"  color="#ff9800" onClick={() => adapter.triggerGeneration()} />
          <ActionBtn icon="🔄" label="Sincronizar"  color="#00d4ff" onClick={() => adapter.triggerSync()} />
          <ActionBtn icon="🧬" label="Aprender"     color="#00ff88" onClick={() => adapter.triggerLearning()} />
        </div>
      </Card>
    </div>
  );
}

function NucleusTab({ adapter, ns }: any) {
  const total = ns.totalIAs;
  const segs = [
    { label: "Ativas",    val: ns.activeIAs,    color: "#00ff88" },
    { label: "Treinando", val: ns.trainingIAs,   color: "#aa00ff" },
    { label: "Standby",   val: Math.max(0, total - ns.activeIAs), color: "#1e293b" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Barra do núcleo */}
      <Card color="#00d4ff">
        <div style={{fontSize:10,color:"#00d4ff",fontWeight:700,marginBottom:10,textTransform:"uppercase",letterSpacing:1}}>
          Núcleo — {total.toLocaleString()} IAs
        </div>
        <div style={{height:16,borderRadius:8,overflow:"hidden",display:"flex",gap:1,marginBottom:10}}>
          {segs.map(s => (
            <div key={s.label} style={{
              flex: s.val, background: s.color,
              minWidth: s.val > 0 ? 4 : 0,
              transition: "flex .5s ease",
            }} />
          ))}
        </div>
        <div style={{display:"flex",gap:12}}>
          {segs.map(s => (
            <div key={s.label} style={{display:"flex",alignItems:"center",gap:5}}>
              <span style={{width:8,height:8,borderRadius:"50%",background:s.color,display:"inline-block"}} />
              <span style={{fontSize:10,color:"#64748b"}}>{s.label}:</span>
              <span style={{fontSize:10,fontWeight:700,color:s.color}}>{s.val.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Controle do nível das IAs */}
      <Card color="#aa00ff">
        <div style={{fontSize:10,color:"#aa00ff",fontWeight:700,marginBottom:10,textTransform:"uppercase",letterSpacing:1}}>
          Nível Operacional
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6}}>
          {["economico","normal","turbo","maxima","infinita"].map(lv => (
            <button key={lv} onClick={() => adapter.setIALevel(lv)} style={{
              padding:"8px 4px",borderRadius:8,border:"1px solid",fontSize:9,
              fontWeight:700,cursor:"pointer",fontFamily:"inherit",
              background:"rgba(170,0,255,0.08)",borderColor:"rgba(170,0,255,0.2)",
              color:"#aa00ff",textTransform:"uppercase",
            }}>
              {lv === "infinita" ? "∞" : lv.slice(0,3).toUpperCase()}
            </button>
          ))}
        </div>
      </Card>

      {/* Faixas-alvo */}
      <Card color="#ffaa00">
        <div style={{fontSize:10,color:"#ffaa00",fontWeight:700,marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>
          🏆 Faixas-Alvo Configuradas
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {adapter.config.targetPrizeTiers.map((t: string) => (
            <span key={t} style={{
              fontSize:9,padding:"2px 8px",borderRadius:10,
              background:"rgba(255,170,0,0.1)",border:"1px solid rgba(255,170,0,0.25)",
              color:"#ffaa00",fontWeight:700,
            }}>{t}</span>
          ))}
        </div>
        <div style={{marginTop:10}}>
          <div style={{fontSize:9,color:"#475569",marginBottom:6}}>
            Confiança mínima: <span style={{color:"#00d4ff"}}>{adapter.config.minConfidence}%</span>
          </div>
          <input type="range" min={50} max={99} value={adapter.config.minConfidence}
            onChange={e => adapter.updateConfig({minConfidence:+e.target.value})}
            style={{width:"100%",accentColor:"#00d4ff"}} />
        </div>
      </Card>
    </div>
  );
}

function CommandsTab({ commands }: { commands: any[] }) {
  const sorted = [...commands].reverse().slice(0, 30);
  const statusColors: Record<string,string> = {
    pending: "#ffaa00", ack: "#00d4ff", done: "#00ff88", error: "#ff4444",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {sorted.length === 0 ? (
        <div style={{textAlign:"center",color:"#334155",fontSize:11,padding:40}}>
          Nenhum comando enviado ainda.
        </div>
      ) : sorted.map(c => (
        <div key={c.id} style={{
          padding:"10px 12px",borderRadius:8,
          background:"rgba(255,255,255,0.03)",
          border:`1px solid ${(statusColors[c.status]??"#334155")}22`,
        }}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
            <span style={{
              fontSize:10,fontWeight:700,color:"#aa00ff",
              background:"rgba(170,0,255,0.1)",padding:"1px 6px",borderRadius:4,
            }}>{c.command}</span>
            <span style={{
              fontSize:9,padding:"1px 7px",borderRadius:10,fontWeight:700,
              background:(statusColors[c.status]??"#334155")+"18",
              color:statusColors[c.status]??"#64748b",
              border:`1px solid ${(statusColors[c.status]??"#334155")}33`,
            }}>{c.status.toUpperCase()}</span>
          </div>
          <div style={{fontSize:9,color:"#334155"}}>
            {new Date(c.sentAt).toLocaleTimeString("pt-BR")}
            {c.ackAt && ` → ACK ${new Date(c.ackAt).toLocaleTimeString("pt-BR")}`}
          </div>
          {c.payload && (
            <div style={{fontSize:8,color:"#1e293b",marginTop:3,fontFamily:"monospace"}}>
              {JSON.stringify(c.payload).slice(0,80)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ScheduleTab({ adapter }: any) {
  const w = adapter.config.windows;
  const fields: {label:string;group:string;field:string;val:string}[] = [
    { label:"Início geração",   group:"generation", field:"start",   val:w.generation.start },
    { label:"Fim geração",      group:"generation", field:"end",     val:w.generation.end },
    { label:"Hora do sorteio",  group:"",           field:"drawTime",val:w.drawTime },
    { label:"Início conferência",group:"checking",  field:"start",   val:w.checking.start },
    { label:"Fim conferência",  group:"checking",   field:"end",     val:w.checking.end },
    { label:"Início treino",    group:"training",   field:"start",   val:w.training.start },
    { label:"Fim treino",       group:"training",   field:"end",     val:w.training.end },
  ];

  function handleChange(group: string, field: string, val: string) {
    if (!group) { adapter.updateWindows({ drawTime: val }); return; }
    adapter.updateWindows({ [group]: { ...w[group], [field]: val } });
  }

  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{
        padding:"10px 12px",borderRadius:8,fontSize:11,color:"#64748b",lineHeight:1.7,
        background:"rgba(0,212,255,0.04)",border:"1px solid rgba(0,212,255,0.1)",
      }}>
        ⚠️ <strong style={{color:"#e2e8f0"}}>Regra crítica:</strong> A conferência automática
        aceita <strong style={{color:"#00ff88"}}>apenas dados do dia atual</strong>.
        Qualquer tentativa de conferir com datas anteriores é bloqueada automaticamente pelo orquestrador.
      </div>

      <Card color="#00d4ff">
        <div style={{fontSize:10,color:"#00d4ff",fontWeight:700,marginBottom:10,textTransform:"uppercase",letterSpacing:1}}>
          Janelas de Operação
        </div>
        {fields.map(f => (
          <div key={f.label} style={{
            display:"flex",justifyContent:"space-between",alignItems:"center",
            padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.04)",
          }}>
            <span style={{fontSize:11,color:"#64748b"}}>{f.label}</span>
            <input type="time" value={f.val}
              onChange={e => handleChange(f.group, f.field, e.target.value)}
              style={{
                background:"rgba(0,0,0,0.3)",border:"1px solid rgba(0,212,255,0.2)",
                borderRadius:6,padding:"3px 8px",color:"#00d4ff",fontSize:11,
                fontFamily:"inherit",outline:"none",
              }} />
          </div>
        ))}
      </Card>

      {/* Toggles de automação */}
      <Card color="#aa00ff">
        <div style={{fontSize:10,color:"#aa00ff",fontWeight:700,marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>
          Automação
        </div>
        {[
          {label:"Gerenciar tudo automaticamente",    key:"autoManage"},
          {label:"Disparar treinamento automático",   key:"autoTriggerTraining"},
          {label:"Gerar jogos no horário",            key:"autoTriggerGeneration"},
          {label:"Conferir após sorteio",             key:"autoTriggerChecking"},
          {label:"Sincronizar após cada ação",        key:"autoSyncAfterAction"},
          {label:"Aprender com resultados do dia",    key:"autoLearnFromResults"},
          {label:"Bloquear conferências passadas",    key:"blockPastDateChecks"},
        ].map(item => (
          <div key={item.key} style={{
            display:"flex",justifyContent:"space-between",alignItems:"center",
            padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.04)",
          }}>
            <span style={{fontSize:10,color:"#94a3b8"}}>{item.label}</span>
            <Toggle on={(adapter.config as any)[item.key]}
              onChange={v => adapter.updateConfig({[item.key]:v})} />
          </div>
        ))}
      </Card>
    </div>
  );
}

function LogTab({ logs, logRef }: any) {
  const [filter, setFilter] = useState("all");
  const levels = ["all","system","nucleus","command","success","warn","error","schedule"];
  const shown = filter === "all" ? logs : logs.filter((l:any) => l.level === filter);

  return (
    <div>
      <div style={{display:"flex",gap:4,marginBottom:8,flexWrap:"wrap"}}>
        {levels.map(l => (
          <button key={l} onClick={() => setFilter(l)} style={{
            padding:"2px 8px",borderRadius:20,border:"1px solid",fontSize:9,
            fontWeight:700,cursor:"pointer",fontFamily:"inherit",
            background: filter===l ? (LEVEL_COLORS[l]??"#00d4ff")+"22" : "transparent",
            borderColor: filter===l ? (LEVEL_COLORS[l]??"#00d4ff")+"55" : "rgba(255,255,255,0.08)",
            color: filter===l ? (LEVEL_COLORS[l]??"#00d4ff") : "#334155",
          }}>{l.toUpperCase()}</button>
        ))}
      </div>
      <div ref={logRef} style={{
        background:"rgba(0,0,0,0.4)",borderRadius:10,
        border:"1px solid rgba(255,255,255,0.06)",
        padding:12,height:320,overflowY:"auto",
      }}>
        {shown.slice(-200).map((l:any) => (
          <div key={l.id} style={{display:"flex",gap:8,marginBottom:3,fontSize:10,lineHeight:1.5}}>
            <span style={{color:"#1e293b",fontSize:9,flexShrink:0}}>
              {new Date(l.ts).toLocaleTimeString("pt-BR")}
            </span>
            <span style={{
              fontSize:9,padding:"0 5px",borderRadius:3,flexShrink:0,
              background:(LEVEL_COLORS[l.level]??"#475569")+"15",
              color:LEVEL_COLORS[l.level]??"#475569",
              border:`1px solid ${(LEVEL_COLORS[l.level]??"#475569")}30`,
            }}>{l.level.toUpperCase()}</span>
            <span style={{color:"#94a3b8"}}>{l.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Micro-componentes ───────────────────────────────────────

function KPI({label,val,sub,color}:{label:string;val:string;sub:string;color:string}) {
  return (
    <div style={{
      background:"rgba(0,0,0,0.25)",borderRadius:10,padding:"10px",textAlign:"center",
      border:`1px solid ${color}18`,
    }}>
      <div style={{fontSize:18,fontWeight:800,color}}>{val}</div>
      <div style={{fontSize:9,color:"#475569",margin:"2px 0"}}>{label}</div>
      <div style={{fontSize:8,color:"#334155"}}>{sub}</div>
    </div>
  );
}

function Card({children,color}:{children:React.ReactNode;color:string}) {
  return (
    <div style={{
      padding:"12px 14px",borderRadius:10,
      background:"rgba(255,255,255,0.03)",
      border:`1px solid ${color}18`,
    }}>{children}</div>
  );
}

function Row({label,children}:{label:string;children:React.ReactNode}) {
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
      padding:"4px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
      <span style={{fontSize:10,color:"#64748b"}}>{label}</span>
      {children}
    </div>
  );
}

function BarSmall({val,color}:{val:number;color:string}) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:6}}>
      <div style={{width:60,height:4,borderRadius:2,background:"rgba(255,255,255,0.06)",overflow:"hidden"}}>
        <div style={{height:"100%",width:`${val}%`,background:color,transition:"width .4s"}} />
      </div>
      <span style={{fontSize:9,color,fontWeight:700}}>{val}%</span>
    </div>
  );
}

function MiniBox({label,val}:{label:string;val:number}) {
  return (
    <div style={{
      background:"rgba(0,0,0,0.2)",borderRadius:6,padding:"6px 8px",textAlign:"center",
      border:"1px solid rgba(255,255,255,0.05)",
    }}>
      <div style={{fontSize:14,fontWeight:800,color:"#e2e8f0"}}>{val}</div>
      <div style={{fontSize:8,color:"#334155",marginTop:1}}>{label}</div>
    </div>
  );
}

function ActionBtn({icon,label,color,onClick}:any) {
  return (
    <button onClick={onClick} style={{
      padding:"8px",borderRadius:8,border:`1px solid ${color}33`,
      background:`${color}10`,color,fontSize:10,fontWeight:700,
      cursor:"pointer",fontFamily:"inherit",
      display:"flex",alignItems:"center",justifyContent:"center",gap:5,
    }}>
      {icon} {label}
    </button>
  );
}

function Toggle({on,onChange}:{on:boolean;onChange:(v:boolean)=>void}) {
  return (
    <button onClick={() => onChange(!on)} style={{
      width:32,height:18,borderRadius:9,border:"1px solid",cursor:"pointer",position:"relative",
      background:on?"rgba(0,255,136,0.2)":"rgba(255,255,255,0.05)",
      borderColor:on?"rgba(0,255,136,0.4)":"rgba(255,255,255,0.1)",
    }}>
      <span style={{
        position:"absolute",top:2,width:12,height:12,borderRadius:"50%",
        background:on?"#00ff88":"#334155",
        left:on?"calc(100% - 15px)":2,transition:"all .2s",
      }} />
    </button>
  );
}

function WinTag({label,c}:{label:string;c:string}) {
  return (
    <span style={{
      fontSize:8,padding:"2px 7px",borderRadius:10,fontWeight:700,
      background:`${c}15`,border:`1px solid ${c}33`,color:c,
      fontFamily:"monospace",animation:"pulse 2s infinite",
    }}>● {label}</span>
  );
}
