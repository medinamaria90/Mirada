// Pantalla que no carga. Tras un despliegue, el móvil puede mezclar módulos de la versión anterior (en su caché) con
// los nuevos: una pantalla nueva importa algo que el módulo viejo no exporta y el import falla. El navegador recuerda
// ese fallo hasta recargar, así que la primera vez se recarga sola, sin aviso (el service worker pide entonces todo
// revalidado). Si vuelve a fallar enseguida en la misma ruta, se muestra el aviso de la app. Puro salvo el almacén.

export const RELOAD_KEY = 'sfumato.recarga';
// Margen en el que un segundo fallo en la misma ruta ya no recarga (evita bucles).
export const RELOAD_WINDOW_MS = 60 * 1000;

// ¿Recargar sola para recuperarse? storage: sessionStorage (o null si no hay); route: la ruta que ha fallado.
export function shouldAutoReload(storage, route, now) {
  if (!storage) return false;
  try {
    const last = JSON.parse(storage.getItem(RELOAD_KEY) || 'null');
    if (last && last.route === route && now - last.at >= 0 && now - last.at < RELOAD_WINDOW_MS) return false;
    storage.setItem(RELOAD_KEY, JSON.stringify({ route, at: now }));
    return true;
  } catch (err) {
    console.info('Sin recarga automática:', err.message);
    return false;
  }
}
