// Metas largas (después del camino): cuadros que reconoces, «Ojo de…» por pintor y salas de los
// movimientos dominados. Puro.

import { artKey } from './srs.js';
import { noAuthorQuestion } from './questions.js';
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
