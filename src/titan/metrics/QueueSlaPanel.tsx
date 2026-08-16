// ============================================================
// QueueSlaPanel.tsx — SLA / Métricas em tempo real + histórico
// por módulo para filas e DLQ: severidade, latência (avg/p95),
// memória e taxa de falhas. Alimentado por titanTelemetry,
// durableQueue e guardianAlerts (IA de diagnóstico integrada).
// ============================================================
import { useEffect, useMemo, useState } from "react";
import { titanTelemetry, SlaSample } from "./titanTelemetry";
import { durableQueue } from "@/titan/queue/durableQueue";
import { queueConfig } from "@/titan/queue/queueConfig";
import { getAlerts, subscribeAlerts, GuardianAlert, THRESHOLDS } from "@/titan/alerts/guardianAlerts";
import {
  evaluateSlaAlerts, startSlaWatchdog, getSlaBreaches, subscribeSlaBreaches,
  clearSlaBreaches, slaBreachesByModule, slaBreachesByConcurso, SlaBreach, SLA_THRESHOLDS,
} from "@/titan/alerts/slaAlerts";

const SEV_COLOR: Record<string, string> = {
  info: "#00d4ff", warn: "#ffaa00", error: "#ff6b6b", critical: "#ff2222", ok: "#00ff88",
};

type Sev = "ok" | "info" | "warn" | "error" | "critical";

function sevOf(value: number, warn: number, error: number): Sev {
  if (value >= error) return "error";
  if (value >= warn) return "warn";
  return "ok";
}

function memoryPct(): number | null {
  try {
    const m = (performance as unknown as { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
    if (!m?.jsHeapSizeLimit) return null;
    return Math.round((m.usedJSHeapSize / m.jsHeapSizeLimit) * 100);
  } catch { return null; }
}

function Spark({ values, color, height = 34 }: { values: number[]; color: string; height?: number }) {
  if (!values.length) return <div style={{ height, fontSize: 9, color: "#475569" }}>sem amostras</div>;
  const max = Math.max(...values, 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 1, height }}>
      {values.slice(-60).map((v, i) => (
        <div key={i} title={String(v)} style={{
          flex: 1, minWidth: 2, borderRadius: 1,
          height: `${Math.max(2, (v / max) * height)}px`,
          background: color, opacity: 0.35 + 0.65 * (v / max),
        }} />
      ))}
    </div>
  );
}

