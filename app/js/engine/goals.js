// Metas largas (después del camino): cuadros que reconoces, «Ojo de…» por pintor, salas de los
// movimientos dominados y el detalle del día. Puro.

import { artKey } from './srs.js';
import { createRng } from './rng.js';
import { noAuthorQuestion, pickDistractorArtists, OPTION_COUNT } from './questions.js';
import { movementStatus, hasEye, EYE_BOX } from './progress.js';

// Un cuadro «se reconoce» cuando está en la caja 3 o más del repaso espaciado (acertado varias
// veces, con días de por medio).
export const RECOGNIZED_BOX = 3;

export function recognizedIds(progress, index) {
  const srs = progress.srs || {};
  return index.artworks.filter((w) => (srs[artKey(w.id)]?.box || 0) >= RECOGNIZED_BOX).map((w) => w.id);
}

export function recognizedCount(progress, index) {
  return recognizedIds(progress, index).length;
}

// «Ojo de <pintor>»: todas sus obras que se preguntan (sin firma ni atribución dudosa) en la caja
// EYE_BOX (4) del repaso espaciado o más.
export function eyeWorks(index, artistId) {
  return index.worksOf(artistId).filter((w) => !noAuthorQuestion(w));
}

export function eyeProgress(progress, index, artistId) {
  const works = eyeWorks(index, artistId);
  const srs = progress.srs || {};
  const top = works.filter((w) => (srs[artKey(w.id)]?.box || 0) >= EYE_BOX).length;
  return { top, total: works.length, done: works.length > 0 && top === works.length };
}

// Medallas «Ojo de…» que se ganan con este progreso (solo pintores con etapa).
export function earnedEyes(progress, index) {
  return index.path.filter((a) => hasEye(progress, index, a.id)).map((a) => a.id);
}

// --- Sala de un movimiento dominado ---------------------------------------------------------

export function isGalleryOpen(progress, index, movementId) {
  return index.visibleMovements.some((m) => m.id === movementId) && movementStatus(progress, index, movementId) === 'mastered';
}

// Obras reconocidas (en la colección) del movimiento, de la más antigua a la más moderna.
export function galleryWorks(progress, index, movementId) {
  const owned = progress.collection || {};
  return index.worksOfMovement(movementId)
    .filter((w) => owned[w.id])
    .sort((a, b) => a.yearSort - b.yearSort || (a.id < b.id ? -1 : 1));
}

export function openGalleries(progress, index) {
  return index.visibleMovements.filter((m) => isGalleryOpen(progress, index, m.id));
}

// --- Detalle del día -----------------------------------------------------------------------

export const DETAIL_XP = 5;

// Obras ya aprendidas que pueden salir: reconocidas alguna vez (colección), de pintores con etapa,
// de fama alta (todas llevan `look`: lo comprueba validate_catalog.py) y que no delatan ni tienen
// atribución dudosa.
export const DETAIL_FAME = 3;
export function detailPool(progress, index) {
  const owned = progress.collection || {};
  return index.artworks.filter((w) => owned[w.id] && index.pathIndex(w.artistId) >= 0 && !noAuthorQuestion(w) && (w.fame || 0) >= DETAIL_FAME);
}

// Zona del recorte (en % del ancho y del alto) y aumento. Con `focus` [x, y] (0-1, catálogo: rostro,
// mano o zona característica, elegida mirando la imagen) se centra ahí; sin él, en el centro un poco
// por encima (donde suelen estar las figuras). Aumento moderado para que se pueda resolver.
export function detailCrop(work, rng) {
  const f = Array.isArray(work.focus) && work.focus.length === 2 ? work.focus : null;
  const clamp = (v) => Math.round(Math.min(92, Math.max(8, v * 100)));
  if (f) return { x: clamp(f[0]), y: clamp(f[1]), scale: 1.6 + rng.int(3) / 10 };
  return { x: 50, y: 42, scale: 1.5 };
}

// Pregunta del día (determinista por fecha de Madrid y por lo aprendido): obra, recorte y opciones.
// null si aún no hay ninguna obra aprendida.
export function planDetail(progress, index, day) {
  const pool = detailPool(progress, index).sort((a, b) => (a.id < b.id ? -1 : 1));
  if (!pool.length) return null;
  const rng = createRng(`detail:${day}`);
  const work = pool[rng.int(pool.length)];
  const artist = index.artist(work.artistId);
  const distractors = pickDistractorArtists(index, artist, OPTION_COUNT - 1, 0.55, rng);
  if (distractors.length < OPTION_COUNT - 1) return null;
  const options = rng.shuffle([artist, ...distractors]).map((a) => ({ id: a.id, label: a.name }));
  const crop = detailCrop(work, rng);
  return { day, artworkId: work.id, artistId: artist.id, answerId: artist.id, options, crop };
}

// Aplica la respuesta (una vez al día). Devuelve { progress, xp, correct } o null si ya estaba.
export function answerDetail(progress, detail, optionId, today) {
  if (!detail || (progress.detail || {})[detail.day]) return null;
  const correct = optionId === detail.answerId;
  const xp = correct ? DETAIL_XP : 0;
  const byDay = { ...(progress.xpByDay || {}) };
  byDay[today] = (Number(byDay[today]) || 0) + xp;
  const keep = Object.keys(progress.detail || {}).sort().slice(-20);
  const detailLog = Object.fromEntries(keep.map((k) => [k, progress.detail[k]]));
  detailLog[detail.day] = { artworkId: detail.artworkId, correct };
  return { progress: { ...progress, xp: (progress.xp || 0) + xp, xpByDay: byDay, detail: detailLog }, xp, correct };
}
