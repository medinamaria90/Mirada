// Botón «Tú» para volver a la parada actual (como el de Duolingo): un círculo pequeño con una flecha hacia donde queda,
// arriba o abajo (calculada al moverse), y «Tú», la misma marca que se mece sobre la parada actual. Solo aparece cuando
// la parada actual sale de la vista. Al tocarlo, el camino vuelve a ella y el
// foco pasa a su nodo; es, con abrir la app, lo único que centra el mapa en la parada actual. Devuelve cómo quitarlo.

import { $, esc, prefersReducedMotion } from '../dom.js';
import { icons } from '../icons.js';

const VIEW_MARGIN = '-96px 0px -96px 0px';   // la cabecera y la barra de abajo tapan esa franja

// La parada queda por encima del centro de la pantalla: la flecha apunta arriba. Se calcula con cada desplazamiento
// (no solo cuando la parada entra o sale de la vista: un salto largo nunca la cruza).
export const pointsUp = (dotTop, viewH) => dotTop < viewH / 2;
export const RETURN_TEXT = 'Tú';

// guide (engine/next-step.js mapGuide): si lo que recomienda el juego no es la parada actual (repasar, lo que pide el rango),
// el mismo botón se alarga con su rótulo («Repasar») y siempre está a la vista: tocarlo empieza esa acción (onGuide).
export function watchReturn(el, guide = null, onGuide = () => {}) {
  if (guide) return guideButton(el, guide, onGuide);
  const dot = $('.stage-spot.is-current .stage-dot', el);
  if (!dot || typeof IntersectionObserver !== 'function') return () => {};
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'map-return';
  button.hidden = true;
  button.setAttribute('aria-label', 'Ir a tu parada');
  button.innerHTML = `<span class="map-return-arrow" aria-hidden="true">${icons.next(18)}</span><span class="map-return-text" aria-hidden="true">${RETURN_TEXT}</span>`;
  el.append(button);
  button.addEventListener('click', () => {
    const stage = dot.closest('.stage');
    stage.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'instant' : 'smooth' });
    stage.focus({ preventScroll: true });
  });
  let away = false;
  let frame = 0;
  // Mientras está la tarjeta de pintores nuevos (abajo, en el mismo sitio), el botón se aparta.
  const update = () => {
    frame = 0;
    button.hidden = !away || Boolean(el.querySelector('.news-card:not(.is-leaving)'));
    button.classList.toggle('is-up', pointsUp(dot.getBoundingClientRect().top, window.innerHeight));
  };
  const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
  const io = new IntersectionObserver(([entry]) => { away = !entry.isIntersecting; update(); }, { rootMargin: VIEW_MARGIN });
  io.observe(dot);
  const news = new MutationObserver(onScroll);
  news.observe(el, { childList: true, subtree: false });
  window.addEventListener('scroll', onScroll, { passive: true });
  return () => { io.disconnect(); news.disconnect(); window.removeEventListener('scroll', onScroll); cancelAnimationFrame(frame); button.remove(); };
}

function guideButton(el, guide, onGuide) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'map-return is-guide';
  button.setAttribute('aria-label', guide.label);
  button.innerHTML = `<span class="map-return-icon" aria-hidden="true">${icons.play(16)}</span><span class="map-return-label">${esc(guide.label)}</span>`;
  button.addEventListener('click', () => onGuide(guide));
  el.append(button);
  return () => button.remove();
}
