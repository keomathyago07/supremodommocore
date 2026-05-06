// ================================================================
// 👁️ OLHO DE DEUS — useGodEye Hook v6.0
// Hook React que conecta qualquer componente ao God Eye Store
// Auto-inicializa sem nenhum botão
// ================================================================

import { useEffect, useState, useCallback, useRef } from "react";
import {
  godSubscribe, godActivate, godDeactivate,
  godRunPipeline, godRunAll, godGetState, godGetProgress,
  GodEyeState,
} from "../store/godEyeStore";
import { TODAS_LOTERIAS, LoteriaNome, LOTERIAS_CONFIG } from "../engine/godCore";

export interface GodEyeHookState {
  pipelines: GodEyeState["pipelines"];
  rodando: LoteriaNome[];
  autoPipelineAtivo: boolean;
  ultimaExecucao: string;
  ciclos: number;
  progressoGeral: number;
  resumo: {
    total: number;
    done: number;
    running: number;
    error: number;
    idle: number;
  };
}

export function useGodEye(loteriaInicial: LoteriaNome = "megasena") {
  const [godState, setGodState]     = useState<GodEyeState>(godGetState() as any);
  const [loteriaAtiva, setLoteriaAtiva] = useState<LoteriaNome>(loteriaInicial);
  const booted                      = useRef(false);
  const loteriaRef                  = useRef(loteriaInicial);

  useEffect(() => { loteriaRef.current = loteriaAtiva; }, [loteriaAtiva]);

  // Inscreve no store global
  useEffect(() => {
    return godSubscribe(state => setGodState(state as any));
  }, []);

  // Auto-boot: ativa o God Eye na primeira montagem
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    godActivate(10); // intervalo de 10 minutos
  }, []);

  // Ações
  const rodarLoteria  = useCallback((l: LoteriaNome) => godRunPipeline(l), []);
  const rodarTodas    = useCallback(() => godRunAll(), []);
  const ativarAuto    = useCallback((min = 10) => godActivate(min), []);
  const desativarAuto = useCallback(() => godDeactivate(), []);

  // Estado derivado
  const rodando    = TODAS_LOTERIAS.filter(l => godState.rodando?.has(l));
  const done       = TODAS_LOTERIAS.filter(l => godState.pipelines?.[l]?.status === "done");
  const running    = TODAS_LOTERIAS.filter(l => godState.pipelines?.[l]?.status === "running");
  const error      = TODAS_LOTERIAS.filter(l => godState.pipelines?.[l]?.status === "error");
  const idle       = TODAS_LOTERIAS.filter(l => !godState.pipelines?.[l] || godState.pipelines[l].status === "idle");

  const progressoGeral = godGetProgress();

  const hookState: GodEyeHookState = {
    pipelines:          godState.pipelines ?? {} as any,
    rodando,
    autoPipelineAtivo:  godState.autoPipelineAtivo,
    ultimaExecucao:     godState.ultimaExecucao,
    ciclos:             godState.ciclos,
    progressoGeral,
    resumo: {
      total:   TODAS_LOTERIAS.length,
      done:    done.length,
      running: running.length,
      error:   error.length,
      idle:    idle.length,
    },
  };

  return {
    ...hookState,
    loteriaAtiva,
    setLoteriaAtiva,
    pipelineAtivo: godState.pipelines?.[loteriaAtiva] ?? null,
    rodarLoteria,
    rodarTodas,
    ativarAuto,
    desativarAuto,
    TODAS_LOTERIAS,
    LOTERIAS_CONFIG,
  };
}
