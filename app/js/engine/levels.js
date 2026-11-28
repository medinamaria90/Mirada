// Niveles de un pintor en el catálogo grande: el básico (nivel 1, «Conoce a» + ronda) y los «a fondo»
// (2..n, una ronda propia por etapa de su vida). Cobertura de obras vistas, estado y avance. Puro.
// Los «a fondo» van por importancia, no por fecha (decisión de María, 28/11): los imprescindibles
// (contenido/imprescindibles.json) son el nivel 2 y, si el pintor tiene varios, los siguientes; cada historia dice en
// qué momento de su vida estamos.
//
// Regla de apertura (decisión de María, 28/11, como en Duolingo): aprobar la ronda de un nivel (≥ 75 % de aciertos) lo da
// por superado (`mastered`) y abre el siguiente. Ver todas sus obras ya no es requisito: es el logro de nivel «completo»
// (levelCovered), y las que falten salen primero en las rondas siguientes de ese pintor y en «Repasar» (approvedPending).

import { levelOf, noAuthorQuestion } from './catalog.js';

export const LEVELS_MASTERY = 0.75;
const MAX_SEEN = 80; // obras vistas que se guardan por pintor

export const deepKey = (artistId, level) => `${artistId}:${level}`;

export function seenWorks(progress, artistId) {
  const list = progress.artists?.[artistId]?.works;
  return new Set(Array.isArray(list) ? list.filter((id) => typeof id === 'string') : []);
}

// Obras que hay que haber visto para dominar el nivel: todas las del nivel 1 (las con firma o
// atribución dudosa están en «Conoce a», se ven al jugar) y las preguntables de un «a fondo».
export function requiredWorks(index, artistId, level = 1) {
  const works = index.levelWorks(artistId, level);
  return level === 1 ? works : works.filter((w) => !noAuthorQuestion(w));
}

export function pendingWorks(progress, index, artistId, level = 1) {
  const seen = seenWorks(progress, artistId);
  return requiredWorks(index, artistId, level).filter((w) => !seen.has(w.id));
}

// Obras vistas tras jugar una ronda: lo ya visto + «Conoce a» (nivel 1) + las preguntadas del pintor.
export function seenAfterRound(progress, index, artistId, level, answers) {
  const seen = seenWorks(progress, artistId);
  if (level === 1) for (const w of index.learnWorks(artistId)) seen.add(w.id);
  for (const a of answers) {
    if (!a || a.retry || !a.q) continue;
    const id = a.q.type === 'which' ? a.q.targetArtworkId : a.q.artworkId;
    if (id && index.artwork(id)?.artistId === artistId) seen.add(id);
  }
  return [...seen].slice(-MAX_SEEN);
}

// ¿Superado (aprobado)? El 1 con el pintor dominado; los «a fondo», con su registro.
export function levelPassed(progress, artistId, level) {
  return level === 1 ? Boolean(progress.artists?.[artistId]?.mastered) : Boolean(progress.deep?.[deepKey(artistId, level)]?.mastered);
}

// Obras aún sin ver de los niveles ya superados (por debajo de `below`), que se puedan preguntar, del nivel más bajo al
// más alto: tienen prioridad en las rondas siguientes del pintor y en «Repasar», para que acaben saliendo.
export function approvedPending(progress, index, artistId, below = Infinity) {
  const levels = [1, ...index.deepLevels(artistId).map((l) => l.id)].filter((l) => l < below && levelPassed(progress, artistId, l));
  return levels.flatMap((l) => pendingWorks(progress, index, artistId, l)).filter((w) => !noAuthorQuestion(w));
}

// Las obras pendientes de niveles superados que han salido en cualquier ronda (Repasar, otro pintor…) cuentan ya como
// vistas: así dejan de tener prioridad. Devuelve progress.artists actualizado (el mismo objeto si no cambia nada).
export function markPendingSeen(progress, index, answers) {
  let artists = progress.artists || {};
  for (const a of answers) {
    if (!a || a.retry || !a.q) continue;
    const id = a.q.type === 'which' ? a.q.targetArtworkId : a.q.artworkId;
    const artistId = index.artwork(id)?.artistId;
    const rec = artistId && artists[artistId];
    if (!rec || !approvedPending(progress, index, artistId).some((w) => w.id === id)) continue;
    artists = { ...artists, [artistId]: { ...rec, works: [...seenWorks({ artists }, artistId).add(id)].slice(-MAX_SEEN) } };
  }
  return artists;
}

// Nivel «completo» (logro, no requisito): todas sus obras vistas.
export function levelCovered(seenIds, index, artistId, level) {
  const seen = new Set(seenIds);
  return requiredWorks(index, artistId, level).every((w) => seen.has(w.id));
}

export function deepRecord(progress, artistId, level) {
  return progress.deep?.[deepKey(artistId, level)] || null;
}

// ¿Está abierto este nivel? La única regla, para el aro, la ficha, el mapa, el itinerario e imprescindibles: el 1 siempre
// (si su pintor se puede jugar, cosa del camino); los «a fondo», con todos los niveles anteriores superados (aprobados).
export function levelOpen(progress, index, artistId, level) {
  if (level === 1) return true;
  return levelPassed(progress, artistId, 1) && index.deepLevels(artistId).filter((l) => l.id < level).every((l) => levelPassed(progress, artistId, l.id));
}

// Estado de un nivel «a fondo»: 'mastered' (superado), 'locked' (levelOpen no lo abre), 'started' o 'available'.
export function deepStatus(progress, index, artistId, level) {
  const rec = deepRecord(progress, artistId, level);
  if (rec?.mastered) return 'mastered';
  if (!levelOpen(progress, index, artistId, level)) return 'locked';
  return rec?.plays ? 'started' : 'available';
}

// Avance «a fondo» de un pintor: { total, mastered, next } (next: el primer nivel por hacer).
export function deepProgress(progress, index, artistId) {
  const levels = index.deepLevels(artistId);
  const states = levels.map((l) => [l.id, deepStatus(progress, index, artistId, l.id)]);
  const next = states.find(([, s]) => s !== 'mastered');
  return { total: levels.length, mastered: states.filter(([, s]) => s === 'mastered').length, next: next ? next[0] : null };
}

export { levelOf };
