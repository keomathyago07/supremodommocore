import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Loader2, Trash2, AlertCircle, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type StatusAposta = "pendente" | "confirmada" | "cancelada";

interface ApostaPendente {
  id: string;
  loteria: string;
  numeros: number[];
  dominancia: number;
  precisao: number;
  horario_envio: string;
  concurso?: number;
  status: StatusAposta;
  criterios_atendidos: { nome: string; valor: string; ok: boolean }[];
}

const CRITERIOS_POR_LOTERIA: Record<string, { qtd_numeros: number; range: [number, number]; faixas_premio: { acertos: number; descricao: string }[]; custo_base: number }> = {
  Quina: { qtd_numeros: 5, range: [1, 80], faixas_premio: [{ acertos: 5, descricao: "Prêmio principal" }, { acertos: 4, descricao: "Quadra" }, { acertos: 3, descricao: "Terno" }, { acertos: 2, descricao: "Duque" }], custo_base: 2.5 },
  Lotomania: { qtd_numeros: 50, range: [0, 99], faixas_premio: [{ acertos: 20, descricao: "Prêmio principal" }, { acertos: 19, descricao: "19 acertos" }, { acertos: 18, descricao: "18 acertos" }, { acertos: 17, descricao: "17 acertos" }, { acertos: 16, descricao: "16 acertos" }, { acertos: 15, descricao: "15 acertos" }, { acertos: 0, descricao: "0 acertos" }], custo_base: 3.0 },
  "Lotofácil": { qtd_numeros: 15, range: [1, 25], faixas_premio: [{ acertos: 15, descricao: "Prêmio principal" }, { acertos: 14, descricao: "14 pontos" }, { acertos: 13, descricao: "13 pontos" }, { acertos: 12, descricao: "12 pontos" }, { acertos: 11, descricao: "11 pontos" }], custo_base: 3.0 },
  "Super Sete": { qtd_numeros: 7, range: [0, 9], faixas_premio: [{ acertos: 7, descricao: "Prêmio principal" }, { acertos: 6, descricao: "6 colunas" }, { acertos: 5, descricao: "5 colunas" }, { acertos: 4, descricao: "4 colunas" }, { acertos: 3, descricao: "3 colunas" }], custo_base: 2.5 },
  "Dupla Sena": { qtd_numeros: 6, range: [1, 50], faixas_premio: [{ acertos: 6, descricao: "Sena" }, { acertos: 5, descricao: "Quina" }, { acertos: 4, descricao: "Quadra" }, { acertos: 3, descricao: "Terno" }], custo_base: 2.5 },
  Megasena: { qtd_numeros: 6, range: [1, 60], faixas_premio: [{ acertos: 6, descricao: "Sena" }, { acertos: 5, descricao: "Quina" }, { acertos: 4, descricao: "Quadra" }], custo_base: 5.0 },
  "Dia de Sorte": { qtd_numeros: 7, range: [1, 31], faixas_premio: [{ acertos: 7, descricao: "Prêmio principal" }, { acertos: 6, descricao: "6 acertos" }, { acertos: 5, descricao: "5 acertos" }, { acertos: 4, descricao: "4 acertos" }], custo_base: 2.5 },
  Timemania: { qtd_numeros: 10, range: [1, 80], faixas_premio: [{ acertos: 7, descricao: "Prêmio principal" }, { acertos: 6, descricao: "6 acertos" }, { acertos: 5, descricao: "5 acertos" }, { acertos: 4, descricao: "4 acertos" }, { acertos: 3, descricao: "3 acertos" }], custo_base: 3.5 },
  "+Milionária": { qtd_numeros: 6, range: [1, 50], faixas_premio: [{ acertos: 6, descricao: "6+2 trevos" }, { acertos: 5, descricao: "5+2 trevos" }, { acertos: 4, descricao: "4+2 trevos" }, { acertos: 3, descricao: "3+2 trevos" }, { acertos: 2, descricao: "2+2 trevos" }], custo_base: 6.0 },
};

function useApostasPendentes() {
  return useQuery<ApostaPendente[]>({
    queryKey: ["apostas-pendentes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("apostas_pendentes" as any)
        .select("*")
        .eq("status", "pendente")
        .order("horario_envio", { ascending: false });
      if (error) throw error;
      const porLoteria: Record<string, ApostaPendente> = {};
      for (const aposta of (data ?? []) as any[]) {
        if (!porLoteria[aposta.loteria]) porLoteria[aposta.loteria] = aposta;
      }
      return Object.values(porLoteria);
    },
    refetchInterval: 30_000,
  });
}

function useConfirmarAposta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (aposta: ApostaPendente) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const criterios = CRITERIOS_POR_LOTERIA[aposta.loteria];
      const { error: errInsert } = await supabase.from("apostas_confirmadas" as any).insert({
        user_id: user.id,
        loteria: aposta.loteria,
        numeros: aposta.numeros,
        dominancia: aposta.dominancia,
        precisao: aposta.precisao,
        concurso: aposta.concurso ?? null,
        horario_confirmacao: new Date().toISOString(),
        status_verificacao: "aguardando_sorteio",
        qtd_numeros_esperada: criterios?.qtd_numeros ?? aposta.numeros.length,
        range_min: criterios?.range[0] ?? 1,
        range_max: criterios?.range[1] ?? 60,
        custo_aposta: criterios?.custo_base ?? 2.5,
        faixas_premio: criterios?.faixas_premio ?? [],
        aposta_pendente_id: aposta.id,
      });
      if (errInsert) throw errInsert;

      await supabase.from("apostas_pendentes" as any).update({ status: "confirmada" }).eq("id", aposta.id);

      // Also save to gate_history
      await supabase.from("gate_history").insert({
        user_id: user.id,
        lottery: aposta.loteria,
        concurso: aposta.concurso ?? 0,
        confidence: aposta.dominancia,
        numbers: aposta.numeros,
        gate_status: "APPROVED",
      });
    },
    onSuccess: (_, aposta) => {
      toast.success(`✅ Aposta ${aposta.loteria} confirmada!`, { description: `Números: ${aposta.numeros.join(", ")}` });
      qc.invalidateQueries({ queryKey: ["apostas-pendentes"] });
      qc.invalidateQueries({ queryKey: ["apostas-confirmadas"] });
    },
    onError: (err) => toast.error("Erro ao confirmar aposta", { description: String(err) }),
  });
}

