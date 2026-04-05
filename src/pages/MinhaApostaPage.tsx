import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Loader2, Trash2, AlertCircle, Trophy, Clock, Send, RefreshCw, Calendar } from "lucide-react";
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

interface ApostaConfirmada {
  id: string;
  loteria: string;
  numeros: number[];
  dominancia: number;
  precisao: number;
  horario_confirmacao: string;
  status_verificacao: string;
  pontos_acertados?: number;
  numeros_sorteados?: number[];
  valor_premio?: number;
  descricao_faixa?: string;
  concurso_verificado?: number;
  custo_aposta: number;
}

const LOTERIAS_VISUAL: Record<string, { emoji: string; cor: string; descricao: string }> = {
  Quina: { emoji: '🟣', cor: '#6633cc', descricao: '5 números de 1 a 80' },
  Lotomania: { emoji: '🟠', cor: '#f68e1e', descricao: '50 números de 00 a 99' },
  "Lotofácil": { emoji: '🟤', cor: '#930089', descricao: '15 números de 1 a 25' },
  "Super Sete": { emoji: '🟡', cor: '#f7941d', descricao: '7 colunas de 0 a 9' },
  "Dupla Sena": { emoji: '🔴', cor: '#cc3333', descricao: '6 números de 1 a 50' },
  Megasena: { emoji: '🟢', cor: '#00a651', descricao: '6 números de 1 a 60' },
  "Dia de Sorte": { emoji: '🍀', cor: '#00cc66', descricao: '7 números de 1 a 31' },
  Timemania: { emoji: '⚽', cor: '#009933', descricao: '10 números de 1 a 80' },
  "+Milionária": { emoji: '💎', cor: '#1a237e', descricao: '6 números de 1 a 50 + 2 trevos' },
};

const CRITERIOS_POR_LOTERIA: Record<string, { qtd_numeros: number; range: [number, number]; faixas_premio: { acertos: number; descricao: string }[]; custo_base: number }> = {
  Quina: { qtd_numeros: 5, range: [1, 80], faixas_premio: [{ acertos: 5, descricao: "Quina" }, { acertos: 4, descricao: "Quadra" }, { acertos: 3, descricao: "Terno" }, { acertos: 2, descricao: "Duque" }], custo_base: 2.5 },
  Lotomania: { qtd_numeros: 50, range: [0, 99], faixas_premio: [{ acertos: 20, descricao: "20 pontos" }, { acertos: 19, descricao: "19 pontos" }, { acertos: 18, descricao: "18 pontos" }, { acertos: 0, descricao: "0 pontos" }], custo_base: 3.0 },
  "Lotofácil": { qtd_numeros: 15, range: [1, 25], faixas_premio: [{ acertos: 15, descricao: "15 pontos" }, { acertos: 14, descricao: "14 pontos" }, { acertos: 13, descricao: "13 pontos" }, { acertos: 12, descricao: "12 pontos" }, { acertos: 11, descricao: "11 pontos" }], custo_base: 3.0 },
  "Super Sete": { qtd_numeros: 7, range: [0, 9], faixas_premio: [{ acertos: 7, descricao: "7 colunas" }, { acertos: 6, descricao: "6 colunas" }, { acertos: 5, descricao: "5 colunas" }], custo_base: 2.5 },
  "Dupla Sena": { qtd_numeros: 6, range: [1, 50], faixas_premio: [{ acertos: 6, descricao: "Sena" }, { acertos: 5, descricao: "Quina" }, { acertos: 4, descricao: "Quadra" }], custo_base: 2.5 },
  Megasena: { qtd_numeros: 6, range: [1, 60], faixas_premio: [{ acertos: 6, descricao: "Sena" }, { acertos: 5, descricao: "Quina" }, { acertos: 4, descricao: "Quadra" }], custo_base: 5.0 },
  "Dia de Sorte": { qtd_numeros: 7, range: [1, 31], faixas_premio: [{ acertos: 7, descricao: "7 acertos" }, { acertos: 6, descricao: "6 acertos" }, { acertos: 5, descricao: "5 acertos" }], custo_base: 2.5 },
  Timemania: { qtd_numeros: 10, range: [1, 80], faixas_premio: [{ acertos: 7, descricao: "7 acertos" }, { acertos: 6, descricao: "6 acertos" }, { acertos: 5, descricao: "5 acertos" }], custo_base: 3.5 },
  "+Milionária": { qtd_numeros: 6, range: [1, 50], faixas_premio: [{ acertos: 6, descricao: "6+2 trevos" }, { acertos: 5, descricao: "5+2 trevos" }], custo_base: 6.0 },
};

