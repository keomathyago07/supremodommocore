// ============================================================
// apiResilient.ts — Cliente API resiliente para loterias
// - Múltiplos endpoints (failover)
// - Retry com backoff exponencial + jitter
// - Headers rotativos (User-Agent / Accept)
// - Timeout via AbortController
// - Nunca lança: retorna { ok, data, source, error }
// ============================================================

import { useResilientStats } from "./resilientStats";

export interface ResilientResult {
  ok: boolean;
  data?: any;
  source?: string;
  concurso?: number;
  attempts: number;
  error?: string;
  latencyMs?: number;
}

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  "DommoCore/3.0 (+lovable)",
];

function pickHeaders(attempt: number): HeadersInit {
  return {
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    "User-Agent": USER_AGENTS[attempt % USER_AGENTS.length],
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
  };
}

async function fetchWithTimeout(url: string, init: RequestInit, ms: number) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

function extractConcurso(data: any): number | undefined {
  if (!data || typeof data !== "object") return undefined;
  return data.numero_concurso ?? data.concurso ?? data.numero ?? data.numeroDoConcurso;
}

/**
 * Testa a conexão tentando múltiplos endpoints com retry e backoff.
 * NUNCA lança — sempre devolve um objeto de resultado.
 */
export async function testLotteryConnection(token: string, opts?: {
  loteria?: string;
  maxRetries?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}): Promise<ResilientResult> {
  const loteria = opts?.loteria ?? "megasena";
  const maxRetries = opts?.maxRetries ?? 3;
  const timeoutMs = opts?.timeoutMs ?? 8000;

  // Lista de endpoints (ordem = prioridade). Failover automático.
  const endpoints = [
    { name: "apiloterias-v2", url: `https://apiloterias.com.br/app/v2/resultado?loteria=${loteria}&token=${encodeURIComponent(token)}` },
    { name: "apiloterias-v1", url: `https://apiloterias.com.br/app/resultado?loteria=${loteria}&token=${encodeURIComponent(token)}` },
    { name: "guidi-fallback", url: `https://loteriascaixa-api.herokuapp.com/api/${loteria}/latest` },
  ];

  let attempts = 0;
  let lastError = "";

  for (const ep of endpoints) {
    for (let i = 0; i < maxRetries; i++) {
      attempts++;
      if (opts?.signal?.aborted) {
        return { ok: false, attempts, error: "aborted" };
      }
      try {
        const res = await fetchWithTimeout(ep.url, { headers: pickHeaders(attempts) }, timeoutMs);
        if (res.ok) {
          const data = await res.json().catch(() => null);
          const concurso = extractConcurso(data);
          if (data && concurso) {
            return { ok: true, data, concurso, source: ep.name, attempts };
          }
          lastError = `resposta sem concurso (${ep.name})`;
        } else {
          lastError = `HTTP ${res.status} em ${ep.name}`;
          // 401/403 = token inválido — não adianta tentar de novo o mesmo endpoint
          if (res.status === 401 || res.status === 403) break;
        }
      } catch (e: any) {
        lastError = `${ep.name}: ${e?.message ?? "erro de rede"}`;
      }
      // Backoff exponencial com jitter (0.5s, 1s, 2s ... + 0-300ms)
      const delay = Math.min(5000, 500 * Math.pow(2, i)) + Math.floor(Math.random() * 300);
      await new Promise((r) => setTimeout(r, delay));
    }
    // próximo endpoint
  }

  return { ok: false, attempts, error: lastError || "Todos os endpoints falharam" };
}
