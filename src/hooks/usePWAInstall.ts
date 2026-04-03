import { useState, useEffect, useRef, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type Platform = 'desktop-chrome' | 'desktop-edge' | 'desktop-firefox' | 'desktop-safari' | 'ios' | 'android-chrome' | 'android-firefox' | 'unknown';

export interface PWAInstallState {
  canInstall: boolean;
  isInstalled: boolean;
  isInstalling: boolean;
  platform: Platform;
  installPromptAvailable: boolean;
  wakeLockActive: boolean;
  backgroundSyncSupported: boolean;
  periodicSyncSupported: boolean;
  pushSupported: boolean;
  installInstructions: string[];
}

export interface PWAInstallActions {
  triggerInstall: () => Promise<boolean>;
  requestWakeLock: () => Promise<void>;
  releaseWakeLock: () => Promise<void>;
  registerBackgroundSync: (tag: string) => Promise<void>;
  registerPeriodicSync: (tag: string, minInterval?: number) => Promise<void>;
  requestPushPermission: () => Promise<NotificationPermission>;
  scheduleVerificacaoSorteios: () => void;
}

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  const isAndroid = /Android/.test(ua);
  const isChrome = /Chrome/.test(ua) && !/Edge|Edg/.test(ua);
  const isEdge = /Edge|Edg/.test(ua);
  const isFirefox = /Firefox/.test(ua);
  const isSafari = /Safari/.test(ua) && !isChrome;

  if (isIOS) return 'ios';
  if (isAndroid && isChrome) return 'android-chrome';
  if (isAndroid && isFirefox) return 'android-firefox';
  if (isEdge) return 'desktop-edge';
  if (isChrome) return 'desktop-chrome';
  if (isFirefox) return 'desktop-firefox';
  if (isSafari) return 'desktop-safari';
  return 'unknown';
}

function getInstallInstructions(platform: Platform): string[] {
  switch (platform) {
    case 'ios':
      return [
        'Toque no ícone de Compartilhar (📤) na barra inferior do Safari',
        'Role a lista e toque em "Adicionar à Tela de Início"',
        'Confirme o nome "DommoSupremo" e toque em "Adicionar"',
        'O ícone aparecerá na sua tela inicial — abra e use como app!',
      ];
    case 'android-chrome':
      return [
        'Toque no menu (⋮) no canto superior direito do Chrome',
        'Selecione "Adicionar à tela inicial" ou "Instalar app"',
        'Confirme tocando em "Instalar" na janela que aparecer',
        'O DommoSupremo será instalado como app nativo!',
      ];
    case 'android-firefox':
      return [
        'Toque no menu (⋮) do Firefox',
        'Selecione "Instalar"',
        'Confirme a instalação',
      ];
    case 'desktop-chrome':
      return [
        'Clique no ícone de instalação (⊕) na barra de endereços',
        'Clique em "Instalar" na janela de confirmação',
        'O DommoSupremo abrirá como aplicativo separado!',
      ];
    case 'desktop-edge':
      return [
        'Clique no ícone de aplicativo (🔲) na barra de endereços',
        'Clique em "Instalar" ou "Adicionar ao desktop"',
      ];
    case 'desktop-safari':
      return [
        'Clique em "Arquivo" no menu do Safari',
        'Selecione "Adicionar ao Dock"',
      ];
    default:
      return [
        'Use o menu do seu navegador para instalar este aplicativo',
        'Procure por "Instalar app" ou "Adicionar à tela inicial"',
      ];
  }
}

export function usePWAInstall(): PWAInstallState & PWAInstallActions {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [platform] = useState<Platform>(detectPlatform);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [backgroundSyncSupported] = useState(() => 'serviceWorker' in navigator && 'SyncManager' in window);
  const [periodicSyncSupported] = useState(() => 'periodicSync' in (navigator as any));
  const [pushSupported] = useState(() => 'Notification' in window && 'PushManager' in window);

  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const wakeLockRef = useRef<any>(null);

  const registerPeriodicSync = useCallback(async (tag: string, minInterval = 60 * 60 * 1000) => {
    if (!periodicSyncSupported) return;
    const reg = await navigator.serviceWorker.ready;
    const status = await navigator.permissions.query({ name: 'periodic-background-sync' } as any);
    if (status.state === 'granted') {
      await (reg as any).periodicSync.register(tag, { minInterval });
    }
  }, [periodicSyncSupported]);

  const scheduleVerificacaoSorteios = useCallback(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        if (reg.active) {
          reg.active.postMessage({ type: 'SCHEDULE_VERIFICACAO' });
        }
      });
    }
    registerPeriodicSync('verificar-sorteios-periodico', 60 * 60 * 1000);
  }, [registerPeriodicSync]);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }
    if ((window.navigator as any).standalone === true) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      deferredPromptRef.current = null;
      scheduleVerificacaoSorteios();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (platform === 'ios') {
      setCanInstall(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [platform, scheduleVerificacaoSorteios]);

  const triggerInstall = useCallback(async (): Promise<boolean> => {
    if (platform === 'ios') return false;
    if (!deferredPromptRef.current) return false;

    setIsInstalling(true);
    try {
      await deferredPromptRef.current.prompt();
      const { outcome } = await deferredPromptRef.current.userChoice;
      deferredPromptRef.current = null;
      setCanInstall(false);
      return outcome === 'accepted';
    } finally {
      setIsInstalling(false);
    }
  }, [platform]);

  const requestWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) return;
    try {
      wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      setWakeLockActive(true);
      wakeLockRef.current.addEventListener('release', () => {
        setWakeLockActive(false);
      });
    } catch (err) {
      console.warn('[PWA] Wake Lock não disponível:', err);
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
      setWakeLockActive(false);
    }
  }, []);

  const registerBackgroundSync = useCallback(async (tag: string) => {
    if (!backgroundSyncSupported) return;
    const reg = await navigator.serviceWorker.ready;
    await (reg as any).sync.register(tag);
  }, [backgroundSyncSupported]);

  const requestPushPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!pushSupported) return 'denied';
    return await Notification.requestPermission();
  }, [pushSupported]);

  return {
    canInstall,
    isInstalled,
    isInstalling,
    platform,
    installPromptAvailable: !!deferredPromptRef.current,
    wakeLockActive,
    backgroundSyncSupported,
    periodicSyncSupported,
    pushSupported,
    installInstructions: getInstallInstructions(platform),
    triggerInstall,
    requestWakeLock,
    releaseWakeLock,
    registerBackgroundSync,
    registerPeriodicSync,
    requestPushPermission,
    scheduleVerificacaoSorteios,
  };
}
