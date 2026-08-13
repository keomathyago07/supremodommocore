// ============================================================
// stateMigrations.ts — Versionamento e migração do estado persistido
// do TitanDommoCore. Mantém compatibilidade após mudanças de schema
// e registra cada migração na auditoria.
// ============================================================
import { supabase } from "@/integrations/supabase/client";

export const TITAN_STATE_VERSION = 3;

export interface AnyState { version?: number; [k: string]: unknown }

type Migration = { to: number; describe: string; up: (s: AnyState) => AnyState };

/** Migrações incrementais — sempre idempotentes e tolerantes a campos ausentes. */
const MIGRATIONS: Migration[] = [
  {
    to: 2,
    describe: "adiciona registro de reprocessamentos e telemetria de conferência",
    up: (s) => ({
      ...s,
      reprocessamentos: Array.isArray(s.reprocessamentos) ? s.reprocessamentos : [],
      conferenciasConcluidas: Array.isArray(s.conferenciasConcluidas) ? s.conferenciasConcluidas : [],
    }),
  },
  {
    to: 3,
    describe: "normaliza consenso/verificações em mapas e adiciona schemaMigratedAt",
    up: (s) => ({
      ...s,
      consenso: (s.consenso && typeof s.consenso === "object") ? s.consenso : {},
      ultimasVerificacoes: (s.ultimasVerificacoes && typeof s.ultimasVerificacoes === "object") ? s.ultimasVerificacoes : {},
      stageStats: (s.stageStats && typeof s.stageStats === "object") ? s.stageStats : {},
      schemaMigratedAt: Date.now(),
    }),
  },
];

export interface MigrationReport {
  from: number;
  to: number;
  applied: { to: number; describe: string }[];
}

/** Migra o estado para a versão corrente, retornando o estado e o relatório. */
export function migrateState<T extends AnyState>(input: T): { state: T; report: MigrationReport } {
  const from = Number(input?.version ?? 1) || 1;
  let out: AnyState = { ...input };
  const applied: MigrationReport["applied"] = [];

  MIGRATIONS.filter(m => m.to > from).sort((a, b) => a.to - b.to).forEach(m => {
    out = m.up(out);
    out.version = m.to;
    applied.push({ to: m.to, describe: m.describe });
  });

  out.version = Math.max(TITAN_STATE_VERSION, Number(out.version ?? TITAN_STATE_VERSION));
  const report: MigrationReport = { from, to: out.version as number, applied };
  if (applied.length) void auditMigration(report);
  return { state: out as T, report };
}

async function auditMigration(report: MigrationReport) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("god_core_events" as any).insert({
      user_id: user.id,
      tipo: "state_migration",
      modulo: "titan_persistence",
      severidade: "info",
      mensagem: `🧬 Estado do TitanDommoCore migrado v${report.from} → v${report.to} (${report.applied.length} passo(s))`,
      payload: report as unknown as Record<string, unknown>,
    });
  } catch { /* nunca throw */ }
}
