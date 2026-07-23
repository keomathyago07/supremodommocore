# Plano — TitanDommoCore Persistent Core + Conferência Inteligente

Vou entregar em 4 fases para manter tudo em sincronia sem quebrar o que já roda.

## Fase 1 — Persistent Core Scheduler (novo motor mestre)

Criar `src/titan/persistentCore.ts`:
- Loop `while(running)` com intervalo dinâmico (5s base, 30s idle, 60s madrugada).
- Executa em ordem: `syncApi → updateResults → checkNewDraws → validateResults → checkSavedBets → calculatePrizes → updateDashboard → syncDevices → saveState → auditLogs`.
- Heartbeat integrado em `god_core_heartbeats` a cada tick.
- Nunca `throw` — cada etapa isolada em try/catch com log em `god_core_events`.

Criar `src/titan/titanGuardian.ts` (watchdog independente):
- Verifica módulos, filas, APIs, Redis (via Supabase), WebSocket, banco.
- Reinicia apenas módulo afetado (via re-registro no store), nunca sistema todo.
- Registra `module_restart` / `watchdog_trip` em `god_core_events`.

Ambos bootados em `TitanBridge.tsx` — persistem enquanto o app está aberto.

## Fase 2 — Conferência Inteligente por Modalidade

Criar `src/titan/conference/` com um verificador por loteria (cada arquivo puro, testável):
- `lotomania.ts` — dupla conferência (principal 50 + complementar 50). Faixas 20/19/18/17/16/15/0. Calcula ambos automaticamente (complementar = 20 − principal quando principal ≥ 15).
- `superSete.ts` — comparação **posição por coluna** (col1..col7), não conjunto.
- `diaSorte.ts` — 7 dezenas + Mês da Sorte, faixas 7/6/5/4 + mês.
- `maisMilionaria.ts` — 6 dezenas + 2 trevos, faixas 6+2, 6+1, 6+0, 5+2, 5+1, 4+2, 3+2, etc.
- `duplaSena.ts` — dois motores independentes (1º e 2º sorteio) com prêmio independente.
- `timemania.ts` — 7 dezenas + Time do Coração.
- `padrao.ts` — Mega, Quina, Lotofácil (faixas padrão).

Orquestrador `src/titan/conference/index.ts`:
- Recebe `resultado_oficial`, valida `modalidade + concurso + data + status === "OFICIAL"`.
- Só dispara conferência se: seg–sex após 21:00 BRT, ou domingo 11:00 (concursos transferidos de sábado).
- Enquanto não houver resultado oficial → status `Aguardando Oficial` (nunca `Premiada` nem `Conferida`).

## Fase 3 — Sincronização Total & Auditoria

- Reforçar `iaConfigCloud.ts` e `betsCloud.ts` para publicar em canal Realtime `titan-sync` após cada mudança (aposta, resultado, conferência, prêmio, config).
- Novo hook `src/titan/useTitanSync.ts` — assina `titan-sync` e invalida react-query keys relevantes; reconexão exponencial (já existe padrão em `MinhasApostasPage`, reusar).
- Auditoria: cada evento (novo resultado / nova aposta / conferência / prêmio / mudança config / erro / reconexão / rollback) grava em `god_core_events` com timestamp BRT.

## Fase 4 — Dashboard Operacional

Nova aba em `TitanCoreDashboard.tsx` — **Operacional**:
- Cards de status (API, Banco, IA, Scheduler, Pipeline, Conferência, WebSocket, Sync, Cache).
- Última sincronização, latência média (de `resilientStats`), CPU/RAM aproximado (via `performance.memory` quando disponível).
- Lista das 9 loterias com pipeline/IA/cache/logs independentes (já existente — expor status).

## Detalhes técnicos

- Sem novas tabelas — reuso `god_core_events`, `god_core_heartbeats`, `god_core_notifications`, `apostas_confirmadas`, `verificacoes_sorteio`, `financeiro_premiacoes`.
- Timezone: sempre `America/Sao_Paulo` (helper já existe em `usePollingResultados`).
- Nada de intervenção humana — Persistent Core arranca no `TitanBridge` junto com o godCore atual.
- Tipos strict, sem `any` cru fora de bordas do Supabase.

## O que **não** vou mexer
- `client.ts`, `types.ts`, `.env`, `supabase/config.toml`.
- Módulos financeiros existentes (só leem eventos novos).
- UI do "Minhas Apostas" (já tem indicador de sync).

Confirma que posso executar as 4 fases nesta ordem?
