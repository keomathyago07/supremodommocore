// DOMMO CORE v23 — Conferidor Definitivo (por DATA, nunca por ID)
// - Busca resultado oficial via API apiloterias.com.br + fallback ao banco
// - Confere apostas pela data do sorteio (não pelo ID interno)
// - Notifica prêmios com VALOR REAL e instruções de resgate
// - Atualiza tabela proximo_concurso para sincronizar IDs reais

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.10";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SLEEP = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Calendário oficial (BRT, 0=domingo)
const CALENDARIO: Record<string, number[]> = {
  megasena: [2, 4, 6],
  lotofacil: [1, 2, 3, 4, 5, 6],
  quina: [1, 2, 3, 4, 5, 6],
  lotomania: [1, 3, 5],
  timemania: [2, 4, 6],
  duplasena: [2, 4, 6],
  diadesorte: [1, 2, 4, 6],
  supersete: [1, 3],
  maismilionaria: [2, 6],
};

const NOMES: Record<string, string> = {
  megasena: "Mega-Sena",
  lotofacil: "Lotofácil",
  quina: "Quina",
  lotomania: "Lotomania",
  timemania: "Timemania",
  duplasena: "Dupla Sena",
  diadesorte: "Dia de Sorte",
  supersete: "Super Sete",
  maismilionaria: "+Milionária",
};

const LIMIARES: Record<string, number> = {
  megasena: 4,
  lotofacil: 11,
  quina: 2,
  lotomania: 0,
  timemania: 3,
  duplasena: 3,
  diadesorte: 4,
  supersete: 3,
  maismilionaria: 2,
};

const FAIXAS: Record<string, { n: number; nome: string }[]> = {
  megasena: [
    { n: 6, nome: "Sena" },
    { n: 5, nome: "Quina" },
    { n: 4, nome: "Quadra" },
  ],
  lotofacil: [15, 14, 13, 12, 11].map((n) => ({ n, nome: `${n} acertos` })),
  quina: [
    { n: 5, nome: "Quina" },
    { n: 4, nome: "Quadra" },
    { n: 3, nome: "Terno" },
    { n: 2, nome: "Duque" },
  ],
  lotomania: [
    { n: 20, nome: "20 acertos" },
    { n: 0, nome: "Zero acertos" },
  ],
  timemania: [7, 6, 5, 4, 3].map((n) => ({ n, nome: `${n} números` })),
  duplasena: [
    { n: 6, nome: "Sena" },
    { n: 5, nome: "Quina" },
    { n: 4, nome: "Quadra" },
    { n: 3, nome: "Terno" },
  ],
  diadesorte: [7, 6, 5, 4].map((n) => ({ n, nome: `${n} acertos` })),
  supersete: [7, 6, 5, 4, 3].map((n) => ({ n, nome: `${n} colunas` })),
  maismilionaria: [6, 5, 4, 3, 2].map((n) => ({ n, nome: `${n}+trevos` })),
};

function parsarData(s: string): string {
  if (!s) return "";
  if (s.includes("T")) return s.split("T")[0];
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return "";
}

function dataHojeBRT(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date());
}

function horaMinBRT(): number {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const [h, m] = fmt.format(new Date()).split(":").map(Number);
  return h * 60 + m;
}

