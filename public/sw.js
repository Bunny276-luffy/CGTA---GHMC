// CivicTrust PWA Service Worker
const CACHE_VERSION = 'civictrust-v1.0.2';
const STATIC_CACHE = `static-${CACHE_VERSION}`;

const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/icon'
];

// Authenticated portal routes that must NEVER be cached in service worker storage
const AUTH_PORTAL_PREFIXES = ['/citizen', '/officer', '/admin', '/dept-head'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== STATIC_CACHE) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. API routes, authentication endpoints, or mutation methods: strictly network-first, never cached
  if (url.pathname.startsWith('/api/') || request.method !== 'GET') {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({ error: 'Offline', message: 'You are currently working offline.' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // 2. Authenticated portal routes (complaints, officer workspace, admin console): strictly network-only
  const isAuthPortal = AUTH_PORTAL_PREFIXES.some(prefix => 
    url.pathname === prefix || (url.pathname.startsWith(prefix + '/') && !url.pathname.endsWith('/login'))
  );

  if (isAuthPortal) {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('/').then(cached => cached || new Response('Offline', { status: 503 }));
      })
    );
    return;
  }

  // 3. Public HTML navigation requests: network-first with cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => cached || caches.match('/'));
        })
    );
    return;
  }

  // 4. Static assets (images, fonts, scripts, css): stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const clone = networkResponse.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
        }
        return networkResponse;
      }).catch(() => null);

      return cachedResponse || fetchPromise;
    })
  );
});
