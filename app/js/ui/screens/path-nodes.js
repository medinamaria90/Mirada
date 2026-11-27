// Nodos del mapa (camino común y pantallas de rama): botón redondo con el cuadro dentro, estado y rótulos.
// Solo HTML.

import { esc } from '../dom.js';
import { icons } from '../icons.js';
import { artFrame } from '../art.js';
import { NEED_TEXT, startedMeta } from '../../engine/level-ring.js';

export const STATE_LABEL = { locked: 'bloqueado', available: 'disponible', started: 'a medias', mastered: 'ya reconoces sus cuadros' };
// Pintor dormido (engine/review.js): terminado y sin salir en una semana.
export const DORMANT_TEXT = '¿Lo recuerdas?';

// Lo jugado y sin terminar (a medias) se ve en su aro, lleno hasta su nota con una muesca en el 75 % (ui/deep-badges.js), y
// en una línea bajo el nombre («Vas por el 67 %»); al tocarlo, su tarjeta dice lo que falta. El único repaso a mano es el
// botón ↻ «Repasar» (shell.js).

// Lo que dice el lector de pantalla de un nodo a medias: «Miguel Ángel, a medias: vas por el 50 %; hace falta un 75 %».
export function startedLabel(name, best) {
  return `${name}, ${STATE_LABEL.started}: ${startedMeta(best).toLowerCase()}; ${NEED_TEXT}`.replaceAll('\u00a0', ' ');
}

// Bajo el nombre de un nodo a medias, su nota («Vas por el 50 %»); el aro se llena hasta ella.
export { startedMeta };

// Cerrado: sin cuadro (no se adelanta nada) y un candado pequeño; terminado, el sello con la marca de hecho.
export function dotFor(status, cover, name) {
  if (status === 'locked') return icons.lock(12);
  const thumb = cover ? artFrame(cover, { cls: 'stage-thumb', alt: '', label: initials(name), thumb: true }) : '';
  const badge = status === 'mastered' ? `<span class="stage-badge">${icons.check(13)}</span>` : '';
  return `${thumb}${badge}`;
}

// unlock: la parada que lo abre («artist:<id>»), para el botón «Ir» del aviso de lo cerrado (path-actions.js).
export function nodeHtml({ cls, action, id, status, lock, label, name, meta, dot, current = false, unlock = '' }) {
  return `<button class="stage ${cls} is-${status}" data-action="${action}" data-id="${esc(id)}" data-status="${status}" data-lock="${esc(lock)}"${unlock ? ` data-unlock="${esc(unlock)}"` : ''}${current ? ' aria-current="step"' : ''} aria-label="${esc(label)}">
      <span class="stage-dot">${dot}${current ? '<span class="stage-you" aria-hidden="true">Tú</span>' : ''}</span>
      <span class="stage-text"><span class="stage-name">${esc(name)}</span>${meta ? `<span class="stage-meta">${esc(meta)}</span>` : ''}</span>
    </button>`;
}

export function initials(name) {
  return String(name).split(/\s+/).filter((w) => /^[A-ZÁÉÍÓÚÑ]/.test(w)).slice(0, 2).map((w) => w[0]).join('');
}
