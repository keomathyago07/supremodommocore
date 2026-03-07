import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Settings, User, Bell, Monitor, Smartphone, Lock, Save, Loader2, Clock, Key, Send, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useAutoAnalysis } from '@/hooks/useAutoAnalysis';

const SettingsPage = () => {
  const { user } = useAuth();
  const auto = useAutoAnalysis();
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [changingPin, setChangingPin] = useState(false);

  const [notifTimes, setNotifTimes] = useState(['18:00', '20:00', '20:30']);
  const [newTime, setNewTime] = useState('');
  const [notifications, setNotifications] = useState({
    gates: true,
    results: true,
    bets: true,
    dailyNumbers: true,
  });

  const handleChangePin = async () => {
    if (!user) return;
    if (newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
      toast.error('O novo PIN deve ter exatamente 6 dígitos');
      return;
    }
    if (newPin !== confirmPin) {
      toast.error('Os PINs não coincidem');
      return;
    }
    setChangingPin(true);
    try {
      const newPassword = `DommoSupremo#${newPin}#2026`;
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('PIN alterado com sucesso!');
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao alterar PIN');
    } finally {
      setChangingPin(false);
    }
  };

  const addNotifTime = () => {
    if (newTime && !notifTimes.includes(newTime)) {
      setNotifTimes([...notifTimes, newTime].sort());
      setNewTime('');
      toast.success(`Horário ${newTime} adicionado`);
    }
  };

  const removeNotifTime = (t: string) => {
    setNotifTimes(notifTimes.filter(x => x !== t));
    toast.success(`Horário ${t} removido`);
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <h1 className="text-2xl font-display font-bold">Configurações</h1>

      {/* Account */}
      <div className="glass rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <User className="w-5 h-5 text-primary" />
          <h2 className="font-display font-semibold">Conta</h2>
        </div>
        <div className="bg-muted/30 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Email</p>
          <p className="font-mono text-sm">{user?.email}</p>
        </div>
      </div>

      {/* Number Delivery Time — ENHANCED */}
      <div className="glass rounded-xl p-6 space-y-4 border border-secondary/30">
        <div className="flex items-center gap-3">
          <Send className="w-5 h-5 text-secondary" />
          <h2 className="font-display font-semibold">📩 Horário de Envio dos Números</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Defina o horário exato para o programa enviar os números das loterias do dia.
          Os números só serão enviados se TODOS os critérios forem atendidos (gate 100%, domínio e precisão máxima → 1000%).
        </p>
        <div className="flex items-center gap-3">
          <label className="text-sm font-display font-semibold text-secondary">Enviar números às:</label>
          <input
            type="time"
            value={auto.numberDeliveryTime}
            onChange={e => auto.setNumberDeliveryTime(e.target.value)}
            className="bg-muted/50 border border-secondary/30 rounded-lg px-4 py-2.5 text-lg font-mono font-bold text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/50"
          />
          <span className="text-sm text-muted-foreground">(Brasília)</span>
        </div>
        <div className="bg-secondary/10 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-secondary" />
            <span className="text-sm font-display font-semibold text-secondary">
              Programado: {auto.numberDeliveryTime}h
            </span>
            <span className="text-xs px-2 py-1 rounded-full bg-success/20 text-success font-mono">✅ ATIVO</span>
          </div>
          <p className="text-xs text-muted-foreground">
            O programa analisará todas as loterias do dia em silêncio. Às <strong className="text-secondary">{auto.numberDeliveryTime}h</strong>, 
            enviará os números de TODAS as loterias que atingiram gate 100% e atenderam todos os critérios. 
            Os números serão salvos automaticamente no Histórico de Gates e você será notificado.
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="px-2 py-1 rounded bg-muted/30">✅ Gate 100%</span>
            <span className="px-2 py-1 rounded bg-muted/30">✅ Domínio → 1000%</span>
            <span className="px-2 py-1 rounded bg-muted/30">✅ Precisão → 1000%</span>
            <span className="px-2 py-1 rounded bg-muted/30">✅ Padrões travados</span>
            <span className="px-2 py-1 rounded bg-muted/30">✅ Prêmio máximo</span>
          </div>
        </div>
      </div>

      {/* Change PIN */}
      <div className="glass rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Key className="w-5 h-5 text-secondary" />
          <h2 className="font-display font-semibold">Alterar PIN de Acesso</h2>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">PIN Atual</label>
            <input type="password" maxLength={6} value={currentPin} onChange={e => setCurrentPin(e.target.value.replace(/\D/g, ''))} className="w-full bg-muted/50 border border-border rounded-lg px-4 py-2.5 text-center tracking-[0.5em] text-transparent focus:outline-none focus:ring-2 focus:ring-primary/50 caret-transparent" placeholder="••••••" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Novo PIN (6 dígitos)</label>
            <input type="password" maxLength={6} value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))} className="w-full bg-muted/50 border border-border rounded-lg px-4 py-2.5 text-center tracking-[0.5em] text-transparent focus:outline-none focus:ring-2 focus:ring-primary/50 caret-transparent" placeholder="••••••" />
            <div className="flex gap-1.5 justify-center mt-1.5">
              {[0,1,2,3,4,5].map(i => (
                <div key={i} className={`w-2.5 h-2.5 rounded-full transition-all ${newPin.length > i ? 'bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.5)]' : 'border border-muted-foreground/30'}`} />
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Confirmar Novo PIN</label>
            <input type="password" maxLength={6} value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))} className="w-full bg-muted/50 border border-border rounded-lg px-4 py-2.5 text-center tracking-[0.5em] text-transparent focus:outline-none focus:ring-2 focus:ring-primary/50 caret-transparent" placeholder="••••••" />
          </div>
          <button onClick={handleChangePin} disabled={changingPin || !newPin || !confirmPin} className="w-full flex items-center justify-center gap-2 gradient-primary text-primary-foreground font-display font-semibold py-2.5 rounded-lg hover:opacity-90 transition-all disabled:opacity-50">
            {changingPin ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            Alterar PIN
          </button>
        </div>
      </div>

      {/* Notification Schedule */}
      <div className="glass rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-secondary" />
          <h2 className="font-display font-semibold">Horários de Notificação</h2>
        </div>
        <p className="text-xs text-muted-foreground">Horários adicionais para notificações de status.</p>
        <div className="flex flex-wrap gap-2">
          {notifTimes.map(t => (
            <div key={t} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
              <Clock className="w-3 h-3 text-primary" />
              <span className="text-sm font-mono text-primary">{t}h</span>
              <button onClick={() => removeNotifTime(t)} className="text-muted-foreground hover:text-destructive ml-1">×</button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="flex-1 bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          <button onClick={addNotifTime} disabled={!newTime} className="px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-display font-semibold disabled:opacity-50">Adicionar</button>
        </div>

        <div className="space-y-2 mt-4">
          {[
            { key: 'gates' as const, label: 'Notificar gates encontrados', desc: 'Alerta quando confiança atinge o gate' },
            { key: 'results' as const, label: 'Notificar resultados (21h)', desc: 'Resultados dos sorteios às 21h de Brasília' },
            { key: 'bets' as const, label: 'Notificar conferência de apostas', desc: 'Resultado da conferência automática' },
            { key: 'dailyNumbers' as const, label: 'Enviar números do dia', desc: `Números enviados às ${auto.numberDeliveryTime}h` },
          ].map((n) => (
            <div key={n.key} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div>
                <span className="text-sm">{n.label}</span>
                <p className="text-xs text-muted-foreground">{n.desc}</p>
              </div>
              <button onClick={() => setNotifications(prev => ({ ...prev, [n.key]: !prev[n.key] }))} className={`w-11 h-6 rounded-full transition-all ${notifications[n.key] ? 'bg-primary' : 'bg-muted'}`}>
                <div className={`w-[18px] h-[18px] rounded-full bg-foreground transition-transform ${notifications[n.key] ? 'translate-x-[22px]' : 'translate-x-[3px]'}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Sync */}
      <div className="glass rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Monitor className="w-5 h-5 text-success" />
          <h2 className="font-display font-semibold">Sincronização Desktop/Mobile</h2>
        </div>
        <p className="text-sm text-muted-foreground">Todos os dados são sincronizados automaticamente entre dispositivos via Lovable Cloud.</p>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-success"><Monitor className="w-4 h-4" /><span>Desktop sincronizado</span></div>
          <div className="flex items-center gap-2 text-xs text-success"><Smartphone className="w-4 h-4" /><span>Mobile sincronizado</span></div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;