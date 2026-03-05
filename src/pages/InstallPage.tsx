import { useState, useEffect } from 'react';
import { Download, Smartphone, Monitor, CheckCircle, Layers, Wifi, WifiOff, Shield, Zap, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

const InstallPage = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    if (window.matchMedia('(display-mode: standalone)').matches) setIsInstalled(true);

    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setIsInstalled(true);
    setDeferredPrompt(null);
  };

  const features = [
    { icon: Activity, label: 'Funciona 24/7', desc: 'As IAs continuam trabalhando mesmo em segundo plano' },
    { icon: Layers, label: 'Sobreposição Mobile', desc: 'No Android, use "Picture-in-Picture" ou "Pop-up View" para sobrepor outros apps' },
    { icon: Wifi, label: 'Sincronização', desc: 'Dados sincronizados automaticamente entre desktop e mobile' },
    { icon: Shield, label: 'Offline Ready', desc: 'O app funciona mesmo sem internet, sincroniza ao reconectar' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div className="text-center">
        <h1 className="text-2xl font-display font-bold mb-2">Instalar DommoSupremo</h1>
        <p className="text-muted-foreground text-sm">Desktop + Mobile — Sempre ligado, sempre sincronizado</p>
        <div className="flex items-center justify-center gap-2 mt-2">
          {isOnline ? (
            <span className="flex items-center gap-1 text-xs text-success"><Wifi className="w-3 h-3" /> Online</span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-destructive"><WifiOff className="w-3 h-3" /> Offline</span>
          )}
        </div>
      </div>

      {isInstalled ? (
        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="glass rounded-xl p-8 text-center">
          <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
          <h2 className="text-xl font-display font-bold text-success mb-2">Já Instalado!</h2>
          <p className="text-muted-foreground text-sm">O DommoSupremo está rodando neste dispositivo.</p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {deferredPrompt && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-6 text-center">
              <Download className="w-12 h-12 text-primary mx-auto mb-4" />
              <h2 className="text-lg font-display font-bold mb-3">Instalar Agora</h2>
              <button onClick={handleInstall} className="gradient-primary text-primary-foreground font-display font-bold px-8 py-3 rounded-lg glow-primary hover:opacity-90 transition-all text-lg">
                <Download className="w-5 h-5 inline mr-2" /> INSTALAR
              </button>
            </motion.div>
          )}

          <div className="glass rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Monitor className="w-6 h-6 text-primary" />
              <h3 className="font-display font-semibold">Desktop (Chrome/Edge)</h3>
            </div>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><span className="text-primary font-bold">1.</span> Clique no ícone de instalação na barra de endereços (🔽)</li>
              <li className="flex items-start gap-2"><span className="text-primary font-bold">2.</span> Clique em "Instalar" na janela que aparecer</li>
              <li className="flex items-start gap-2"><span className="text-primary font-bold">3.</span> O DommoSupremo aparecerá como um app no seu computador</li>
            </ol>
          </div>

          <div className="glass rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Smartphone className="w-6 h-6 text-secondary" />
              <h3 className="font-display font-semibold">Mobile (iOS/Android)</h3>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-foreground mb-2">Android (Chrome):</p>
                <ol className="space-y-1 text-sm text-muted-foreground">
                  <li>1. Toque no menu (⋮) do Chrome</li>
                  <li>2. Selecione "Instalar app" ou "Adicionar à tela inicial"</li>
                  <li>3. O app abre em modo standalone (tela cheia)</li>
                </ol>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground mb-2">iPhone (Safari):</p>
                <ol className="space-y-1 text-sm text-muted-foreground">
                  <li>1. Toque no botão Compartilhar (📤)</li>
                  <li>2. Role e toque "Adicionar à Tela de Início"</li>
                  <li>3. Toque "Adicionar"</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Features */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {features.map((f, i) => (
          <motion.div key={f.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <f.icon className="w-4 h-4 text-primary" />
              <span className="text-sm font-display font-semibold">{f.label}</span>
            </div>
            <p className="text-xs text-muted-foreground">{f.desc}</p>
          </motion.div>
        ))}
      </div>

      {/* Overlay / Background Instructions */}
      <div className="glass rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Layers className="w-6 h-6 text-warning" />
          <h3 className="font-display font-semibold">Modo Segundo Plano & Sobreposição</h3>
        </div>
        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="bg-muted/20 rounded-lg p-3">
            <p className="font-semibold text-foreground mb-1">Android — Sobreposição:</p>
            <ol className="space-y-1 text-xs">
              <li>1. Abra o DommoSupremo instalado</li>
              <li>2. Toque no botão "Recentes" (quadrado)</li>
              <li>3. Toque no ícone do app → "Abrir em janela pop-up" ou "Tela dividida"</li>
              <li>4. O app fica flutuando sobre outros apps</li>
            </ol>
          </div>
          <div className="bg-muted/20 rounded-lg p-3">
            <p className="font-semibold text-foreground mb-1">Samsung — Pop-up View:</p>
            <ol className="space-y-1 text-xs">
              <li>1. Abra "Recentes" → Toque no ícone do app</li>
              <li>2. Selecione "Abrir na exibição pop-up"</li>
              <li>3. O app fica como janela flutuante redimensionável</li>
            </ol>
          </div>
          <div className="bg-muted/20 rounded-lg p-3">
            <p className="font-semibold text-foreground mb-1">Sincronização Desktop ↔ Mobile:</p>
            <p className="text-xs">
              ✅ Automática — Todos os dados (apostas, gates, análises) são sincronizados em tempo real via Lovable Cloud. 
              Basta fazer login nos dois dispositivos com o mesmo PIN.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstallPage;
