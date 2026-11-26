// Nodos del mapa (camino común y pantallas de rama): botón redondo con el cuadro dentro, estado y rótulos.
// Solo HTML.

import { esc } from '../dom.js';
import { icons } from '../icons.js';
import { artFrame } from '../art.js';

export const STATE_LABEL = { locked: 'bloqueado', available: 'disponible', started: 'por repasar', mastered: 'dominado' };
// Pintor dormido (engine/review.js): dominado y sin salir en una semana.
export const DORMANT_TEXT = '¿Lo recuerdas?';

// Texto bajo el nombre solo cuando dice algo: «Empezar»/«Seguir» en el nodo actual y «Repite · n %»
// (pintado como botón) en lo jugado que aún no está dominado: el repaso de la época solo se abre al
// dominarlos a todos, y María quería que se viera claro qué hacer.
export function metaFor(status, info, current) {
  if (current) return status === 'started' ? 'Seguir' : 'Empezar';
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

export function nodeHtml({ cls, action, id, status, lock, label, name, meta, dot, section, current = false }) {
  const kicker = section ? `<span class="stage-kicker" aria-hidden="true">${esc(section.name)} <span class="stage-kicker-count">${section.got}/${section.total}</span></span>` : '';
  return `<button class="stage ${cls}${section ? ' has-kicker' : ''} is-${status}" data-action="${action}" data-id="${esc(id)}" data-status="${status}" data-lock="${esc(lock)}"${current ? ' aria-current="step"' : ''} aria-label="${esc(label)}">
      <span class="stage-dot">${dot}</span>
      <span class="stage-text">${kicker}<span class="stage-name">${esc(name)}</span>${meta ? `<span class="stage-meta">${esc(meta)}</span>` : ''}</span>
    </button>`;
}

export function initials(name) {
  return String(name).split(/\s+/).filter((w) => /^[A-ZÁÉÍÓÚÑ]/.test(w)).slice(0, 2).map((w) => w[0]).join('');
}
