## Escopo

Sete entregas coordenadas em `/titan-core`, no God Core e no módulo Candidatos+XAI, com persistência no banco, calibração estatística real e telemetria/notificações em tempo real.

## Fases

### FASE 1 — Banco (migração única)
Novas tabelas com RLS + GRANT + triggers `updated_at`:
- `titan_backtest_run_logs` — logs por execução do scheduler (schedule_id, run_id, nível INFO/WARN/ERROR, mensagem, duração_ms, tentativa, contexto jsonb, timestamps BRT).
- `titan_calibration_runs` — método (temperature/platt/isotonic), parâmetros, Brier antes/depois, ECE, CI95 e CI99 por bin, referência ao `backtest_run_id`.
- `god_core_heartbeats` — módulo, status (OK/FAIL/RESET/RUNNING), latência, mensagem, ts.
- `god_core_events` — tipo (auto_recovery, module_restart, strategy_switch, config_change, watchdog), payload, severidade.
- `god_core_notifications` — fila de notificações in-app (lida/não lida) alimentada por trigger em `god_core_events` para eventos de recovery.

### FASE 2 — Calibração real (`src/titan/calibration/`)
- `methods.ts`: Temperature Scaling (NLL/LBFGS 1D), Platt Scaling (sigmoid A/B via IRLS), Isotonic Regression (PAV).
- `intervals.ts`: Wilson score CI 95% e 99% + bootstrap opcional.
- Integração em `engines/backtest.ts`: gera `calibrated_probs`, `ci95`, `ci99`, `brier_pre/post`, `ece`. Persiste linha em `titan_calibration_runs` ao final de cada run.

### FASE 3 — Scheduler logs & status
- `BacktestScheduler.ts`: passa a gravar em `titan_backtest_run_logs` (start, cada tentativa/retry, erro, duração, fim).
- Nova aba `BacktestRunLogsPanel.tsx` no `TitanBacktestTab`: lista com filtros (schedule, status, data BRT), expansão de contexto/erro, badge de tentativa e duração.

### FASE 4 — Comparação de runs
- `TitanBacktestCompareTab.tsx`: seleciona 2..N runs (`titan_backtest_runs`), gráficos (recharts) de ROI/hitRate/precisão/Brier ao longo do tempo, tabela pivô por loteria×algoritmo, destaque da melhor configuração por métrica e por loteria. Export CSV/PDF.
- Nova sub-aba no `TitanBacktestTab`.

### FASE 5 — Calibração em Candidatos+XAI
- Localizar painel Candidatos+XAI existente e injetar:
  - Faixa de probabilidade calibrada (barra ci95/ci99).
  - Badge de risco (low/medium/high) e garantia (alta/media/baixa) usando limiares do run mais recente de calibração.
  - Ordenação por risco/garantia.

### FASE 6 — Logs em tempo real do God Core
- `godCore.ts`: emitir eventos para `god_core_events` e heartbeats a cada tick para `god_core_heartbeats`. Ao detectar `fullReset`/`restartX`, gravar evento `auto_recovery` + criar notificação.
- `GodCoreLogsPage.tsx` (rota `/dashboard/godcore/logs`): stream via Supabase Realtime, filtros por módulo/data/tipo, colunas BRT.
- Item na sidebar.

### FASE 7 — Notificações auto-recovery
- Hook `useGodCoreNotifications`: subscribe realtime em `god_core_notifications`, toast + badge no header. Persistência de leitura.

## Detalhes técnicos

- Realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE …` para as 4 novas tabelas.
- Todas as tabelas com policy `auth.uid() = user_id` (leitura/escrita autenticada) + `service_role ALL`.
- BRT em toda UI: `toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"})`.
- Calibração: implementação pura TS, sem dependências extras.
- Gráficos: usar `recharts` (já presente no shadcn stack).
- Sem tocar em `client.ts`/`types.ts`/`.env`/`config.toml`.

## Arquivos novos principais
```
src/titan/calibration/{methods.ts,intervals.ts,calibrationStore.ts}
src/titan/backtest/BacktestRunLogsPanel.tsx
src/titan/backtest/TitanBacktestCompareTab.tsx
src/titan/candidates/CandidatesCalibrationBadge.tsx
src/pages/GodCoreLogsPage.tsx
src/hooks/useGodCoreNotifications.ts
src/components/GodCoreNotificationBell.tsx
```

## Arquivos editados
```
src/titan/engines/backtest.ts        (calibração + CI99)
src/titan/backtest/BacktestScheduler.ts (logs)
src/titan/TitanBacktestTab.tsx       (novas sub-abas)
src/lib/godCore.ts                   (heartbeat + eventos)
src/App.tsx                          (rota /godcore/logs)
src/components/DashboardSidebar.tsx  (item Logs Core)
```

## Validação
- `tsgo` typecheck ao final.
- Verificação visual das 3 novas abas e da rota de logs no preview.

Confirmar para eu iniciar pela migração da FASE 1?
