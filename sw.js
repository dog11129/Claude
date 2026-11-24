// Kuschelinsel als App: alles, was einmal geladen wurde, bleibt für offline im Speicher.
// Immer zuerst aus dem Netz (damit Updates sofort da sind), ohne Netz aus dem Speicher.
const CACHE = 'kuschelinsel-2';
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
  e.respondWith(fetch(r).then(res => {
    if (res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); }
    return res;
  }).catch(async () => (await caches.match(r, { ignoreSearch: true })) || (r.mode === 'navigate' ? caches.match('./') : Response.error())));
});
