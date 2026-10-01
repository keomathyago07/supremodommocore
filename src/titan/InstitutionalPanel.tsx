// ============================================================
// InstitutionalPanel.tsx — Aba INSTITUCIONAL do TitanCoreDashboard
// Políticas de fila (retry exponencial + limites de DLQ por tipo),
// limiares de SLA e regras de reprocessamento — todos visíveis e
// editáveis, com versionamento, rollback e auditoria automática.
// ============================================================
import React, { useEffect, useMemo, useState } from "react";
import { queueConfig, DEFAULT_POLICY, TaskPolicy } from "./queue/queueConfig";
import {
  SLA_THRESHOLDS, setSlaThresholds, subscribeSlaThresholds, SlaThresholds,
} from "./alerts/slaAlerts";
import { durableQueue } from "./queue/durableQueue";

interface ReprocessRules {
  janelaHoras: number;        // janela máxima para reprocessar um concurso
  exigirMotivo: boolean;      // motivo obrigatório na auditoria
  maxPorCiclo: number;        // limite de reprocessos por ciclo
  bloquearDuplicado: boolean; // idempotência forçada por loteria+concurso
  autoAposFalha: boolean;     // reprocessar automaticamente após falha da conferência
}

const LS_RULES = "titan.reprocess.rules.v1";
const DEFAULT_RULES: ReprocessRules = {
  janelaHoras: 72,
  exigirMotivo: true,
  maxPorCiclo: 5,
  bloquearDuplicado: true,
  autoAposFalha: true,
};

function readRules(): ReprocessRules {
  try {
    const raw = localStorage.getItem(LS_RULES);
    return raw ? { ...DEFAULT_RULES, ...(JSON.parse(raw) as ReprocessRules) } : { ...DEFAULT_RULES };
  } catch { return { ...DEFAULT_RULES }; }
}

