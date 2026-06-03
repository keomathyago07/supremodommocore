// DOMMO CORE v18 — Sync e Conferência Suprema (9 loterias, calendário-aware, dedup)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOTERIAS = [
  "megasena", "lotofacil", "quina", "lotomania",
  "timemania", "duplasena", "diadesorte", "supersete", "maismilionaria"
];

// Mapas para Caixa API (loteriascaixa-api.herokuapp.com — sem token)
const API_CAIXA = (l: string) => `https://loteriascaixa-api.herokuapp.com/api/${l}/latest`;
const API_GUIDI = (l: string) => `https://api.guidi.dev.br/loteria/${l}/ultimo`;

async function fetchComFallback(loteria: string) {
  for (const url of [API_CAIXA(loteria), API_GUIDI(loteria)]) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) continue;
      const json = await res.json();
      const dezenas = json.dezenas || json.listaDezenas || json.numbers || [];
      const concurso = json.concurso || json.numero || json.numeroDoConcurso;
      const data = json.data || json.dataApuracao;
      if (concurso && dezenas?.length) {
        return {
          concurso: Number(concurso),
          dezenas: dezenas.map((n: any) => Number(n)),
          data_apuracao: data || null,
          acumulou: !!(json.acumulou ?? json.indicadorConcursoFinalZero5),
          raw: json,
        };
      }
    } catch (_) { /* try next */ }
  }
  return null;
}

function diaDaSemanaBRT(): number {
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", weekday: "short" });
  const map: Record<string, number> = { Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6 };
  return map[fmt.format(new Date())] ?? 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Require authenticated caller
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  try {
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { data: claimsData, error: claimsErr } = await authClient.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const dow = diaDaSemanaBRT();
    const { data: cal } = await supa.from("loterias_calendario").select("*");
    const calendarioMap = new Map<string, any>((cal ?? []).map((c: any) => [c.loteria, c]));

    const resultados: any[] = [];

    for (const loteria of LOTERIAS) {
      const c = calendarioMap.get(loteria);
      const temSorteioHoje = c?.dias_semana?.includes(dow) ?? false;

      if (!temSorteioHoje) {
        resultados.push({ loteria, status: "skip_sem_sorteio_hoje" });
        continue;
      }

      const dados = await fetchComFallback(loteria);
      if (!dados) {
        resultados.push({ loteria, status: "api_indisponivel" });
        continue;
      }

      // Upsert resultado
      const { error: errUp } = await supa.from("resultados_sorteios").upsert({
        loteria,
        concurso: dados.concurso,
        dezenas: dados.dezenas,
        data_apuracao: dados.data_apuracao,
        acumulado: dados.acumulou,
        raw_response: dados.raw,
      }, { onConflict: "loteria,concurso" } as any);

      // Calcular atrasos para alertas críticos
      if (c?.threshold_atraso && c.qtd_dezenas_total) {
        const { data: ultimos } = await supa
          .from("resultados_sorteios")
          .select("dezenas")
          .eq("loteria", loteria)
          .order("concurso", { ascending: false })
          .limit(40);

        const atrasos = new Map<number, number>();
        for (let n = 1; n <= c.qtd_dezenas_total; n++) atrasos.set(n, 0);

        let i = 0;
        for (const r of (ultimos ?? [])) {
          const set = new Set((r.dezenas as number[]).map(Number));
          for (let n = 1; n <= c.qtd_dezenas_total; n++) {
            if (atrasos.get(n) === i && !set.has(n)) atrasos.set(n, i + 1);
          }
          i++;
        }

        const criticos = [...atrasos.entries()]
          .filter(([_, a]) => a >= c.threshold_atraso)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);

        // Inserir alertas com dedup (sem user_id — global p/ trigger fan-out)
        for (const [num, atraso] of criticos) {
          const hash = `${loteria}_${num}_${dados.concurso}`;
          const { data: dup } = await supa
            .from("alertas_dedupe").select("hash").eq("hash", hash).maybeSingle();
          if (dup) continue;
          await supa.from("alertas_dedupe").insert({ hash, loteria, tipo: "atraso" });
          // alertas serão criados por usuário via RPC chamado pelo client; aqui registramos no log
        }

        resultados.push({
          loteria,
          status: errUp ? "erro_save" : "ok",
          concurso: dados.concurso,
          criticos: criticos.map(([n, a]) => ({ numero: n, atraso: a })),
        });
      } else {
        resultados.push({ loteria, status: errUp ? "erro_save" : "ok", concurso: dados.concurso });
      }
    }

    return new Response(JSON.stringify({ ok: true, dow, resultados }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
