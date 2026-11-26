// Aro de niveles de un pintor: un tramo por nivel con historia (el 1, «Quién fue», incluido), el mismo en el mapa, en la
// tarjeta del nodo y en la ficha. Sin historia no hay tramo: cuentan el nivel 1 y las etapas «a fondo» seguidas que tienen
// título corto (`short`, que sale de su historia: tools/catalog_from_pipeline.py). Puro.

import { deepStatus } from './levels.js';

export const FIRST_LEVEL_SHORT = 'Quién fue';

// Niveles del aro: [{ level, short }], empezando por el 1; se corta en la primera etapa sin historia.
export function ringLevels(index, artistId) {
  const out = [{ level: 1, short: FIRST_LEVEL_SHORT }];
  for (const s of index.deepLevels(artistId)) {
    if (!s.short) break;
    out.push({ level: s.id, short: s.short });
  }
  return out;
}

// Título corto de un nivel («Quién fue», «La corte»), o '' si el nivel no está en el aro.
export function levelShort(index, artistId, level) {
  return ringLevels(index, artistId).find((l) => l.level === level)?.short || '';
}

// Estado de cada nivel del aro: 'done' (hecho), 'next' (el siguiente, solo uno) o 'locked'. El 1 está hecho con el
// pintor dominado; los demás, con su nivel «a fondo» dominado.
export function levelStates(progress, index, artistId) {
  const mastered = Boolean(progress.artists?.[artistId]?.mastered);
  let nextGiven = false;
  return ringLevels(index, artistId).map((l) => {
    const done = l.level === 1 ? mastered : deepStatus(progress, index, artistId, l.level) === 'mastered';
    if (done) return { ...l, state: 'done' };
    if (nextGiven) return { ...l, state: 'locked' };
    nextGiven = true;
    return { ...l, state: 'next' };
  });
}

// Aro del mapa: solo en pintores dominados con más de un nivel. { levels, total, next (nivel o null), at (su número, 1..total,
// o null), done } o null.
export function levelRing(progress, index, artistId) {
  if (!progress.artists?.[artistId]?.mastered) return null;
  const levels = levelStates(progress, index, artistId);
  if (levels.length < 2) return null;
  const at = levels.findIndex((l) => l.state === 'next');
  return { levels, total: levels.length, next: at < 0 ? null : levels[at].level, at: at < 0 ? null : at + 1, done: at < 0 };
}

// Tarjeta del nodo: la tienen los pintores dominados con algún nivel «a fondo», tengan o no historia (un «Más obras» sin
// historia no hace tramo ni círculo, pero se juega desde la tarjeta). { levels (los del aro, con estado), total (todos sus
// niveles), next (el primer nivel por jugar o null), at (su número), done } o null.
export function levelPlan(progress, index, artistId) {
  if (!progress.artists?.[artistId]?.mastered) return null;
  const deep = index.deepLevels(artistId);
  if (!deep.length) return null;
  const i = deep.findIndex((s) => deepStatus(progress, index, artistId, s.id) !== 'mastered');
  return { levels: levelStates(progress, index, artistId), total: deep.length + 1, next: i < 0 ? null : deep[i].id, at: i < 0 ? null : i + 2, done: i < 0 };
}

// Lo que dice el aro al lector de pantalla: «Nivel 3 de 5 por jugar» o «Todos los niveles hechos».
export const ringLabel = (ring) => (ring.done ? 'Todos los niveles hechos' : `Nivel ${ring.at} de ${ring.total} por jugar`);
