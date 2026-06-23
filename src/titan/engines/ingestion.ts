// ============================================================
// engines/ingestion.ts — Ingestão resiliente de loterias
// Port TS de: Ingestão de dados reais (Python)
// Múltiplas APIs em cadeia de fallback, retry com backoff exponencial,
// timeout curto por tentativa e normalização de payload.
// ============================================================

export interface NormalizedDraw {
  concurso: string;
  numbers: number[];
  raw: Record<string, unknown>;
}

export interface IngestionConfig {
  apis: string[];          // base URLs, ex: ["https://api1.com", "https://api2.com"]
  pathTemplate?: (api: string, lottery: string) => string; // default `${api}/${lottery}/latest`
  timeoutMs?: number;      // default 3000
  attempts?: number;       // default 3
  backoffMultiplier?: number; // default 500ms
  backoffMaxMs?: number;   // default 4000
}

const DEFAULT_APIS = [
  "https://loteriascaixa-api.herokuapp.com/api",
  "https://servicebus2.caixa.gov.br/portaldeloterias/api",
];

function defaultPath(api: string, lottery: string) {
  return `${api}/${lottery}/latest`;
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    return r;
  } finally {
    clearTimeout(t);
  }
}

async function fetchOne(
  api: string,
  lottery: string,
  cfg: Required<Pick<IngestionConfig, "timeoutMs" | "attempts" | "backoffMultiplier" | "backoffMaxMs" | "pathTemplate">>,
): Promise<Record<string, unknown>> {
  let lastErr: unknown;
  for (let i = 0; i < cfg.attempts; i++) {
    try {
      const url = cfg.pathTemplate(api, lottery);
      const r = await fetchWithTimeout(url, cfg.timeoutMs);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return (await r.json()) as Record<string, unknown>;
    } catch (e) {
      lastErr = e;
      const wait = Math.min(cfg.backoffMultiplier * Math.pow(2, i), cfg.backoffMaxMs);
      await new Promise((res) => setTimeout(res, wait));
    }
  }
  throw lastErr ?? new Error("fetch failed");
}

function normalize(payload: Record<string, unknown>): NormalizedDraw | null {
  const candidateKeys = ["numeros", "dezenas", "numbers", "listaDezenas"] as const;
  for (const k of candidateKeys) {
    const v = (payload as Record<string, unknown>)[k];
    if (Array.isArray(v)) {
      const nums = v.map((n) => Number(n)).filter((n) => Number.isFinite(n));
      if (!nums.length) continue;
      const concurso =
        (payload["concurso"] as string | number | undefined) ??
        (payload["numero"] as string | number | undefined) ??
        "";
      return {
        concurso: String(concurso),
        numbers: [...nums].sort((a, b) => a - b),
        raw: payload,
      };
    }
  }
  return null;
}

export async function fetchLottery(
  lottery: string,
  config: IngestionConfig = { apis: DEFAULT_APIS },
): Promise<NormalizedDraw | null> {
  const cfg = {
    apis: config.apis?.length ? config.apis : DEFAULT_APIS,
    pathTemplate: config.pathTemplate ?? defaultPath,
    timeoutMs: config.timeoutMs ?? 3000,
    attempts: config.attempts ?? 3,
    backoffMultiplier: config.backoffMultiplier ?? 500,
    backoffMaxMs: config.backoffMaxMs ?? 4000,
  };

  for (const api of cfg.apis) {
    try {
      const payload = await fetchOne(api, lottery, cfg);
      const normalized = normalize(payload);
      if (normalized) {
        console.info(`[ingestion] OK ${lottery} via ${api}`);
        return normalized;
      }
      console.warn(`[ingestion] payload sem dezenas em ${api}`);
    } catch (e) {
      console.warn(`[ingestion] falha ${api} para ${lottery}:`, e);
    }
  }
  console.error(`[ingestion] todas APIs falharam para ${lottery}`);
  return null;
}
