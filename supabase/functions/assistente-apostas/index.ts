// Assistente: responde perguntas sobre as apostas e concursos conferidos do usuário,
// usando somente dados oficiais gravados no banco.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { convertToModelMessages, type UIMessage } from "npm:ai";
import { createResponsesCall } from "../_shared/responses.ts";

const json = (b: unknown, s: number) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ error: "Faça login para usar o assistente." }, 401);
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } }, auth: { persistSession: false },
  });
  const { data: u } = await db.auth.getUser(auth.slice(7));
  if (!u?.user) return json({ error: "Sessão inválida." }, 401);

  let messages: UIMessage[];
  try {
    const body = await req.json();
    messages = body?.messages;
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 60) throw new Error();
  } catch { return json({ error: "Mensagens inválidas." }, 400); }

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return json({ error: "Assistente não configurado." }, 500);

  const [{ data: apostas }, { data: premios }, { data: resultados }] = await Promise.all([
    db.from("apostas_confirmadas").select("loteria, concurso, concurso_verificado, numeros, numeros_sorteados, pontos_acertados, valor_premio, descricao_faixa, status_verificacao, data_sorteio, horario_confirmacao").order("horario_confirmacao", { ascending: false }).limit(60),
    db.from("financeiro_premiacoes").select("loteria, concurso, acertos, descricao_faixa, valor_bruto, valor_liquido, status_pagamento").order("data_lancamento", { ascending: false }).limit(40),
    db.from("resultados_sorteios").select("loteria, concurso, dezenas, data_apuracao, acumulado").order("concurso", { ascending: false }).limit(90),
  ]);

  const system = `Você é o Assistente de Conferência do DOMMO CORE. Responda em português do Brasil, de forma clara e curta.
Use SOMENTE os dados abaixo (apostas do usuário, prêmios e resultados oficiais registrados). Se a informação não estiver nos dados, diga que não há registro.
Explique acertos (quais números bateram), faixas de prêmio e valores. Prêmios líquidos descontam 30% de imposto.
Ao falar de tendências (números mais frequentes, atrasados), deixe claro que sorteios são aleatórios: o passado não aumenta a chance de acerto e nenhuma estratégia garante prêmio. Nunca prometa porcentagens de acerto.
Horário de referência: Brasília.

APOSTAS (mais recentes): ${JSON.stringify(apostas ?? [])}
PRÊMIOS: ${JSON.stringify(premios ?? [])}
RESULTADOS OFICIAIS: ${JSON.stringify(resultados ?? [])}`;

  const call = createResponsesCall(
    req,
    { baseURL: "https://ai.gateway.lovable.dev/v1", apiKey, model: "openai/gpt-6-astra" },
    await convertToModelMessages(messages),
    system,
  );
  return call.response().then((r) =>
    new Response(r.body, {
      status: r.status,
      headers: { ...Object.fromEntries(r.headers), ...corsHeaders },
    })
  );
});
