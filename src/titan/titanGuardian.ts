// ============================================================
// titanGuardian.ts — Watchdog independente.
// Reinicia apenas módulo afetado. Nunca sistema inteiro.
// ============================================================
import { supabase } from "@/integrations/supabase/client";
import { useTitanCore } from "./titanCoreStore";
import { persistentCore } from "./persistentCore";
import { durableQueue } from "./queue/durableQueue";
import { evaluateMetrics, raiseAlert } from "./alerts/guardianAlerts";

interface HealthReport {
  api: boolean;
  banco: boolean;
  realtime: boolean;
  scheduler: boolean;
  pipeline: boolean;
}

async function auditEvent(tipo: string, mensagem: string, severidade: "info"|"warn"|"error" = "info", modulo = "guardian") {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("god_core_events" as any).insert({
      user_id: user.id, tipo, mensagem, severidade, modulo,
    });
  } catch { /* silencioso */ }
}

/** Teto de tentativas de recuperação por módulo antes de pausar e sondar. */
const MAX_RECOVERY_ATTEMPTS = 5;

class TitanGuardian {
  private running = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private failCounts: Record<string, number> = {};
  private nextAttemptAt: Record<string, number> = {};
  private lastReport: HealthReport | null = null;
  private reconnects = 0;

  getFailCounts() { return { ...this.failCounts }; }


  getReconnects() { return this.reconnects; }

  isRunning() { return this.running; }
  getLastReport() { return this.lastReport; }

  start(intervalMs = 30_000) {
    if (this.running) return;
    this.running = true;
    auditEvent("guardian_start", "🛡️ TitanGuardian iniciado");
    this.check();
    this.timer = setInterval(() => this.check(), intervalMs);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.running = false;
  }

  private async check() {
    const report: HealthReport = {
      api: await this.probeApi(),
      banco: await this.probeBanco(),
      realtime: this.probeRealtime(),
      scheduler: persistentCore.isRunning(),
      pipeline: this.probePipeline(),
    };
    this.lastReport = report;

    // Alertas com severidade + histórico por módulo.
    const qs = durableQueue.stats();
    const memInfo = (performance as any).memory;
    if (!report.realtime) this.reconnects += 1;
    evaluateMetrics({
      memoryPct: memInfo ? (memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit) * 100 : undefined,
      queuePending: qs.pending,
      dlqCount: qs.dead,
      reconnects: this.reconnects,
      modulesDown: Object.entries(report).filter(([, ok]) => !ok).map(([k]) => k),
    });

    // IAS Recovery: cirúrgico, com backoff exponencial, teto de tentativas e
    // reset automático quando o módulo volta a ficar saudável (nunca loop infinito).
    if (report.scheduler) this.markHealthy("scheduler");
    else this.recover("scheduler", () => persistentCore.start());

    if (report.pipeline) this.markHealthy("pipeline");
    else this.recover("pipeline", () => this.reviveTitanPipeline());
  }

  /**
   * Recuperação inteligente do pipeline: se o core nunca bootou (ou caiu para
   * STANDBY), o boot institucional é a ação correta — reexecutar o pipeline sem
   * boot deixava `isOnline=false` e gerava reinícios infinitos.
   */
  private reviveTitanPipeline() {
    const s = useTitanCore.getState();
    if (!s.isOnline || s.systemState === "STANDBY" || s.systemState === "IDLE") {
      void s.boot?.();
      return;
    }
    void s.runFullPipeline?.();
  }

  private markHealthy(modulo: string) {
    if (this.failCounts[modulo]) {
      const falhas = this.failCounts[modulo];
      this.failCounts[modulo] = 0;
      this.nextAttemptAt[modulo] = 0;
      auditEvent("auto_recovery", `✅ Módulo "${modulo}" recuperado após ${falhas} tentativa(s)`, "info", modulo);
    }
  }

  private recover(modulo: string, fn: () => void) {
    const now = Date.now();
    // Backoff exponencial 30s → 8min entre tentativas do mesmo módulo.
    if ((this.nextAttemptAt[modulo] ?? 0) > now) return;

    const falhas = (this.failCounts[modulo] ?? 0) + 1;
    this.failCounts[modulo] = falhas;
    const backoff = Math.min(30_000 * 2 ** Math.min(falhas - 1, 4), 480_000);
    this.nextAttemptAt[modulo] = now + backoff;

    if (falhas > MAX_RECOVERY_ATTEMPTS) {
      if (falhas === MAX_RECOVERY_ATTEMPTS + 1) {
        auditEvent("watchdog_trip",
          `⛔ Módulo "${modulo}" pausado após ${MAX_RECOVERY_ATTEMPTS} tentativas — aguardando recuperação externa`,
          "error", modulo);
        raiseAlert({
          modulo, tipo: "recovery", severidade: "error",
          mensagem: `⛔ Recuperação de "${modulo}" pausada (teto de ${MAX_RECOVERY_ATTEMPTS} tentativas)`,
          valor: falhas,
        });
      }
      // Sonda espaçada (a cada 8min) para detectar recuperação sem inundar logs.
      this.nextAttemptAt[modulo] = now + 480_000;
      return;
    }

    auditEvent("module_restart", `🔄 Guardian reiniciando módulo "${modulo}" (tentativa ${falhas}/${MAX_RECOVERY_ATTEMPTS})`, "warn", modulo);
    raiseAlert({
      modulo, tipo: "recovery", severidade: falhas >= 3 ? "error" : "warn",
      mensagem: `🔄 Recuperação cirúrgica do módulo "${modulo}" (tentativa ${falhas}/${MAX_RECOVERY_ATTEMPTS})`,
      valor: falhas,
    });
    try { fn(); } catch (e) {
      auditEvent("watchdog_trip", `⚠️ Falha ao reiniciar "${modulo}": ${(e as Error).message}`, "error", modulo);
    }
  }


  private async probeApi(): Promise<boolean> {
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 3000);
      const r = await fetch("https://servicebus2.caixa.gov.br/portaldeloterias/api/megasena/", { signal: ctl.signal });
      clearTimeout(t);
      return r.ok;
    } catch { return false; }
  }

  private async probeBanco(): Promise<boolean> {
    try {
      const { error } = await supabase.from("proximo_concurso").select("loteria").limit(1);
      return !error;
    } catch { return false; }
  }

  private probeRealtime(): boolean {
    try {
      const st = (supabase.realtime as any)?.isConnected?.();
      return st !== false; // undefined = considera ok
    } catch { return true; }
  }

  private probePipeline(): boolean {
    try {
      const s = useTitanCore.getState();
      return s.isOnline === true;
    } catch { return false; }
  }
}

export const titanGuardian = new TitanGuardian();
