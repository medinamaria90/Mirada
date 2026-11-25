// Sellos de niveles «a fondo» en los nodos del mapa de los pintores dominados: «+3» con los que quedan por
// hacer, o un check dorado si ya están todos. Pulsarlo abre la ficha del pintor en sus etapas. Se añaden al DOM
// ya pintado (los nodos los dibuja el mapa) y solo en pintores dominados con niveles.

import { esc } from './dom.js';
import { icons } from './icons.js';
import { deepProgress } from '../engine/levels.js';

// Texto y estado del sello de un pintor, o null si no lleva (sin dominar o sin niveles «a fondo»).
export function deepBadgeInfo(progress, index, artistId) {
  if (!progress.artists?.[artistId]?.mastered) return null;
  const { total, mastered } = deepProgress(progress, index, artistId);
  if (!total) return null;
  const left = total - mastered;
  return { left, total, text: left ? `+${left}` : '', done: left === 0 };
}

export function badgeHtml(artist, info) {
  const label = info.done
    ? `${artist.name}: todos los niveles a fondo hechos`
    : `${artist.name}: ${info.left === 1 ? '1 nivel' : `${info.left} niveles`} a fondo por hacer`;
  return `<button type="button" class="deep-badge${info.done ? ' is-done' : ''}" data-artist="${esc(artist.id)}" data-focus="stages" aria-label="${esc(label)}">
    <span class="deep-seal" aria-hidden="true">${info.done ? icons.check(14) : esc(info.text)}</span></button>`;
}

export function addDeepBadges(ctx, root) {
  const progress = ctx.store.get().progress;
  for (const spot of root.querySelectorAll('.stage-spot[data-step^="artist:"]')) {
    const artist = ctx.index.artist(spot.dataset.step.slice('artist:'.length));
    const info = artist && deepBadgeInfo(progress, ctx.index, artist.id);
    if (info) spot.insertAdjacentHTML('beforeend', badgeHtml(artist, info));
  }
}
