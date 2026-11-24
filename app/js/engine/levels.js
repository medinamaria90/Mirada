// Niveles de un pintor en el catálogo grande: el básico (nivel 1, «Conoce a» + ronda) y los «a fondo»
// (2..n, una ronda propia por etapa de su vida). Cobertura de obras vistas, estado y avance. Puro.
//
// Regla de dominio (decisión de María): un nivel se domina viendo TODAS sus obras (las de «Conoce a»,
// al jugar, y las preguntadas en las rondas) y con ≥ 75 % de aciertos en la ronda.

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

export function levelCovered(seenIds, index, artistId, level) {
  const seen = new Set(seenIds);
  return requiredWorks(index, artistId, level).every((w) => seen.has(w.id));
}

export function deepRecord(progress, artistId, level) {
  return progress.deep?.[deepKey(artistId, level)] || null;
}

// Estado de un nivel «a fondo»: bloqueado hasta dominar el básico y el nivel anterior.
export function deepStatus(progress, index, artistId, level) {
  const rec = deepRecord(progress, artistId, level);
  if (rec?.mastered) return 'mastered';
  if (rec?.plays) return 'started';
  if (!progress.artists?.[artistId]?.mastered) return 'locked';
  const prev = index.deepLevels(artistId).filter((l) => l.id < level).pop();
  return !prev || deepRecord(progress, artistId, prev.id)?.mastered ? 'available' : 'locked';
}

// Avance «a fondo» de un pintor: { total, mastered, next } (next: el primer nivel por hacer).
export function deepProgress(progress, index, artistId) {
  const levels = index.deepLevels(artistId);
  const states = levels.map((l) => [l.id, deepStatus(progress, index, artistId, l.id)]);
  const next = states.find(([, s]) => s !== 'mastered');
  return { total: levels.length, mastered: states.filter(([, s]) => s === 'mastered').length, next: next ? next[0] : null };
}

export { levelOf };
