import { useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Settings, User, Bell, Monitor, Smartphone, Lock, Save, Loader2, Clock, Key, Send, Zap, Palette, Image, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAutoAnalysis } from '@/hooks/useAutoAnalysis';
import { THEME_PRESETS, applyTheme, loadSavedTheme, saveTheme, saveWallpaper, loadSavedWallpaper, removeWallpaper, applyWallpaper } from '@/lib/themePresets';
import { ThemePanel } from '@/components/ThemeSystem';

const SettingsPage = () => {
  const { user } = useAuth();
  const auto = useAutoAnalysis();
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [changingPin, setChangingPin] = useState(false);
  const [activeTheme, setActiveTheme] = useState(loadSavedTheme());
  const [hasWallpaper, setHasWallpaper] = useState(!!loadSavedWallpaper());
  const wallpaperInputRef = useRef<HTMLInputElement>(null);

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

  const handleThemeChange = (themeId: string) => {
    const theme = THEME_PRESETS.find(t => t.id === themeId);
    if (!theme) return;
    applyTheme(theme);
    saveTheme(themeId);
    setActiveTheme(themeId);
    toast.success(`Tema "${theme.name}" aplicado!`);
  };

  const handleWallpaperUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione uma imagem válida (JPG, PNG, WebP)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem muito grande. Máximo 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      saveWallpaper(dataUrl);
      applyWallpaper(dataUrl);
      setHasWallpaper(true);
      toast.success('🖼️ Papel de parede aplicado com sucesso!');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveWallpaper = () => {
    removeWallpaper();
    setHasWallpaper(false);
    toast.success('Papel de parede removido');
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <h1 className="text-2xl font-display font-bold">Configurações</h1>

      {/* Theme System Ultra Avançado com IA */}
      <div className="glass rounded-xl border border-primary/20 overflow-hidden">
        <ThemePanel />
      </div>

      {/* Wallpaper Upload */}
      <div className="glass rounded-xl p-6 space-y-4 border border-primary/20">
        <div className="flex items-center gap-3">
          <Image className="w-5 h-5 text-primary" />
          <h2 className="font-display font-semibold text-sm">🖼️ Papel de Parede Personalizado</h2>
        </div>
        <p className="text-xs text-muted-foreground">Faça upload de uma imagem para usar como fundo do programa. Máximo 5MB. As imagens fixas do sistema permanecem.</p>
        <div className="flex items-center gap-3">
          <input
            ref={wallpaperInputRef}
            type="file"
            accept="image/*"
            onChange={handleWallpaperUpload}
            className="hidden"
          />
          <button
            onClick={() => wallpaperInputRef.current?.click()}
            className="flex items-center gap-2 gradient-primary text-primary-foreground font-display font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-all text-sm"
          >
            <Image className="w-4 h-4" />
            Escolher Imagem
          </button>
          {hasWallpaper && (
            <button
              onClick={handleRemoveWallpaper}
              className="flex items-center gap-2 bg-destructive/20 text-destructive font-display font-semibold px-4 py-2 rounded-lg hover:bg-destructive/30 transition-all text-sm"
            >
              <Trash2 className="w-4 h-4" />
              Remover Wallpaper
            </button>
          )}
        </div>
        {hasWallpaper && (
          <p className="text-xs text-green-400 mt-2">✅ Papel de parede ativo. A imagem é mantida ao trocar temas.</p>
        )}
      </div>

      {/* Old theme presets kept for backward compat */}
      <div className="glass rounded-xl p-6 space-y-4 border border-border/20">
        <div className="flex items-center gap-3">
          <Palette className="w-5 h-5 text-primary" />
          <h2 className="font-display font-semibold">Presets de Cores Clássicos</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {THEME_PRESETS.map(theme => (
            <button
              key={theme.id}
              onClick={() => handleThemeChange(theme.id)}
              className={`text-left rounded-xl p-4 border-2 transition-all ${
                activeTheme === theme.id
                  ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                  : 'border-border hover:border-primary/40 bg-muted/20'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-display font-bold text-sm">{theme.name}</span>
                {activeTheme === theme.id && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-mono">ATIVO</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{theme.description}</p>
              <div className="flex gap-1.5 mt-2">
                {[theme.colors.primary, theme.colors.secondary, theme.colors.success, theme.colors.accent].map((color, i) => (
                  <div key={i} className="w-5 h-5 rounded-full border border-border/50" style={{ background: `hsl(${color})` }} />
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>
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

      {/* Number Delivery Time */}
      <div className="glass rounded-xl p-6 space-y-4 border border-secondary/30">
        <div className="flex items-center gap-3">
          <Send className="w-5 h-5 text-secondary" />
          <h2 className="font-display font-semibold">📩 Horário de Envio dos Números</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Defina o horário exato para o programa enviar os números das loterias do dia.
          Os números só serão enviados se TODOS os critérios forem atendidos (gate 100%, domínio e precisão máxima → 1000%).
          Ao enviar, salva automaticamente em <strong>Minhas Apostas</strong> (máx. 1 jogo por loteria).
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
            enviará os números de TODAS as loterias que atingiram gate 100%, salvando automaticamente em Minhas Apostas para conferência.
            +Milionária inclui trevos, Timemania inclui time do coração.
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="px-2 py-1 rounded bg-muted/30">✅ Gate 100%</span>
            <span className="px-2 py-1 rounded bg-muted/30">✅ Domínio → 1000%</span>
            <span className="px-2 py-1 rounded bg-muted/30">✅ Precisão → 1000%</span>
            <span className="px-2 py-1 rounded bg-muted/30">✅ Padrões travados</span>
            <span className="px-2 py-1 rounded bg-muted/30">✅ Prêmio máximo</span>
            <span className="px-2 py-1 rounded bg-muted/30">✅ Auto-save Apostas</span>
            <span className="px-2 py-1 rounded bg-muted/30">🍀 Trevos +Milionária</span>
            <span className="px-2 py-1 rounded bg-muted/30">⚽ Time Timemania</span>
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
