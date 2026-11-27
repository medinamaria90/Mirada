// Botón flotante «Volver a tu parada» (docs/eval/ux-posicion-mapa.md): solo aparece cuando la parada actual sale de la
// vista, con su cuadro en pequeño y una flecha hacia donde queda (arriba o abajo, calculada al moverse, no guardada). Al
// tocarlo, el camino vuelve a ella y el foco pasa a su nodo. Devuelve cómo quitarlo.

import { $, prefersReducedMotion } from '../dom.js';
import { icons } from '../icons.js';

const VIEW_MARGIN = '-96px 0px -96px 0px';   // la cabecera y la barra de abajo tapan esa franja

export function watchReturn(el) {
  const dot = $('.stage-spot.is-current .stage-dot', el);
  if (!dot || typeof IntersectionObserver !== 'function') return () => {};
  const thumb = $('.stage-thumb', dot)?.cloneNode(true);
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'map-return';
  button.hidden = true;
  button.setAttribute('aria-label', 'Volver a tu parada');
  button.innerHTML = `<span class="map-return-art" aria-hidden="true"></span><span class="map-return-arrow" aria-hidden="true">${icons.next(18)}</span>`;
  if (thumb) $('.map-return-art', button).append(thumb);
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
