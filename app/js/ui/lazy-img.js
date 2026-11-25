// Imágenes diferidas (`artFrame(..., { defer: true })`): llevan `data-src` y se piden al acercarse a la pantalla
// (un margen corto, no el que usa el navegador para `loading="lazy"`, que en el móvil trae tres pantallas de golpe).
// Sin IntersectionObserver se piden todas.

const MARGIN = '160px 0px';
let observer = null;

function load(img) {
  if (img.dataset.src) { img.src = img.dataset.src; delete img.dataset.src; }
}

export function observeDeferred(root = document) {
  const imgs = [...root.querySelectorAll('img[data-src]')];
  if (!imgs.length) return;
  if (typeof IntersectionObserver !== 'function') { imgs.forEach(load); return; }
  observer = observer || new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      observer.unobserve(e.target);
      load(e.target);
    }
  }, { rootMargin: MARGIN });
  imgs.forEach((img) => observer.observe(img));
}
