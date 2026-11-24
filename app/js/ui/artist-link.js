// Nombre de pintor pulsable: abre su ficha (delegación global en main.js, atributo data-artist).
// Siempre es un botón de fila (≥ 48 px), nunca un enlace dentro de una frase.

import { esc } from './dom.js';
import { icons } from './icons.js';

export function artistLink(artistId, text, cls = '') {
  if (!artistId) return `<span class="${cls}">${esc(text)}</span>`;
  return `<button type="button" class="artist-link ${cls}" data-artist="${esc(artistId)}" aria-label="${esc(text)}: ver ficha del pintor"><span>${esc(text)}</span>${icons.next(16)}</button>`;
}
