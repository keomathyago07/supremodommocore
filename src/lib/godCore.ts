// IASV60+ GOD CORE — "OLHO DE DEUS" (ANTI-TRAVA REAL)
// Orquestrador central com auto-recuperação, fallback e força de pipeline.

import { supabase } from "@/integrations/supabase/client";

export type GodStatus = "IDLE" | "OK" | "RUNNING" | "FAIL" | "RESET";

export interface GodSystemState {
  ingest: GodStatus;
  models: GodStatus;
  pipeline: GodStatus;
  last_data: Record<string, any> | null;
  last_run_at: string | null;
  fail_count: number;
  cycles: number;
  last_error: string | null;
  fallback_active: boolean;
}

export const LOTERIAS_GOD = [
  "megasena", "quina", "lotofacil", "lotomania",
  "timemania", "duplasena", "diadesorte", "supersete", "maismilionaria",
];

type Listener = (s: GodSystemState) => void;

class GodCore {
  state: GodSystemState = {
    ingest: "IDLE",
    models: "IDLE",
    pipeline: "IDLE",
    last_data: null,
    last_run_at: null,
    fail_count: 0,
    cycles: 0,
    last_error: null,
    fallback_active: false,
  };
  private listeners = new Set<Listener>();
  private timer: number | null = null;
  private running = false;

  subscribe(l: Listener) {
    this.listeners.add(l);
    l(this.state);
    return () => this.listeners.delete(l);
  }

  private emit() {
    const snap = { ...this.state };
    this.listeners.forEach((l) => l(snap));
  }

  private set(patch: Partial<GodSystemState>) {
    this.state = { ...this.state, ...patch };
    this.emit();
  }

  log(msg: string) {
    // eslint-disable-next-line no-console
    console.log(`[GOD-CORE] ${msg}`);
  }

