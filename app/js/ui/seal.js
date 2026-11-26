// Sello de categoría del pintor (Gran maestro, Maestro, Artista invitado): oro, plata o bronce. Lo enseñan la ficha, la
// historia, la lista de Pintores y el momento de dominarlo (ui/match-moment.js). Estilos en css/sello.css.

import { esc } from './dom.js';
import { icons } from './icons.js';
import { loadCss } from './lazy-css.js';
import { tierOf } from '../engine/painters.js';

export const loadSealCss = () => loadCss('css/sello.css');

// size: '' (normal) | 'sm' (lista) | 'lg' (momento de dominarlo).
export function sealHtml(artist, size = '') {
  const t = tierOf(artist);
  if (!t) return '';
  return `<span class="seal tier-${t.tier}${size ? ` seal-${size}` : ''}"><span class="seal-disc" aria-hidden="true">${icons.laurel(16)}</span><span class="seal-text">${esc(t.label)}</span></span>`;
}
