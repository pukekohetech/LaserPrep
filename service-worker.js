const CACHE_NAME = 'laserprep-cache-v8';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './jspdf.umd.min.js',
  './svg2pdf.umd.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Install: pre-cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: offline-first for navigations, cache-first for assets
self.addEventListener('fetch', event => {
  const req = event.request;

  // For page navigations, always serve index.html from cache when offline
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then(cached => {
        return cached || fetch(req);
      })
    );
    return;
  }

  // For everything else, try cache, then network + cache
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;

      return fetch(req)
        .then(networkResp => {
          // Don’t cache opaque responses, etc, too aggressively if you don’t want to
          const respClone = networkResp.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(req, respClone);
          });
          return networkResp;
        })
        .catch(() => cached); // fallback if both fail
    })
  );
});