export function InstitutionalPanel() {
  const [cfg, setCfg] = useState(queueConfig.get());
  const [tipo, setTipo] = useState<string>("*");
  const [motivo, setMotivo] = useState("ajuste institucional");
  const [sla, setSla] = useState<SlaThresholds>({ ...SLA_THRESHOLDS });
  const [rules, setRules] = useState<ReprocessRules>(readRules);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => queueConfig.subscribe(() => setCfg({ ...queueConfig.get() })), []);
  useEffect(() => subscribeSlaThresholds(t => setSla({ ...t })), []);

  const policy = useMemo<TaskPolicy>(() => queueConfig.policy(tipo), [cfg, tipo]);
  const stats = durableQueue.stats();

  function patchPolicy(patch: Partial<TaskPolicy>) {
    queueConfig.update(tipo, patch, motivo);
    flash(`✅ Política "${tipo}" salva (v${queueConfig.get().version})`);
  }
  function salvarSla(patch: Partial<SlaThresholds>) {
    setSlaThresholds(patch);
    flash("✅ Limiares de SLA aplicados em tempo real");
  }
  function salvarRules(patch: Partial<ReprocessRules>) {
    const next = { ...rules, ...patch };
    setRules(next);
    try { localStorage.setItem(LS_RULES, JSON.stringify(next)); } catch { /* quota */ }
    flash("✅ Regras de reprocessamento atualizadas");
  }
  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(null), 3500); }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {msg && (
        <div style={{
          fontSize: 9, fontWeight: 700, color: "#00ff88", padding: "6px 8px", borderRadius: 6,
          background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.3)",
        }}>{msg}</div>
      )}

      <Box c="#00d4ff" title={`⚙️ Políticas de fila · v${cfg.version} · ${cfg.motivo}`}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 9, color: "#94a3b8" }}>Tipo de tarefa</span>
          <select value={tipo} onChange={e => setTipo(e.target.value)} style={inputStyle(120)}>
            {queueConfig.types().map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <span style={{ fontSize: 9, color: "#94a3b8" }}>Motivo</span>
          <input value={motivo} onChange={e => setMotivo(e.target.value)} style={inputStyle(200)} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 8 }}>
          <Num l="Tentativas máx." v={policy.maxAttempts} min={1} max={20}
            onSave={v => patchPolicy({ maxAttempts: v })} />
          <Num l="Delay base (ms)" v={policy.baseDelayMs} min={200} max={60_000} step={200}
            onSave={v => patchPolicy({ baseDelayMs: v })} />
          <Num l="Delay máx. (ms)" v={policy.maxDelayMs} min={1_000} max={1_800_000} step={1_000}
            onSave={v => patchPolicy({ maxDelayMs: v })} />
          <Num l="Jitter (0–1)" v={policy.jitter} min={0} max={1} step={0.05}
            onSave={v => patchPolicy({ jitter: v })} />
          <Num l="Limite DLQ" v={policy.dlqLimit} min={10} max={5_000} step={10}
            onSave={v => patchPolicy({ dlqLimit: v })} />
          <Toggle l="Auto-requeue da DLQ" v={policy.autoRequeueDlq}
            onChange={v => patchPolicy({ autoRequeueDlq: v })} />
        </div>

        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
          <button style={btn("#ffaa00")} onClick={() => { queueConfig.resetDefaults(motivo); flash("♻️ Políticas restauradas aos padrões"); }}>
            ♻️ Restaurar padrões
          </button>
          {queueConfig.history().slice(0, 4).map(h => (
            <button key={h.version} style={btn("#aa00ff")} onClick={() => { queueConfig.rollback(h.version, motivo); flash(`⏪ Rollback para v${h.version}`); }}>
              ⏪ v{h.version}
            </button>
          ))}
        </div>

        <div style={{ fontSize: 8, color: "#475569", marginTop: 8 }}>
          Padrão de fábrica: {DEFAULT_POLICY.maxAttempts} tentativas · base {DEFAULT_POLICY.baseDelayMs}ms ·
          teto {DEFAULT_POLICY.maxDelayMs}ms · DLQ {DEFAULT_POLICY.dlqLimit}. Toda alteração é versionada e auditada.
        </div>
      </Box>

      <Box c="#ff9800" title="📈 Limiares de SLA (aplicados em tempo real)">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 8 }}>
          <Num l="p95 aviso (ms)" v={sla.p95WarnMs} min={100} max={120_000} step={100} onSave={v => salvarSla({ p95WarnMs: v })} />
          <Num l="p95 erro (ms)" v={sla.p95ErrorMs} min={200} max={240_000} step={100} onSave={v => salvarSla({ p95ErrorMs: v })} />
          <Num l="p95 crítico (ms)" v={sla.p95CriticalMs} min={500} max={480_000} step={500} onSave={v => salvarSla({ p95CriticalMs: v })} />
          <Num l="Falhas aviso (%)" v={sla.failWarnPct} min={1} max={100} onSave={v => salvarSla({ failWarnPct: v })} />
          <Num l="Falhas erro (%)" v={sla.failErrorPct} min={1} max={100} onSave={v => salvarSla({ failErrorPct: v })} />
          <Num l="Falhas crítico (%)" v={sla.failCriticalPct} min={1} max={100} onSave={v => salvarSla({ failCriticalPct: v })} />
          <Num l="Retry aviso (%)" v={sla.retryWarnPct} min={1} max={100} onSave={v => salvarSla({ retryWarnPct: v })} />
          <Num l="Retry erro (%)" v={sla.retryErrorPct} min={1} max={100} onSave={v => salvarSla({ retryErrorPct: v })} />
          <Num l="Amostra mínima" v={sla.minSamples} min={1} max={50} onSave={v => salvarSla({ minSamples: v })} />
        </div>
      </Box>

      <Box c="#00ff88" title="🔁 Regras de reprocessamento">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 8 }}>
          <Num l="Janela (horas)" v={rules.janelaHoras} min={1} max={720} onSave={v => salvarRules({ janelaHoras: v })} />
          <Num l="Máx. por ciclo" v={rules.maxPorCiclo} min={1} max={50} onSave={v => salvarRules({ maxPorCiclo: v })} />
          <Toggle l="Motivo obrigatório" v={rules.exigirMotivo} onChange={v => salvarRules({ exigirMotivo: v })} />
          <Toggle l="Bloquear duplicado (idempotência)" v={rules.bloquearDuplicado} onChange={v => salvarRules({ bloquearDuplicado: v })} />
          <Toggle l="Auto-reprocessar após falha" v={rules.autoAposFalha} onChange={v => salvarRules({ autoAposFalha: v })} />
        </div>
        <div style={{ fontSize: 8, color: "#475569", marginTop: 8 }}>
          Fila atual: {stats.pending} pendente(s) · {stats.dead} morta(s) · {stats.dlq.length} na DLQ.
          Reprocessos respeitam a idempotência por loteria+concurso e são gravados na auditoria.
        </div>
      </Box>

      <Box c="#aa00ff" title="🔐 Governança de dados (banco)">
        <div style={{ fontSize: 9, color: "#cbd5e1", lineHeight: 1.7 }}>
          Tabelas de previsão, resultados, próximo concurso, calendário e controle de ingestão estão em
          modo <b>somente leitura</b> no app: a gravação é exclusiva dos processos internos do servidor
          (service_role), com RLS ativa e GRANTs restritos. Nenhuma escrita direta pelo cliente é aceita.
        </div>
      </Box>
    </div>
  );
}

