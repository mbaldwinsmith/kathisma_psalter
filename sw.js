const CACHE_VERSION = 'psalter-v4';

const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/reset.css',
  './css/tokens.css',
  './css/typography.css',
  './css/layout.css',
  './css/animations.css',
  './js/app.js',
  './js/state.js',
  './js/plan.js',
  './js/numbering.js',
  './js/render.js',
  './js/router.js',
  './js/storage.js',
  './data/structure.json',
  './icons/favicon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './fonts/EBGaramond-Regular.woff2',
  './fonts/EBGaramond-Italic.woff2',
  './fonts/EBGaramond-SemiBold.woff2',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(PRECACHE.map(u => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== location.origin) return;

  // Psalm JSON: stale-while-revalidate
  if (url.pathname.includes('/data/psalms/')) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Everything else: cache-first
  event.respondWith(cacheFirst(request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_VERSION);
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  const networkPromise = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  });
  return cached || networkPromise;
}