  private async persistEvent(tipo: string, mensagem: string, severidade: "info"|"warn"|"error"|"success" = "info", modulo?: string, payload: any = {}) {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      await supabase.from("god_core_events" as any).insert({
        user_id: userData.user.id, tipo, modulo: modulo ?? null, severidade, mensagem, payload,
      });
    } catch { /* silent */ }
  }

  private async persistHeartbeat(modulo: string, status: GodStatus, latencia_ms?: number, mensagem?: string) {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      await supabase.from("god_core_heartbeats" as any).insert({
        user_id: userData.user.id, modulo, status, latencia_ms: latencia_ms ?? null,
        mensagem: mensagem ?? null, ciclos: this.state.cycles,
      });
    } catch { /* silent */ }
  }

  /** Inicia o ciclo de monitoramento contínuo (a cada 5s). */
  start(intervalMs = 5000) {
    if (this.running) return;
    this.running = true;
    this.log("👁️ OLHO DE DEUS ATIVADO");
    void this.persistEvent("core_start", "God Core iniciado", "success", "core");
    this.tick();
    this.timer = window.setInterval(() => this.tick(), intervalMs);
  }

  stop() {
    this.running = false;
    if (this.timer) window.clearInterval(this.timer);
    this.timer = null;
    this.log("OLHO DE DEUS pausado");
    void this.persistEvent("core_stop", "God Core pausado", "warn", "core");
  }

  private async tick() {
    this.set({ cycles: this.state.cycles + 1 });

    try {
      // 🔍 MONITORAMENTO TOTAL
      if (this.state.ingest !== "OK") {
        this.log("⚠️ INGEST FALHOU → REINICIANDO");
        await this.restartIngest();
      }

      if (this.state.pipeline !== "RUNNING") {
        this.log("⚠️ PIPELINE TRAVADO → FORÇANDO EXECUÇÃO");
        await this.forcePipeline();
      }

      if (this.state.models !== "RUNNING") {
        this.log("⚠️ MODELOS PARADOS → RESTART");
        await this.restartModels();
      }

      // 🧠 AUTO CORREÇÃO
      if (this.state.fail_count > 3) {
        this.log("🔥 RESET TOTAL DO SISTEMA");
        await this.fullReset();
      }
    } catch (e: any) {
      this.set({ last_error: String(e?.message ?? e), fail_count: this.state.fail_count + 1 });
    }
  }

  /** ⚡ FORÇADOR DE PIPELINE (SEMPRE EXECUTA) */
  async forcePipeline() {
    const data = await this.fetchMultiSourceAll();

    if (!data) {
      this.set({
        ingest: "FAIL",
        pipeline: "FAIL",
        fail_count: this.state.fail_count + 1,
      });
      return;
    }

    this.set({ ingest: "OK", last_data: data, last_run_at: new Date().toISOString() });

    const processed = this.processData(data);
    if (!processed) {
      this.set({ pipeline: "FAIL", fail_count: this.state.fail_count + 1 });
      return;
    }

    this.set({ pipeline: "RUNNING" });
    await this.runModels(processed);
  }

  /** 🔄 INGESTÃO GLOBAL (TODAS LOTERIAS) — multi-source com fallback Supabase. */
  async fetchMultiSourceAll(): Promise<Record<string, any> | null> {
    const results: Record<string, any> = {};

    // Fonte 1: tenta edge function god-core-pipeline (servidor multi-fonte)
    try {
      const { data } = await supabase.functions.invoke("god-core-pipeline", {
        body: { action: "ingest", lotteries: LOTERIAS_GOD },
      });
      if (data?.results) Object.assign(results, data.results);
    } catch (e) {
      this.log(`ingest edge falhou: ${e}`);
    }

    // Fonte 2: fallback — lê últimos resultados do banco
    if (Object.keys(results).length === 0) {
      try {
        const { data: rows } = await supabase
          .from("resultados_sorteios")
          .select("loteria, concurso, dezenas, data_apuracao")
          .order("concurso", { ascending: false })
          .limit(200);
        (rows ?? []).forEach((r: any) => {
          if (!results[r.loteria]) {
            results[r.loteria] = { numeros: r.dezenas, concurso: r.concurso, data: r.data_apuracao };
          }
        });
      } catch (e) {
        this.log(`fallback DB falhou: ${e}`);
      }
    }

    return Object.keys(results).length === 0 ? null : results;
  }

  private processData(data: Record<string, any>) {
    // Normaliza/valida
    const out: Record<string, number[]> = {};
    for (const [lot, payload] of Object.entries(data)) {
      const nums = (payload as any)?.numeros ?? (payload as any)?.dezenas ?? [];
      if (Array.isArray(nums) && nums.length > 0) {
        out[lot] = nums.map((n: any) => Number(n)).filter((n) => !Number.isNaN(n));
      }
    }
    return Object.keys(out).length > 0 ? out : null;
  }

  /** 🧠 EXECUÇÃO FORÇADA DOS MODELOS (DESTRAVA 0%) */
  async runModels(data: Record<string, number[]>) {
    let lstm: any, stacking: any, mcmc: any;
    let usedFallback = false;

    try {
      lstm = await this.runLSTM(data);
      this.set({ models: "RUNNING" });
    } catch {
      this.log("Erro LSTM → fallback estatístico");
      lstm = this.fallbackModel(data);
      usedFallback = true;
    }

    try {
      stacking = await this.runStacking(data);
    } catch {
      stacking = lstm;
      usedFallback = true;
    }

    try {
      mcmc = await this.runMCMC(data);
    } catch {
      mcmc = lstm;
      usedFallback = true;
    }

    this.set({ models: "RUNNING", fallback_active: usedFallback, fail_count: 0 });
    return this.combineModels(lstm, stacking, mcmc);
  }

  private async runLSTM(data: Record<string, number[]>) {
    const { data: out } = await supabase.functions.invoke("god-core-pipeline", {
      body: { action: "lstm", data },
    });
    if (!out) throw new Error("lstm vazio");
    return out;
  }

  private async runStacking(data: Record<string, number[]>) {
    const { data: out } = await supabase.functions.invoke("god-core-pipeline", {
      body: { action: "stacking", data },
    });
    if (!out) throw new Error("stacking vazio");
    return out;
  }

  private async runMCMC(data: Record<string, number[]>) {
    const { data: out } = await supabase.functions.invoke("god-core-pipeline", {
      body: { action: "mcmc", data },
    });
    if (!out) throw new Error("mcmc vazio");
    return out;
  }

  /** 🧠 FALLBACK — Frequência simples (o que te salva do 0%). */
  fallbackModel(data: Record<string, number[]>) {
    const counter = new Map<number, number>();
    for (const nums of Object.values(data)) {
      for (const n of nums) counter.set(n, (counter.get(n) ?? 0) + 1);
    }
    const top = [...counter.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    return { source: "fallback", top };
  }

  private combineModels(a: any, b: any, c: any) {
    return { lstm: a, stacking: b, mcmc: c, mergedAt: new Date().toISOString() };
  }

  // ==== Restart helpers ====
  async restartIngest() {
    this.set({ ingest: "RESET" });
    const data = await this.fetchMultiSourceAll();
    if (data) this.set({ ingest: "OK", last_data: data });
    else this.set({ ingest: "FAIL", fail_count: this.state.fail_count + 1 });
  }

  async restartModels() {
    this.set({ models: "RESET" });
    if (this.state.last_data) {
      const processed = this.processData(this.state.last_data);
      if (processed) await this.runModels(processed);
    }
  }

  async restartPipeline() {
    this.set({ pipeline: "RESET" });
    await this.forcePipeline();
  }

  /** 🔁 AUTO RESET COMPLETO */
  async fullReset() {
    this.set({
      fail_count: 0,
      ingest: "RESET",
      pipeline: "RESET",
      models: "RESET",
      last_error: null,
    });
    await this.restartIngest();
    await this.restartModels();
    await this.restartPipeline();
    this.log("✅ SISTEMA RECUPERADO");
  }

  /** 👁️ "OLHO DE DEUS" (MONITOR TOTAL) */
  godEyeDashboard() {
    return { ...this.state };
  }
}

export const godCore = new GodCore();
