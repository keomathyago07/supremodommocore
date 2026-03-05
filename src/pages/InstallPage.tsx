import { useState, useEffect } from 'react';
import { Download, Smartphone, Monitor, CheckCircle, ArrowDown } from 'lucide-react';
import { motion } from 'framer-motion';

const InstallPage = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setIsInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <div className="text-center">
        <h1 className="text-2xl font-display font-bold mb-2">Instalar DommoSupremo</h1>
        <p className="text-muted-foreground text-sm">Instale o programa no seu dispositivo para acesso rápido e notificações</p>
      </div>

      {isInstalled ? (
        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="glass rounded-xl p-8 text-center">
          <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
          <h2 className="text-xl font-display font-bold text-success mb-2">Já Instalado!</h2>
          <p className="text-muted-foreground text-sm">O DommoSupremo já está instalado neste dispositivo.</p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {deferredPrompt && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-6 text-center">
              <Download className="w-12 h-12 text-primary mx-auto mb-4" />
              <h2 className="text-lg font-display font-bold mb-3">Instalar Agora</h2>
              <button
                onClick={handleInstall}
                className="gradient-primary text-primary-foreground font-display font-bold px-8 py-3 rounded-lg glow-primary hover:opacity-90 transition-all text-lg"
              >
                <Download className="w-5 h-5 inline mr-2" />
                INSTALAR
              </button>
            </motion.div>
          )}

          {/* Desktop Instructions */}
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

          {/* Mobile Instructions */}
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
                </ol>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground mb-2">iPhone (Safari):</p>
                <ol className="space-y-1 text-sm text-muted-foreground">
                  <li>1. Toque no botão Compartilhar (📤)</li>
                  <li>2. Role para baixo e toque "Adicionar à Tela de Início"</li>
                  <li>3. Toque "Adicionar"</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstallPage;
