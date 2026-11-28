// Píldora flotante con lo que recomienda el itinerario («Sigue: Leonardo», «Repasar», «Profundiza en Leonardo: nivel 2»): sale
// cuando la parada recomendada no está a la vista (con una flecha hacia donde queda) y siempre que el paso no tiene parada en el
// mapa. Al tocarla LANZA el paso (lo mismo que el botón del resultado), no solo desplaza el mapa. Si la parada está a la vista,
// basta su burbuja (map-cue.js). Se coloca abajo, en el hueco de la fila donde no tapa ni carteles ni paradas.
// Devuelve { set(step, dot), stop }: set da el paso y el nodo con su burbuja (null si no tiene).

import { $ } from '../dom.js';
import { icons } from '../icons.js';

const VIEW_MARGIN = '-96px 0px -96px 0px';   // la cabecera y la barra de abajo tapan esa franja
const EDGE = 16;                             // aire con el borde de la columna
const COVERS = '.stage, .lore, .sign-plate, .road-sign, .era-arch, .map-cue';   // lo que la píldora no debe tapar
const PLACE_EVERY_MS = 120;                  // cada cuánto se busca hueco al desplazar
const SAMPLES = [[0.05, 0.1], [0.5, 0.1], [0.95, 0.1], [0.05, 0.9], [0.5, 0.9], [0.95, 0.9]];   // puntos de la píldora que se prueban

// Lo recomendado queda por encima del centro de la pantalla: la flecha apunta arriba. Se calcula con cada desplazamiento
// (no solo cuando entra o sale de la vista: un salto largo nunca la cruza).
export const pointsUp = (dotTop, viewH) => dotTop < viewH / 2;

// Cuántos nodos o carteles tapa la píldora si su borde izquierdo está en x.
function covered(pill, x) {
  const r = pill.getBoundingClientRect();
  let hits = 0;
  for (const [fx, fy] of SAMPLES) {
    const px = x + fx * r.width;
    const py = r.top + fy * r.height;
    if (document.elementsFromPoint(px, py).some((n) => !pill.contains(n) && n.closest(COVERS))) hits += 1;
  }
  return hits;
}

export function watchReturn(el, launch) {
  const pill = document.createElement('button');
  pill.type = 'button';
  pill.className = 'map-pill';
  pill.hidden = true;
  pill.innerHTML = `<span class="map-pill-arrow" aria-hidden="true">${icons.next(18)}</span><span class="map-pill-text"></span>`;
  el.append(pill);
  const text = $('.map-pill-text', pill);
  const arrow = $('.map-pill-arrow', pill);
  let step = null;
  let dot = null;
  let away = false;
  let frame = 0;
  let placedAt = 0;
  // Izquierda, centro o derecha de la columna: el primer hueco que no tape nada (si no lo hay, el que tape menos).
  const place = () => {
    placedAt = performance.now();
    const map = $('.path-map', el)?.getBoundingClientRect();
    const left = Math.max(map?.left ?? 0, 0) + EDGE;
    const right = Math.min(map?.right ?? window.innerWidth, window.innerWidth) - EDGE - pill.offsetWidth;
    const options = [right, (left + right) / 2, left].map((x) => Math.max(0, Math.round(x)));
    let best = options[0];
    let fewest = Infinity;
    for (const x of options) {
      const n = covered(pill, x);
      if (n < fewest) { fewest = n; best = x; }
      if (!n) break;
    }
    pill.style.left = `${best}px`;
  };
  // Mientras está la tarjeta de pintores nuevos (abajo, en el mismo sitio), la píldora se aparta.
  const update = () => {
    frame = 0;
    pill.hidden = !step || (Boolean(dot) && !away) || Boolean(el.querySelector('.news-card:not(.is-leaving)'));
    arrow.hidden = !dot;
    if (dot) pill.classList.toggle('is-up', pointsUp(dot.getBoundingClientRect().top, window.innerHeight));
    if (!pill.hidden && performance.now() - placedAt > PLACE_EVERY_MS) place();
  };
  const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
  const io = typeof IntersectionObserver === 'function' ? new IntersectionObserver(([entry]) => { away = !entry.isIntersecting; update(); }, { rootMargin: VIEW_MARGIN }) : null;
  const set = (nextStep, nextDot) => {
    step = nextStep;
    text.textContent = nextStep?.label || '';
    if (nextDot !== dot) {
      if (dot) io?.unobserve(dot);
      dot = nextDot;
      away = !io;
      if (dot) io?.observe(dot);
    }
    placedAt = 0;
    update();
  };
  pill.addEventListener('click', () => { if (step) launch(step); });
  const news = new MutationObserver(onScroll);
  news.observe(el, { childList: true, subtree: false });
  window.addEventListener('scroll', onScroll, { passive: true });
  return { set, stop: () => { io?.disconnect(); news.disconnect(); window.removeEventListener('scroll', onScroll); cancelAnimationFrame(frame); pill.remove(); } };
}
