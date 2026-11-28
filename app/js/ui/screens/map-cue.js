// La burbuja del itinerario: lo que devuelve engine/next-step.js para el mapa (mapRecommendation) se señala con un verbo sobre
// su parada, con un pulso suave («Empezar», «Seguir», «Repasar», «Profundizar», «Abrir», «Conocer»). Solo hay una y es lo único
// animado de los nodos. Si lo recomendado queda atrás (la frontera, la última parada abierta, no es lo recomendado), el mapa
// lo marca con la clase is-rec-back y la frontera lleva un anillo fino sin texto (mapa-carteles.css).

import { $ } from '../dom.js';

export const CUE_VERB = { start: 'Empezar', resume: 'Seguir', review: 'Repasar', deepen: 'Profundizar', era: 'Abrir', tramo: 'Conocer' };
const REVIEW_KINDS = ['recall', 'debt'];
const DEEP_KINDS = ['deepen', 'deep', 'essential', 'rank'];

// Siempre hay una guía visible: la burbuja sobre la parada (cueFor) y, además, la píldora flotante con su texto (map-return.js)
// cuando la parada queda fuera de la vista o lo recomendado no es una parada del mapa («Repasar», el reto semanal, el cierre…).
// guideFor devuelve { bubble: cue } | { pill: texto } | null (nada que recomendar y ninguna parada abierta: camino terminado).
export function guideFor(step, frontier, started = false) {
  if (!step) return frontier.step ? { bubble: cueFor({ kind: 'stop', artistId: frontier.step.startsWith('artist:') ? frontier.step.slice(7) : '', movementId: frontier.step.startsWith('sala:') ? frontier.step.slice(5) : '', to: '' }, frontier, started) } : null;
  const cue = cueFor(step, frontier, started);
  return cue ? { bubble: cue } : { pill: step.label };
}

// Dónde y qué dice la burbuja para una recomendación: { host (selector del punto del nodo), verb, back } o null si la
// recomendación no es una parada del mapa (cierre de época, «Repasar» general, reto semanal…).
// frontier: { lore: «era:<id>»/«tramo:<clave>» o '', step: «artist:<id>»/«sala:<id>» de la parada actual }.
export function cueFor(step, frontier, started = false) {
  if (!step) return null;
  const artist = step.artistId ? `artist:${step.artistId}` : '';
  const step_ = artist || (step.movementId ? `sala:${step.movementId}` : '');
  const dot = (key) => ({ host: `.stage-spot[data-step="${key}"] .stage-dot` });
  if (step.kind === 'stop') {
    if (step_ === frontier.step && frontier.lore) {
      return { host: `.lore-spot[data-lore="${frontier.lore}"] .lore-dot`, verb: frontier.lore.startsWith('era:') ? CUE_VERB.era : CUE_VERB.tramo, back: false };
    }
    return { ...dot(step_), verb: started ? CUE_VERB.resume : CUE_VERB.start, back: step_ !== frontier.step };
  }
  if (REVIEW_KINDS.includes(step.kind)) {
    if (artist) return { ...dot(artist), verb: CUE_VERB.review, back: true };
    if (step.movementId && step.to.startsWith('repaso-')) return { host: `.stage[data-action="review"][data-id="${step.movementId}"] .stage-dot`, verb: CUE_VERB.review, back: true };
    if (step.movementId) return { host: `.lore-spot[data-lore="era:${step.movementId}"] .lore-dot`, verb: CUE_VERB.review, back: true };
    return null;
  }
  if (DEEP_KINDS.includes(step.kind) && artist) return { ...dot(artist), verb: CUE_VERB.deepen, back: true };
  return null;
}

// Pone la burbuja en el mapa ya pintado (y quita la anterior). Devuelve el nodo con la burbuja o null si la guía no tiene parada
// pintada (la píldora flotante de map-return.js lo cubre).
export function placeCue(root, step, started) {
  root.querySelector('.map-cue')?.remove();
  const map = $('.path-map', root);
  map?.classList.remove('is-rec-back');
  const frontier = { lore: $('.lore-spot.is-here', root)?.dataset.lore || '', step: $('.stage-spot.is-current', root)?.dataset.step || '' };
  const cue = guideFor(step, frontier, started)?.bubble;
  const host = cue && $(cue.host, root);
  if (!host) return null;
  const bubble = document.createElement('span');
  bubble.className = 'map-cue';
  bubble.setAttribute('aria-hidden', 'true');
  bubble.textContent = cue.verb;
  host.append(bubble);
  const button = host.closest('button');
  if (button) button.setAttribute('aria-label', `${button.getAttribute('aria-label')}. ${cue.verb}`);
  if (cue.back) map?.classList.add('is-rec-back');
  return host;
}
