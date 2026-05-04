// DOMMO CORE v23 — Conferidor Definitivo (Frontend)
// Layout reformulado: resultado do dia + apostas válidas + alertas de prêmio
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trophy, Clock } from "lucide-react";

const NOMES: Record<string, string> = {
  megasena: "Mega-Sena", lotofacil: "Lotofácil", quina: "Quina",
  lotomania: "Lotomania", timemania: "Timemania", duplasena: "Dupla Sena",
  diadesorte: "Dia de Sorte", supersete: "Super Sete", maismilionaria: "+Milionária",
};
const CORES: Record<string, string> = {
  megasena: "#209869", lotofacil: "#930089", quina: "#260085",
  lotomania: "#F78100", timemania: "#00A6E2", duplasena: "#A6CE2E",
  diadesorte: "#F08E12", supersete: "#009444", maismilionaria: "#27259F",
};
const CALENDARIO: Record<string, number[]> = {
  megasena: [2, 4, 6], lotofacil: [1, 2, 3, 4, 5, 6], quina: [1, 2, 3, 4, 5, 6],
  lotomania: [1, 3, 5], timemania: [2, 4, 6], duplasena: [2, 4, 6],
  diadesorte: [1, 2, 4, 6], supersete: [1, 3], maismilionaria: [2, 6],
};

function dataHojeBRT(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}
function horaMinBRT(): number {
  const [h, m] = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date()).split(":").map(Number);
  return h * 60 + m;
}
function diaSemanaBRT(): number {
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo", weekday: "short",
  }).format(new Date())] ?? 0;
}

export default function ConferidorV23Page() {
  const hoje = dataHojeBRT();
  const hora = horaMinBRT();
  const sorteio_passou = hora >= 21 * 60 + 30;

  const [resultados, setResultados] = useState<Record<string, any>>({});
  const [apostas, setApostas] = useState<Record<string, any[]>>({});
  const [carregando, setCarregando] = useState(false);

  const dia = diaSemanaBRT();
  const loterias_hoje = Object.entries(CALENDARIO)
    .filter(([_, d]) => d.includes(dia)).map(([id]) => id);

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    try {
      const res_map: Record<string, any> = {};
      const ap_map: Record<string, any[]> = {};
      for (const lot of loterias_hoje) {
        const { data: r } = await supabase.rpc("conferir_pelo_dia", {
          p_loteria: lot, p_data: hoje,
        });
        res_map[lot] = r?.[0] ?? null;

        const { data: a } = await supabase
          .from("apostas_confirmadas")
          .select("*")
          .eq("loteria", lot)
          .eq("concurso_invalido", false)
          .eq("data_sorteio_alvo", hoje)
          .order("horario_confirmacao", { ascending: false });
        ap_map[lot] = a ?? [];
      }
      setResultados(res_map);
      setApostas(ap_map);
    } finally {
      setCarregando(false);
    }
  }, [hoje, loterias_hoje.join(",")]);

  useEffect(() => {
    carregarDados();
    if (sorteio_passou) {
      const iv = setInterval(carregarDados, 5 * 60 * 1000);
      return () => clearInterval(iv);
    }
  }, [carregarDados, sorteio_passou]);

  const conferirAgora = async () => {
    setCarregando(true);
    try {
      await supabase.functions.invoke("conferidor-v23", { body: {} });
      await carregarDados();
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen p-4 space-y-4 bg-background">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Conferência V23 — Definitiva</h1>
          <p className="text-sm text-muted-foreground">
            {hoje} • {loterias_hoje.length} loteria(s) hoje • Por DATA, nunca por ID
          </p>
        </div>
        <Button onClick={conferirAgora} disabled={!sorteio_passou || carregando}>
          {carregando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          {sorteio_passou ? "Conferir agora" : "Aguardando 21:30 BRT"}
        </Button>
      </div>

      {loterias_hoje.length === 0 && (
        <Card><CardContent className="p-6 text-center text-muted-foreground">
          Nenhum sorteio oficial hoje.
        </CardContent></Card>
      )}

      {loterias_hoje.map((lot) => {
        const res = resultados[lot];
        const aps = apostas[lot] ?? [];
        const cor = CORES[lot] ?? "#888";
        const nome = NOMES[lot] ?? lot;
        const numeros_reais: number[] = res?.numeros ?? res?.dezenas ?? [];

        return (
          <Card key={lot} style={{ borderLeft: `4px solid ${cor}` }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle style={{ color: cor }}>{nome}</CardTitle>
              {res ? (
                <Badge variant="outline" className="text-green-500">
                  #{res.concurso} • {res.data_sorteio}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-yellow-500">
                  <Clock className="w-3 h-3 mr-1" />
                  Aguardando 21:00 BRT
                </Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {res && numeros_reais.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Números sorteados hoje:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[...numeros_reais].sort((a, b) => a - b).map((n) => (
                      <span key={n}
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
                        style={{ background: cor }}>
                        {String(n).padStart(2, "0")}
                      </span>
                    ))}
                  </div>
                  {res.acumulado && (
                    <p className="text-yellow-500 text-xs mt-2 font-semibold">
                      ACUMULOU — próximo prêmio maior!
                    </p>
                  )}
                </div>
              )}

              <div className="border-t pt-3">
                <p className="text-xs text-muted-foreground mb-2">
                  {aps.length} aposta(s) confirmada(s) para hoje:
                </p>
                {aps.length === 0 && (
                  <p className="text-xs italic text-muted-foreground">
                    Nenhuma aposta cadastrada para o sorteio de hoje.
                  </p>
                )}
                {aps.map((ap) => {
                  const acertados = res
                    ? ap.numeros.filter((n: number) => numeros_reais.includes(n))
                    : [];
                  const conferida = !!res;
                  const premiada = conferida && acertados.length >= 4;
                  return (
                    <div key={ap.id}
                      className={`rounded-lg p-2 mb-2 border ${
                        premiada ? "bg-green-500/10 border-green-500"
                          : "bg-muted/40 border-border"
                      }`}>
                      <div className="flex flex-wrap gap-1.5">
                        {ap.numeros.map((n: number) => (
                          <span key={n}
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                              acertados.includes(n)
                                ? "bg-green-500 text-white"
                                : "bg-muted text-muted-foreground"
                            }`}>
                            {String(n).padStart(2, "0")}
                          </span>
                        ))}
                      </div>
                      {conferida && (
                        <div className="mt-2 flex items-center gap-3 text-xs">
                          <span className={premiada ? "text-green-500 font-bold" : "text-muted-foreground"}>
                            {acertados.length} acertos
                          </span>
                          {premiada && (
                            <span className="text-green-500 flex items-center gap-1">
                              <Trophy className="w-3 h-3" /> PREMIADA!
                            </span>
                          )}
                        </div>
                      )}
                      {!conferida && (
                        <p className="text-yellow-500 text-xs mt-1">
                          Aguardando resultado das 21:00 BRT
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// Hook para auto-conferência entre 21:30 e 23:00 BRT (cada 15 min)
export function useAutoConferenciaV23() {
  useEffect(() => {
    const verificar = async () => {
      const h = horaMinBRT();
      if (h >= 21 * 60 + 30 && h <= 23 * 60) {
        try {
          await supabase.functions.invoke("conferidor-v23", { body: {} });
        } catch (e) {
          console.warn("[v23] auto-conferência falhou", e);
        }
      }
    };
    verificar();
    const iv = setInterval(verificar, 15 * 60 * 1000);
    return () => clearInterval(iv);
  }, []);
}
