// ============================================================
// OrchestratorBridge.tsx
// Ponte entre o Orquestrador Master e os módulos JÁ EXISTENTES
// no seu programa Lovable. Escuta eventos do orquestrador e
// delega para as stores/funções já implementadas no programa.
//
// COMO USAR:
// Coloque <OrchestratorBridge /> uma única vez no seu App.tsx
// ou no seu layout raiz. Ele não renderiza nada visualmente.
// ============================================================

import { useEffect } from "react";
import { useMasterOrchestrator } from "./masterOrchestratorStore";

// ── Importe aqui as stores já existentes no seu programa ────
// Ajuste os caminhos conforme a estrutura do seu projeto:
// import { useBetStore } from "../store/betStore";
// import { useOrchestratorStore } from "../store/orchestratorStore";
// import { useSyncStore } from "../store/syncStore";
// import { useLotteryRulesStore } from "../store/lotteryRulesStore";

export function OrchestratorBridge() {
  const masterOrch = useMasterOrchestrator();

  useEffect(() => {
    // ── Listener: Gerar jogos ──────────────────────────────
    // O orquestrador master dispara "orchestrator:generate"
    // quando está dentro da janela de geração configurada.
    const onGenerate = (e: CustomEvent) => {
      masterOrch.addLog(
        "ia",
        "prediction_pipeline",
        `🔮 Evento de geração recebido — disparando pipeline existente`
      );

      // CONECTE AQUI ao seu módulo existente de geração.
      // Exemplo:
      // useOrchestratorStore.getState().runDailyCycle();
      //
      // O evento CustomEvent tem:
      // e.detail.triggeredBy = "master_orchestrator"
      // e.detail.ts = timestamp ISO
    };

    // ── Listener: Conferir resultados ──────────────────────
    // Disparado após 21h com dados do sorteio do dia atual.
    // Garante que conferência nunca usa dados de outro dia.
    const onCheck = (e: CustomEvent) => {
      const { lotteryId, numbers, extras, contestNumber, drawDate } = e.detail;

      masterOrch.addLog(
        "check",
        "checker",
        `🔍 Conferência recebida — ${lotteryId} concurso ${contestNumber} (${drawDate})`
      );

      // CONECTE AQUI ao seu módulo existente de conferência.
      // Exemplo:
      // useBetStore.getState().submitDrawResult(lotteryId, numbers, extras);
      //
      // Dados disponíveis em e.detail:
      // lotteryId: string
      // numbers: number[]
      // extras?: number[]
      // contestNumber: string
      // drawDate: string (sempre hoje)
    };

    // ── Listener: Sincronizar todos os módulos ─────────────
    const onSyncAll = (e: CustomEvent) => {
      masterOrch.addLog("system", "sync", `🔄 Sync global disparado pelo orquestrador`);
      // useSyncStore.getState().forceSync();
    };

    // ── Listener: Atualizar regras de premiação ────────────
    const onUpdateRules = (e: CustomEvent) => {
      masterOrch.addLog("system", "rules_engine", `📋 Regras de premiação atualizadas pelo orquestrador`);
      // As regras vêm em e.detail.rules
    };

    // ── Listener: Estado de apostas salvas mudou ──────────
    const onBetsUpdated = (e: CustomEvent) => {
      const { count, prizes } = e.detail ?? {};
      masterOrch.addLog(
        "success",
        "bet_manager",
        `🎟️ Apostas atualizadas — total: ${count ?? "?"} | premiadas: ${prizes ?? "?"}`
      );
    };

    // ── Listener: Resultado de conferência disponível ─────
    const onCheckResult = (e: CustomEvent) => {
      const { lotteryId, acertos, tierId, prizeEstimate } = e.detail ?? {};
      if (tierId) {
        masterOrch.addLog(
          "success",
          "prize_tracker",
          `🏆 PREMIADA! ${lotteryId} — ${acertos} acertos — R$ ${prizeEstimate?.toLocaleString("pt-BR") ?? "?"}`
        );
      } else {
        masterOrch.addLog(
          "check",
          "checker",
          `${lotteryId} — ${acertos} acertos — não premiada`
        );
      }
    };

    // Registra todos os listeners
    window.addEventListener("orchestrator:generate",    onGenerate    as EventListener);
    window.addEventListener("orchestrator:check",       onCheck       as EventListener);
    window.addEventListener("orchestrator:sync_all",    onSyncAll     as EventListener);
    window.addEventListener("orchestrator:update_rules", onUpdateRules as EventListener);
    window.addEventListener("program:bets_updated",     onBetsUpdated as EventListener);
    window.addEventListener("program:check_result",     onCheckResult as EventListener);

    masterOrch.addLog("system", "orchestrator", "🌉 Bridge conectada — ouvindo eventos do programa");

    return () => {
      window.removeEventListener("orchestrator:generate",    onGenerate    as EventListener);
      window.removeEventListener("orchestrator:check",       onCheck       as EventListener);
      window.removeEventListener("orchestrator:sync_all",    onSyncAll     as EventListener);
      window.removeEventListener("orchestrator:update_rules", onUpdateRules as EventListener);
      window.removeEventListener("program:bets_updated",     onBetsUpdated as EventListener);
      window.removeEventListener("program:check_result",     onCheckResult as EventListener);
    };
  }, []);

  // Sem renderização — componente invisível
  return null;
}

// ─────────────────────────────────────────────────────────────
// UTILITÁRIOS: dispare esses eventos nos módulos existentes
// para reportar ao orquestrador o que está acontecendo.
// Cole essas chamadas nos seus módulos já desenvolvidos:
// ─────────────────────────────────────────────────────────────

/** Notifica o orquestrador que apostas foram salvas/atualizadas */
export function notifyBetsUpdated(count: number, prizes: number) {
  window.dispatchEvent(new CustomEvent("program:bets_updated", {
    detail: { count, prizes, ts: new Date().toISOString() }
  }));
}

/** Notifica o orquestrador com o resultado de uma conferência */
export function notifyCheckResult(payload: {
  lotteryId: string;
  acertos: number;
  tierId: string | null;
  tierDesc: string | null;
  prizeEstimate: number;
  drawDate: string;
}) {
  window.dispatchEvent(new CustomEvent("program:check_result", {
    detail: { ...payload, ts: new Date().toISOString() }
  }));
}

/** Notifica o orquestrador que um jogo foi confirmado */
export function notifyGameConfirmed(lotteryId: string, betId: string) {
  window.dispatchEvent(new CustomEvent("program:game_confirmed", {
    detail: { lotteryId, betId, ts: new Date().toISOString() }
  }));
}

/** Notifica o orquestrador que o sorteio do dia foi publicado */
export function notifyDrawPublished(lotteryId: string, contestNumber: string, numbers: number[], extras?: number[]) {
  window.dispatchEvent(new CustomEvent("program:draw_published", {
    detail: {
      lotteryId, contestNumber, numbers, extras,
      drawDate: new Date().toISOString().split("T")[0],
      ts: new Date().toISOString(),
    }
  }));
}
