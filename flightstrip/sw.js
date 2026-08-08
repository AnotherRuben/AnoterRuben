// Flight Strip service worker — caches the app shell for offline use.
// Bump CACHE_VERSION whenever you edit the HTML to force an update.
const CACHE_VERSION = 'flightstrip-v1';
const APP_SHELL = [
  './flightstrip.html',
  './manifest.webmanifest',
  './icon.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_VERSION).then(c => c.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  // Clear old caches
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Never cache live API calls — always go to network, fail gracefully
  const liveHosts = ['simbrief.com', 'aviationweather.gov', 'metar.vatsim.net',
                     'api.checkwx.com', 'corsproxy.io', 'allorigins.win',
                     'fonts.googleapis.com', 'fonts.gstatic.com'];
  if (liveHosts.some(h => url.hostname.includes(h))) {
    e.respondWith(fetch(e.request).catch(() => new Response('', { status: 503 })));
    return;
  }

  // App shell: cache-first (instant load, works offline)
  e.respondWith(
    caches.match(e.request).then(cached =>
      cached || fetch(e.request).then(resp => {
        // Cache same-origin GET responses as we see them
        if (e.request.method === 'GET' && resp.ok && url.origin === location.origin) {
          const clone = resp.clone();
          caches.open(CACHE_VERSION).then(c => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => caches.match('./flightstrip.html'))
    )
  );
});