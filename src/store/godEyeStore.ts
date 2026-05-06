// ================================================================
// 👁️ OLHO DE DEUS — GOD EYE STORE v6.0
// Singleton global ultra robusto
// Gerencia estado de TODAS as loterias e TODOS os modelos
// Garante que nenhum modelo fica travado
// ================================================================

import {
  LoteriaNome, TODAS_LOTERIAS, LOTERIAS_CONFIG, MESES_ANO,
  fetchAPIMultiFonte, DadosAPI, LoteriaPipelineState, ModeloResultado,
} from "../engine/godCore";
import { rodarBiLSTM } from "../engine/motorBiLSTM";
import { rodarMCMC } from "../engine/motorMCMC";
import { rodarStacking, calcularEnsemble } from "../engine/motorStacking";

// ── Estado global singleton ──────────────────────────────────────
interface GodEyeState {
  pipelines: Record<LoteriaNome, LoteriaPipelineState>;
  rodando: Set<LoteriaNome>;
  autoPipelineAtivo: boolean;
  ultimaExecucao: string;
  ciclos: number;
  totalModelos: number;
  modelosConcluidos: number;
}

function criarPipelineInicial(loteria: LoteriaNome): LoteriaPipelineState {
  return {
    loteria,
    status: "idle",
    dadosAPI: null,
    modelos: [
      { id:"bilstm",   nome:"MCD-BiLSTM+BiGRU",   descricao:"MC Dropout · IC 95%",         peso:10, progresso:0, status:"idle", numeros:[], confianca:0, detalhes:"Inicializando...", tempoMs:0 },
      { id:"mcmc",     nome:"MCMC 4-Chain Copula", descricao:"Metropolis-Hastings · R-hat",  peso:55, progresso:0, status:"idle", numeros:[], confianca:0, detalhes:"Inicializando...", tempoMs:0 },
      { id:"stacking", nome:"Stacking 5-Layer",    descricao:"Meta-MLP · Platt · Attention", peso:35, progresso:0, status:"idle", numeros:[], confianca:0, detalhes:"Aguardando BiLSTM+MCMC...", tempoMs:0 },
    ],
    ensemble: [],
    mesSorte: loteria === "diadesorte" ? MESES_ANO[new Date().getMonth()] : undefined,
    score: 0,
    timestampInicio: "",
    timestampFim: "",
    tentativas: 0,
  };
}

const _state: GodEyeState = {
  pipelines: Object.fromEntries(
    TODAS_LOTERIAS.map(l => [l, criarPipelineInicial(l)])
  ) as Record<LoteriaNome, LoteriaPipelineState>,
  rodando: new Set(),
  autoPipelineAtivo: false,
  ultimaExecucao: "",
  ciclos: 0,
  totalModelos: 0,
  modelosConcluidos: 0,
};

// ── Sistema pub/sub ──────────────────────────────────────────────
type Listener = (state: Readonly<GodEyeState>) => void;
const _listeners: Set<Listener> = new Set();

export function godSubscribe(fn: Listener): () => void {
  _listeners.add(fn);
  fn(snapshot());
  return () => _listeners.delete(fn);
}

function snapshot(): Readonly<GodEyeState> {
  return {
    ..._state,
    pipelines: { ..._state.pipelines },
    rodando: new Set(_state.rodando),
  };
}

function emit() {
  const snap = snapshot();
  _listeners.forEach(fn => { try { fn(snap); } catch {} });
}

// ── Helpers de atualização ───────────────────────────────────────
function setModelo(
  loteria: LoteriaNome,
  id: "bilstm"|"mcmc"|"stacking",
  patch: Partial<ModeloResultado>
) {
  const p = _state.pipelines[loteria];
  if (!p) return;
  const idx = p.modelos.findIndex(m => m.id === id);
  if (idx < 0) return;
  p.modelos[idx] = { ...p.modelos[idx], ...patch };
  emit();
}

function setPipeline(loteria: LoteriaNome, patch: Partial<LoteriaPipelineState>) {
  _state.pipelines[loteria] = { ..._state.pipelines[loteria], ...patch };
  emit();
}

