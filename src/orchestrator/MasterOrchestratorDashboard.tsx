// ============================================================
// MasterOrchestratorDashboard.tsx
// Painel principal do Orquestrador Master
// Monitora e administra TODO o programa de ponta a ponta
// ============================================================

import React, { useState, useEffect, useRef } from "react";
import { useMasterOrchestrator } from "./masterOrchestratorStore";
import { SystemPhase, SystemModule, IAAgentId } from "./orchestrator.types";

// ─── Constantes visuais ──────────────────────────────────────
const PHASE_META: Record<SystemPhase, { label: string; color: string; icon: string }> = {
  boot:               { label: "Inicializando",         color: "#00d4ff", icon: "⚡" },
  monitoring:         { label: "Monitorando",           color: "#00ff88", icon: "👁️" },
  training:           { label: "Treinando IAs",         color: "#aa00ff", icon: "🎓" },
  generating:         { label: "Gerando Previsões",     color: "#ff9800", icon: "🔮" },
  awaiting_draw:      { label: "Aguardando Sorteio",    color: "#ffaa00", icon: "⏳" },
  checking:           { label: "Conferindo",            color: "#00d4ff", icon: "🔍" },
  learning:           { label: "Aprendendo",            color: "#aa00ff", icon: "🧬" },
  idle:               { label: "Em Standby",            color: "#475569", icon: "💤" },
};

type Tab = "overview" | "agents" | "modules" | "schedule" | "log" | "cycles";

