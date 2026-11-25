// Kuschelinsel als App: alles, was einmal geladen wurde, bleibt für offline im Speicher.
// Immer zuerst aus dem Netz (damit Updates sofort da sind), ohne Netz aus dem Speicher.
const CACHE = 'kuschelinsel-4';
const CORE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).catch(() => {}));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return; // Mehrspieler-Server & Co. nicht anfassen
  // Nach einem Update nie alte und neue Dateien mischen: beim Server nachfragen, ob sich etwas geändert hat (sonst kurz 304)
  const fresh = r.mode === 'navigate' ? new Request(r.url, { cache: 'no-cache', credentials: 'same-origin' }) : new Request(r, { cache: 'no-cache' });
  e.respondWith(fetch(fresh).then(res => {
    if (res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); }
    return res;
  }).catch(async () => (await caches.match(r, { ignoreSearch: true })) || (r.mode === 'navigate' ? caches.match('./') : Response.error())));
});
