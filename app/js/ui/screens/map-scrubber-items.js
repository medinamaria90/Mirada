// Qué enseña el desplazamiento rápido (ui/map-scrubber.js) en cada mapa: en la portada, las épocas del camino y «Tu
// museo»; en una rama, sus tramos (la época en la que se abre cada grupo de pintores). Lee las posiciones del DOM del
// mapa ya pintado (también las épocas aún por rellenar: guardan su alto) sin tocar el trazado.

import { $ } from '../dom.js';
import { artFrame, coverOf } from '../art.js';
import { mountScrubber, worthIt } from '../map-scrubber.js';
import { stepStatus } from '../../engine/progress.js';
import { salaCover } from './path-map.js';
import { branchLayout } from './path-layout.js';

const docBox = (node) => {
  const r = node.getBoundingClientRect();
  return { top: r.top + window.scrollY, bottom: r.bottom + window.scrollY };
};
// Miniatura de la burbuja: el cuadro de la primera parada abierta de la época (el mismo que lleva su nodo); si todas
// están cerradas, ninguna (como en el mapa, lo cerrado no enseña cuadro).
const thumbOf = (art) => (art ? artFrame(art, { cls: 'scrub-art', alt: '', label: '', thumb: true }) : '');
const focusIn = (node) => () => (node ? $('.arch-band', node) || $('.stage', node) : null);

// Centro de la parada actual, en coordenadas del documento (null si no hay).
function currentY(el) {
  const spot = $('.stage-spot.is-current .stage-dot', el);
  if (!spot) return null;
  const box = docBox(spot);
  return (box.top + box.bottom) / 2;
}

function mountIfLong(el, map, items, label) {
  if (!map || !worthIt(map.getBoundingClientRect().height, window.innerHeight)) return () => {};
  return mountScrubber(el, { map, items, label, current: () => currentY(el) });
}

// Portada: una marca por época, en el orden del camino, y la última en «Tu museo».
export function mountHomeScrubber(ctx, el) {
  const map = $('.path-map', el);
  if (!map) return () => {};
  const { index } = ctx;
  const meta = new Map();
  const eraMeta = (id) => {
    if (!meta.has(id)) {
      const m = index.movement(id);
      const p = ctx.store.get().progress;
      const open = index.stepsOf(id).find((s) => stepStatus(p, index, s) !== 'locked');
      const art = !open ? null : open.type === 'sala' ? salaCover(index, id) : coverOf(index, open.id);
      meta.set(id, { label: m?.name || id, sub: m?.period || '', thumb: thumbOf(art), tint: id });
    }
    return meta.get(id);
  };
  const items = () => {
    const eras = [...map.querySelectorAll('.path-era[data-era]')].map((li, i) => {
      // La primera época tiene su arco sobre la muralla de salida.
      const gate = i === 0 ? $('.path-start', map) || li : li;
      return { id: li.dataset.era, ...eraMeta(li.dataset.era), ...docBox(li), focusEl: focusIn(gate) };
    });
    const museum = $('.path-museum', map);
    if (museum) eras.push({ id: 'museo', label: 'Tu museo', sub: '', thumb: '', ...docBox(museum), focusEl: focusIn(null) });
    return eras;
  };
  return mountIfLong(el, map, items, 'Épocas del camino');
}

// Rama: una marca por tramo (de su cartel al siguiente); sin tramos, la rama entera.
export function mountBranchScrubber(ctx, el, branch) {
  const map = $('.path-map', el);
  if (!map) return () => {};
  const { index } = ctx;
  const sections = branchLayout(index, branch).sections;
  const items = () => {
    const whole = docBox(map);
    if (!sections.length) return [{ id: branch.id, label: branch.name, sub: '', thumb: '', ...whole, focusEl: () => $('.stage', map) }];
    const signs = sections.map((s) => map.querySelector(`.sign-plate.is-tramo[data-id="${s.key}"]`));
    return sections.map((s, i) => {
      const m = index.movement(s.movementId);
      const next = signs[i + 1];
      return {
        id: s.key, label: s.name || m?.name || '', sub: m?.period || '', thumb: '', tint: s.movementId,
        bottom: i === 0 || !signs[i] ? whole.bottom : docBox(signs[i]).bottom,
        top: next ? docBox(next).bottom : whole.top,
        focusEl: () => signs[i],
      };
    });
  };
  return mountIfLong(el, map, items, 'Tramos de la rama');
}
