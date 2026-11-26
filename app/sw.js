// Service worker mínimo: hace la app instalable (sin barra de direcciones) y deja abrirla sin red con lo ya visto.
// Siempre red primero: un despliegue nuevo se ve en cuanto hay conexión; la caché solo responde si la red falla.
// Solo se guardan peticiones GET del propio origen.
const CACHE = 'sfumato-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(request).then((res) => {
    if (res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => { /* sin espacio: se sirve igual */ });
    }
    return res;
  }).catch(() => caches.match(request).then((hit) => hit || caches.match('./'))));
});
