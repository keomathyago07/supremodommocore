// ============================================================
// persistentCore.ts — TitanDommoCore Scheduler Institucional
// Loop permanente enquanto o app estiver aberto.
// Nunca depende de intervenção humana.
// ============================================================
import { supabase } from "@/integrations/supabase/client";
import { useTitanCore } from "./titanCoreStore";
import { dentroDaJanelaOficial } from "./conference";

type StageFn = () => Promise<void> | void;

function nowBRT(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
}

function dynamicIntervalMs(): number {
  const h = nowBRT().getHours();
  // Madrugada 00-06 → 60s ; janela oficial 21-23 → 5s ; resto → 15s.
  if (h >= 21 && h <= 23) return 5_000;
  if (h >= 0 && h < 6)    return 60_000;
  return 15_000;
}

async function audit(tipo: string, mensagem: string, severidade: "info"|"warn"|"error" = "info", modulo?: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("god_core_events" as any).insert({
      user_id: user.id, tipo, mensagem, severidade, modulo: modulo ?? "persistent_core",
    });
  } catch { /* nunca throw */ }
}

async function heartbeat(status: string, latencyMs: number) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("god_core_heartbeats" as any).insert({
      user_id: user.id, modulo: "persistent_core", status, latencia_ms: latencyMs,
    });
  } catch { /* silencioso */ }
}

class PersistentCore {
  private running = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private tickCount = 0;
  private lastError: string | null = null;
  private stageStats: Record<string, { ok: number; fail: number; lastMs: number }> = {};

  isRunning() { return this.running; }
  stats() { return { tickCount: this.tickCount, lastError: this.lastError, stages: this.stageStats }; }

  start() {
    if (this.running) return;
    this.running = true;
    audit("persistent_core_start", "🟢 Persistent Core iniciado");
    this.loop();
  }

  stop() {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    audit("persistent_core_stop", "🔴 Persistent Core parado", "warn");
  }

  private async runStage(name: string, fn: StageFn) {
    const t0 = performance.now();
    try {
      await fn();
      const ms = Math.round(performance.now() - t0);
      const s = this.stageStats[name] ?? { ok: 0, fail: 0, lastMs: 0 };
      this.stageStats[name] = { ok: s.ok + 1, fail: s.fail, lastMs: ms };
    } catch (err) {
      const ms = Math.round(performance.now() - t0);
      const s = this.stageStats[name] ?? { ok: 0, fail: 0, lastMs: 0 };
      this.stageStats[name] = { ok: s.ok, fail: s.fail + 1, lastMs: ms };
      this.lastError = `${name}: ${(err as Error).message}`;
      audit(`stage_error_${name}`, this.lastError, "error", name);
    }
  }

  private async loop() {
    if (!this.running) return;
    const t0 = performance.now();
    this.tickCount++;

    const titan = useTitanCore.getState();

    // Pipeline de 10 etapas — cada etapa isolada, nunca joga fora.
    await this.runStage("sync_api",         () => this.syncApi());
    await this.runStage("update_results",   () => this.updateResults());
    await this.runStage("check_new_draws",  () => this.checkNewDraws());
    await this.runStage("validate_results", () => this.validateResults());
    await this.runStage("check_bets",       () => this.checkSavedBets());
    await this.runStage("calc_prizes",      () => this.calculatePrizes());
    await this.runStage("update_dashboard", () => this.updateDashboard(titan));
    await this.runStage("sync_devices",     () => this.syncDevices());
    await this.runStage("save_state",       () => this.saveState());
    await this.runStage("audit",            () => this.auditLogs());

    const totalMs = Math.round(performance.now() - t0);
    await heartbeat(this.lastError ? "degraded" : "ok", totalMs);

    const wait = dynamicIntervalMs();
    this.timer = setTimeout(() => this.loop(), wait);
  }

  // ── Estágios ────────────────────────────────────────────────
  private async syncApi() {
    // Dispara sync-e-confere apenas dentro da janela oficial.
    if (!dentroDaJanelaOficial()) return;
    try { await supabase.functions.invoke("sync-e-confere", { body: {} }); } catch { /* resiliente */ }
  }

  private async updateResults() {
    // Notifica UI via evento custom (react-query invalida sozinha nos consumidores).
    window.dispatchEvent(new CustomEvent("titan:results_updated"));
  }

  private async checkNewDraws() {
    window.dispatchEvent(new CustomEvent("titan:check_new_draws"));
  }

  private async validateResults() {
    // Placeholder — validação já ocorre no orquestrador de conferência.
  }

  private async checkSavedBets() {
    if (!dentroDaJanelaOficial()) return;
    window.dispatchEvent(new CustomEvent("titan:check_bets"));
  }

  private async calculatePrizes() {
    window.dispatchEvent(new CustomEvent("titan:calc_prizes"));
  }

  private updateDashboard(titan: ReturnType<typeof useTitanCore.getState>) {
    // Heartbeat no store do Titan para UI mostrar vida.
    try { titan.log?.("system", `⏱️ Persistent tick #${this.tickCount}`); } catch { /* noop */ }
  }

  private async syncDevices() {
    // Publica marcador no canal titan-sync (todas as abas/dispositivos ouvem).
    try {
      const ch = supabase.channel("titan-sync");
      await ch.send({ type: "broadcast", event: "tick", payload: { at: Date.now() } });
      supabase.removeChannel(ch);
    } catch { /* silencioso */ }
  }

  private saveState() {
    try {
      localStorage.setItem("titan.persistent.lastTick", String(Date.now()));
      localStorage.setItem("titan.persistent.stats", JSON.stringify(this.stageStats));
    } catch { /* quota */ }
  }

  private async auditLogs() {
    if (this.tickCount % 60 !== 0) return; // audit periódico
    await audit("persistent_core_health",
      `Tick #${this.tickCount} · stages ok/fail: ${Object.entries(this.stageStats).map(([k,v])=>`${k}=${v.ok}/${v.fail}`).join(" ")}`,
      this.lastError ? "warn" : "info"
    );
  }
}

export const persistentCore = new PersistentCore();