export function MasterOrchestratorDashboard() {
  const {
    phase, isRunning, agents, modules, logs, config,
    trainingMetrics, cycles, currentCycle,
    boot, shutdown, runTrainingSession, runStudySession,
    triggerGeneration, runFullDailyCycle,
    getSystemHealthScore, getEnsembleAccuracy,
    isWithinGenerationWindow, isWithinCheckingWindow,
  } = useMasterOrchestrator();

  const [tab, setTab] = useState<Tab>("overview");
  const [booting, setBooting] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  // Auto-scroll log
  useEffect(() => {
    if (tab === "log" && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs, tab]);

  const phaseMeta = PHASE_META[phase];
  const health = getSystemHealthScore();
  const ensembleAcc = getEnsembleAccuracy();
  const onlineModules = modules.filter(m => m.status === "online" || m.status === "processing").length;
  const activeAgents = agents.filter(a => a.status === "active" || a.status === "training").length;

  async function handleBoot() {
    setBooting(true);
    await boot();
    setBooting(false);
  }

  const TABS: { id: Tab; icon: string; label: string }[] = [
    { id: "overview",  icon: "📊", label: "Visão Geral" },
    { id: "agents",    icon: "🧠", label: "IAs" },
    { id: "modules",   icon: "⚙️",  label: "Módulos" },
    { id: "schedule",  icon: "📅", label: "Horários" },
    { id: "log",       icon: "📋", label: "Log" },
    { id: "cycles",    icon: "🔄", label: "Ciclos" },
  ];

  return (
    <div style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace", background: "transparent" }}>
      {/* ── Header ── */}
      <div style={{
        background: "linear-gradient(135deg, rgba(0,212,255,0.06) 0%, rgba(170,0,255,0.08) 100%)",
        border: "1px solid rgba(0,212,255,0.15)",
        borderRadius: 14,
        padding: "14px 16px",
        marginBottom: 14,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: "linear-gradient(135deg, #00d4ff22, #aa00ff33)",
              border: "1px solid rgba(0,212,255,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20,
            }}>🤖</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", letterSpacing: 0.3 }}>
                Orquestrador Master
              </div>
              <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>
                Gerenciamento Ultra Avançado de Ponta a Ponta
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <PhasePill phase={phase} />
            {isRunning && (
              <span style={{
                width: 8, height: 8, borderRadius: "50%",
                background: "#00ff88",
                boxShadow: "0 0 8px #00ff88",
                animation: "pulse 1.5s infinite",
                display: "inline-block",
              }} />
            )}
          </div>
        </div>

        {/* Métricas rápidas */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
          <QuickStat label="Saúde do Sistema" value={`${health}%`}
            color={health >= 90 ? "#00ff88" : health >= 70 ? "#ffaa00" : "#ff4444"} />
          <QuickStat label="Precisão Ensemble" value={`${ensembleAcc}%`} color="#00d4ff" />
          <QuickStat label="Módulos Online" value={`${onlineModules}/${modules.length}`} color="#aa00ff" />
          <QuickStat label="IAs Ativas" value={`${activeAgents}/${agents.length}`} color="#ff9800" />
        </div>

        {/* Janela de tempo atual */}
        <div style={{
          marginTop: 10, padding: "7px 12px", borderRadius: 8,
          background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.06)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ fontSize: 10, color: "#64748b" }}>
            Janela de geração: <span style={{ color: "#00d4ff" }}>
              {config.schedule.generationWindowStart}–{config.schedule.generationWindowEnd}
            </span>
            &nbsp;|&nbsp; Sorteios: <span style={{ color: "#ffaa00" }}>{config.schedule.drawTime}</span>
            &nbsp;|&nbsp; Conferência: <span style={{ color: "#00ff88" }}>{config.schedule.checkingWindowStart}</span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <WindowBadge label="Geração" active={isWithinGenerationWindow()} />
            <WindowBadge label="Conferência" active={isWithinCheckingWindow()} />
          </div>
        </div>
      </div>

      {/* ── Controles ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {!isRunning ? (
          <CtrlBtn
            icon="🚀" label={booting ? "Inicializando..." : "Iniciar Orquestrador"}
            onClick={handleBoot} disabled={booting}
            primary
          />
        ) : (
          <CtrlBtn icon="⏹️" label="Desligar" onClick={shutdown} danger />
        )}
        <CtrlBtn icon="🎓" label="Treinar IAs" onClick={runTrainingSession} disabled={!isRunning} />
        <CtrlBtn icon="📚" label="Sessão de Estudo" onClick={runStudySession} disabled={!isRunning} />
        <CtrlBtn icon="🔮" label="Gerar Previsões" onClick={triggerGeneration} disabled={!isRunning} />
        <CtrlBtn icon="▶️" label="Ciclo Completo" onClick={runFullDailyCycle} disabled={!isRunning} primary />
      </div>

      {/* ── Tabs ── */}
      <div style={{
        display: "flex", gap: 2,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 10, padding: 4, marginBottom: 14,
        overflowX: "auto",
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, minWidth: 60, padding: "6px 8px",
            borderRadius: 7, border: "none", cursor: "pointer",
            fontSize: 10, fontWeight: 600,
            background: tab === t.id ? "rgba(0,212,255,0.12)" : "transparent",
            color: tab === t.id ? "#00d4ff" : "#475569",
            transition: "all .15s",
            whiteSpace: "nowrap",
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Conteúdo por aba ── */}
      {tab === "overview" && <OverviewTab />}
      {tab === "agents"   && <AgentsTab />}
      {tab === "modules"  && <ModulesTab />}
      {tab === "schedule" && <ScheduleTab />}
      {tab === "log"      && <LogTab logRef={logRef} />}
      {tab === "cycles"   && <CyclesTab />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ABAS
// ═══════════════════════════════════════════════════════════

function OverviewTab() {
  const { phase, agents, modules, trainingMetrics, config } = useMasterOrchestrator();

  const totalTrainCycles = agents.reduce((s, a) => s + a.trainingCycles, 0);
  const bestAgent = [...agents].sort((a, b) => b.accuracy - a.accuracy)[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Pipeline visual */}
      <PipelineVisual phase={phase} />

      {/* Plano Ultra-Sync do dia */}
      <DailyPlanCard />


      {/* Cards de status */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <SectionCard title="🎓 Treinamento" color="#aa00ff">
          <StatLine label="Ciclos totais" value={String(trainingMetrics.totalCycles)} />
          <StatLine label="Sessões de estudo" value={String(trainingMetrics.totalStudySessions)} />
          <StatLine label="Métodos refinados" value={String(trainingMetrics.methodsRefined)} />
          <StatLine label="Padrões aprendidos" value={String(trainingMetrics.patternsLearned)} />
          <StatLine label="Precisão média" value={`${trainingMetrics.averageAccuracy}%`} highlight />
          <StatLine label="Pico de precisão" value={`${trainingMetrics.peakAccuracy}%`} highlight />
        </SectionCard>

        <SectionCard title="🏆 Melhor IA" color="#ffaa00">
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div style={{ fontSize: 28 }}>{bestAgent?.icon}</div>
            <div style={{ fontSize: 12, color: "#e2e8f0", fontWeight: 700, marginTop: 4 }}>
              {bestAgent?.name}
            </div>
            <div style={{ fontSize: 10, color: "#64748b", marginTop: 3 }}>
              {bestAgent?.specialty}
            </div>
            <div style={{
              marginTop: 8, fontSize: 20, fontWeight: 800,
              color: "#00ff88",
            }}>
              {bestAgent?.accuracy.toFixed(1)}%
            </div>
            <div style={{ fontSize: 9, color: "#64748b" }}>precisão atual</div>
            <StatLine label="Ciclos treino" value={String(bestAgent?.trainingCycles ?? 0)} />
            <StatLine label="Ciclos estudo" value={String(bestAgent?.studyCycles ?? 0)} />
          </div>
        </SectionCard>
      </div>

      {/* Trend de precisão */}
      {trainingMetrics.improvementTrend.length > 1 && (
        <SectionCard title="📈 Tendência de Precisão" color="#00d4ff">
          <TrendChart data={trainingMetrics.improvementTrend} />
        </SectionCard>
      )}

      {/* Configurações auto */}
      <SectionCard title="⚙️ Gestão Automática" color="#00d4ff">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {[
            { label: "Gerenciar tudo",        val: config.autoManageAll },
            { label: "Treino automático",     val: config.autoTrain },
            { label: "Estudo automático",     val: config.autoStudy },
            { label: "Gerar no horário",      val: config.autoGenerateOnSchedule },
            { label: "Conferir após 21h",     val: config.autoCheckAfterDraw },
            { label: "Aprender resultados",   val: config.autoLearnFromResults },
            { label: "Sync todos módulos",    val: config.syncAllModules },
            { label: "Forçar data sorteio",   val: config.enforceDrawTime },
          ].map(item => (
            <div key={item.label} style={{
              display: "flex", justifyContent: "space-between",
              padding: "5px 8px", borderRadius: 6,
              background: "rgba(255,255,255,0.03)",
              alignItems: "center",
            }}>
              <span style={{ fontSize: 10, color: "#94a3b8" }}>{item.label}</span>
              <span style={{
                fontSize: 9, padding: "1px 6px", borderRadius: 10,
                background: item.val ? "rgba(0,255,136,0.15)" : "rgba(255,255,255,0.05)",
                color: item.val ? "#00ff88" : "#475569",
                border: `1px solid ${item.val ? "rgba(0,255,136,0.3)" : "rgba(255,255,255,0.08)"}`,
                fontWeight: 700,
              }}>
                {item.val ? "ON" : "OFF"}
              </span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function AgentsTab() {
  const { agents, runTrainingSession, runStudySession } = useMasterOrchestrator();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
        <button onClick={runTrainingSession} style={smallBtnStyle("#aa00ff")}>
          🎓 Treinar Todas
        </button>
        <button onClick={runStudySession} style={smallBtnStyle("#00d4ff")}>
          📚 Estudar Todas
        </button>
      </div>
      {agents.map(agent => <AgentCard key={agent.id} agent={agent} />)}
    </div>
  );
}

function ModulesTab() {
  const { modules } = useMasterOrchestrator();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {modules.map(mod => (
        <div key={mod.id} style={{
          padding: "12px 14px", borderRadius: 10,
          background: "rgba(255,255,255,0.04)",
          border: `1px solid ${mod.status === "online" ? "rgba(0,255,136,0.15)" : mod.status === "processing" ? "rgba(0,212,255,0.2)" : "rgba(255,255,255,0.07)"}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>{mod.icon}</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{mod.label}</div>
              <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>{mod.description}</div>
              <div style={{ fontSize: 9, color: "#334155", marginTop: 1 }}>
                Última atividade: {mod.lastActivity} · Tarefas: {mod.tasksCompleted}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            <ModuleStatusBadge status={mod.status} />
            <HealthBar value={mod.healthScore} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ScheduleTab() {
  const { config, updateSchedule, updateConfig } = useMasterOrchestrator();
  const s = config.schedule;

  function handleTime(field: string, val: string) {
    updateSchedule({ [field]: val } as any);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <InfoBox>
        ⏰ O sistema opera dentro das janelas de tempo definidas abaixo.
        Jogos são gerados apenas entre {s.generationWindowStart} e {s.generationWindowEnd}.
        A conferência automática só aceita resultados <strong style={{ color: "#00ff88" }}>do dia atual</strong>,
        iniciando após {s.checkingWindowStart}.
      </InfoBox>

      <SectionCard title="🕐 Janelas de Operação" color="#00d4ff">
        <TimeRow label="Início da geração" field="generationWindowStart" value={s.generationWindowStart} onChange={handleTime} />
        <TimeRow label="Fim da geração" field="generationWindowEnd" value={s.generationWindowEnd} onChange={handleTime} />
        <TimeRow label="Hora do sorteio" field="drawTime" value={s.drawTime} onChange={handleTime} />
        <TimeRow label="Início da conferência" field="checkingWindowStart" value={s.checkingWindowStart} onChange={handleTime} />
        <TimeRow label="Fim da conferência" field="checkingWindowEnd" value={s.checkingWindowEnd} onChange={handleTime} />
        <TimeRow label="Início do treino" field="trainingWindowStart" value={s.trainingWindowStart} onChange={handleTime} />
        <TimeRow label="Fim do treino" field="trainingWindowEnd" value={s.trainingWindowEnd} onChange={handleTime} />
      </SectionCard>

      <SectionCard title="⚙️ Modo do Ensemble" color="#aa00ff">
        <div style={{ display: "flex", gap: 8 }}>
          {(["parallel", "sequential", "hierarchical"] as const).map(mode => (
            <button key={mode} onClick={() => updateConfig({ iaEnsembleMode: mode })} style={{
              flex: 1, padding: "8px 4px", borderRadius: 8, border: "1px solid",
              fontSize: 10, fontWeight: 600, cursor: "pointer",
              background: config.iaEnsembleMode === mode ? "rgba(170,0,255,0.2)" : "rgba(255,255,255,0.04)",
              borderColor: config.iaEnsembleMode === mode ? "#aa00ff" : "rgba(255,255,255,0.08)",
              color: config.iaEnsembleMode === mode ? "#aa00ff" : "#475569",
            }}>
              {mode === "parallel" ? "⚡ Paralelo" : mode === "sequential" ? "➡️ Sequencial" : "🏗️ Hierárquico"}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 10, color: "#64748b", marginBottom: 6 }}>
            Confiança mínima para publicar jogo: <span style={{ color: "#00d4ff" }}>{config.minConfidenceThreshold}%</span>
          </div>
          <input type="range" min={50} max={99} value={config.minConfidenceThreshold}
            onChange={e => updateConfig({ minConfidenceThreshold: +e.target.value })}
            style={{ width: "100%", accentColor: "#00d4ff" }} />
        </div>
      </SectionCard>

      <SectionCard title="🔒 Regras Críticas" color="#ff4444">
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <RuleRow
            label="Conferir apenas com sorteios do dia atual"
            desc="Bloqueia conferências com dados de dias anteriores"
            on={config.enforceDrawTime}
            onChange={v => updateConfig({ enforceDrawTime: v })}
            locked
          />
          <RuleRow
            label="Gerar jogos apenas na janela configurada"
            desc={`Somente entre ${s.generationWindowStart} e ${s.generationWindowEnd}`}
            on={config.autoGenerateOnSchedule}
            onChange={v => updateConfig({ autoGenerateOnSchedule: v })}
          />
          <RuleRow
            label="Aprender com cada resultado do dia"
            desc="Refinamento contínuo dos modelos após conferência"
            on={config.autoLearnFromResults}
            onChange={v => updateConfig({ autoLearnFromResults: v })}
          />
        </div>
      </SectionCard>
    </div>
  );
}

function LogTab({ logRef }: { logRef: React.RefObject<HTMLDivElement> }) {
  const { logs } = useMasterOrchestrator();
  const [filter, setFilter] = useState<string>("all");

  const levels = ["all", "system", "ia", "training", "check", "success", "warn", "error"];
  const filtered = filter === "all" ? logs : logs.filter(l => l.level === filter);

  const levelColors: Record<string, string> = {
    system: "#64748b", ia: "#aa00ff", training: "#ff9800",
    check: "#00d4ff", success: "#00ff88", warn: "#ffaa00", error: "#ff4444",
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 4, marginBottom: 10, flexWrap: "wrap" }}>
        {levels.map(l => (
          <button key={l} onClick={() => setFilter(l)} style={{
            padding: "3px 10px", borderRadius: 20, border: "1px solid",
            fontSize: 9, fontWeight: 700, cursor: "pointer",
            background: filter === l ? (levelColors[l] ?? "#00d4ff") + "22" : "transparent",
            borderColor: filter === l ? (levelColors[l] ?? "#00d4ff") + "66" : "rgba(255,255,255,0.08)",
            color: filter === l ? (levelColors[l] ?? "#00d4ff") : "#475569",
          }}>
            {l.toUpperCase()}
          </button>
        ))}
      </div>
      <div ref={logRef} style={{
        background: "rgba(0,0,0,0.4)", borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.06)",
        padding: 12, height: 340, overflowY: "auto",
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", color: "#334155", fontSize: 11, paddingTop: 40 }}>
            Log vazio. Inicie o orquestrador.
          </div>
        ) : (
          filtered.slice(-200).map(log => (
            <div key={log.id} style={{
              display: "flex", gap: 8, marginBottom: 4,
              fontSize: 10, lineHeight: 1.5,
            }}>
              <span style={{ color: "#1e293b", flexShrink: 0, fontSize: 9 }}>
                {new Date(log.ts).toLocaleTimeString("pt-BR")}
              </span>
              <span style={{
                fontSize: 9, padding: "0 5px", borderRadius: 4, flexShrink: 0,
                background: (levelColors[log.level] ?? "#64748b") + "18",
                color: levelColors[log.level] ?? "#64748b",
                border: `1px solid ${(levelColors[log.level] ?? "#64748b")}33`,
              }}>
                {log.level.toUpperCase()}
              </span>
              <span style={{ color: "#94a3b8" }}>{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function CyclesTab() {
  const { cycles } = useMasterOrchestrator();
  const sorted = [...cycles].reverse();

  if (!sorted.length) return (
    <div style={{ textAlign: "center", color: "#334155", fontSize: 11, padding: 40 }}>
      Nenhum ciclo registrado ainda.
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {sorted.map((c, i) => (
        <div key={i} style={{
          padding: "12px 14px", borderRadius: 10,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>{c.date}</span>
            <PhasePill phase={c.phase} small />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
            <MiniStat label="Jogos gerados" val={String(c.gamesGenerated)} />
            <MiniStat label="Confirmados" val={String(c.gamesConfirmed)} />
            <MiniStat label="Conferidos" val={String(c.drawsChecked)} />
            <MiniStat label="Premiações" val={String(c.prizesWon)} color="#00ff88" />
            <MiniStat label="Melhorias IA" val={String(c.iaImprovements)} color="#aa00ff" />
            <MiniStat label="Ganhos" val={c.totalEarnings > 0 ? `R$${c.totalEarnings.toLocaleString("pt-BR")}` : "—"} color="#ffaa00" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SUB-COMPONENTES
// ═══════════════════════════════════════════════════════════

function PipelineVisual({ phase }: { phase: SystemPhase }) {
  const steps: { id: SystemPhase; label: string; icon: string }[] = [
    { id: "training",      label: "Treinar",  icon: "🎓" },
    { id: "generating",    label: "Gerar",    icon: "🔮" },
    { id: "awaiting_draw", label: "Aguardar", icon: "⏳" },
    { id: "checking",      label: "Conferir", icon: "🔍" },
    { id: "learning",      label: "Aprender", icon: "🧬" },
    { id: "idle",          label: "Standby",  icon: "💤" },
  ];

  const order: SystemPhase[] = ["boot","training","generating","awaiting_draw","checking","learning","idle"];
  const currentIdx = order.indexOf(phase);

  return (
    <div style={{
      padding: "12px 14px", borderRadius: 10,
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.07)",
    }}>
      <div style={{ fontSize: 10, color: "#475569", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>
        Pipeline de Execução
      </div>
      <div style={{ display: "flex", alignItems: "center" }}>
        {steps.map((step, i) => {
          const stepIdx = order.indexOf(step.id);
          const done = currentIdx > stepIdx;
          const active = phase === step.id;
          return (
            <React.Fragment key={step.id}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, gap: 4 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12,
                  background: active ? "rgba(0,212,255,0.2)" : done ? "rgba(0,255,136,0.15)" : "rgba(255,255,255,0.04)",
                  border: `2px solid ${active ? "#00d4ff" : done ? "#00ff88" : "rgba(255,255,255,0.08)"}`,
                  boxShadow: active ? "0 0 12px rgba(0,212,255,0.4)" : "none",
                  animation: active ? "pulse 1.5s infinite" : "none",
                }}>
                  {done ? "✓" : step.icon}
                </div>
                <span style={{
                  fontSize: 8,
                  color: active ? "#00d4ff" : done ? "#00ff88" : "#334155",
                  fontWeight: active ? 700 : 400,
                }}>
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div style={{
                  height: 1, flex: 1, marginBottom: 16,
                  background: done ? "rgba(0,255,136,0.3)" : "rgba(255,255,255,0.06)",
                }} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

function AgentCard({ agent }: { agent: any }) {
  const statusColors: Record<string, string> = {
    active: "#00ff88", training: "#aa00ff", studying: "#ff9800", idle: "#475569",
  };
  const statusLabels: Record<string, string> = {
    active: "Ativo", training: "Treinando", studying: "Estudando", idle: "Standby",
  };

  return (
    <div style={{
      padding: "12px 14px", borderRadius: 10,
      background: agent.status === "training"
        ? "rgba(170,0,255,0.06)"
        : agent.status === "active"
        ? "rgba(0,255,136,0.04)"
        : "rgba(255,255,255,0.03)",
      border: `1px solid ${agent.status === "training" ? "rgba(170,0,255,0.2)" : agent.status === "active" ? "rgba(0,255,136,0.12)" : "rgba(255,255,255,0.07)"}`,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>{agent.icon}</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>{agent.name}</div>
            <div style={{ fontSize: 9, color: "#475569", marginTop: 2 }}>{agent.specialty}</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <span style={{
            fontSize: 9, padding: "2px 7px", borderRadius: 10, fontWeight: 700,
            background: statusColors[agent.status] + "20",
            border: `1px solid ${statusColors[agent.status]}44`,
            color: statusColors[agent.status],
          }}>
            {statusLabels[agent.status]}
          </span>
          <span style={{ fontSize: 16, fontWeight: 800, color: "#00d4ff" }}>
            {agent.accuracy.toFixed(1)}%
          </span>
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        <AccuracyBar value={agent.accuracy} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, marginTop: 10 }}>
        <MiniStat label="Treinos" val={String(agent.trainingCycles)} color="#aa00ff" />
        <MiniStat label="Estudos" val={String(agent.studyCycles)} color="#00d4ff" />
        <MiniStat label="Melhora" val={`+${agent.improvementRate.toFixed(1)}%`} color="#00ff88" />
      </div>

      <div style={{ marginTop: 8, fontSize: 9, color: "#334155" }}>
        Última saída: {agent.lastOutput}
      </div>
    </div>
  );
}

// ── Componentes menores ─────────────────────────────────────

function QuickStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      background: "rgba(0,0,0,0.25)", borderRadius: 8, padding: "8px 10px", textAlign: "center",
      border: "1px solid rgba(255,255,255,0.05)",
    }}>
      <div style={{ fontSize: 15, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 9, color: "#475569", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function PhasePill({ phase, small }: { phase: SystemPhase; small?: boolean }) {
  const m = PHASE_META[phase] ?? { label: phase, color: "#64748b", icon: "?" };
  return (
    <span style={{
      fontSize: small ? 9 : 10, padding: small ? "2px 6px" : "3px 10px",
      borderRadius: 20, fontWeight: 700,
      background: m.color + "18", border: `1px solid ${m.color}44`, color: m.color,
      display: "inline-flex", alignItems: "center", gap: 4,
    }}>
      {m.icon} {m.label}
    </span>
  );
}

function WindowBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <span style={{
      fontSize: 9, padding: "2px 7px", borderRadius: 10, fontWeight: 700,
      background: active ? "rgba(0,255,136,0.15)" : "rgba(255,255,255,0.04)",
      border: `1px solid ${active ? "rgba(0,255,136,0.3)" : "rgba(255,255,255,0.08)"}`,
      color: active ? "#00ff88" : "#334155",
    }}>
      {active ? "● " : "○ "}{label}
    </span>
  );
}

function CtrlBtn({ icon, label, onClick, disabled, primary, danger }: any) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: "8px 14px", borderRadius: 8, border: "1px solid",
      fontSize: 11, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.4 : 1, transition: "all .15s",
      background: primary
        ? "linear-gradient(135deg, rgba(0,212,255,0.2), rgba(170,0,255,0.2))"
        : danger
        ? "rgba(255,68,68,0.1)"
        : "rgba(255,255,255,0.05)",
      borderColor: primary ? "rgba(0,212,255,0.4)" : danger ? "rgba(255,68,68,0.3)" : "rgba(255,255,255,0.1)",
      color: primary ? "#00d4ff" : danger ? "#ff4444" : "#94a3b8",
      display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
    }}>
      {icon} {label}
    </button>
  );
}

function SectionCard({ title, color, children }: any) {
  return (
    <div style={{
      padding: "12px 14px", borderRadius: 10,
      background: "rgba(255,255,255,0.03)",
      border: `1px solid ${color}22`,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 10,
        textTransform: "uppercase", letterSpacing: 0.5 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function StatLine({ label, value, highlight }: any) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0",
      borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <span style={{ fontSize: 10, color: "#64748b" }}>{label}</span>
      <span style={{ fontSize: 10, fontWeight: 700, color: highlight ? "#00ff88" : "#94a3b8" }}>{value}</span>
    </div>
  );
}

function MiniStat({ label, val, color = "#64748b" }: any) {
  return (
    <div style={{
      background: "rgba(0,0,0,0.2)", borderRadius: 6, padding: "6px 8px", textAlign: "center",
      border: "1px solid rgba(255,255,255,0.05)",
    }}>
      <div style={{ fontSize: 13, fontWeight: 800, color }}>{val}</div>
      <div style={{ fontSize: 8, color: "#334155", marginTop: 1 }}>{label}</div>
    </div>
  );
}

function AccuracyBar({ value }: { value: number }) {
  return (
    <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
      <div style={{
        height: "100%", width: `${value}%`, borderRadius: 2,
        background: value >= 90 ? "#00ff88" : value >= 75 ? "#00d4ff" : "#ffaa00",
        transition: "width 0.5s ease",
      }} />
    </div>
  );
}

function HealthBar({ value }: { value: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <div style={{ width: 50, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${value}%`,
          background: value >= 90 ? "#00ff88" : value >= 60 ? "#ffaa00" : "#ff4444",
        }} />
      </div>
      <span style={{ fontSize: 9, color: "#475569" }}>{value}%</span>
    </div>
  );
}

function ModuleStatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; label: string }> = {
    online:     { color: "#00ff88", label: "ONLINE" },
    processing: { color: "#00d4ff", label: "PROCESSANDO" },
    idle:       { color: "#475569", label: "STANDBY" },
    error:      { color: "#ff4444", label: "ERRO" },
  };
  const m = map[status] ?? map.idle;
  return (
    <span style={{
      fontSize: 8, padding: "2px 6px", borderRadius: 10, fontWeight: 700,
      background: m.color + "18", border: `1px solid ${m.color}40`, color: m.color,
    }}>
      {m.label}
    </span>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: "10px 12px", borderRadius: 8, fontSize: 11, color: "#64748b", lineHeight: 1.6,
      background: "rgba(0,212,255,0.04)", border: "1px solid rgba(0,212,255,0.1)",
    }}>
      {children}
    </div>
  );
}

function TimeRow({ label, field, value, onChange }: any) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <span style={{ fontSize: 11, color: "#64748b" }}>{label}</span>
      <input type="time" value={value}
        onChange={e => onChange(field, e.target.value)}
        style={{
          background: "rgba(0,0,0,0.3)", border: "1px solid rgba(0,212,255,0.2)",
          borderRadius: 6, padding: "3px 8px", color: "#00d4ff", fontSize: 11,
          fontFamily: "inherit", outline: "none",
        }} />
    </div>
  );
}

function RuleRow({ label, desc, on, onChange, locked }: any) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "8px 10px", borderRadius: 8,
      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
    }}>
      <div>
        <div style={{ fontSize: 11, color: "#e2e8f0" }}>{label}</div>
        <div style={{ fontSize: 9, color: "#475569", marginTop: 2 }}>{desc}</div>
      </div>
      <button onClick={() => !locked && onChange(!on)} style={{
        width: 36, height: 20, borderRadius: 10, border: "1px solid",
        background: on ? "rgba(0,255,136,0.25)" : "rgba(255,255,255,0.05)",
        borderColor: on ? "rgba(0,255,136,0.5)" : "rgba(255,255,255,0.1)",
        cursor: locked ? "not-allowed" : "pointer",
        position: "relative",
      }}>
        <span style={{
          position: "absolute", top: 2, width: 14, height: 14, borderRadius: "50%",
          background: on ? "#00ff88" : "#334155",
          left: on ? "calc(100% - 17px)" : 2,
          transition: "all .2s",
        }} />
      </button>
    </div>
  );
}

function TrendChart({ data }: { data: number[] }) {
  const min = Math.min(...data) - 2;
  const max = Math.max(...data) + 2;
  const range = max - min || 1;
  const w = 240, h = 50;

  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - ((v - min) / range) * h,
  }));

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="trendGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#aa00ff" />
          <stop offset="100%" stopColor="#00d4ff" />
        </linearGradient>
      </defs>
      <path d={path} fill="none" stroke="url(#trendGrad)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill="#00d4ff" />
      ))}
    </svg>
  );
}

const smallBtnStyle = (color: string) => ({
  padding: "6px 14px", borderRadius: 8,
  background: color + "15", border: `1px solid ${color}33`,
  color, fontSize: 10, fontWeight: 700, cursor: "pointer",
});