function diaSemanaBRT(): number {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
  });
  const map: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return map[fmt.format(new Date())] ?? new Date().getDay();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const data_hoje = dataHojeBRT();
  const hora_min = horaMinBRT();
  const HORARIO_MIN = 21 * 60 + 30; // 21:30 BRT

  if (hora_min < HORARIO_MIN) {
    return new Response(
      JSON.stringify({
        status: "aguardando_sorteio",
        hora_min,
        disponivel_em: "21:30 BRT",
        msg: "Sorteios às 21:00 BRT. Conferência automática a partir de 21:30 BRT.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const dia = diaSemanaBRT();
  const loterias_hoje = Object.entries(CALENDARIO)
    .filter(([_, d]) => d.includes(dia))
    .map(([id]) => id);

  const resultados = await Promise.allSettled(
    loterias_hoje.map((l) => conferirLoteria(supabase, l, data_hoje)),
  );

  const conferidas = resultados.filter((r) => r.status === "fulfilled").length;
  const erros = resultados
    .filter((r) => r.status === "rejected")
    .map((r: any) => String(r.reason));

  return new Response(
    JSON.stringify({
      data: data_hoje,
      loterias: loterias_hoje,
      conferidas,
      erros,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});

async function conferirLoteria(
  supabase: any,
  loteria: string,
  data_hoje: string,
) {
  const nome = NOMES[loteria] ?? loteria;
  const token = Deno.env.get("API_LOTERIAS_TOKEN") ?? "";

  // 1) Tenta resultado do dia no banco
  const { data: rpcRes } = await supabase.rpc("conferir_pelo_dia", {
    p_loteria: loteria,
    p_data: data_hoje,
  });
  let res: any = rpcRes?.[0];

  // 2) Se não tem, busca direto na API
  if (!res && token) {
    try {
      const url = `https://apiloterias.com.br/app/v2/resultado?loteria=${loteria}&token=${token}&antecipado=false`;
      const r = await Promise.race([
        fetch(url),
        SLEEP(10000).then(() => {
          throw new Error("timeout");
        }),
      ]);
      if ((r as Response).ok) {
        const dados: any = await (r as Response).json();
        const data_api = parsarData(
          dados.data_concurso ?? dados.data ?? dados.dataApuracao ?? "",
        );
        if (data_api === data_hoje && dados.dezenas?.length) {
          const numeros = (dados.dezenas as any[]).map(Number);
          const premiacao_raw = dados.premiacao ?? dados.listaRateioPremio ?? [];

          await supabase.from("resultados_sorteios").upsert(
            {
              loteria,
              concurso: dados.numero_concurso ?? dados.numero,
              data_apuracao: data_hoje,
              dezenas: numeros,
              acumulado: dados.acumulou ?? false,
              raw_response: dados,
            },
            { onConflict: "loteria,concurso" } as any,
          );

          await supabase.from("proximo_concurso").upsert({
            loteria,
            concurso_atual:
              dados.proximoConcurso ??
              (dados.numero_concurso ?? dados.numero) + 1,
            data_proxima: parsarData(
              dados.dataProximoConcurso ?? dados.proximoSorteio ?? "",
            ),
            atualizado_em: new Date().toISOString(),
          });

          res = {
            concurso: dados.numero_concurso ?? dados.numero,
            data_sorteio: data_hoje,
            numeros,
            acumulado: dados.acumulou ?? false,
            raw_response: { ...dados, premiacao: premiacao_raw },
          };
        }
      }
    } catch (e) {
      console.warn(`[v23] ${loteria}: API falhou —`, e);
    }
  }

  // 3) Sem resultado: notificar aguardando (com dedupe)
  if (!res) {
    const hash = `aguardando_${loteria}_${data_hoje}_${Math.floor(Date.now() / 3600000)}`;
    const { data: existe } = await supabase
      .from("alertas_dedupe")
      .select("hash")
      .eq("hash", hash)
      .maybeSingle();
    if (!existe) {
      await supabase.from("notificacoes").insert({
        tipo: "aguardando_resultado",
        loteria,
        loteria_nome: nome,
        titulo: `Aguardando resultado — ${nome}`,
        corpo: `${data_hoje} | 21:00 BRT | resultado ainda não disponível.`,
      });
      await supabase
        .from("alertas_dedupe")
        .upsert({ hash, loteria, tipo: "aguardando" });
    }
    return { loteria, status: "aguardando" };
  }

  const numeros_reais: number[] = res.numeros ?? res.dezenas ?? [];

  // 4) Buscar apostas válidas para a data de hoje (NUNCA por ID)
  const { data: apostas } = await supabase
    .from("apostas_confirmadas")
    .select("*")
    .eq("loteria", loteria)
    .eq("concurso_invalido", false)
    .eq("data_sorteio_alvo", data_hoje);

  const lista_apostas = apostas ?? [];

  const premiacao_arr =
    res.raw_response?.premiacao ?? res.raw_response?.listaRateioPremio ?? [];
  let premiadas = 0;
  const detalhes_premiados: any[] = [];

  // Para Dupla Sena, parsear segundo sorteio da resposta da API
  const numeros_reais_2: number[] =
    loteria === "duplasena"
      ? (
          res.raw_response?.dezenas_2 ??
          res.raw_response?.dezenasSegundoSorteio ??
          res.raw_response?.dezenas2 ??
          []
        ).map(Number)
      : [];

  for (const aposta of lista_apostas) {
    // ─── Lotomania: confere PRINCIPAL + INVERTIDO (jogo duplo) ───
    let acertados: number[] = aposta.numeros.filter((n: number) =>
      numeros_reais.includes(n),
    );
    let acertados_invertido: number[] = [];
    if (loteria === "lotomania" && Array.isArray(aposta.numeros_invertido)) {
      acertados_invertido = (aposta.numeros_invertido as number[]).filter(
        (n) => numeros_reais.includes(n),
      );
      // Pontuação considera o melhor dos dois jogos (principal ou invertido)
      if (acertados_invertido.length > acertados.length) {
        acertados = acertados_invertido;
      }
    }
    const n_acertos = acertados.length;

    // ─── Dupla Sena: confere SORTEIO 1 e SORTEIO 2 ───
    let acertados_s2: number[] = [];
    let n_acertos_s2 = 0;
    if (loteria === "duplasena" && numeros_reais_2.length) {
      acertados_s2 = aposta.numeros.filter((n: number) =>
        numeros_reais_2.includes(n),
      );
      n_acertos_s2 = acertados_s2.length;
    }

    const loto_zero = loteria === "lotomania" && n_acertos === 0;
    const melhor_acertos = Math.max(n_acertos, n_acertos_s2);
    const faixa_obj = (FAIXAS[loteria] ?? []).find(
      (f) => f.n === melhor_acertos || (loto_zero && f.n === 0),
    );
    const premiada =
      melhor_acertos >= (LIMIARES[loteria] ?? 4) || loto_zero;

    let valor_premio = 0;
    if (faixa_obj && Array.isArray(premiacao_arr)) {
      const fapi = premiacao_arr.find((p: any) => {
        const desc = String(p.acertos ?? p.nome ?? p.descricao ?? "").toLowerCase();
        return (
          desc.includes(`${n_acertos} acerto`) ||
          desc.includes(faixa_obj.nome.toLowerCase())
        );
      });
      valor_premio = Number(fapi?.valor_total ?? fapi?.valorPremio ?? 0);
    }

    if (premiada) {
      premiadas++;
      detalhes_premiados.push({
        user_id: aposta.user_id,
        n_acertos,
        faixa: faixa_obj?.nome,
        acertados,
        valor_premio,
      });
    }

    // Persistir verificação detalhada
    await supabase.from("verificacoes_sorteio").upsert(
      {
        aposta_id: aposta.id,
        user_id: aposta.user_id,
        loteria,
        concurso: res.concurso,
        data_sorteio: res.data_sorteio,
        numeros_apostados: aposta.numeros,
        numeros_sorteados: numeros_reais,
        acertos_s1: n_acertos,
        acertos_total: n_acertos,
        faixa_s1: faixa_obj?.nome ?? null,
        valor_s1: valor_premio,
        valor_total: valor_premio,
        premiado: premiada,
        verificado_em: new Date().toISOString(),
      },
      { onConflict: "aposta_id" } as any,
    );

    // Atualizar status da aposta confirmada
    await supabase
      .from("apostas_confirmadas")
      .update({
        status_verificacao: "verificada",
        numeros_sorteados: numeros_reais,
        concurso_verificado: res.concurso,
        data_sorteio: res.data_sorteio,
        pontos_acertados: n_acertos,
        descricao_faixa: faixa_obj?.nome ?? null,
        valor_premio,
      })
      .eq("id", aposta.id);
  }

  await notificarResultado(
    supabase,
    loteria,
    nome,
    res,
    numeros_reais,
    lista_apostas.length,
    premiadas,
    detalhes_premiados,
  );

  return {
    loteria,
    status: "conferido",
    concurso: res.concurso,
    apostas: lista_apostas.length,
    premiadas,
  };
}

async function notificarResultado(
  supabase: any,
  loteria: string,
  nome: string,
  res: any,
  numeros_reais: number[],
  total: number,
  premiadas: number,
  dets: any[],
) {
  const numeros_fmt = [...numeros_reais]
    .sort((a, b) => a - b)
    .map((n) => String(n).padStart(2, "0"))
    .join(", ");

  await supabase.from("notificacoes").insert({
    tipo: premiadas > 0 ? "resultado_premiado" : "resultado_conferido",
    loteria,
    loteria_nome: nome,
    titulo: `${nome} #${res.concurso} — ${
      premiadas > 0 ? `${premiadas} PREMIADA(S)!` : "Conferido"
    }`,
    corpo: [
      `Data: ${res.data_sorteio} | Horário: 21:00 BRT`,
      `Números sorteados: ${numeros_fmt}`,
      `${total} aposta(s) | ${premiadas} premiada(s)`,
      res.acumulado ? "ACUMULOU — próximo prêmio maior!" : "",
    ]
      .filter(Boolean)
      .join("\n"),
  });

  for (const det of dets) {
    const valor_fmt =
      det.valor_premio > 0
        ? `R$ ${Number(det.valor_premio).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`
        : "Verificar na lotérica (rateio ainda não divulgado)";

    await supabase.from("notificacoes").insert({
      tipo: "PREMIADO",
      emoji: "🏆",
      prioridade: "maxima",
      user_id: det.user_id,
      loteria,
      loteria_nome: nome,
      titulo: `🏆 PARABÉNS! Você ganhou na ${nome}!`,
      corpo: [
        `Concurso: #${res.concurso}`,
        `Data do sorteio: ${res.data_sorteio} às 21:00 BRT`,
        `Números sorteados: ${numeros_fmt}`,
        `Seus números acertados: ${[...det.acertados]
          .sort((a: number, b: number) => a - b)
          .map((n: number) => String(n).padStart(2, "0"))
          .join(", ")}`,
        `Acertos: ${det.n_acertos}`,
        `Faixa premiada: ${det.faixa}`,
        `VALOR A RECEBER: ${valor_fmt}`,
        "",
        "Para resgatar:",
        "  • Prêmio até R$ 2.259,20: qualquer casa lotérica",
        "  • Prêmio acima de R$ 2.259,20: agência Caixa com RG e CPF",
        "  • Prazo: 90 dias após o sorteio",
      ].join("\n"),
    });
  }
}
