// Dato curioso de la obra en la hoja de feedback (al acertar y al fallar, tras decir cuál era). Plegado es una tarjeta
// de dos líneas que abre el apetito sin alargar la hoja ni tapar el cuadro; al tocarla se lee entero y aparece
// «Ver más», que abre la página de la obra (ui/artwork-sheet.js). Si se abre una vez, en esa ronda sale ya abierto.

import { esc } from './dom.js';
import { icons } from './icons.js';
import { loadCss } from './lazy-css.js';

// Su hoja de estilo se pide al empezar la ronda, mucho antes de la primera respuesta.
export const loadCurioCss = () => loadCss('css/curio.css');

export function curioHtml(work, open) {
  if (!work || !work.curio) return '';
  return `<div class="fb-curio${open ? ' is-open' : ''}">
    <button type="button" class="fb-curio-btn" data-action="curio" aria-expanded="${open}">
      <span class="fb-curio-mark" aria-hidden="true">${icons.spark(18)}</span>
      <span class="fb-curio-text"><span class="sr-only">Dato curioso: </span>${esc(work.curio.text)}</span>
      <span class="fb-curio-chev" aria-hidden="true">${icons.next(16)}</span>
    </button>
    <button type="button" class="fb-curio-more" data-action="work" data-work="${esc(work.id)}"${open ? '' : ' hidden'}>Ver más${icons.next(16)}</button>
  </div>`;
}

// Abre o pliega la tarjeta; devuelve el nuevo estado.
export function toggleCurio(btn) {
  const box = btn.closest('.fb-curio');
  const open = !box.classList.contains('is-open');
  box.classList.toggle('is-open', open);
  btn.setAttribute('aria-expanded', String(open));
  box.querySelector('.fb-curio-more').hidden = !open;
  // Abierto, se lee entero: la hoja (que se desplaza por dentro) baja hasta el final de la tarjeta.
  const scroller = box.closest('.fb-text');
  if (open && scroller) {
    requestAnimationFrame(() => {
      const below = box.getBoundingClientRect().bottom - scroller.getBoundingClientRect().bottom;
      if (below > 0) scroller.scrollBy({ top: below + 8, behavior: document.documentElement.classList.contains('reduce-motion') ? 'auto' : 'smooth' });
    });
  }
  return open;
}
