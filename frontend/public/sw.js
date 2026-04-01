// CivicTrust-GHMC Service Worker
// Prepares structure for Offline Sync caching strategy for Field Officers
const CACHE_NAME = 'civictrust-cache-v1';
const OFFLINE_URLS = [
    '/',
    '/index.html',
    // Assets would go here in production build
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(OFFLINE_URLS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// A basic stale-while-revalidate strategy placeholder
self.addEventListener('fetch', (event) => {
    // Exclude API/Firebase calls from service worker cache for now to prevent stale dynamic data
    if (event.request.url.includes('firestore.googleapis.com') || event.request.url.includes('identitytoolkit.googleapis.com')) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const networkFetch = fetch(event.request).then((response) => {
                // cache the new response if valid
                if (response && response.status === 200 && response.type === 'basic') {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return response;
            }).catch(() => {
                // If offline and not in cache, we could return a specific offline page here
            });
            
            return cachedResponse || networkFetch;
        })
    );
});

// Background Sync for Offline 'After' Photo Uploads (Proof-of-Work Verification)
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-resolution-photos') {
        event.waitUntil(
            // Logic to pull from IndexedDB and push to Firebase Storage
            console.log("Service Worker: Syncing offline resolution photos to server...")
        );
    }
});
