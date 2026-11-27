// «Ver más» del visor: bajo el título de un cuadro revelado, su dato curioso (si lo hay) y un botón que abre la página de la
// obra (ui/artwork-sheet.js). Al pasar de cuadro cambia el texto con él. Solo donde se pide (data-zoom-more en el cuadro,
// p. ej. la Colección y la ficha del pintor; el abridor lo pone main.js): dentro de una ronda, no.

import { esc } from './dom.js';
import { icons } from './icons.js';

export function moreHtml(work) {
  return `${work.curio ? `<span class="viewer-curio">${esc(work.curio.text)}</span>` : ''}
    <button type="button" class="viewer-more" data-v="more">Ver más${icons.next(16)}</button>`;
}
