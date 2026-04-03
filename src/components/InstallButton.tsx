import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Monitor, CheckCircle, Info, X, Wifi, WifiOff, Battery } from 'lucide-react';
import type { Platform } from '@/hooks/usePWAInstall';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface InstallButtonProps {
  variant?: 'sidebar' | 'topbar' | 'floating' | 'minimal';
  className?: string;
}

export function InstallButton({ variant = 'sidebar', className = '' }: InstallButtonProps) {
  const {
    canInstall,
    isInstalled,
    isInstalling,
    platform,
    wakeLockActive,
    backgroundSyncSupported,
    installInstructions,
    triggerInstall,
    requestWakeLock,
    releaseWakeLock,
    requestPushPermission,
    scheduleVerificacaoSorteios,
  } = usePWAInstall();

  const [showInstructions, setShowInstructions] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if ('Notification' in window) {
      setPushPermission(Notification.permission);
    }
  }, []);

  const handleInstall = async () => {
    if (platform === 'ios' as Platform) {
      setShowInstructions(true);
      return;
    }

    const accepted = await triggerInstall();
    if (accepted) {
      setInstallSuccess(true);
      await requestWakeLock();
      scheduleVerificacaoSorteios();

      const perm = await requestPushPermission();
      setPushPermission(perm);

      toast.success('DommoSupremo instalado com sucesso!', {
        description: 'O app rodará em segundo plano e verificará sorteios automaticamente às 21h.',
        duration: 6000,
      });
    } else if (!accepted && platform !== 'ios') {
      toast.info('Instalação cancelada', {
        description: 'Você pode instalar a qualquer momento pelo botão na barra de endereços.',
      });
    }
  };

  const handleEnableBackground = async () => {
    if (!wakeLockActive) {
      await requestWakeLock();
      toast.success('Modo segundo plano ativado!');
    } else {
      await releaseWakeLock();
      toast.info('Modo segundo plano desativado.');
    }
  };

  const handleEnablePush = async () => {
    const perm = await requestPushPermission();
    setPushPermission(perm);
    if (perm === 'granted') {
      scheduleVerificacaoSorteios();
      toast.success('Notificações ativadas!');
    }
  };

  if (isInstalled || installSuccess) {
    return (
      <div className={`flex flex-col gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/30 ${className}`}>
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-400" />
          <span className="text-xs font-semibold text-green-400">App Instalado</span>
          {isOnline ? (
            <Wifi className="w-3 h-3 text-green-400 ml-auto" />
          ) : (
            <WifiOff className="w-3 h-3 text-yellow-400 ml-auto" />
          )}
        </div>

        <button
          onClick={handleEnableBackground}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            wakeLockActive
              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
              : 'bg-muted/50 text-muted-foreground border border-border/30 hover:bg-blue-500/10'
          }`}
        >
          <Battery className={`w-3 h-3 ${wakeLockActive ? 'text-blue-400' : 'text-muted-foreground'}`} />
          {wakeLockActive ? 'Segundo plano: ON' : 'Ativar segundo plano'}
        </button>

        {pushPermission !== 'granted' && (
          <button
            onClick={handleEnablePush}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/20 transition-all"
          >
            <span>🔔</span>
            Ativar alertas de sorteio
          </button>
        )}

        {pushPermission === 'granted' && (
          <div className="flex items-center gap-2 px-2 py-1 rounded text-xs text-green-400/70">
            <span>✓</span> Alertas de sorteio às 21h ativados
          </div>
        )}
      </div>
    );
  }

  if (!canInstall) return null;

  const PlatformIcon = platform.includes('android') || platform === 'ios' ? Smartphone : Monitor;

  if (variant === 'minimal') {
    return (
      <button
        onClick={handleInstall}
        disabled={isInstalling}
        className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition-all ${className}`}
      >
        <Download className="w-3 h-3" />
        {isInstalling ? 'Instalando...' : 'Instalar'}
      </button>
    );
  }

  return (
    <>
      <button
        onClick={handleInstall}
        disabled={isInstalling}
        className={`
          group relative flex items-center gap-3 w-full px-4 py-3 rounded-xl
          bg-gradient-to-r from-primary/20 to-accent/20
          border border-primary/40 hover:border-primary/70
          text-primary hover:text-foreground
          transition-all duration-300 hover:shadow-lg hover:shadow-primary/20
          disabled:opacity-50 disabled:cursor-not-allowed
          ${className}
        `}
      >
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />

        <div className="relative flex items-center gap-3 w-full">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            {isInstalling ? (
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download className="w-4 h-4 text-primary" />
            )}
          </div>

          <div className="flex-1 text-left">
            <div className="text-sm font-semibold">
              {isInstalling ? 'Instalando...' : 'Instalar App'}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <PlatformIcon className="w-3 h-3" />
              {platform === 'ios' ? 'iPhone/iPad' :
               platform.includes('android') ? 'Android' : 'Desktop'}
            </div>
          </div>

          <Badge variant="outline" className="text-xs border-primary/40 text-primary bg-primary/10">
            PWA
          </Badge>
        </div>
      </button>

      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="bg-card border-border text-foreground max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Download className="w-5 h-5" />
              Instalar DommoSupremo
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Siga os passos abaixo para instalar no seu dispositivo
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {installInstructions.map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-xs font-bold text-primary">
                  {i + 1}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{step}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <p className="text-xs text-blue-300">
              Após instalar, o app rodará em segundo plano e verificará sorteios automaticamente às 21h.
            </p>
          </div>

          <Button onClick={() => setShowInstructions(false)} className="w-full">
            Entendido!
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function AddressBarInstallHint() {
  const { canInstall, isInstalled } = usePWAInstall();

  useEffect(() => {
    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (!manifestLink) {
      const link = document.createElement('link');
      link.rel = 'manifest';
      link.href = '/manifest.json';
      document.head.appendChild(link);
    }
  }, []);

  if (!canInstall || isInstalled) return null;

  return (
    <div
      id="address-bar-install-hint"
      className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center py-1.5 px-4 bg-gradient-to-r from-primary/10 to-accent/10 backdrop-blur-sm border-b border-primary/30 text-xs text-primary gap-2"
    >
      <Download className="w-3 h-3" />
      <span>Instale o DommoSupremo para acesso offline e alertas automáticos de sorteio</span>
      <button
        className="ml-auto px-2 py-0.5 rounded bg-primary/20 border border-primary/40 hover:bg-primary/30 transition-colors"
        onClick={() => document.getElementById('address-bar-install-hint')?.remove()}
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
