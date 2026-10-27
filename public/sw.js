const CACHE_NAME = 'roonjha-print-share-v1';
const PRECACHE_ASSETS = [
  '/',
  '/upload',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Pre-caching some assets failed:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Do NOT cache API calls (job uploads, SSE events, ping, downloads)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Network first, falling back to cache
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;

        // If navigating to upload page offline, return cached /upload
        if (event.request.mode === 'navigate') {
          const fallback = await caches.match('/upload');
          if (fallback) return fallback;
        }

        return new Response('Network offline. Please ensure you are connected to the shop Wi-Fi / Hotspot.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' },
        });
      })
  );
});
