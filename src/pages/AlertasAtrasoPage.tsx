// DOMMO CORE v18 — Página de Alertas Críticos (todas as 9 loterias)
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, RefreshCw, Bell } from "lucide-react";
import { usePollingResultados } from "@/hooks/usePollingResultados";
import { toast } from "sonner";

const LOTERIA_NOMES: Record<string, string> = {
  megasena: "Mega-Sena", lotofacil: "Lotofácil", quina: "Quina",
  lotomania: "Lotomania", timemania: "Timemania", duplasena: "Dupla Sena",
  diadesorte: "Dia de Sorte", supersete: "Super Sete", maismilionaria: "+Milionária",
};

interface Alerta {
  id: string;
  loteria: string;
  numero: number;
  atraso: number;
  concurso_referencia: number | null;
  criado_em: string;
}

export default function AlertasAtrasoPage() {
  usePollingResultados();
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [calendario, setCalendario] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const carregar = async () => {
    setLoading(true);
    const [{ data: a }, { data: c }] = await Promise.all([
      supabase.from("alertas_atraso").select("*").order("criado_em", { ascending: false }).limit(100),
      supabase.from("loterias_calendario").select("*").order("loteria"),
    ]);
    setAlertas((a as any) ?? []);
    setCalendario((c as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  const sincronizarAgora = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-e-confere", { body: {} });
      if (error) throw error;
      toast.success(`Sincronização v18 executada — ${(data?.resultados ?? []).length} loterias`);
      await carregar();
    } catch (e: any) {
      toast.error("Falha ao sincronizar: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Agrupa por loteria
  const porLoteria = new Map<string, Alerta[]>();
  for (const a of alertas) {
    if (!porLoteria.has(a.loteria)) porLoteria.set(a.loteria, []);
    porLoteria.get(a.loteria)!.push(a);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold glow-text-primary flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-yellow-400" />
            Alertas Atraso Crítico — 9 Loterias
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            v18 SUPREMO — Polling 21h-23h BRT · Dedup TTL 6h · Calendário oficial
          </p>
        </div>
        <Button onClick={sincronizarAgora} disabled={loading} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Sincronizar Agora
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Calendário Oficial — Thresholds por Loteria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            {calendario.map((c) => (
              <div key={c.loteria} className="border border-border rounded-lg p-2 text-xs">
                <div className="font-bold text-primary">{LOTERIA_NOMES[c.loteria] ?? c.loteria}</div>
                <div className="text-muted-foreground">Threshold: {c.threshold_atraso}</div>
                <div className="text-muted-foreground">{c.dias_semana?.length} dias/sem</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from(porLoteria.entries()).map(([loteria, lista]) => (
          <Card key={loteria} className="border-yellow-600/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="w-4 h-4 text-yellow-400" />
                {LOTERIA_NOMES[loteria] ?? loteria}
                <Badge variant="outline">{lista.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {lista.slice(0, 8).map((a) => (
                <div key={a.id} className="flex items-center justify-between text-sm py-1 border-b border-border/30 last:border-0">
                  <span className="font-mono font-bold text-primary">#{a.numero.toString().padStart(2, "0")}</span>
                  <span className="text-yellow-400 font-bold">{a.atraso} sorteios</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(a.criado_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
        {alertas.length === 0 && !loading && (
          <Card className="md:col-span-3">
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhum alerta crítico. Sistema vigilante 24/7.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
