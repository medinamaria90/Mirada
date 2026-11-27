// Dónde queda la vista del mapa al pintarlo (portada o pantalla de rama):
//  · Al abrir la app (o entrar en una rama desde el camino): la parada actual hacia el 60 % de la altura, sin animación.
//  · Al volver a él (de un cartel, una ficha, una historia, una ronda…): EXACTAMENTE donde estaba (map-memory.js), con
//    el foco en la parada jugada si se viene de ella. Nunca se recentra a la fuerza en la parada actual: para eso está
//    el botón «Tu parada» (map-return.js).
//  · Si se pide ir a una parada concreta (un pintor «En el camino» desde una rama), centrada en ella.
// Mientras se pintan las épocas lejanas y los paisajes la altura puede cambiar: la vista se recoloca hasta que se
// asienta o hasta que se toca la pantalla.

import { $ } from '../dom.js';
import { restoreTop } from './map-memory.js';

const CURRENT_AT = 0.6;     // la parada actual, a esta fracción de la altura de la ventana
const SETTLE_MS = 1500;     // tiempo en que se recoloca si cambia la altura del mapa
const STOP_EVENTS = ['pointerdown', 'wheel', 'touchstart', 'keydown', 'hashchange'];

const yFor = (node, at) => {
  const r = node.getBoundingClientRect();
  return Math.max(0, window.scrollY + r.top + r.height / 2 - window.innerHeight * at);
};

// el: la pantalla; branchId / step: la rama o la parada («artist:<id>», «sala:<id>») de la que se vuelve (recibe el
// foco); jump: centrar la vista en esa parada; restore: el ancla guardada de este mapa (map-memory.js).
// Devuelve cómo dejar de vigilarla.
export function placeMap(el, { branchId = '', step = '', jump = false, restore = null } = {}) {
  const map = $('.path-map', el);
  const current = () => $('.stage-spot.is-current .stage', el) || $('.stage.is-available:not(.stage-review)', el) || $('.stage.is-started', el);
  const from = () => (step && $(`.stage-spot[data-step="${step}"] .stage`, el))
    || (branchId && $(`.branch[data-id="${branchId}"]`, el)) || null;
  const target = () => {
    const f = from();
    if (jump && f) return yFor(f, 0.5);
    const back = restore && map ? restoreTop(map, restore) : null;
    if (back !== null) return back;
    if (f) return yFor(f, 0.5);
    const c = current();
    return c ? yFor(c, CURRENT_AT) : null;
  };
  let user = false;
  let timers = [];
  let ro = null;
  const place = () => {
    const top = user ? null : target();
    if (top !== null) window.scrollTo({ top, behavior: 'instant' });
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
    from()?.focus({ preventScroll: true });
  });
  return stop;
}
