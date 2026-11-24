// Hojas de estilo que solo hacen falta en algunas pantallas (ficha, historias, guía…): se piden la
// primera vez que se usan y no cuentan en el arranque.

const loaded = new Map();

export function loadCss(href) {
  if (!loaded.has(href)) {
    loaded.set(href, new Promise((resolve) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.addEventListener('load', () => resolve(true), { once: true });
      link.addEventListener('error', () => { loaded.delete(href); resolve(false); }, { once: true });
      document.head.appendChild(link);
    }));
  }
  return loaded.get(href);
}
