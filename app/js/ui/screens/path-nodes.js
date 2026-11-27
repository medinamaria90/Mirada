// Nodos del mapa (camino común y pantallas de rama): botón redondo con el cuadro dentro, estado y rótulos.
// Solo HTML.

import { esc } from '../dom.js';
import { icons } from '../icons.js';
import { artFrame } from '../art.js';

export const STATE_LABEL = { locked: 'bloqueado', available: 'disponible', started: 'por repasar', mastered: 'dominado' };
// Pintor dormido (engine/review.js): dominado y sin salir en una semana.
export const DORMANT_TEXT = '¿Lo recuerdas?';

// Texto bajo el nombre solo cuando dice algo: «Repite · n %» (pintado como botón) en lo jugado que aún no está dominado:
// el repaso de la época solo se abre al dominarlos a todos, y María quería que se viera claro qué hacer. La parada
// actual no lleva botón: se distingue por su nodo (más grande, aro con halo y la marca «Tú») y se toca el propio nodo.
export function metaFor(status, info) {
  if (status === 'started') return `Repite · ${Math.round((info?.best || 0) * 100)}\u00a0%`;
  return '';
}

// Cerrado: sin cuadro (no se adelanta nada) y un candado pequeño; el nodo es más pequeño y suave.
export function dotFor(status, cover, name) {
  if (status === 'locked') return icons.lock(12);
  const thumb = cover ? artFrame(cover, { cls: 'stage-thumb', alt: '', label: initials(name), thumb: true }) : '';
  const badge = status === 'mastered' ? `<span class="stage-badge">${icons.check(13)}</span>` : '';
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