function Kpi({ label, value, sub, sev }: { label: string; value: string; sub?: string; sev: Sev }) {
  const c = SEV_COLOR[sev];
  return (
    <div style={{
      padding: 10, borderRadius: 10, background: "rgba(255,255,255,0.03)",
      border: `1px solid ${c}33`, boxShadow: `0 0 14px ${c}12`,
    }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: c }}>{value}</div>
      <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 8, color: "#475569", marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

export function QueueSlaPanel() {
  const [, setTick] = useState(0);
  const [alerts, setAlerts] = useState<GuardianAlert[]>(getAlerts());
  const [mem, setMem] = useState<number | null>(memoryPct());
  const [breaches, setBreaches] = useState<SlaBreach[]>(getSlaBreaches());

  useEffect(() => {
    const unTel = titanTelemetry.subscribe(() => setTick(t => t + 1));
    const unQ = durableQueue.subscribe(() => setTick(t => t + 1));
    const unA = subscribeAlerts(setAlerts);
    const unB = subscribeSlaBreaches(setBreaches);
    const it = setInterval(() => { setMem(memoryPct()); setTick(t => t + 1); }, 2_000);
    // Alertas automáticos de SLA: avaliação imediata + watchdog contínuo
    evaluateSlaAlerts();
    const stopWatchdog = startSlaWatchdog(15_000);
    return () => { unTel(); unQ(); unA(); unB(); clearInterval(it); stopWatchdog(); };
  }, []);

  const stats = durableQueue.stats();
  const counters = titanTelemetry.getCounters();
  const sla: SlaSample[] = titanTelemetry.getSla();
  const latency = titanTelemetry.latencyByKind();
  const hot = titanTelemetry.hotTraces(6);

  const execs = counters.jobsOk + counters.jobsError;
  const failRate = execs ? (counters.jobsError / execs) * 100 : 0;
  const retryRate = execs ? (counters.retries / execs) * 100 : 0;
  const p95 = latency.length ? Math.max(...latency.map(l => l.p95Ms)) : 0;
  const avg = latency.length ? Math.round(latency.reduce((a, b) => a + b.avgMs, 0) / latency.length) : 0;

  const sevQueue = sevOf(stats.pending, THRESHOLDS.queueWarn, THRESHOLDS.queueError);
  const sevDlq = sevOf(stats.dead, THRESHOLDS.dlqWarn, THRESHOLDS.dlqError);
  const sevLat = sevOf(p95, THRESHOLDS.latencyWarnMs, THRESHOLDS.latencyErrorMs);
  const sevMem: Sev = mem == null ? "info" : sevOf(mem, THRESHOLDS.memoryWarnPct, THRESHOLDS.memoryErrorPct);
  const sevFail = sevOf(failRate, 5, 20);

  // Histórico por módulo (fila/tipo de tarefa) com severidade agregada
  const modulos = useMemo(() => {
    const types = new Set<string>([
      ...queueConfig.types().filter(t => t !== "*"),
      ...stats.jobs.map(j => j.type),
      ...stats.dlq.map(d => d.type),
    ]);
    return Array.from(types).map(type => {
      const pol = queueConfig.policy(type);
      const pend = stats.jobs.filter(j => j.type === type);
      const dead = stats.dlq.filter(d => d.type === type);
      const spans = titanTelemetry.getSpans().filter(s => s.name.includes(type));
      const done = spans.filter(s => s.status === "ok").length;
      const err = spans.filter(s => s.status === "error").length;
      const durs = spans.map(s => s.durationMs ?? 0).filter(Boolean).sort((a, b) => a - b);
      const avgMs = durs.length ? Math.round(durs.reduce((a, b) => a + b, 0) / durs.length) : 0;
      const p95Ms = durs.length ? Math.round(durs[Math.floor(durs.length * 0.95)] ?? durs[durs.length - 1]) : 0;
      const fail = done + err ? (err / (done + err)) * 100 : 0;
      const sev: Sev = dead.length >= THRESHOLDS.dlqError || fail >= 20 ? "error"
        : dead.length >= THRESHOLDS.dlqWarn || fail >= 5 || pend.length >= THRESHOLDS.queueWarn ? "warn"
        : "ok";
      return { type, pend: pend.length, dead: dead.length, done, err, avgMs, p95Ms, fail, sev, limite: pol.dlqLimit, tentativas: pol.maxAttempts };
    }).sort((a, b) => b.dead - a.dead || b.fail - a.fail);
  }, [stats.jobs, stats.dlq]);

  const diagnostico = (() => {
    if (sevDlq === "error") return "🔴 DLQ acima do limite — reprocessar ou revisar handler do tipo com mais falhas.";
    if (sevLat === "error") return `🔴 Gargalo de latência (p95 ${p95}ms) em "${latency[0]?.kind ?? "-"}" — reduzir lote/paralelismo.`;
    if (sevFail === "warn" || sevFail === "error") return `🟠 Taxa de falhas ${failRate.toFixed(1)}% — backoff em ação, monitorando regressão.`;
    if (sevQueue !== "ok") return "🟠 Fila acumulando — scheduler em ritmo acelerado para drenar.";
    if (sevMem === "warn" || sevMem === "error") return "🟠 Memória elevada — coletor reduzindo retenção de spans.";
    return "🟢 SLA saudável — latência, filas, memória e falhas dentro dos limites institucionais.";
  })();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{
        padding: 10, borderRadius: 10, fontSize: 10, color: "#cbd5e1",
        background: "rgba(0,212,255,0.04)", border: "1px solid rgba(0,212,255,0.18)",
      }}>
        <b style={{ color: "#00d4ff" }}>SLA EM TEMPO REAL · IA DE DIAGNÓSTICO</b>
        <div style={{ marginTop: 4 }}>{diagnostico}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: 8 }}>
        <Kpi label="Fila pendente" value={String(stats.pending)} sub={`sync ${stats.byQueue.sync} · conf ${stats.byQueue.conference}`} sev={sevQueue} />
        <Kpi label="DLQ" value={String(stats.dead)} sub={`${Object.keys(stats.byTypeDead).length} tipo(s)`} sev={sevDlq} />
        <Kpi label="Latência p95" value={`${p95}ms`} sub={`média ${avg}ms`} sev={sevLat} />
        <Kpi label="Taxa de falhas" value={`${failRate.toFixed(1)}%`} sub={`${counters.jobsError}/${execs || 0} execuções`} sev={sevFail} />
        <Kpi label="Retries" value={`${retryRate.toFixed(1)}%`} sub={`${counters.retries} tentativas`} sev={sevOf(retryRate, 25, 60)} />
        <Kpi label="Memória JS" value={mem == null ? "n/d" : `${mem}%`} sub="heap do device" sev={sevMem} />
        <Kpi label="Dedupe" value={String(counters.dedupeHits + counters.duplicates)} sub={`${counters.reprocessos} reprocesso(s)`} sev="info" />
        <Kpi label="Amostras SLA" value={String(sla.length)} sub="janela contínua 10s" sev="info" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 8 }}>
        <Box title="⏱️ Latência de sync (histórico)" color="#00d4ff">
          <Spark values={sla.map(s => s.syncMs)} color="#00d4ff" />
        </Box>
        <Box title="📦 Fila pendente (histórico)" color="#ffaa00">
          <Spark values={sla.map(s => s.pending)} color="#ffaa00" />
        </Box>
        <Box title="☠️ Volume da DLQ (histórico)" color="#ff6b6b">
          <Spark values={sla.map(s => s.dlqVolume)} color="#ff6b6b" />
        </Box>
        <Box title="♻️ Taxa de retry (histórico)" color="#aa00ff">
          <Spark values={sla.map(s => Math.round(s.retryRate * 100))} color="#aa00ff" />
        </Box>
      </div>

      <Box title="🧩 Histórico por módulo · severidade, latência e falhas" color="#00ff88">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9 }}>
            <thead>
              <tr style={{ color: "#64748b", textAlign: "left" }}>
                <th style={{ padding: 4 }}>Módulo/Tarefa</th>
                <th style={{ padding: 4 }}>Sev</th>
                <th style={{ padding: 4 }}>Fila</th>
                <th style={{ padding: 4 }}>DLQ</th>
                <th style={{ padding: 4 }}>OK</th>
                <th style={{ padding: 4 }}>Erros</th>
                <th style={{ padding: 4 }}>Falhas</th>
                <th style={{ padding: 4 }}>Média</th>
                <th style={{ padding: 4 }}>p95</th>
                <th style={{ padding: 4 }}>Política</th>
              </tr>
            </thead>
            <tbody>
              {modulos.map(m => (
                <tr key={m.type} style={{ borderTop: "1px solid rgba(255,255,255,0.06)", color: "#cbd5e1" }}>
                  <td style={{ padding: 4, fontWeight: 700 }}>{m.type}</td>
                  <td style={{ padding: 4, color: SEV_COLOR[m.sev], fontWeight: 800 }}>{m.sev.toUpperCase()}</td>
                  <td style={{ padding: 4 }}>{m.pend}</td>
                  <td style={{ padding: 4, color: m.dead ? "#ff6b6b" : "#475569" }}>{m.dead}</td>
                  <td style={{ padding: 4, color: "#00ff88" }}>{m.done}</td>
                  <td style={{ padding: 4, color: m.err ? "#ffaa00" : "#475569" }}>{m.err}</td>
                  <td style={{ padding: 4 }}>{m.fail.toFixed(1)}%</td>
                  <td style={{ padding: 4 }}>{m.avgMs}ms</td>
                  <td style={{ padding: 4 }}>{m.p95Ms}ms</td>
                  <td style={{ padding: 4, color: "#64748b" }}>{m.tentativas}x · DLQ≤{m.limite}</td>
                </tr>
              ))}
              {!modulos.length && (
                <tr><td colSpan={10} style={{ padding: 8, color: "#475569" }}>Sem execuções registradas ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Box>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 8 }}>
        <Box title="🔥 Gargalos por modalidade+concurso" color="#ff9800">
          {hot.length ? hot.map(h => (
            <div key={h.traceKey} style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#cbd5e1", padding: "2px 0" }}>
              <span>{h.traceKey}</span>
              <span style={{ color: h.errors ? "#ff6b6b" : "#00ff88" }}>{h.totalMs}ms · {h.spans} spans · {h.errors} err</span>
            </div>
          )) : <div style={{ fontSize: 9, color: "#475569" }}>Nenhum trace correlacionado ainda.</div>}
        </Box>
        <Box title="🚨 Severidade por módulo (Guardian)" color="#ff6b6b">
          {alerts.length ? Object.entries(alerts.reduce<Record<string, GuardianAlert[]>>((a, x) => { (a[x.modulo] ??= []).push(x); return a; }, {}))
            .map(([mod, list]) => {
              const worst = list.reduce<GuardianAlert>((w, x) => {
                const order = { info: 0, warn: 1, error: 2, critical: 3 } as const;
                return order[x.severidade] > order[w.severidade] ? x : w;
              }, list[0]);
              return (
                <div key={mod} style={{ display: "flex", justifyContent: "space-between", fontSize: 9, padding: "2px 0" }}>
                  <span style={{ color: "#cbd5e1" }}>{mod}</span>
                  <span style={{ color: SEV_COLOR[worst.severidade] }}>{worst.severidade.toUpperCase()} · {list.length}</span>
                </div>
              );
            }) : <div style={{ fontSize: 9, color: "#00ff88" }}>● Nenhuma degradação detectada.</div>}
        </Box>
      </div>

      <Box title="🛰️ Alertas automáticos de SLA · histórico por módulo e concurso" color="#ffaa00">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontSize: 8, color: "#475569" }}>
            limiares: p95 {SLA_THRESHOLDS.p95WarnMs}/{SLA_THRESHOLDS.p95ErrorMs}/{SLA_THRESHOLDS.p95CriticalMs}ms ·
            falhas {SLA_THRESHOLDS.failWarnPct}/{SLA_THRESHOLDS.failErrorPct}/{SLA_THRESHOLDS.failCriticalPct}% ·
            retry {SLA_THRESHOLDS.retryWarnPct}/{SLA_THRESHOLDS.retryErrorPct}%
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => evaluateSlaAlerts()} style={btnStyle("#00d4ff")}>🔍 Avaliar agora</button>
            {breaches.length > 0 && (
              <button onClick={clearSlaBreaches} style={btnStyle("#94a3b8")}>limpar</button>
            )}
          </div>
        </div>
        {!breaches.length ? (
          <div style={{ fontSize: 9, color: "#00ff88" }}>● Nenhuma violação de SLA registrada.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div>
              <div style={{ fontSize: 9, color: "#64748b", marginBottom: 4 }}>POR MÓDULO</div>
              {Object.entries(slaBreachesByModule()).map(([mod, list]) => (
                <div key={mod} style={{ marginBottom: 4 }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: "#e2e8f0" }}>{mod} · {list.length}</div>
                  {[...list].reverse().slice(0, 4).map(b => (
                    <div key={b.id} style={{ fontSize: 8, color: "#cbd5e1" }}>
                      <span style={{ color: SEV_COLOR[b.severidade], fontWeight: 700 }}>[{b.severidade}]</span>{" "}
                      <span style={{ color: "#64748b" }}>{new Date(b.at).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span>{" "}
                      {b.metrica} {b.valor} (lim {b.limite}, n={b.amostras}) — {b.mensagem}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 9, color: "#64748b", marginBottom: 4 }}>POR CONCURSO</div>
              {Object.keys(slaBreachesByConcurso()).length === 0 ? (
                <div style={{ fontSize: 8, color: "#475569" }}>Sem correlação por concurso.</div>
              ) : Object.entries(slaBreachesByConcurso()).map(([trace, list]) => (
                <div key={trace} style={{ marginBottom: 4 }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: "#ff9800" }}>{trace} · {list.length}</div>
                  {[...list].reverse().slice(0, 4).map(b => (
                    <div key={b.id} style={{ fontSize: 8, color: "#cbd5e1" }}>
                      <span style={{ color: SEV_COLOR[b.severidade], fontWeight: 700 }}>[{b.severidade}]</span>{" "}
                      {b.modulo} · {b.metrica} {b.valor}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </Box>
    </div>
  );
}

function btnStyle(color: string): React.CSSProperties {
  return {
    background: `${color}1a`, border: `1px solid ${color}44`, color,
    borderRadius: 6, fontSize: 9, fontWeight: 700, padding: "4px 8px", cursor: "pointer",
    fontFamily: "inherit",
  };
}

function Box({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{
      padding: 10, borderRadius: 10, background: "rgba(255,255,255,0.02)",
      border: `1px solid ${color}22`,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color, marginBottom: 6 }}>{title}</div>
      {children}
    </div>
  );
}
