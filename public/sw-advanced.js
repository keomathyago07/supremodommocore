const CACHE_VERSION = 'dommo-v3';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const API_CACHE = `${CACHE_VERSION}-api`;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith('dommo-') && k !== STATIC_CACHE && k !== DYNAMIC_CACHE && k !== API_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.hostname.includes('supabase.co')) {
    event.respondWith(networkFirstWithCache(request, API_CACHE, 30));
    return;
  }

  if (url.hostname.includes('serviceodds') || url.hostname.includes('loteriascaixa') || url.pathname.includes('/resultados')) {
    event.respondWith(networkFirstWithCache(request, API_CACHE, 5));
    return;
  }

  if (request.destination === 'image' || request.destination === 'font' || request.destination === 'style') {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
});

async function networkFirstWithCache(request, cacheName, maxAgeMinutes) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request.clone());
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    return cached || new Response(JSON.stringify({ error: 'offline' }), { headers: { 'Content-Type': 'application/json' } });
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  const cache = await caches.open(cacheName);
  cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then((response) => {
    cache.put(request, response.clone());
    return response;
  }).catch(() => cached);
  return cached || fetchPromise;
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'verificar-sorteios') {
    event.waitUntil(verificarSorteiosAutomatico());
  }
});

async function verificarSorteiosAutomatico() {
  const agora = new Date();
  if (agora.getHours() >= 21) {
    try {
      const response = await fetch('https://serviceodds.com.br/api/resultados/recentes');
      if (response.ok) {
        const resultados = await response.json();
        await notifyClients({ type: 'SORTEIO_VERIFICADO', resultados, timestamp: Date.now() });

        const clients = await self.clients.matchAll();
        if (clients.length === 0) {
          self.registration.showNotification('🎯 DommoSupremo — Sorteios Verificados!', {
            body: 'Resultado disponível. Toque para ver pontuação.',
            icon: '/favicon.ico',
            tag: 'sorteio-resultado',
            requireInteraction: true,
            data: { url: '/dashboard/history' },
          });
        }
      }
    } catch (err) {
      console.error('[SW] Erro na verificação:', err);
    }
  }
}

self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || '🎯 DommoSupremo', {
      body: data.body || 'Nova notificação',
      icon: '/favicon.ico',
      tag: data.tag || 'dommo-notif',
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data;
  const targetUrl = data?.url || '/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(targetUrl));
      if (existing) return existing.focus();
      return self.clients.openWindow(targetUrl);
    })
  );
});

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'verificar-sorteios-periodico') {
    event.waitUntil(verificarSorteiosAutomatico());
  }
});

self.addEventListener('message', (event) => {
  const { type } = event.data || {};
  if (type === 'SKIP_WAITING') self.skipWaiting();
  if (type === 'SCHEDULE_VERIFICACAO') {
    const agora = new Date();
    const alvo = new Date();
    alvo.setHours(21, 5, 0, 0);
    if (agora > alvo) alvo.setDate(alvo.getDate() + 1);
    const delay = alvo - agora;
    setTimeout(() => verificarSorteiosAutomatico(), delay);
  }
});

async function notifyClients(message) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  clients.forEach((client) => client.postMessage(message));
}
