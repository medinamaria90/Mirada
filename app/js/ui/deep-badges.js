// Aro de niveles alrededor del retrato (engine/level-ring.js): un tramo por nivel, desde las 12 en el sentido
// del reloj. Oro lo hecho, coral (más grueso y con un halo que respira) el siguiente y apagado lo cerrado; el sello dice el
// número del siguiente o, con todo hecho, lleva el check de oro y el aro se queda entero en oro. Sustituye al anillo de oro
// de «dominado» en los pintores con niveles. Se añade al DOM ya pintado (los nodos los dibuja el mapa o la rama) y tocar el
// nodo abre su tarjeta (ui/level-card.js). El mismo aro, más grande, va en el avatar de la ficha.

import { levelRing, ringLabel } from '../engine/level-ring.js';

const RING_R = 47;      // radio del aro en su caja de 100
const RING_LEN = 100;   // longitud de la circunferencia (pathLength)
const RING_GAP = 5;     // hueco entre tramos, sobre RING_LEN
const HALO_R = 45;

// SVG del aro para unos niveles con estado ([{ state: 'done' | 'next' | 'locked' }]).
export function ringSvg(levels, cls = 'level-ring') {
  const step = RING_LEN / levels.length;
  const arcs = levels.map((l, i) => `<circle class="ring-arc is-${l.state}" cx="50" cy="50" r="${RING_R}" pathLength="${RING_LEN}" stroke-dasharray="${(step - RING_GAP).toFixed(2)} ${(RING_LEN - step + RING_GAP).toFixed(2)}" stroke-dashoffset="${(-i * step - RING_GAP / 2).toFixed(2)}"/>`).join('');
  const halo = levels.some((l) => l.state === 'next') ? `<circle class="ring-halo" cx="50" cy="50" r="${HALO_R}"/>` : '';
  return `<svg class="${cls}" viewBox="0 0 100 100" aria-hidden="true" focusable="false">${halo}${arcs}</svg>`;
}

export function addLevelRings(ctx, root) {
  const progress = ctx.store.get().progress;
  for (const spot of root.querySelectorAll('.stage-spot[data-step^="artist:"]')) {
    const id = spot.dataset.step.slice('artist:'.length);
    const button = spot.querySelector('.stage');
    if (!button || button.dataset.card || !ctx.index.artist(id)) continue;
    const ring = levelRing(progress, ctx.index, id);
    if (!ring) continue;
    // Con más de un nivel, tocar el retrato abre su tarjeta.
    button.dataset.card = '1';
    if (!button.classList.contains('is-onpath')) button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-label', `${button.getAttribute('aria-label')}. ${ringLabel(ring)}`);
    button.classList.add('has-ring');
    const dot = button.querySelector('.stage-dot');
    dot?.insertAdjacentHTML('afterbegin', ringSvg(ring.levels));
    const badge = dot?.querySelector('.stage-badge');
    if (badge && !ring.done) {
      badge.classList.add('is-next');
      badge.textContent = String(ring.at);
    }
  }
}
