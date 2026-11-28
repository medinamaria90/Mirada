// Paradas didácticas del camino: la presentación de cada época (medallón) y el cartel de cada tramo (rombo), en el orden del
// camino. Regla de María (28/11): el itinerario nunca se salta una de ellas sin ver. Si se llegó a pintores de un tramo sin
// ver su cartel (una partida de antes de que el cartel fuera un paso, un tramo reordenado, un cartel que no llegó a abrirse),
// el cartel sale antes del siguiente pintor de ese tramo o de los que vienen detrás, venga de donde venga (camino, «a fondo»,
// «Repasar a…», sala o Prueba de época). Visto = abierto alguna vez (progress.intros, progress.signs); jugar no cuenta. Puro.

import { hasTramoSign } from './progress.js';

const cache = new WeakMap();

// Paradas didácticas del índice, en orden: { type: 'era', id, pos } o { type: 'tramo', key, artistId, pos }; pos: el
// puesto en index.steps de la parada a la que preceden.
export function loreStops(index) {
  if (cache.has(index)) return cache.get(index);
  const visible = new Set(index.visibleMovements.map((m) => m.id));
  const stops = [];
  const eras = new Set();
  const tramos = new Set();
  index.steps.forEach((s, pos) => {
    if (visible.has(s.movementId) && !eras.has(s.movementId)) {
      eras.add(s.movementId);
      stops.push({ type: 'era', id: s.movementId, pos });
    }
    const key = s.type === 'artist' ? index.artist(s.id)?.section : '';
    if (key && !tramos.has(key) && hasTramoSign(index, s.id)) {
      tramos.add(key);
      stops.push({ type: 'tramo', key, artistId: s.id, pos });
    }
  });
  cache.set(index, stops);
  return stops;
}

// Hasta qué puesto del camino llega un destino. artist: su parada (fuera del camino, el inicio de su época); sala: la suya;
// movement (Prueba de época, «Repasar el Barroco»): la época entera. -1 si no está en el camino.
function reach(index, target) {
  if (!target?.id) return -1;
  if (target.type === 'artist') {
    const at = index.stepIndex('artist', target.id);
    if (at >= 0) return at;
    const mid = index.artist(target.id)?.movementId;
    return index.steps.findIndex((s) => s.movementId === mid);
  }
  if (target.type === 'sala') return index.stepIndex('sala', target.id);
  if (target.type === 'movement') {
    let last = -1;
    index.steps.forEach((s, i) => { if (s.movementId === target.id) last = i; });
    return last;
  }
  return -1;
}

export const loreSeen = (progress, stop) => Boolean(stop.type === 'era' ? progress.intros?.[stop.id] : progress.signs?.[stop.key]);
export const loreKey = (stop) => (stop.type === 'era' ? `era:${stop.id}` : `tramo:${stop.key}`);

// La primera parada didáctica sin ver antes de `target` ({ type: 'artist' | 'sala' | 'movement', id }), o null.
export function pendingLore(progress, index, target) {
  const limit = reach(index, target);
  if (limit < 0) return null;
  return loreStops(index).find((stop) => stop.pos <= limit && !loreSeen(progress, stop)) || null;
}

// Destino de un paso de nextStep ({ artistId } o { movementId }, con su ruta), o null si no lleva a un pintor ni a una época.
export function stepTarget(step) {
  if (step?.artistId) return { type: 'artist', id: step.artistId };
  if (step?.movementId) return { type: String(step.to || '').startsWith('sala-') ? 'sala' : 'movement', id: step.movementId };
  return null;
}
