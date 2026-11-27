// Service worker mínimo: hace la app instalable (sin barra de direcciones) y deja abrirla sin red con lo ya visto.
// Siempre red primero: un despliegue nuevo se ve en cuanto hay conexión; la caché solo responde si la red falla.
// Solo se guardan peticiones GET del propio origen.
const CACHE = 'sfumato-v1';
// Código, estilos, datos y páginas se piden revalidados (una petición condicional: 304 si no han cambiado). Sin esto,
// la caché HTTP del navegador puede servir tras un despliegue módulos viejos mezclados con los nuevos, y una pantalla
// que importa algo que el viejo no exporta no abre. Imágenes, letras y música siguen con la caché normal.
const REVALIDATE = /(?:\.(?:js|mjs|css|json|html|webmanifest)|\/)$/;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  const fresh = REVALIDATE.test(url.pathname) ? { cache: 'no-cache' } : undefined;
  event.respondWith(fetch(request, fresh).then((res) => {
    if (res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => { /* sin espacio: se sirve igual */ });
    }
    return res;
  }).catch(() => caches.match(request).then((hit) => hit || caches.match('./'))));
});
