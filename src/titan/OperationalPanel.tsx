// Dashboard Operacional — status de todos os subsistemas.
import { useEffect, useState } from "react";
import { persistentCore } from "./persistentCore";
import { titanGuardian } from "./titanGuardian";
import { useTitanSync } from "./useTitanSync";
import { useTitanCore } from "./titanCoreStore";
import { dentroDaJanelaOficial } from "./conference";
import { durableQueue } from "./queue/durableQueue";
import { titanPersistence } from "./state/titanPersistence";
import { getAlerts, subscribeAlerts, clearAlerts, GuardianAlert } from "./alerts/guardianAlerts";

const SEV_COLOR: Record<string, string> = { info: "#00d4ff", warn: "#ffaa00", error: "#ff6b6b", critical: "#ff2222" };

function AlertsSection() {
  const [alerts, setAlerts] = useState<GuardianAlert[]>(getAlerts());
  useEffect(() => { const un = subscribeAlerts(setAlerts); return () => { un(); }; }, []);
  const byModule = alerts.reduce<Record<string, GuardianAlert[]>>((a, x) => { (a[x.modulo] ??= []).push(x); return a; }, {});
  const qs = durableQueue.stats();
  const st = titanPersistence.get();

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 0 8px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#ffaa00" }}>🚨 ALERTAS DO TITANGUARDIAN · HISTÓRICO POR MÓDULO</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 10, color: "#94a3b8" }}>
            ciclos {st.cycles} · fila {qs.pending} · DLQ {qs.dead} · conferências {st.conferenciasConcluidas.length}
          </span>
          {qs.dead > 0 && (
            <button onClick={() => durableQueue.requeueDlq()} style={{
              background: "rgba(255,68,68,0.12)", border: "1px solid rgba(255,68,68,0.3)",
              color: "#ff6b6b", borderRadius: 6, fontSize: 9, fontWeight: 700, padding: "4px 8px", cursor: "pointer",
            }}>♻️ Reprocessar DLQ</button>
          )}
          {alerts.length > 0 && (
            <button onClick={clearAlerts} style={{
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
              color: "#94a3b8", borderRadius: 6, fontSize: 9, fontWeight: 700, padding: "4px 8px", cursor: "pointer",
            }}>limpar</button>
          )}
        </div>
      </div>
      {!alerts.length ? (
        <div style={{ fontSize: 10, color: "#00ff88", padding: 10, background: "rgba(0,255,136,0.05)", border: "1px solid rgba(0,255,136,0.15)", borderRadius: 8 }}>
          ● Nenhuma degradação detectada — latência, memória, filas e reconexões dentro dos limites.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 8 }}>
          {Object.entries(byModule).map(([mod, list]) => (
            <div key={mod} style={{ padding: 10, borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#e2e8f0", marginBottom: 6 }}>
                {mod.toUpperCase()} · {list.length}
              </div>
              <div style={{ maxHeight: 130, overflow: "auto", display: "grid", gap: 4 }}>
                {[...list].reverse().slice(0, 12).map(a => (
                  <div key={a.id} style={{ fontSize: 9, color: "#cbd5e1" }}>
                    <span style={{ color: SEV_COLOR[a.severidade] ?? "#94a3b8", fontWeight: 700 }}>[{a.severidade}]</span>{" "}
                    <span style={{ color: "#64748b" }}>
                      {new Date(a.at).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                    </span>{" "}
                    {a.mensagem}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const LOTERIAS = [
  "megasena","quina","lotofacil","lotomania",
  "timemania","duplasena","diadesorte","supersete","maismilionaria",
];

function StatusDot({ ok, warn }: { ok: boolean; warn?: boolean }) {
  const color = ok ? "#00ff88" : warn ? "#ffaa00" : "#ff4444";
  return <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 5, background: color, boxShadow: `0 0 8px ${color}` }} />;
}

function Card({ title, ok, warn, detail }: { title: string; ok: boolean; warn?: boolean; detail?: string }) {
  return (
    <div style={{
      padding: 12, borderRadius: 10, background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.08)", minWidth: 160,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <StatusDot ok={ok} warn={warn} />
        <span style={{ fontSize: 11, fontWeight: 700, color: "#e2e8f0" }}>{title}</span>
      </div>
      {detail && <div style={{ fontSize: 10, color: "#94a3b8" }}>{detail}</div>}
    </div>
  );
}

export function OperationalPanel() {
  const sync = useTitanSync();
  const titan = useTitanCore();
  const [, tick] = useState(0);
  const [mem, setMem] = useState<{ used: number; total: number } | null>(null);

  useEffect(() => {
    const t = setInterval(() => {
      tick(x => x + 1);
      const p = (performance as any).memory;
      if (p) setMem({ used: Math.round(p.usedJSHeapSize/1024/1024), total: Math.round(p.jsHeapSizeLimit/1024/1024) });
    }, 2000);
    return () => clearInterval(t);
  }, []);

  const stats = persistentCore.stats();
  const guardian = titanGuardian.getLastReport();
  const lastTick = Number(localStorage.getItem("titan.persistent.lastTick") ?? 0);
  const sinceLastMs = lastTick ? Date.now() - lastTick : null;

  const avgLatency = Object.values(stats.stages).reduce((a, s) => a + s.lastMs, 0) /
    Math.max(1, Object.keys(stats.stages).length);

  return (
    <div style={{ fontFamily: "'JetBrains Mono',monospace", color: "#e2e8f0" }}>
      <div style={{ marginBottom: 12, fontSize: 12, fontWeight: 800, color: "#00d4ff" }}>
        🛰️ DASHBOARD OPERACIONAL — TitanDommoCore Persistent Core
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 10, marginBottom: 16 }}>
        <Card title="Scheduler"  ok={persistentCore.isRunning()} detail={`Tick #${stats.tickCount}`} />
        <Card title="Guardian"   ok={titanGuardian.isRunning()} detail={guardian ? "monitorando" : "iniciando"} />
        <Card title="API Caixa"  ok={!!guardian?.api} />
        <Card title="Banco"      ok={!!guardian?.banco} />
        <Card title="Realtime"   ok={sync.status === "connected"} warn={sync.status === "connecting"} detail={sync.status} />
        <Card title="Pipeline"   ok={titan.isOnline} />
        <Card title="Conferência" ok={dentroDaJanelaOficial()} warn detail={dentroDaJanelaOficial() ? "janela ativa" : "fora janela"} />
        <Card title="Cache"      ok detail={`${Object.keys(stats.stages).length} stages`} />
        <Card title="Sync msg"   ok={sync.lastEventAt !== null} detail={sync.lastEventAt ? `${Math.round((Date.now()-sync.lastEventAt)/1000)}s atrás` : "—"} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 10, marginBottom: 16 }}>
        <Card title="Último tick" ok={sinceLastMs !== null && sinceLastMs < 90_000} detail={sinceLastMs !== null ? `${Math.round(sinceLastMs/1000)}s` : "—"} />
        <Card title="Latência média" ok={avgLatency < 500} warn={avgLatency < 1500} detail={`${avgLatency.toFixed(0)} ms`} />
        <Card title="Memória JS" ok={!!mem && mem.used/mem.total < 0.8} detail={mem ? `${mem.used}/${mem.total} MB` : "n/a"} />
        <Card title="Erro recente" ok={!stats.lastError} detail={stats.lastError ?? "sem erros"} />
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, color: "#00d4ff", margin: "12px 0 8px" }}>
        🎰 PIPELINES INDEPENDENTES POR LOTERIA
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 8 }}>
        {LOTERIAS.map(l => (
          <div key={l} style={{
            padding: 10, borderRadius: 8, background: "rgba(0,212,255,0.05)",
            border: "1px solid rgba(0,212,255,0.15)", fontSize: 10,
          }}>
            <div style={{ fontWeight: 700, color: "#00d4ff", marginBottom: 4 }}>{l.toUpperCase()}</div>
            <div style={{ color: "#94a3b8" }}>Pipeline · IA · Cache · Logs</div>
            <div style={{ color: "#00ff88", marginTop: 4 }}>● independente</div>
          </div>
        ))}
      </div>

      <AlertsSection />

      <div style={{ marginTop: 16, padding: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", marginBottom: 6 }}>ESTATÍSTICAS DE ESTÁGIOS</div>
        <div style={{ fontSize: 10, color: "#cbd5e1", display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 4 }}>
          {Object.entries(stats.stages).map(([k, v]) => (
            <div key={k}>
              <b style={{ color: "#e2e8f0" }}>{k}</b> · ok {v.ok} / fail {v.fail} · {v.lastMs}ms
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
