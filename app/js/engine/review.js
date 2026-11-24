// Repaso que no se anuncia ni bloquea. Puro.
//  · Cuadro de repaso en cada etapa: una de las preguntas de repaso de pintores anteriores es de un
//    pintor dominado hace más de CONTRABAND_DAYS días (el que lleva más tiempo sin salir) o, si no hay,
//    del de dominio más antiguo; el cuadro lo elige el repaso espaciado (el que más tiempo lleva vencido).
//  · Pintor dormido: dominado y sin salir en DORMANT_DAYS días; el mapa lo pinta apagado y pregunta
//    «¿Lo recuerdas?». Nunca bloquea ni quita el dominado; al jugarlo vuelve a su estado.

import { daysBetween } from './dates.js';
import { noAuthorQuestion } from './catalog.js';
import { artKey } from './srs.js';

export const CONTRABAND_DAYS = 5;
export const DORMANT_DAYS = 7;

const later = (a, b) => (!a ? b : !b ? a : a > b ? a : b);

// Último día en que salió el pintor: en una pregunta (progress.seen) o jugando su etapa.
export function lastSeen(progress, artistId) {
  return later(progress.seen?.[artistId] || null, progress.artists?.[artistId]?.last || null);
}

function masteredOn(progress, artistId) {
  return progress.medals?.[`artist-${artistId}`] || progress.artists?.[artistId]?.last || null;
}

export function isDormant(progress, artistId, today) {
  if (!today || !progress.artists?.[artistId]?.mastered) return false;
  const seen = lastSeen(progress, artistId);
  return Boolean(seen) && daysBetween(seen, today) >= DORMANT_DAYS;
}

// Cuadros preguntables de un pintor ordenados por el repaso espaciado: primero los que llevan más
// tiempo vencidos (y en caja más baja); los que aún no están en el repaso, al final.
export function worksBySrs(progress, index, artistId) {
  const srs = progress.srs || {};
  const rank = (w) => srs[artKey(w.id)] || null;
  return index.worksOf(artistId).filter((w) => !noAuthorQuestion(w)).sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    if (!ra || !rb) return ra ? -1 : rb ? 1 : (b.fame || 0) - (a.fame || 0);
    if (ra.due !== rb.due) return ra.due < rb.due ? -1 : 1;
    return (ra.box || 0) - (rb.box || 0);
  });
}

// Pintor del cuadro de repaso de la etapa de `artistId` (entre los anteriores del camino) o null.
export function contrabandArtist(progress, index, artistId, today) {
  const before = index.path.slice(0, Math.max(0, index.pathIndex(artistId)));
  const mastered = before.filter((a) => progress.artists?.[a.id]?.mastered && worksBySrs(progress, index, a.id).length);
  if (!mastered.length) return null;
  const since = (a) => masteredOn(progress, a.id) || today;
  const stale = mastered.filter((a) => daysBetween(since(a), today) > CONTRABAND_DAYS);
  if (stale.length) {
    return stale.slice().sort((a, b) => ((lastSeen(progress, a.id) || '') < (lastSeen(progress, b.id) || '') ? -1 : 1))[0];
  }
  return mastered.slice().sort((a, b) => (since(a) < since(b) ? -1 : since(a) > since(b) ? 1 : 0))[0];
}

// Obra para el cuadro de repaso de la etapa (id) o null (primera etapa o nadie dominado antes).
export function contrabandWork(progress, index, artistId, today) {
  const a = contrabandArtist(progress, index, artistId, today);
  return a ? worksBySrs(progress, index, a.id)[0].id : null;
}