function CardAposta({ aposta, onConfirmar, onCancelar, isLoading }: { aposta: ApostaPendente; onConfirmar: () => void; onCancelar: () => void; isLoading: boolean }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const criterios = CRITERIOS_POR_LOTERIA[aposta.loteria];
  const hora = new Date(aposta.horario_envio).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
        className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge className="bg-primary/20 text-primary border-primary/30 text-sm font-semibold px-3 py-1">{aposta.loteria}</Badge>
            <span className="text-xs text-muted-foreground">Gerado às {hora}</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-emerald-400 font-semibold">Dom: {aposta.dominancia.toFixed(1)}%</span>
            <span className="text-blue-400 font-semibold">Prec: {aposta.precisao.toFixed(1)}%</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {aposta.numeros.map((n) => (
            <span key={n} className="w-9 h-9 flex items-center justify-center rounded-full bg-primary/15 border border-primary/30 text-primary font-bold text-sm">
              {String(n).padStart(2, "0")}
            </span>
          ))}
        </div>

        {criterios && (
          <div className="bg-background rounded-lg p-3 space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Critérios da {aposta.loteria}</p>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <span className="text-muted-foreground">Qtd. números:</span>
              <span className="text-foreground font-medium">{criterios.qtd_numeros}</span>
              <span className="text-muted-foreground">Intervalo:</span>
              <span className="text-foreground font-medium">{criterios.range[0]} – {criterios.range[1]}</span>
              <span className="text-muted-foreground">Custo:</span>
              <span className="text-foreground font-medium">R$ {criterios.custo_base.toFixed(2)}</span>
              <span className="text-muted-foreground">Qtd. gerada:</span>
              <span className={aposta.numeros.length === criterios.qtd_numeros ? "text-emerald-400 font-semibold" : "text-destructive font-semibold"}>
                {aposta.numeros.length} {aposta.numeros.length === criterios.qtd_numeros ? "✓" : "✗"}
              </span>
            </div>
          </div>
        )}

        {criterios && (
          <div className="flex flex-wrap gap-2">
            {criterios.faixas_premio.slice(0, 4).map((f) => (
              <span key={f.acertos} className="text-[11px] bg-emerald-500/10 border border-emerald-800/40 text-emerald-400 rounded-md px-2 py-0.5">
                {f.acertos} acertos → {f.descricao}
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <Button onClick={() => setConfirmOpen(true)} disabled={isLoading} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
            Confirmar Aposta
          </Button>
          <Button variant="outline" onClick={onCancelar} className="border-destructive/50 text-destructive hover:bg-destructive/10">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Confirmar aposta — {aposta.loteria}</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Números: <strong className="text-foreground">{aposta.numeros.join(", ")}</strong><br />
              Será registrada no banco e aguardará verificação automática às 21h.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-muted-foreground">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConfirmOpen(false); onConfirmar(); }} className="bg-primary hover:bg-primary/90">Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function MinhaApostaPage() {
  const { data: apostas, isLoading, isError } = useApostasPendentes();
  const confirmar = useConfirmarAposta();
  const qc = useQueryClient();

  async function handleCancelar(id: string) {
    await supabase.from("apostas_pendentes" as any).update({ status: "cancelada" }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["apostas-pendentes"] });
    toast.info("Aposta removida.");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Trophy className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold text-foreground">Minha Aposta</h1>
          <p className="text-sm text-muted-foreground">Apostas geradas pela IA — máximo 1 por loteria</p>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-3 text-destructive bg-destructive/10 rounded-xl p-4">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">Erro ao carregar apostas.</p>
        </div>
      )}

      {!isLoading && apostas?.length === 0 && (
        <div className="text-center py-16 space-y-3">
          <Trophy className="w-12 h-12 text-muted-foreground/30 mx-auto" />
          <p className="text-muted-foreground">Nenhuma aposta pendente no momento.</p>
          <p className="text-muted-foreground/70 text-sm">As apostas aparecerão aqui quando a IA gerar novos jogos.</p>
        </div>
      )}

      <AnimatePresence>
        {apostas?.map((aposta) => (
          <CardAposta key={aposta.id} aposta={aposta} isLoading={confirmar.isPending}
            onConfirmar={() => confirmar.mutate(aposta)} onCancelar={() => handleCancelar(aposta.id)} />
        ))}
      </AnimatePresence>

      {apostas && apostas.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Resumo</p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-foreground">{apostas.length}</p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-400">
                R$ {apostas.reduce((s, a) => s + (CRITERIOS_POR_LOTERIA[a.loteria]?.custo_base ?? 0), 0).toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">Custo total</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{new Set(apostas.map((a) => a.loteria)).size}</p>
              <p className="text-xs text-muted-foreground">Loterias</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
