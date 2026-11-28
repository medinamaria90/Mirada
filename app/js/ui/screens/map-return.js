// Botón flotante para ir a lo que recomienda el itinerario (como el de Duolingo): un círculo con una flecha hacia donde queda,
// arriba o abajo (calculada al moverse). Solo aparece cuando lo recomendado (la parada con la burbuja de map-cue.js; si aún
// no hay, el medallón, el rombo o la parada actual) sale de la vista. Al tocarlo, el camino vuelve a ello y el foco pasa a
// su nodo; es, con abrir la app, lo único que centra el mapa en lo recomendado. Devuelve { retarget, stop }: retarget
// vuelve a buscar el destino cuando la burbuja cambia de sitio.

import { $, prefersReducedMotion } from '../dom.js';
import { icons } from '../icons.js';

const VIEW_MARGIN = '-96px 0px -96px 0px';   // la cabecera y la barra de abajo tapan esa franja

// Lo recomendado queda por encima del centro de la pantalla: la flecha apunta arriba. Se calcula con cada desplazamiento
// (no solo cuando entra o sale de la vista: un salto largo nunca la cruza).
export const pointsUp = (dotTop, viewH) => dotTop < viewH / 2;

// El nodo al que lleva: el de la burbuja, o la próxima parada didáctica o la parada actual.
const targetDot = (el) => $('.map-cue', el)?.parentElement || $('.lore-spot.is-here .lore-dot', el) || $('.stage-spot.is-current .stage-dot', el);

export function watchReturn(el) {
  if (typeof IntersectionObserver !== 'function') return { retarget: () => {}, stop: () => {} };
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'map-return';
  button.hidden = true;
  button.setAttribute('aria-label', 'Ir a lo recomendado');
  button.innerHTML = `<span class="map-return-arrow" aria-hidden="true">${icons.next(22)}</span>`;
  el.append(button);
  let dot = null;
  let away = false;
  let frame = 0;
  // Mientras está la tarjeta de pintores nuevos (abajo, en el mismo sitio), el botón se aparta.
  const update = () => {
    frame = 0;
    button.hidden = !dot || !away || Boolean(el.querySelector('.news-card:not(.is-leaving)'));
    if (dot) button.classList.toggle('is-up', pointsUp(dot.getBoundingClientRect().top, window.innerHeight));
  };
  const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
  const io = new IntersectionObserver(([entry]) => { away = !entry.isIntersecting; update(); }, { rootMargin: VIEW_MARGIN });
  const retarget = () => {
    const next = targetDot(el);
    if (next === dot) return;
    if (dot) io.unobserve(dot);
    dot = next;
    away = false;
    if (dot) io.observe(dot);
    update();
  };
  button.addEventListener('click', () => {
    const stage = dot?.closest('.stage, .lore');
    if (!stage) return;
    stage.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'instant' : 'smooth' });
    stage.focus({ preventScroll: true });
  });
  const news = new MutationObserver(onScroll);
  news.observe(el, { childList: true, subtree: false });
  window.addEventListener('scroll', onScroll, { passive: true });
  retarget();
  return { retarget, stop: () => { io.disconnect(); news.disconnect(); window.removeEventListener('scroll', onScroll); cancelAnimationFrame(frame); button.remove(); } };
}
