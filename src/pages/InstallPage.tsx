import { useState, useEffect, useCallback } from 'react';
import { Download, Smartphone, Monitor, CheckCircle, Layers, Wifi, WifiOff, Shield, Zap, Activity, Chrome, Apple, Globe, Laptop } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const InstallPage = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [platform, setPlatform] = useState<'windows' | 'mac' | 'linux' | 'android' | 'ios' | 'unknown'>('unknown');

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      toast.info('Instalação disponível! Clique no botão para instalar.', { duration: 5000 });
    };
    window.addEventListener('beforeinstallprompt', handler);

    const installedHandler = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      toast.success('✅ DommoSupremo instalado com sucesso!');
    };
    window.addEventListener('appinstalled', installedHandler);

    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) setPlatform('ios');
    else if (/android/.test(ua)) setPlatform('android');
    else if (/mac/.test(ua)) setPlatform('mac');
    else if (/linux/.test(ua)) setPlatform('linux');
    else if (/win/.test(ua)) setPlatform('windows');

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) {
      // Fallback: show manual instructions
      toast.info('Use o menu do navegador (⋮) → "Instalar app" ou "Adicionar à tela inicial"', { duration: 8000 });
      return;
    }
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        toast.success('✅ DommoSupremo instalado com sucesso!');
      }
      setDeferredPrompt(null);
    } catch (e) {
      toast.error('Erro na instalação. Tente pelo menu do navegador.');
    }
  }, [deferredPrompt]);

  const features = [
    { icon: Activity, label: 'Funciona 24/7', desc: 'As IAs continuam trabalhando mesmo em segundo plano' },
    { icon: Layers, label: 'Sobreposição Mobile', desc: 'No Android, use "Picture-in-Picture" ou "Pop-up View" para sobrepor outros apps' },
    { icon: Wifi, label: 'Sincronização', desc: 'Dados sincronizados automaticamente entre desktop e mobile' },
    { icon: Shield, label: 'Offline Ready', desc: 'O app funciona mesmo sem internet, sincroniza ao reconectar' },
  ];

  const platformInstructions = [
    {
      id: 'windows',
      title: 'Windows (Chrome / Edge)',
      icon: Laptop,
      color: 'text-primary',
      steps: [
        'Abra o DommoSupremo no Google Chrome ou Microsoft Edge',
        'Clique no ícone de instalação (⊕) na barra de endereços, à direita',
        'Ou vá em Menu (⋮) → "Instalar DommoSupremo"',
        'Clique em "Instalar" na janela de confirmação',
        'O app será instalado e aparecerá no Menu Iniciar e na Área de Trabalho',
      ],
    },
    {
      id: 'linux',
      title: 'Linux (Chrome / Chromium / Edge)',
      icon: Globe,
      color: 'text-success',
      steps: [
        'Abra o DommoSupremo no Chrome, Chromium ou Edge',
        'Clique no ícone de instalação na barra de endereços',
        'Ou vá em Menu (⋮) → "Instalar DommoSupremo"',
        'Confirme a instalação',
        'O app ficará disponível no launcher do sistema como aplicativo nativo',
      ],
    },
    {
      id: 'mac',
      title: 'macOS (Chrome / Edge / Arc)',
      icon: Apple,
      color: 'text-muted-foreground',
      steps: [
        'Abra o DommoSupremo no Chrome, Edge ou Arc',
        'Clique no ícone de instalação na barra de endereços',
        'Ou vá em Menu (⋮) → "Instalar DommoSupremo"',
        'Confirme a instalação',
        'O app aparecerá no Launchpad e na pasta Aplicativos',
      ],
    },
    {
      id: 'android',
      title: 'Android (Chrome)',
      icon: Smartphone,
      color: 'text-secondary',
      steps: [
        'Abra o DommoSupremo no Chrome',
        'Toque no menu (⋮) no canto superior direito',
        'Selecione "Instalar app" ou "Adicionar à tela inicial"',
        'Toque em "Instalar" na janela de confirmação',
        'O app abre em modo standalone (tela cheia) como um app nativo',
      ],
    },
    {
      id: 'ios',
      title: 'iPhone / iPad (Safari)',
      icon: Apple,
      color: 'text-warning',
      steps: [
        'Abra o DommoSupremo no Safari (obrigatório ser Safari)',
        'Toque no botão Compartilhar (📤) na barra inferior',
        'Role a lista e toque "Adicionar à Tela de Início"',
        'Dê o nome "DommoSupremo" e toque "Adicionar"',
        'O app aparecerá na tela inicial como um ícone nativo',
      ],
    },
  ];

  const sortedInstructions = [...platformInstructions].sort((a, b) => {
    if (a.id === platform) return -1;
    if (b.id === platform) return 1;
    return 0;
  });

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div className="text-center">
        <h1 className="text-2xl font-display font-bold mb-2">Instalar DommoSupremo</h1>
        <p className="text-muted-foreground text-sm">
          Instale direto do navegador — Windows, Linux, macOS, Android e iOS
        </p>
        <div className="flex items-center justify-center gap-4 mt-3">
          {isOnline ? (
            <span className="flex items-center gap-1 text-xs text-success"><Wifi className="w-3 h-3" /> Online</span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-destructive"><WifiOff className="w-3 h-3" /> Offline</span>
          )}
          <span className="flex items-center gap-1 text-xs text-primary">
            <Globe className="w-3 h-3" />
            {platform === 'windows' ? 'Windows detectado' :
             platform === 'mac' ? 'macOS detectado' :
             platform === 'linux' ? 'Linux detectado' :
             platform === 'android' ? 'Android detectado' :
             platform === 'ios' ? 'iOS detectado' : 'Plataforma detectada'}
          </span>
        </div>
      </div>

      {/* Install Button - Always visible and functional */}
      {isInstalled ? (
        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="glass rounded-xl p-8 text-center">
          <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
          <h2 className="text-xl font-display font-bold text-success mb-2">Já Instalado!</h2>
          <p className="text-muted-foreground text-sm">O DommoSupremo está rodando neste dispositivo.</p>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-6 text-center border border-primary/30">
          <Download className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="text-lg font-display font-bold mb-3">
            {deferredPrompt ? '✅ Instalação Rápida Disponível!' : 'Instalar DommoSupremo'}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            {deferredPrompt 
              ? 'Seu navegador suporta instalação direta. Clique para instalar agora.'
              : platform === 'ios'
              ? 'No iOS, use o Safari e toque em Compartilhar → "Adicionar à Tela de Início"'
              : 'Clique no botão abaixo ou use o ícone ⊕ na barra de endereços do navegador.'}
          </p>
          <button 
            onClick={handleInstall} 
            className="gradient-primary text-primary-foreground font-display font-bold px-8 py-3 rounded-lg glow-primary hover:opacity-90 transition-all text-lg inline-flex items-center gap-2"
          >
            <Download className="w-5 h-5" /> 
            {deferredPrompt ? 'INSTALAR AGORA' : 'INSTALAR'}
          </button>
          {!deferredPrompt && platform !== 'ios' && (
            <p className="text-xs text-muted-foreground mt-3">
              💡 Se o botão não abrir a instalação, procure o ícone ⊕ na barra de endereços ou acesse Menu (⋮) → "Instalar app"
            </p>
          )}
        </motion.div>
      )}

      {/* Platform-specific instructions */}
      <div className="space-y-4">
        <h2 className="text-sm font-display font-bold text-muted-foreground tracking-wider">
          INSTRUÇÕES POR PLATAFORMA
        </h2>
        {sortedInstructions.map((p, idx) => {
          const isDetected = p.id === platform;
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`glass rounded-xl p-6 ${isDetected ? 'border-2 border-primary/40 ring-1 ring-primary/20' : ''}`}
            >
              <div className="flex items-center gap-3 mb-4">
                <p.icon className={`w-6 h-6 ${p.color}`} />
                <h3 className="font-display font-semibold">{p.title}</h3>
                {isDetected && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono">
                    SEU DISPOSITIVO
                  </span>
                )}
              </div>
              <ol className="space-y-2 text-sm text-muted-foreground">
                {p.steps.map((step, si) => (
                  <li key={si} className="flex items-start gap-2">
                    <span className="text-primary font-bold shrink-0">{si + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </motion.div>
          );
        })}
      </div>

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
