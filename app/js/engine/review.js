// Repaso que no se anuncia ni bloquea. Puro.
//  · Cuadro de repaso en cada etapa: una de las preguntas de repaso de pintores anteriores es de un
//    pintor dominado hace más de CONTRABAND_DAYS días (el que lleva más tiempo sin salir) o, si no hay,
//    del de dominio más antiguo; el cuadro lo elige el repaso espaciado (el que más tiempo lleva vencido).
//  · Pintor dormido: dominado y sin salir en DORMANT_DAYS días; el mapa lo pinta apagado y pregunta
//    «¿Lo recuerdas?». Nunca bloquea ni quita el dominado; al jugarlo vuelve a su estado.
//  · «Repasar lo aprendido» (antes «Repaso de 5»): ronda corta y opcional de cuadros ya vistos de pintores dominados: los fallados que
//    vuelven (el más antiguo primero), los vencidos hoy en el repaso espaciado y, después, los que
//    llevan más tiempo sin repasarse. Da XP y cuenta para meta y racha; no toca dominio ni anti-trampa.

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

// ---------------------------------------------------------------- Repaso de 5

// Nombre de la ronda (título y perfil) y, si entre sus cuadros hay fallados, el del botón que la ofrece.
export const REVIEW5_NAME = 'Repasar lo aprendido';
export const REVIEW5_MISSED = 'Repasar los que fallaste';
export const REVIEW5_SIZE = 5;
// Con menos cuadros elegibles no se ofrece.
export const REVIEW5_MIN = 3;

function eligible(progress, index) {
  const srs = progress.srs || {};
  const owned = progress.collection || {};
  return index.path
    .filter((a) => progress.artists?.[a.id]?.mastered)
    .flatMap((a) => index.worksOf(a.id))
    .filter((w) => !noAuthorQuestion(w) && (srs[artKey(w.id)] || owned[w.id]));
}

// Ids de los cuadros del repaso (hasta REVIEW5_SIZE), en orden de prioridad.
export function review5Works(progress, index, today) {
  const pool = eligible(progress, index);
  const inPool = new Map(pool.map((w) => [w.id, w]));
  const srs = progress.srs || {};
  const out = [];
  const add = (id) => { if (inPool.has(id) && !out.includes(id) && out.length < REVIEW5_SIZE) out.push(id); };
  const fallados = (Array.isArray(progress.fallados) ? progress.fallados : []).slice()
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  fallados.forEach((f) => add(f.id));
  // Sin fecha de repaso (raro: solo en la colección), al final.
  const due = (w) => srs[artKey(w.id)]?.due || '9999-12-31';
  const byAge = pool.slice().sort((a, b) => (due(a) < due(b) ? -1 : due(a) > due(b) ? 1 : (srs[artKey(a.id)]?.box || 0) - (srs[artKey(b.id)]?.box || 0)));
  byAge.filter((w) => due(w) <= today).forEach((w) => add(w.id));
  byAge.forEach((w) => add(w.id));
  return out;
}

// Rótulo del botón: dice lo que trae la ronda (ids: los de review5Works).
export function review5Label(progress, ids) {
  const missed = new Set((Array.isArray(progress.fallados) ? progress.fallados : []).map((f) => f.id));
  return ids.some((id) => missed.has(id)) ? REVIEW5_MISSED : REVIEW5_NAME;
}

export function hasReview5(progress, index, today) {
  return review5Works(progress, index, today).length >= REVIEW5_MIN;
}
