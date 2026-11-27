// Aro de niveles de un pintor: un tramo por nivel (el 1, «Quién fue», y cada etapa «a fondo»), tenga o no historia. Es el
// mismo en el mapa, en la tarjeta del nodo y en la ficha: los tramos del aro, los círculos de la fila y el «Nivel N de M»
// cuentan lo mismo. El título corto de cada etapa (`short`) viene en el catálogo (tools/catalog_from_pipeline.py). Puro.

import { deepStatus, pendingWorks } from './levels.js';
import { MASTERY } from './progress.js';

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

// Pintor a medias (jugado y sin terminar): el aro entero se llena con su mejor nota y lleva una muesca en el 75 % (lo que hace
// falta). { levels (para la fila de la tarjeta: el 1 'partial', el resto cerrados), total, best, missing (cuadros del nivel 1
// por ver), started: true, next: 1, at: 1, done: false } o null.
export function startedRing(progress, index, artistId) {
  const rec = progress.artists?.[artistId];
  if (!rec?.plays || rec.mastered || !index.artist(artistId)) return null;
  const best = Math.max(0, Math.min(1, Number(rec.best) || 0));
  const levels = ringLevels(index, artistId).map((l, i) => (i === 0 ? { ...l, state: 'partial' } : { ...l, state: 'locked' }));
  return { levels, total: levels.length, best, missing: pendingWorks(progress, index, artistId, 1).length, started: true, next: 1, at: 1, done: false };
}

export const percent = (k) => `${Math.round(k * 100)}\u00a0%`;
export const NEED_TEXT = `hace falta un ${percent(MASTERY)}`;
// A partir de aquí, «te falta poco».
export const CLOSE_BEST = 0.65;

// Bajo el nombre del nodo a medias: «Vas por el 50 %».
export const startedMeta = (best) => `Vas por el ${percent(Number(best) || 0)}`;

// Lo que le falta a un pintor a medias, en una línea: «Has acertado el 50 %; hace falta un 75 %» (desde el 65 %, «Te falta
// poco: …») o, si ya llega a la nota y le faltan cuadros por ver, «Te faltan n cuadros por ver».
export function startedLine(ring) {
  if (ring.best >= MASTERY && ring.missing > 0) return ring.missing === 1 ? 'Te falta 1 cuadro por ver' : `Te faltan ${ring.missing} cuadros por ver`;
  const score = `has acertado el ${percent(ring.best)}; ${NEED_TEXT}`;
  return ring.best >= CLOSE_BEST ? `Te falta poco: ${score}` : `${score.charAt(0).toUpperCase()}${score.slice(1)}`;
}