function useApostasPendentes() {
  return useQuery<ApostaPendente[]>({
    queryKey: ["apostas-pendentes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("apostas_pendentes")
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
    refetchInterval: 15_000,
  });
}

function useApostasConfirmadas() {
  return useQuery<ApostaConfirmada[]>({
    queryKey: ["apostas-confirmadas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("apostas_confirmadas")
        .select("*")
        .order("horario_confirmacao", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    refetchInterval: 30_000,
  });
}

function useConfirmarAposta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (aposta: ApostaPendente) => {
      // Try RPC first
      const { error: rpcErr } = await supabase.rpc('confirmar_aposta_ia' as any, {
        p_aposta_id: aposta.id,
      });

      if (rpcErr) {
        // Fallback: manual confirmation
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Não autenticado");

        const criterios = CRITERIOS_POR_LOTERIA[aposta.loteria];
        await supabase.from("apostas_confirmadas").insert({
          user_id: user.id,
          loteria: aposta.loteria,
          numeros: aposta.numeros,
          dominancia: aposta.dominancia,
          precisao: aposta.precisao,
          aposta_pendente_id: aposta.id,
          qtd_numeros_esperada: criterios?.qtd_numeros ?? aposta.numeros.length,
          range_min: criterios?.range[0] ?? 1,
          range_max: criterios?.range[1] ?? 60,
          custo_aposta: criterios?.custo_base ?? 2.5,
          faixas_premio: criterios?.faixas_premio ?? [],
        } as any);

        await supabase.from("apostas_pendentes").update({ status: "confirmada" } as any).eq("id", aposta.id);

        await supabase.from("gate_history").insert({
          user_id: user.id,
          lottery: aposta.loteria,
          concurso: aposta.concurso ?? 0,
          confidence: aposta.dominancia,
          numbers: aposta.numeros,
          gate_status: "APPROVED",
        });
      }
    },
    onSuccess: (_, aposta) => {
      toast.success(`✅ ${aposta.loteria} confirmada!`, { description: `Números: ${aposta.numeros.join(", ")}` });
      qc.invalidateQueries({ queryKey: ["apostas-pendentes"] });
      qc.invalidateQueries({ queryKey: ["apostas-confirmadas"] });
    },
    onError: (err) => toast.error("Erro ao confirmar", { description: String(err) }),
  });
}

