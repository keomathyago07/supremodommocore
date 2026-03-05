import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Loader2, Key, Save, Trash2, Bot } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const PROVIDERS = [
  { id: 'openai', name: 'OpenAI (GPT)', baseUrl: 'https://api.openai.com/v1/chat/completions', defaultModel: 'gpt-4o' },
  { id: 'anthropic', name: 'Anthropic (Claude)', baseUrl: 'https://api.anthropic.com/v1/messages', defaultModel: 'claude-sonnet-4-20250514' },
  { id: 'custom', name: 'Custom API', baseUrl: '', defaultModel: '' },
];

const AIChatPage = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState(PROVIDERS[0]);
  const [apiKey, setApiKey] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [showConfig, setShowConfig] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load saved config
  useEffect(() => {
    const saved = localStorage.getItem('dommo_chat_config');
    if (saved) {
      try {
        const cfg = JSON.parse(saved);
        setApiKey(cfg.apiKey || '');
        setProvider(PROVIDERS.find(p => p.id === cfg.providerId) || PROVIDERS[0]);
        setCustomUrl(cfg.customUrl || '');
        setCustomModel(cfg.customModel || '');
        if (cfg.apiKey) setShowConfig(false);
      } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const saveConfig = () => {
    if (!apiKey.trim()) {
      toast.error('Insira a chave da API');
      return;
    }
    localStorage.setItem('dommo_chat_config', JSON.stringify({
      apiKey: apiKey.trim(),
      providerId: provider.id,
      customUrl,
      customModel,
    }));
    setShowConfig(false);
    toast.success('Configuração salva com sucesso!');
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    if (!apiKey) {
      toast.error('Configure sua API key primeiro');
      setShowConfig(true);
      return;
    }

    const userMsg: ChatMessage = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      let responseText = '';

      if (provider.id === 'anthropic') {
        const res = await fetch(provider.baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: customModel || provider.defaultModel,
            max_tokens: 4096,
            system: 'Você é o assistente do DommoSupremo, um sistema avançado de inteligência para loterias brasileiras. Ajude o usuário com análises, ideias e melhorias para o sistema. Responda em português.',
            messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          }),
        });
        if (!res.ok) throw new Error(`API Error: ${res.status}`);
        const data = await res.json();
        responseText = data.content?.[0]?.text || 'Sem resposta';
      } else {
        const url = provider.id === 'custom' ? customUrl : provider.baseUrl;
        const model = customModel || provider.defaultModel;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: 'Você é o assistente do DommoSupremo, um sistema avançado de inteligência para loterias brasileiras. Ajude o usuário com análises, ideias e melhorias para o sistema. Responda em português.' },
              ...newMessages.map(m => ({ role: m.role, content: m.content })),
            ],
            max_tokens: 4096,
          }),
        });
        if (!res.ok) throw new Error(`API Error: ${res.status}`);
        const data = await res.json();
        responseText = data.choices?.[0]?.message?.content || 'Sem resposta';
      }

      setMessages([...newMessages, { role: 'assistant', content: responseText }]);
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ Erro: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 flex flex-col h-[calc(100vh-2rem)] max-h-[calc(100vh-2rem)]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Bot className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-display font-bold">Chat Assistente IA</h1>
        </div>
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="flex items-center gap-2 glass px-3 py-2 rounded-lg text-sm hover:border-primary/30 transition-all"
        >
          <Key className="w-4 h-4 text-secondary" />
          <span className="hidden sm:inline">Configurar API</span>
        </button>
      </div>

      {/* Config Panel */}
      {showConfig && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="glass rounded-xl p-5 mb-4 space-y-4">
          <h3 className="text-sm font-display font-semibold text-primary">Configuração da API</h3>
          <p className="text-xs text-muted-foreground">Insira sua chave de API (OpenAI, Claude, ou qualquer API compatível)</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {PROVIDERS.map(p => (
              <button
                key={p.id}
                onClick={() => setProvider(p)}
                className={`px-3 py-2 rounded-lg text-xs font-display font-semibold transition-all ${
                  provider.id === p.id ? 'bg-primary/20 text-primary border border-primary/30' : 'glass text-muted-foreground'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">API Key / Token</label>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              className="w-full bg-muted/50 border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="sk-... ou sua chave"
            />
          </div>

          {provider.id === 'custom' && (
            <>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">URL da API</label>
                <input
                  type="url"
                  value={customUrl}
                  onChange={e => setCustomUrl(e.target.value)}
                  className="w-full bg-muted/50 border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="https://api.example.com/v1/chat/completions"
                />
              </div>
            </>
          )}

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Modelo (opcional)</label>
            <input
              type="text"
              value={customModel}
              onChange={e => setCustomModel(e.target.value)}
              className="w-full bg-muted/50 border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder={provider.defaultModel || 'nome-do-modelo'}
            />
          </div>

          <button onClick={saveConfig} className="flex items-center gap-2 gradient-primary text-primary-foreground font-display font-semibold px-5 py-2.5 rounded-lg hover:opacity-90 transition-all">
            <Save className="w-4 h-4" />
            Salvar Configuração
          </button>
        </motion.div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 glass rounded-xl p-4 overflow-y-auto space-y-3 mb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Bot className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-sm">Converse com o assistente IA do DommoSupremo</p>
            <p className="text-xs mt-1">Peça análises, ideias, melhorias...</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${
              msg.role === 'user'
                ? 'bg-primary/20 text-foreground border border-primary/20'
                : 'bg-muted/40 text-foreground border border-border/50'
            }`}>
              <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
            </div>
          </motion.div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted/40 rounded-xl px-4 py-3 border border-border/50">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <button onClick={() => { setMessages([]); }} className="glass px-3 py-3 rounded-lg hover:border-destructive/30 transition-all" title="Limpar chat">
          <Trash2 className="w-5 h-5 text-muted-foreground" />
        </button>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          className="flex-1 bg-muted/50 border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="Digite sua mensagem..."
          disabled={loading}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="gradient-primary text-primary-foreground px-5 py-3 rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default AIChatPage;
