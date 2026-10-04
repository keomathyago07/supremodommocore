// Assistente de Conferência: perguntas livres sobre apostas, acertos, prêmios e tendências.
import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { toast } from "sonner";
import { ScrollText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputTextarea, PromptInputFooter, PromptInputSubmit } from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";

const SUGESTOES = [
  "Quantos pontos fiz na minha última aposta?",
  "Quanto ganhei este mês, bruto e líquido?",
  "Quais números mais saíram na Mega-Sena recentemente?",
];

export default function AssistenteApostasPage() {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const transport = useMemo(() => new DefaultChatTransport({
    api: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assistente-apostas`,
    headers: async () => {
      const { data } = await supabase.auth.getSession();
      return {
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${data.session?.access_token ?? ""}`,
      };
    },
  }), []);
  const { messages, sendMessage, status, stop } = useChat({
    transport,
    onError: (e) => {
      const m = String(e?.message ?? "");
      if (m.includes("429")) toast.error("Muitas perguntas seguidas. Aguarde um pouco.");
      else if (m.includes("402")) toast.error("Créditos de IA esgotados.");
      else toast.error("Não foi possível responder agora.", { description: m.slice(0, 160) });
    },
  });
  const busy = status === "submitted" || status === "streaming";
  useEffect(() => { if (!busy) inputRef.current?.focus(); }, [busy]);

  const enviar = (t: string) => {
    if (!t.trim() || busy) return;
    sendMessage({ text: t.trim() });
    setText("");
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col p-4 max-w-4xl mx-auto w-full">
      <div className="mb-3">
        <h1 className="text-2xl font-display font-bold text-primary flex items-center gap-2">
          <ScrollText className="w-6 h-6" /> Assistente de Conferência
        </h1>
        <p className="text-xs text-muted-foreground">
          Pergunte sobre suas apostas, acertos e prêmios. Respostas baseadas nos resultados oficiais registrados.
        </p>
      </div>
      <Conversation className="flex-1 rounded-lg border border-border">
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState title="Pergunte algo" description="Ex.: quais números acertei no último concurso?">
              <div className="flex flex-wrap justify-center gap-2 mt-3">
                {SUGESTOES.map((s) => (
                  <button key={s} onClick={() => enviar(s)} className="text-xs px-3 py-1.5 rounded-full border border-border hover:border-primary text-muted-foreground hover:text-foreground">
                    {s}
                  </button>
                ))}
              </div>
            </ConversationEmptyState>
          ) : messages.map((m) => (
            <Message key={m.id} from={m.role}>
              <MessageContent className={m.role === "user" ? "bg-primary text-primary-foreground" : "bg-transparent"}>
                {m.parts.map((p, i) => p.type === "text"
                  ? (m.role === "assistant" ? <MessageResponse key={i}>{p.text}</MessageResponse> : <span key={i}>{p.text}</span>)
                  : null)}
              </MessageContent>
            </Message>
          ))}
          {status === "submitted" && <Shimmer>Consultando seus resultados...</Shimmer>}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <PromptInput className="mt-3" onSubmit={(msg) => enviar(msg.text ?? text)}>
        <PromptInputTextarea ref={inputRef} autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="Ex.: por que não ganhei na Quina ontem?" />
        <PromptInputFooter className="justify-end">
          <PromptInputSubmit status={status} disabled={!busy && !text.trim()} onStop={stop} />
        </PromptInputFooter>
      </PromptInput>
      <p className="text-[10px] text-muted-foreground mt-2 text-center">Sorteios são aleatórios: tendências passadas não garantem acertos.</p>
    </div>
  );
}
