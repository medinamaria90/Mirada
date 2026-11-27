// Hojas de estilo que solo hacen falta en algunas pantallas (ficha, historias, guía…): se piden la
// primera vez que se usan y no cuentan en el arranque.

const loaded = new Map();
// Si la hoja no avisa (ni carga ni error), la pantalla no se queda esperando: sigue sin ella y la hoja se aplica al llegar.
export const CSS_WAIT_MS = 4000;

export function loadCss(href) {
  if (!loaded.has(href)) {
    loaded.set(href, new Promise((resolve) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.addEventListener('load', () => resolve(true), { once: true });
      link.addEventListener('error', () => { loaded.delete(href); resolve(false); }, { once: true });
      document.head.appendChild(link);
      setTimeout(() => resolve(false), CSS_WAIT_MS);
    }));
  }
  return loaded.get(href);
}

// Hojas del arranque: las mismas que enlaza index.html (lo comprueba tests/hojas-arranque.test.js). Si el navegador
// sirve un index.html viejo de su caché, sin una hoja añadida después, el módulo (que siempre llega fresco) la pide:
// así el mapa nunca sale sin sus estilos.
export const BOOT_CSS = ['css/brand.css', 'css/main.css', 'css/mapa-vivo.css', 'css/mapa-vida.css', 'css/mapa-carteles.css'];

// Las de `wanted` que no están entre los href presentes.
export const missingCss = (present, wanted = BOOT_CSS) => wanted.filter((href) => !present.some((p) => p === href || p.endsWith(`/${href}`)));

export function ensureBootCss() {
  const present = [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.getAttribute('href') || '');
  for (const href of missingCss(present)) loadCss(href);
}
