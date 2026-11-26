// Aro de niveles «a fondo» en el retrato de los pintores dominados (como el aro de las historias): un arco por
// nivel, del color de la marca el que queda por hacer y apagado el ya hecho; con todos hechos, sin aro. Con niveles por hacer,
// tocar el nodo abre la ficha del pintor en sus etapas (ahí está también repetir la primera). Se añade al DOM ya
// pintado (los nodos los dibuja el mapa o la rama) y solo en pintores dominados con niveles.

import { deepProgress } from '../engine/levels.js';

const RING_R = 47;              // radio del aro en su caja de 100
const RING_GAP = 9;             // hueco entre arcos (en grados)

// Estado del aro de un pintor, o null si no lleva (sin dominar o sin niveles «a fondo»).
export function deepBadgeInfo(progress, index, artistId) {
  if (!progress.artists?.[artistId]?.mastered) return null;
  const { total, mastered } = deepProgress(progress, index, artistId);
  if (!total) return null;
  const left = total - mastered;
  return { left, total, done: left === 0 };
}

// Arcos del aro: los que quedan, primero (desde arriba, en el sentido del reloj).
export function ringHtml(info) {
  const len = 2 * Math.PI * RING_R;
  const step = len / info.total;
  const gap = info.total > 1 ? (RING_GAP / 360) * len : 0;
  const arcs = Array.from({ length: info.total }, (_, i) => `<circle class="deep-arc${i < info.left ? ' is-left' : ''}" cx="50" cy="50" r="${RING_R}" pathLength="${len.toFixed(2)}" stroke-dasharray="${(step - gap).toFixed(2)} ${(len - step + gap).toFixed(2)}" stroke-dashoffset="${(-i * step - gap / 2).toFixed(2)}"/>`).join('');
  return `<svg class="deep-ring" viewBox="0 0 100 100" aria-hidden="true" focusable="false">${arcs}</svg>`;
}

export const deepLabel = (info) => `${info.left === 1 ? 'queda 1 nivel' : `quedan ${info.left} niveles`} a fondo`;

export function addDeepBadges(ctx, root) {
  const progress = ctx.store.get().progress;
  for (const spot of root.querySelectorAll('.stage-spot[data-step^="artist:"]')) {
    const id = spot.dataset.step.slice('artist:'.length);
    const info = ctx.index.artist(id) && deepBadgeInfo(progress, ctx.index, id);
    const button = spot.querySelector('.stage');
    if (!info || info.done || !button || button.dataset.deep) continue;
    button.dataset.deep = '1';
    button.setAttribute('aria-label', `${button.getAttribute('aria-label')}. ${deepLabel(info)}`);
    button.querySelector('.stage-dot')?.insertAdjacentHTML('afterbegin', ringHtml(info));
  }
}