function inputStyle(w: number): React.CSSProperties {
  return {
    width: w, background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.12)",
    color: "#e2e8f0", borderRadius: 6, fontSize: 9, padding: "4px 6px", fontFamily: "inherit",
  };
}
function btn(color: string): React.CSSProperties {
  return {
    background: `${color}1a`, border: `1px solid ${color}44`, color, borderRadius: 6,
    fontSize: 9, fontWeight: 700, padding: "4px 8px", cursor: "pointer", fontFamily: "inherit",
  };
}

function Num({ l, v, min, max, step = 1, onSave }: {
  l: string; v: number; min: number; max: number; step?: number; onSave: (v: number) => void;
}) {
  const [val, setVal] = useState(String(v));
  useEffect(() => setVal(String(v)), [v]);
  const dirty = Number(val) !== v;
  return (
    <div style={{ padding: 8, borderRadius: 8, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ fontSize: 8, color: "#94a3b8", marginBottom: 4 }}>{l}</div>
      <div style={{ display: "flex", gap: 4 }}>
        <input type="number" value={val} min={min} max={max} step={step}
          onChange={e => setVal(e.target.value)} style={inputStyle(78)} />
        <button style={{ ...btn(dirty ? "#00ff88" : "#475569"), opacity: dirty ? 1 : 0.5 }}
          disabled={!dirty}
          onClick={() => {
            const n = Math.min(max, Math.max(min, Number(val) || min));
            setVal(String(n)); onSave(n);
          }}>salvar</button>
      </div>
    </div>
  );
}

function Toggle({ l, v, onChange }: { l: string; v: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!v)} style={{
      textAlign: "left", padding: 8, borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
      background: "rgba(0,0,0,0.3)", border: `1px solid ${v ? "rgba(0,255,136,0.35)" : "rgba(255,255,255,0.08)"}`,
    }}>
      <div style={{ fontSize: 8, color: "#94a3b8", marginBottom: 4 }}>{l}</div>
      <div style={{ fontSize: 10, fontWeight: 800, color: v ? "#00ff88" : "#64748b" }}>
        {v ? "ATIVO" : "INATIVO"}
      </div>
    </button>
  );
}

function Box({ c, title, children }: { c: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: 10, borderRadius: 10, background: "rgba(255,255,255,0.02)", border: `1px solid ${c}33` }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: c, marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

export default InstitutionalPanel;
