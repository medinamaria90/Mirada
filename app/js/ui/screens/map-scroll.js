// Dónde queda la vista del mapa al abrir la portada (docs/eval/ux-posicion-mapa.md):
//  · Al abrir: la parada actual hacia el 60 % de la altura, sin animación.
//  · Al volver de una parada (o de una rama): en esa misma parada; si la siguiente abierta queda fuera de la pantalla,
//    el camino sube suave hasta ella (se cancela si se toca o se desplaza; sin animación con movimiento reducido).
// Mientras se pintan las épocas lejanas y los paisajes la altura puede cambiar: la vista se recoloca hasta que se
// asienta o hasta que se toca la pantalla.

import { $, prefersReducedMotion } from '../dom.js';

const CURRENT_AT = 0.6;     // la parada actual, a esta fracción de la altura de la ventana
const SETTLE_MS = 1500;     // tiempo en que se recoloca si cambia la altura del mapa
const GLIDE_DELAY_MS = 700; // la parada jugada se ve un momento antes de subir a la siguiente
const MARGIN = 0.12;        // «se ve» si queda dentro de la ventana con este margen arriba y abajo
const STOP_EVENTS = ['pointerdown', 'wheel', 'touchstart', 'keydown', 'hashchange'];

const yFor = (node, at) => {
  const r = node.getBoundingClientRect();
  return Math.max(0, window.scrollY + r.top + r.height / 2 - window.innerHeight * at);
};
const inView = (node) => {
  const r = node.getBoundingClientRect();
  const h = window.innerHeight;
  return r.top >= h * MARGIN && r.bottom <= h * (1 - MARGIN);
};

// el: la portada; branchId / step: la rama o la parada («artist:<id>», «sala:<id>») de la que se vuelve.
// Devuelve cómo dejar de vigilarla.
export function placeMap(el, { branchId = '', step = '' } = {}) {
  const map = $('.path-map', el);
  const current = () => $('.stage-spot.is-current .stage', el) || $('.stage.is-available:not(.stage-review)', el) || $('.stage.is-started', el);
  const from = () => (step && $(`.stage-spot[data-step="${step}"] .stage`, el))
    || (branchId && $(`.branch[data-id="${branchId}"]`, el)) || null;
  let anchor = () => { const f = from(); return f ? [f, 0.5] : current() ? [current(), CURRENT_AT] : null; };
  let user = false;
  let timers = [];
  let ro = null;
  const place = () => {
    const a = anchor();
    if (a && !user && a[0].isConnected) window.scrollTo({ top: yFor(a[0], a[1]), behavior: 'instant' });
  };
  const stop = () => {
    timers.forEach(clearTimeout);
    timers = [];
    ro?.disconnect();
    STOP_EVENTS.forEach((t) => window.removeEventListener(t, onUser, true));
  };
  const onUser = () => { user = true; stop(); };
  requestAnimationFrame(() => {
    place();
    STOP_EVENTS.forEach((t) => window.addEventListener(t, onUser, { capture: true, passive: true }));
    if (map && typeof ResizeObserver === 'function') {
      ro = new ResizeObserver(place);
      ro.observe(map);
    }
    timers.push(setTimeout(() => ro?.disconnect(), SETTLE_MS));
    // Desde una parada ya jugada: el foco, en ella; si la actual es otra y no se ve, se sube hasta ella.
    const f = from();
    if (step && f) f.focus({ preventScroll: true });
    const next = current();
    if (step && f && next && next !== f) {
      timers.push(setTimeout(() => {
        if (user || !next.isConnected || inView(next)) return;
        ro?.disconnect();
        anchor = () => [next, CURRENT_AT];
        window.scrollTo({ top: yFor(next, CURRENT_AT), behavior: prefersReducedMotion() ? 'instant' : 'smooth' });
      }, GLIDE_DELAY_MS));
    }
  });
  return stop;
}