function CardAposta({ aposta, onConfirmar, onCancelar, isLoading }: { aposta: ApostaPendente; onConfirmar: () => void; onCancelar: () => void; isLoading: boolean }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const criterios = CRITERIOS_POR_LOTERIA[aposta.loteria];
  const visual = LOTERIAS_VISUAL[aposta.loteria] || { emoji: '🎰', cor: '#666', descricao: '' };
  const hora = new Date(aposta.horario_envio).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
        className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">{visual.emoji}</span>
            <div>
              <Badge className="bg-primary/20 text-primary border-primary/30 text-sm font-semibold px-3 py-1">{aposta.loteria}</Badge>
              <p className="text-[10px] text-muted-foreground mt-0.5">{visual.descricao}</p>
            </div>
            <span className="text-xs text-muted-foreground">Gerado às {hora}</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-emerald-400 font-semibold">Dom: {aposta.dominancia.toFixed(1)}%</span>
            <span className="text-blue-400 font-semibold">Prec: {aposta.precisao.toFixed(1)}%</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {aposta.numeros.map((n, i) => (
            <span key={i} className="w-9 h-9 flex items-center justify-center rounded-full text-sm font-bold text-black"
              style={{ background: visual.cor }}>
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
              <span className="text-muted-foreground">Gerada por IA:</span>
              <span className="text-emerald-400 font-semibold">✓ Sim</span>
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

        {/* Critérios atendidos */}
        {aposta.criterios_atendidos && aposta.criterios_atendidos.length > 0 && (
          <div className="bg-background rounded-lg p-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Validação IA</p>
            <div className="grid grid-cols-2 gap-1 text-xs">
              {(aposta.criterios_atendidos as any[]).map((c: any, i: number) => (
                <div key={i} className="flex items-center gap-1">
                  <span className={c.ok ? "text-emerald-400" : "text-destructive"}>{c.ok ? "✓" : "✗"}</span>
                  <span className="text-muted-foreground">{c.nome}:</span>
                  <span className="text-foreground font-medium">{c.valor}</span>
                </div>
              ))}
            </div>
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
            <AlertDialogTitle className="text-foreground">{visual.emoji} Confirmar aposta — {aposta.loteria}</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Números: <strong className="text-foreground">{aposta.numeros.join(", ")}</strong><br />
              Dom: {aposta.dominancia.toFixed(1)}% · Prec: {aposta.precisao.toFixed(1)}%<br /><br />
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

function CardConfirmada({ aposta }: { aposta: ApostaConfirmada }) {
  const visual = LOTERIAS_VISUAL[aposta.loteria] || { emoji: '🎰', cor: '#666', descricao: '' };
  const isVerificada = aposta.status_verificacao === 'verificada';
  const isAguardando = aposta.status_verificacao === 'aguardando_sorteio';

  return (
    <div className={`bg-card border rounded-xl p-4 space-y-3 ${isVerificada ? 'border-amber-500/40' : 'border-emerald-500/30'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{visual.emoji}</span>
          <span className="text-sm font-bold text-foreground">{aposta.loteria}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-emerald-400 font-semibold">Dom {aposta.dominancia.toFixed(1)}%</span>
          <Badge variant="outline" className={isVerificada ? "text-amber-400 border-amber-500/50 text-[10px]" : "text-emerald-400 border-emerald-500/50 text-[10px]"}>
            {isVerificada ? '🏆 Verificada' : isAguardando ? '⏳ Aguardando sorteio' : aposta.status_verificacao}
          </Badge>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {aposta.numeros.map((n, i) => {
          const acertou = aposta.numeros_sorteados?.includes(n);
          return (
            <span key={i} className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold ${acertou ? 'ring-2 ring-amber-400 text-amber-400 bg-amber-500/20' : 'text-black'}`}
              style={!acertou ? { background: visual.cor } : undefined}>
              {String(n).padStart(2, "0")}
            </span>
          );
        })}
      </div>

      {isVerificada && aposta.pontos_acertados !== null && (
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
          <Trophy className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <div className="text-xs">
            <span className="text-amber-400 font-bold">{aposta.pontos_acertados} acertos</span>
            {aposta.descricao_faixa && <span className="text-muted-foreground ml-2">• {aposta.descricao_faixa}</span>}
            {(aposta.valor_premio ?? 0) > 0 && (
              <span className="text-emerald-400 ml-2 font-bold">
                R$ {(aposta.valor_premio ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <Calendar className="w-3 h-3" />
        <span>Confirmada em {new Date(aposta.horario_confirmacao).toLocaleString('pt-BR')}</span>
      </div>
    </div>
  );
}

export default function MinhaApostaPage() {
  const { data: pendentes, isLoading: loadingP, refetch: refetchP } = useApostasPendentes();
  const { data: confirmadas, isLoading: loadingC } = useApostasConfirmadas();
  const confirmar = useConfirmarAposta();
  const qc = useQueryClient();

  async function handleCancelar(id: string) {
    await supabase.from("apostas_pendentes").update({ status: "cancelada" } as any).eq("id", id);
    qc.invalidateQueries({ queryKey: ["apostas-pendentes"] });
    toast.info("Aposta removida.");
  }

  const isLoading = loadingP || loadingC;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trophy className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-foreground">Minha Aposta</h1>
            <p className="text-sm text-muted-foreground">Apostas geradas pela IA — máximo 1 por loteria/dia</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetchP()} className="gap-2">
          <RefreshCw className="w-3.5 h-3.5" /> Atualizar
        </Button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-center">
          <div className="text-2xl font-black text-yellow-400">{pendentes?.length ?? 0}</div>
          <div className="text-xs text-muted-foreground">Pendentes</div>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-center">
          <div className="text-2xl font-black text-emerald-400">{confirmadas?.filter(a => a.status_verificacao === 'aguardando_sorteio').length ?? 0}</div>
          <div className="text-xs text-muted-foreground">Aguardando</div>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-center">
          <div className="text-2xl font-black text-amber-400">{confirmadas?.filter(a => a.status_verificacao === 'verificada').length ?? 0}</div>
          <div className="text-xs text-muted-foreground">Verificadas</div>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && (pendentes?.length ?? 0) === 0 && (confirmadas?.length ?? 0) === 0 && (
        <div className="text-center py-16 space-y-3">
          <Trophy className="w-12 h-12 text-muted-foreground/30 mx-auto" />
          <p className="text-muted-foreground">Nenhuma aposta no momento.</p>
          <p className="text-muted-foreground/70 text-sm">As apostas aparecerão aqui quando a IA gerar novos jogos.</p>
        </div>
      )}

      {/* Pendentes */}
      {(pendentes?.length ?? 0) > 0 && (
        <section>
          <h3 className="text-sm font-bold text-yellow-400 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Aguardando Confirmação ({pendentes?.length})
          </h3>
          <AnimatePresence>
            <div className="space-y-4">
              {pendentes?.map((aposta) => (
                <CardAposta key={aposta.id} aposta={aposta} isLoading={confirmar.isPending}
                  onConfirmar={() => confirmar.mutate(aposta)} onCancelar={() => handleCancelar(aposta.id)} />
              ))}
            </div>
          </AnimatePresence>
        </section>
      )}

      {/* Confirmadas */}
      {(confirmadas?.length ?? 0) > 0 && (
        <section>
          <h3 className="text-sm font-bold text-emerald-400 mb-3 flex items-center gap-2">
            <Send className="w-4 h-4" /> Apostas Confirmadas ({confirmadas?.length})
          </h3>
          <div className="space-y-3">
            {confirmadas?.map((aposta) => (
              <CardConfirmada key={aposta.id} aposta={aposta} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
