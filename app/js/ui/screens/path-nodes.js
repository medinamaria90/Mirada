// Nodos del mapa (camino común y pantallas de rama): botón redondo con el cuadro dentro, estado y rótulos.
// Solo HTML.

import { esc } from '../dom.js';
import { icons } from '../icons.js';
import { artFrame } from '../art.js';
import { NEED_TEXT, startedMeta } from '../../engine/level-ring.js';
import { stepPassed } from '../../engine/progress.js';
import { gateEssentials, essentialLock, essentialOpen } from '../../engine/essentials.js';
import { stepName } from './path-signs.js';

export const STATE_LABEL = { locked: 'bloqueado', available: 'disponible', started: 'a medias', mastered: 'ya reconoces sus cuadros' };
// Pintor dormido (engine/review.js): terminado y sin salir en una semana.
export const DORMANT_TEXT = '¿Lo recuerdas?';

// Lo jugado y sin terminar (a medias) se ve en su aro, lleno hasta su nota con una muesca en el 75 % (ui/deep-badges.js),
// sin texto bajo el nombre (la cifra, en el aria-label y en su tarjeta al tocarlo). El único repaso a mano es el
// botón ↻ «Repasar» (shell.js).

// Lo que dice el lector de pantalla de un nodo a medias: «Miguel Ángel, a medias: vas por el 50 %; hace falta un 75 %».
export function startedLabel(name, best) {
  return `${name}, ${STATE_LABEL.started}: ${startedMeta(best).toLowerCase()}; ${NEED_TEXT}`.replaceAll('\u00a0', ' ');
}

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

// Candado de una parada cerrada: en una puerta de época con la parada anterior ya superada, el imprescindible que falta
// («Te falta conocer las pinturas negras de Goya (nivel 6)», con «Ir» a su nivel o, si su pintor está a medias, a él); si
// no, la parada anterior. { text, unlock } (unlock: «artist:<id>», «sala:<id>» o «deep:<id>:<nivel>», path-actions.js).
export function lockOf(progress, index, step, prev) {
  if (!prev) return { text: '', unlock: '' };
  const must = stepPassed(progress, prev) ? gateEssentials(progress, index, step, prev)[0] : null;
  if (!must) return { text: `Antes, acierta la mitad con ${stepName(index, prev)}`, unlock: `${prev.type}:${prev.id}` };
  return { text: essentialLock(must), unlock: essentialOpen(progress, index, must) ? `deep:${must.artistId}:${must.level}` : `artist:${must.artistId}` };
}
