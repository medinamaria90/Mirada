// Aro de niveles de un pintor: un tramo por nivel (el 1, «Quién fue», y cada etapa «a fondo»), tenga o no historia. Es el
// mismo en el mapa, en la tarjeta del nodo y en la ficha: los tramos del aro, los círculos de la fila y el «Nivel N de M»
// cuentan lo mismo. El título corto de cada etapa (`short`) viene en el catálogo (tools/catalog_from_pipeline.py). Puro.

import { deepStatus } from './levels.js';

export const FIRST_LEVEL_SHORT = 'Quién fue';

// Niveles del aro: [{ level, short }], empezando por el 1.
export function ringLevels(index, artistId) {
  return [{ level: 1, short: FIRST_LEVEL_SHORT }, ...index.deepLevels(artistId).map((s) => ({ level: s.id, short: s.short || s.name }))];
}

// Título corto de un nivel («Quién fue», «La corte»), o '' si el pintor no tiene ese nivel.
export function levelShort(index, artistId, level) {
  return ringLevels(index, artistId).find((l) => l.level === level)?.short || '';
}

// Estado de cada nivel: 'done' (hecho), 'next' (el siguiente, solo uno) o 'locked'. El 1 está hecho con el pintor dominado;
// los demás, con su nivel «a fondo» dominado.
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

// Aro del mapa y tarjeta del nodo: solo en pintores dominados con más de un nivel (con uno solo, tocarlo entra directo).
// { levels, total, next (nivel o null), at (su número, 1..total, o null), done } o null.
export function levelRing(progress, index, artistId) {
  if (!progress.artists?.[artistId]?.mastered) return null;
  const levels = levelStates(progress, index, artistId);
  if (levels.length < 2) return null;
  const at = levels.findIndex((l) => l.state === 'next');
  return { levels, total: levels.length, next: at < 0 ? null : levels[at].level, at: at < 0 ? null : at + 1, done: at < 0 };
}

// Lo que dice el aro al lector de pantalla: «Nivel 3 de 5 por jugar» o «Todos los niveles hechos».
export const ringLabel = (ring) => (ring.done ? 'Todos los niveles hechos' : `Nivel ${ring.at} de ${ring.total} por jugar`);
