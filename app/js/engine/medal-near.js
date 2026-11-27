// Avance hacia los logros que aún no se tienen («12 de 15») y el más cercano de todos. Puro.

import { visibleStreak, movementStatus, gateSteps, stepStatus, artistStatus } from './progress.js';
import { eyeProgress } from './goals.js';

// { have, need } de un logro pendiente que se puede medir (racha, «Ojo de…», época), o null.
export function medalProgress(progress, index, id, today) {
  const [kind, ...rest] = String(id).split('-');
  const ref = rest.join('-');
  if (kind === 'streak') {
    const need = Number(ref);
    return need > 0 ? { have: Math.min(need, visibleStreak(progress.streak || {}, today)), need } : null;
  }
  if (kind === 'eye') {
    if (!index.artist(ref) || artistStatus(progress, index, ref) !== 'mastered') return null;
    const e = eyeProgress(progress, index, ref);
    return e.total ? { have: e.top, need: e.total } : null;
  }
  if (kind === 'movement') {
    if (!index.movement(ref) || movementStatus(progress, index, ref) === 'locked') return null;
    const steps = gateSteps(progress, index.stepsOf(ref));
    return steps.length ? { have: steps.filter((s) => stepStatus(progress, index, s) === 'mastered').length, need: steps.length } : null;
  }
  return null;
}

// Logro pendiente más cercano: el de más avance (con algo hecho); a igualdad, al que le falta menos.
// { id, have, need } o null.
export function nearestMedal(progress, index, ids, today) {
  let best = null;
  for (const id of ids) {
    if (progress.medals?.[id]) continue;
    const m = medalProgress(progress, index, id, today);
    if (!m || m.have <= 0 || m.have >= m.need) continue;
    const k = m.have / m.need;
    const bk = best ? best.have / best.need : -1;
    if (k > bk || (k === bk && m.need - m.have < best.need - best.have)) best = { id, ...m };
  }
  return best;
}