// ── EXECUTOR PRINCIPAL ───────────────────────────────────────────
export async function godRunPipeline(loteria: LoteriaNome): Promise<void> {
  if (_state.rodando.has(loteria)) return;

  _state.rodando.add(loteria);
  _state.totalModelos += 3;
  emit();

  setPipeline(loteria, {
    status: "running",
    timestampInicio: new Date().toLocaleTimeString("pt-BR"),
    timestampFim: "",
    ensemble: [],
    score: 0,
    tentativas: (_state.pipelines[loteria].tentativas ?? 0) + 1,
    modelos: [
      { id:"bilstm",   nome:"MCD-BiLSTM+BiGRU",   descricao:"MC Dropout · IC 95%",         peso:10, progresso:0, status:"running", numeros:[], confianca:0, detalhes:"Buscando dados da API...", tempoMs:0 },
      { id:"mcmc",     nome:"MCMC 4-Chain Copula", descricao:"Metropolis-Hastings · R-hat",  peso:55, progresso:0, status:"idle",    numeros:[], confianca:0, detalhes:"Aguardando dados...", tempoMs:0 },
      { id:"stacking", nome:"Stacking 5-Layer",    descricao:"Meta-MLP · Platt · Attention", peso:35, progresso:0, status:"idle",    numeros:[], confianca:0, detalhes:"Aguardando BiLSTM+MCMC...", tempoMs:0 },
    ],
  });

  try {
    // ── FASE 1: API ─────────────────────────────────────────────
    let dadosAPI: DadosAPI;
    try { dadosAPI = await fetchAPIMultiFonte(loteria); }
    catch {
      const cfg = LOTERIAS_CONFIG[loteria];
      dadosAPI = {
        concurso: 0, data: new Date().toLocaleDateString("pt-BR"),
        numeros: Array.from({length: cfg.qtd}, () =>
          Math.floor(Math.random() * (cfg.max - cfg.min + 1)) + cfg.min
        ),
        fonte: "sintetico",
      };
    }

    setPipeline(loteria, { dadosAPI });
    if (dadosAPI.mesSorte) setPipeline(loteria, { mesSorte: dadosAPI.mesSorte });

    const numerosBase = dadosAPI.numeros;
    const cfg = LOTERIAS_CONFIG[loteria];

    // ── FASE 2: BiLSTM (DESBLOQUEADO) ───────────────────────────
    setModelo(loteria, "bilstm", { status:"running", progresso:0, detalhes:"Iniciando BiLSTM..." });

    const rBiLSTM = await rodarBiLSTM(
      loteria, numerosBase,
      (p, d) => setModelo(loteria, "bilstm", { progresso: p, detalhes: d })
    );

    setModelo(loteria, "bilstm", {
      status: "done", progresso: 100,
      numeros: rBiLSTM.numeros, confianca: rBiLSTM.confianca,
      detalhes: rBiLSTM.detalhe, tempoMs: rBiLSTM.ms,
    });
    _state.modelosConcluidos++;
    emit();

    // ── FASE 3: MCMC ─────────────────────────────────────────────
    setModelo(loteria, "mcmc", { status:"running", progresso:0, detalhes:"Iniciando MCMC..." });

    const rMCMC = await rodarMCMC(
      loteria, numerosBase,
      (p, d) => setModelo(loteria, "mcmc", { progresso: p, detalhes: d })
    );

    setModelo(loteria, "mcmc", {
      status: "done", progresso: 100,
      numeros: rMCMC.numeros, confianca: rMCMC.confianca,
      detalhes: rMCMC.detalhe, tempoMs: rMCMC.ms,
    });
    _state.modelosConcluidos++;
    emit();

    // ── FASE 4: Stacking (DESBLOQUEADO — recebe outputs reais) ───
    setModelo(loteria, "stacking", {
      status: "running", progresso: 0,
      detalhes: `Recebendo ${rBiLSTM.numeros.length} outputs BiLSTM + ${rMCMC.numeros.length} MCMC...`
    });

    const rStack = await rodarStacking(
      loteria, numerosBase,
      rBiLSTM.numeros, rMCMC.numeros,
      (p, d) => setModelo(loteria, "stacking", { progresso: p, detalhes: d })
    );

    setModelo(loteria, "stacking", {
      status: "done", progresso: 100,
      numeros: rStack.numeros, confianca: rStack.confianca,
      detalhes: rStack.detalhe, tempoMs: rStack.ms,
    });
    _state.modelosConcluidos++;
    emit();

    // ── FASE 5: Ensemble ponderado final ─────────────────────────
    const ensemble = calcularEnsemble(
      rBiLSTM.numeros, rMCMC.numeros, rStack.numeros, cfg
    );

    const score = Math.floor(
      (rBiLSTM.confianca * 10 + rMCMC.confianca * 55 + rStack.confianca * 35) / 100
    );

    setPipeline(loteria, {
      status: "done",
      ensemble,
      score,
      timestampFim: new Date().toLocaleTimeString("pt-BR"),
    });

  } catch (e: any) {
    setPipeline(loteria, {
      status: "error",
      erroMsg: e?.message ?? "Erro desconhecido",
      timestampFim: new Date().toLocaleTimeString("pt-BR"),
    });
    // Reset modelos travados
    const p = _state.pipelines[loteria];
    p.modelos.forEach((m, i) => {
      if (m.status === "idle" || m.status === "running") {
        p.modelos[i] = { ...m, status:"error", detalhes:"Erro — será reexecutado" };
      }
    });
    emit();
  } finally {
    _state.rodando.delete(loteria);
    _state.ultimaExecucao = new Date().toLocaleTimeString("pt-BR");
    emit();
  }
}

// ── Rodar TODAS em paralelo com stagger ─────────────────────────
export async function godRunAll(): Promise<void> {
  _state.ciclos++;
  _state.totalModelos = 0;
  _state.modelosConcluidos = 0;
  emit();

  await Promise.allSettled(
    TODAS_LOTERIAS.map((l, i) =>
      new Promise<void>(res => setTimeout(() => godRunPipeline(l).then(res), i * 700))
    )
  );

  _state.ultimaExecucao = new Date().toLocaleTimeString("pt-BR");
  emit();
}

// ── AUTO-PIPELINE GLOBAL ─────────────────────────────────────────
let _timer: ReturnType<typeof setInterval> | null = null;
let _booted = false;

export function godActivate(intervaloMin = 10): void {
  if (!_booted) {
    _booted = true;
    _state.autoPipelineAtivo = true;
    godRunAll(); // primeira execução IMEDIATA
    emit();
  }
  if (_timer) clearInterval(_timer);
  _timer = setInterval(() => godRunAll(), intervaloMin * 60 * 1000);
}

export function godDeactivate(): void {
  if (_timer) { clearInterval(_timer); _timer = null; }
  _state.autoPipelineAtivo = false;
  emit();
}

// ── Getters ──────────────────────────────────────────────────────
export function godGetState() { return snapshot(); }
export function godGetPipeline(l: LoteriaNome) { return _state.pipelines[l]; }
export function godIsRunning(l: LoteriaNome) { return _state.rodando.has(l); }
export function godGetProgress(): number {
  if (_state.totalModelos === 0) return 0;
  return Math.round((_state.modelosConcluidos / _state.totalModelos) * 100);
}
