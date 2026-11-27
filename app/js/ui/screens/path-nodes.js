// Nodos del mapa (camino común y pantallas de rama): botón redondo con el cuadro dentro, estado y rótulos.
// Solo HTML.

import { esc } from '../dom.js';
import { icons } from '../icons.js';
import { artFrame } from '../art.js';
import { percent, MASTERY_TEXT } from '../../engine/level-ring.js';

export const STATE_LABEL = { locked: 'bloqueado', available: 'disponible', started: 'a medias', mastered: 'ya lo reconoces' };
// Pintor dormido (engine/review.js): dominado y sin salir en una semana.
export const DORMANT_TEXT = '¿Lo recuerdas?';

// Lo jugado que aún no está dominado (a medias) no lleva texto bajo el nombre: se ve en su aro (el tramo del nivel 1 lleno
// en proporción a su nota, ui/deep-badges.js) y en su insignia con la nota («67 %»); al tocarlo, su tarjeta dice lo que falta. El único repaso
// a mano es el botón ↻ «Repasar» (shell.js).
// Lo que dice el lector de pantalla de un nodo a medias: «Miguel Ángel, a medias: 67 % de 75 %».
export function startedLabel(name, best) {
  return `${name}, ${STATE_LABEL.started}: ${percent(Number(best) || 0)} ${MASTERY_TEXT}`.replaceAll('\u00a0', ' ');
}

// A medias, la insignia dice su nota («67 %»): con el aro casi lleno, se entiende sola que falta un poco.
const shortPercent = (best) => `${Math.round((Number(best) || 0) * 100)}%`;

export function dotFor(status, cover, name, best = 0) {
  if (status === 'locked') return icons.lock(12);
  const thumb = cover ? artFrame(cover, { cls: 'stage-thumb', alt: '', label: initials(name), thumb: true }) : '';
  const badge = status === 'mastered' ? `<span class="stage-badge">${icons.check(13)}</span>`
    : status === 'started' ? `<span class="stage-badge is-partial" aria-hidden="true">${shortPercent(best)}</span>` : '';
  return `${thumb}${badge}`;
}

export function nodeHtml({ cls, action, id, status, lock, label, name, meta, dot, current = false }) {
  return `<button class="stage ${cls} is-${status}" data-action="${action}" data-id="${esc(id)}" data-status="${status}" data-lock="${esc(lock)}"${current ? ' aria-current="step"' : ''} aria-label="${esc(label)}">
      <span class="stage-dot">${dot}${current ? '<span class="stage-you" aria-hidden="true">Tú</span>' : ''}</span>
      <span class="stage-text"><span class="stage-name">${esc(name)}</span>${meta ? `<span class="stage-meta">${esc(meta)}</span>` : ''}</span>
    </button>`;
}

export function initials(name) {
  return String(name).split(/\s+/).filter((w) => /^[A-ZÁÉÍÓÚÑ]/.test(w)).slice(0, 2).map((w) => w[0]).join('');
}
