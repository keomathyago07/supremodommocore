import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Database, CheckCircle, XCircle, Loader2, Save, RefreshCw, Wifi } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const ApiConfigPage = () => {
  const { user } = useAuth();
  const [token, setToken] = useState('');
  const [provider, setProvider] = useState('apiloterias');
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [savedTokenId, setSavedTokenId] = useState<string | null>(null);
  const [autoSync, setAutoSync] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadToken();
  }, [user]);

  // Auto-sync when token changes
  useEffect(() => {
    if (savedTokenId && autoSync && connectionStatus === 'success') {
      const interval = setInterval(() => {
        syncData();
      }, 60000); // Auto-sync every 60s
      return () => clearInterval(interval);
    }
  }, [savedTokenId, autoSync, connectionStatus]);

  const loadToken = async () => {
    const { data } = await supabase
      .from('api_tokens')
      .select('*')
      .eq('provider', provider)
      .maybeSingle() as any;
    if (data) {
      setToken(data.token);
      setSavedTokenId(data.id);
      setConnectionStatus(data.is_valid ? 'success' : 'idle');
      setLastSync(data.last_sync_at);
    }
  };

  const testConnection = async () => {
    if (!token.trim()) {
      toast.error('Insira um token válido');
      return;
    }
    setIsTesting(true);
    setConnectionStatus('idle');
    try {
      // Test the API connection
      const response = await fetch(`https://apiloterias.com.br/app/v2/resultado?loteria=megasena&token=${token}`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.numero_concurso) {
          setConnectionStatus('success');
          toast.success(`Conexão válida! Último concurso: #${data.numero_concurso}`);
        } else {
          setConnectionStatus('error');
          toast.error('Token inválido ou resposta inesperada');
        }
      } else {
        setConnectionStatus('error');
        toast.error('Falha na conexão — verifique o token');
      }
    } catch {
      setConnectionStatus('error');
      toast.error('Erro de rede — verifique sua conexão');
    }
    setIsTesting(false);
  };

  const saveToken = async () => {
    if (!user || !token.trim()) return;
    setIsSaving(true);
    const isValid = connectionStatus === 'success';
    const payload = {
      user_id: user.id,
      provider,
      token,
      is_valid: isValid,
      last_sync_at: isValid ? new Date().toISOString() : null,
    };

    if (savedTokenId) {
      await supabase.from('api_tokens').update(payload as any).eq('id', savedTokenId);
    } else {
      const { data } = await supabase.from('api_tokens').insert(payload as any).select().single() as any;
      if (data) setSavedTokenId(data.id);
    }
    setLastSync(isValid ? new Date().toISOString() : null);
    toast.success('Token salvo com sucesso!');
    
    // Auto-sync after saving
    if (isValid) {
      syncData();
    }
    setIsSaving(false);
  };

  const syncData = async () => {
    if (!token.trim()) return;
    try {
      const response = await fetch(`https://apiloterias.com.br/app/v2/resultado?loteria=megasena&token=${token}`);
      if (response.ok) {
        setLastSync(new Date().toISOString());
        if (savedTokenId) {
          await supabase.from('api_tokens').update({ last_sync_at: new Date().toISOString() } as any).eq('id', savedTokenId);
        }
        toast.success('Sincronização automática concluída!');
      }
    } catch {
      toast.error('Falha na sincronização');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-display font-bold">API & Sincronização</h1>

      <div className="glass rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-3 mb-2">
          <Database className="w-6 h-6 text-primary" />
          <h2 className="text-lg font-display font-semibold">Configuração da API</h2>
        </div>

        {/* Provider */}
        <div>
          <label className="block text-sm text-muted-foreground mb-1.5">Provedor</label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="w-full bg-muted/50 border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="apiloterias">apiloterias.com.br</option>
            <option value="custom">API Personalizada</option>
          </select>
        </div>

        {/* Token */}
        <div>
          <label className="block text-sm text-muted-foreground mb-1.5">Token da API</label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-full bg-muted/50 border border-border rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Insira seu token da API"
          />
        </div>

        {/* Connection Status */}
        {connectionStatus !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-center gap-2 p-3 rounded-lg ${
              connectionStatus === 'success' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
            }`}
          >
            {connectionStatus === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
            <span className="text-sm font-medium">
              {connectionStatus === 'success' ? 'Conexão válida — API sincronizada!' : 'Conexão falhou — verifique o token'}
            </span>
          </motion.div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={testConnection}
            disabled={isTesting || !token.trim()}
            className="flex-1 flex items-center justify-center gap-2 bg-accent text-accent-foreground font-display font-semibold py-3 rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
          >
            {isTesting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wifi className="w-5 h-5" />}
            Testar Conexão
          </button>
          <button
            onClick={saveToken}
            disabled={isSaving || !token.trim()}
            className="flex-1 flex items-center justify-center gap-2 gradient-primary text-primary-foreground font-display font-semibold py-3 rounded-lg glow-primary hover:opacity-90 transition-all disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Salvar Token
          </button>
        </div>

        {/* Auto Sync */}
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium">Sincronização Automática</p>
              <p className="text-xs text-muted-foreground">Sincroniza dados automaticamente a cada 60 segundos</p>
            </div>
          </div>
          <button
            onClick={() => setAutoSync(!autoSync)}
            className={`w-12 h-6 rounded-full transition-all ${autoSync ? 'bg-primary' : 'bg-muted'}`}
          >
            <div className={`w-5 h-5 rounded-full bg-foreground transition-transform ${autoSync ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>

        {/* Last Sync */}
        {lastSync && (
          <p className="text-xs text-muted-foreground">
            Última sincronização: {new Date(lastSync).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
          </p>
        )}
      </div>
    </div>
  );
};

export default ApiConfigPage;
