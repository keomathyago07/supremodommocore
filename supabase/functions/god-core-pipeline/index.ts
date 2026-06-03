// IASV60+ GOD CORE — Pipeline server-side com multi-source ingest e fallback
// Sempre responde algo (nunca trava). Suporta actions: ingest | lstm | stacking | mcmc
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOTERIAS_DEFAULT = [
  "megasena", "quina", "lotofacil", "lotomania",
  "timemania", "duplasena", "diadesorte", "supersete", "maismilionaria",
];

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function fetchFromCaixa(loteria: string) {
  const url = `https://servicebus2.caixa.gov.br/portaldeloterias/api/${loteria}`;
  try {
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!r.ok) return null;
    const j = await r.json();
    const dezenas: number[] = (j.listaDezenas ?? j.dezenas ?? []).map((d: string) => parseInt(d, 10));
    if (dezenas.length === 0) return null;
    return { numeros: dezenas, concurso: j.numero, data: j.dataApuracao, source: "caixa" };
  } catch {
    return null;
  }
}

async function fetchFromGuidi(loteria: string) {
  const url = `https://loteriascaixa-api.herokuapp.com/api/${loteria}/latest`;
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const j = await r.json();
    const dezenas: number[] = (j.dezenas ?? []).map((d: string) => parseInt(d, 10));
    if (dezenas.length === 0) return null;
    return { numeros: dezenas, concurso: j.concurso, data: j.data, source: "guidi" };
  } catch {
    return null;
  }
}

async function fetchFromDB(loteria: string) {
  const { data } = await supabase
    .from("resultados_sorteios")
    .select("dezenas, concurso, data_apuracao")
    .eq("loteria", loteria)
    .order("concurso", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return { numeros: data.dezenas, concurso: data.concurso, data: data.data_apuracao, source: "db" };
}

async function fetchOne(loteria: string) {
  return (await fetchFromCaixa(loteria))
      ?? (await fetchFromGuidi(loteria))
      ?? (await fetchFromDB(loteria));
}

async function ingestAll(lotteries: string[]) {
  const results: Record<string, any> = {};
  await Promise.all(lotteries.map(async (lot) => {
    const d = await fetchOne(lot);
    if (d) results[lot] = d;
  }));
  return results;
}

// === Modelos (versões leves no edge — sempre retornam algo) ===
function frequencyTop(numbers: number[], k = 10) {
  const c = new Map<number, number>();
  for (const n of numbers) c.set(n, (c.get(n) ?? 0) + 1);
  return [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, k);
}

function runLSTMLite(data: Record<string, number[]>) {
  // Aproximação LSTM-lite: peso recente x frequência (sem ML real, mas nunca falha)
  const out: Record<string, any> = {};
  for (const [lot, nums] of Object.entries(data)) {
    const recent = nums.slice(-30);
    out[lot] = { top: frequencyTop(recent, 15), method: "lstm-lite" };
  }
  return out;
}

function runStackingLite(data: Record<string, number[]>) {
  const out: Record<string, any> = {};
  for (const [lot, nums] of Object.entries(data)) {
    const all = frequencyTop(nums, 20);
    const recent = frequencyTop(nums.slice(-15), 15);
    const merged = new Map<number, number>();
    [...all, ...recent].forEach(([n, c]) => merged.set(n, (merged.get(n) ?? 0) + c));
    out[lot] = { top: [...merged.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15), method: "stacking-lite" };
  }
  return out;
}

function runMCMCLite(data: Record<string, number[]>) {
  // Sampling pseudo-MCMC: amostragem ponderada por frequência
  const out: Record<string, any> = {};
  for (const [lot, nums] of Object.entries(data)) {
    const freq = frequencyTop(nums, 30);
    const total = freq.reduce((a, [, c]) => a + c, 0) || 1;
    const sampled: number[] = [];
    for (let i = 0; i < 15; i++) {
      let r = Math.random() * total;
      for (const [n, c] of freq) {
        r -= c;
        if (r <= 0) { sampled.push(n); break; }
      }
    }
    out[lot] = { top: [...new Set(sampled)].map((n) => [n, 1]), method: "mcmc-lite" };
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const authClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data: claimsData, error: claimsErr } = await authClient.auth.getClaims(
    authHeader.replace("Bearer ", ""),
  );
  if (claimsErr || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action ?? "ingest";

    if (action === "ingest") {
      const lots = Array.isArray(body.lotteries) && body.lotteries.length ? body.lotteries : LOTERIAS_DEFAULT;
      const results = await ingestAll(lots);
      return new Response(JSON.stringify({ ok: true, results, ts: new Date().toISOString() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data: Record<string, number[]> = body.data ?? {};
    if (!data || Object.keys(data).length === 0) {
      // Nunca retorna vazio: fallback automático
      return new Response(JSON.stringify({ ok: true, fallback: true, top: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let out: any = {};
    if (action === "lstm") out = runLSTMLite(data);
    else if (action === "stacking") out = runStackingLite(data);
    else if (action === "mcmc") out = runMCMCLite(data);
    else out = { error: "unknown action" };

    return new Response(JSON.stringify({ ok: true, action, result: out }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    // Nunca trava: erro vira fallback
    return new Response(JSON.stringify({ ok: false, error: String(e), fallback: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
