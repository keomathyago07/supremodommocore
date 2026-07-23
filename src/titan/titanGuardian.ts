// ============================================================
// titanGuardian.ts — Watchdog independente.
// Reinicia apenas módulo afetado. Nunca sistema inteiro.
// ============================================================
import { supabase } from "@/integrations/supabase/client";
import { useTitanCore } from "./titanCoreStore";
import { persistentCore } from "./persistentCore";

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

class TitanGuardian {
  private running = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private failCounts: Record<string, number> = {};
  private lastReport: HealthReport | null = null;

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

    // Reinicia apenas o módulo afetado.
    if (!report.scheduler) this.recover("scheduler", () => persistentCore.start());
    if (!report.pipeline)  this.recover("pipeline",  () => useTitanCore.getState().runPipeline?.());
  }

  private recover(modulo: string, fn: () => void) {
    this.failCounts[modulo] = (this.failCounts[modulo] ?? 0) + 1;
    auditEvent("module_restart", `🔄 Guardian reiniciando módulo "${modulo}" (falha #${this.failCounts[modulo]})`, "warn", modulo);
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
