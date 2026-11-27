// Botón «Tú» para volver a la parada actual (como el de Duolingo): un círculo pequeño con una flecha hacia donde queda,
// arriba o abajo (calculada al moverse), y «Tú», la misma marca que se mece sobre la parada actual. Solo aparece cuando
// la parada actual sale de la vista. Al tocarlo, el camino vuelve a ella y el
// foco pasa a su nodo; es, con abrir la app, lo único que centra el mapa en la parada actual. Devuelve cómo quitarlo.

import { $, prefersReducedMotion } from '../dom.js';
import { icons } from '../icons.js';

const VIEW_MARGIN = '-96px 0px -96px 0px';   // la cabecera y la barra de abajo tapan esa franja
export const RETURN_TEXT = 'Tú';

export function watchReturn(el) {
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
  const io = new IntersectionObserver(([entry]) => {
    button.hidden = entry.isIntersecting;
    button.classList.toggle('is-up', entry.boundingClientRect.top < 0);
  }, { rootMargin: VIEW_MARGIN });
  io.observe(dot);
  return () => { io.disconnect(); button.remove(); };
}
