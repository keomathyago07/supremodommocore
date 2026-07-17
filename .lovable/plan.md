# Plano de implementação — 4 blocos aprovados

Todos os 4 blocos serão entregues em fases sequenciais e independentes. Cada fase pode ser publicada isoladamente. Nenhum módulo existente (Titan, Orchestrator, Adapter, God Core, IA Control, Sync) será alterado — só extensões novas.

---

## FASE 1 — Backtest Completo (aba `/titan-core → 🧪 Backtest`)

**Entregas**
- Botões **Exportar CSV** e **Exportar PDF** com métricas: acertos, taxa, precisão, ROI, Brier, IC Wilson 95%, ranking por confiança.
- **Drill-down**: clicar numa loteria abre modal com lista de concursos usados, números sorteados vs previstos, acertos/erros por IA.
- **Scheduler**: cron interno (`setInterval` + persistência em `titan_backtest_schedules`) para rodar backtest a cada X dias/horas. Salva status (`running/done/failed`) e logs.
- Painel de **status do scheduler** (última execução, próxima, últimos 10 runs).

**Arquivos novos** (nenhum existente alterado exceto `TitanBacktestTab.tsx` p/ adicionar botões):
- `src/titan/backtest/exportCsv.ts`, `exportPdf.ts` (jsPDF)
- `src/titan/backtest/BacktestDrillDown.tsx`
- `src/titan/backtest/BacktestScheduler.ts` + `BacktestSchedulerPanel.tsx`
- Migração: tabela `titan_backtest_schedules`

---

## FASE 2 — Tela de Calibração (nova rota `/dashboard/titan/calibration`)

**Entregas**
- Métodos: **Temperature scaling**, **Platt scaling**, **Isotonic regression**.
- Roda calibração sobre `titan_backtest_runs` mais recente por loteria.
- Comparação **antes vs depois**: Brier, ECE, reliability diagram lado a lado.
- Persiste em nova tabela `titan_calibration_runs` (método, params, métricas pré/pós, timestamp).
- Botão "aplicar calibração aos próximos gates" (grava params em `ia_config`).

**Arquivos novos**:
- `src/titan/calibration/methods.ts` (temperature/platt/isotonic puros TS)
- `src/titan/calibration/TitanCalibrationPage.tsx`
- Migração: tabela `titan_calibration_runs`

---

## FASE 3 — TITAN 10.0 Institucional (God Core residente + Event Bus + Watchdog + Self-Healing)

Camada nova em `src/titan10/` — não toca em `src/titan/` nem `src/orchestrator/`. Comunica com eles via eventos.

**Entregas**
- **God Core residente**: `titan10Supervisor.ts` com heartbeat 1s (Web Worker + SharedWorker onde possível), monitora: memória, latência API, pipeline stall, WS, scheduler.
- **Event Bus** central (`titan10Bus.ts`) — pub/sub tipado, todos os módulos existentes podem publicar via wrapper opcional.
- **Watchdog de APIs**: teste em cascata (DNS→SSL→Timeout→Latência→Endpoint), retry exponencial, failover entre endpoints já existentes em `apiResilient.ts`.
- **Self-Healing**: detecta pipeline travado (>N min sem tick) → dispara restart via eventos já existentes (`nucleus:restart`, `engines:auto-start`).
- Painel `/dashboard/titan/supervisor` com heartbeat, uptime, healings executados.
- **Shutdown Zero**: Service Worker (`sw-advanced.js`) estende para background sync mantendo heartbeat + scheduler quando aba fechada.

**Arquivos novos**: `src/titan10/*` (supervisor, bus, watchdog, healer, page). Pequeno append em `public/sw-advanced.js` para background sync do supervisor.

---

## FASE 4 — Análise Global Ativa + Auditoria + Versionamento

**Entregas**
- **Análise Global Ativa** (job cron a cada 30min): registra por loteria em `analise_global_ativa` (loteria, timestamp, gate_atingido, confiança, motivo, versão_modelo).
- **Auditoria detalhada**: tabela `titan_audit_log` — cada decisão IA (consenso, drift detectado, ajuste de peso, versão trocada) grava linha com JSON completo. Nova aba `/dashboard/titan/auditoria` com filtros por tipo/loteria/data + export CSV.
- **Versionamento de modelos**: tabela `titan_model_versions` (versão, loteria, métricas, criado_em, ativo). Ao rodar backtest ou calibração, cria nova versão; painel mostra histórico e permite ativar/rollback.

**Arquivos novos**:
- Migração: 3 tabelas + GRANTs + RLS por `user_id`
- `src/titan/auditoria/TitanAuditPage.tsx`
- `src/titan/versioning/ModelVersionsPanel.tsx`
- `src/titan/globalActive/globalActiveJob.ts`

---

## Ordem de execução

1. Aprovar este plano.
2. Executo FASE 1 completa → você testa → publica.
3. FASE 2 → testa → publica.
4. FASE 3 (mais delicada, camada nova isolada) → testa → publica.
5. FASE 4 → testa → publica.

## Fora deste plano (para pedir depois se quiser)

- Itens de infra S3 (fila/backoff/dedupe ETag) — só fazem sentido se seu deploy usa S3 direto; a hospedagem Lovable não expõe esse pipeline ao app.
- "Auto-Scale de workers", "GPU Monitor", Celery, Redis, FastAPI — não aplicáveis: seu app é 100% frontend React + edge functions Deno. Posso emular no cliente (workers dinâmicos + fila) se quiser, mas o comportamento é diferente do institucional Python.
