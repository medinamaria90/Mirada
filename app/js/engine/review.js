// Repaso que no se anuncia ni bloquea. Puro.
//  · Cuadro de repaso en cada etapa: una de las preguntas de repaso de pintores anteriores es de un
//    pintor dominado hace más de CONTRABAND_DAYS días (el que lleva más tiempo sin salir) o, si no hay,
//    del de dominio más antiguo; el cuadro lo elige el repaso espaciado (el que más tiempo lleva vencido).
//  · Pintor dormido: dominado y sin salir en DORMANT_DAYS días; el mapa lo pinta apagado y pregunta
//    «¿Lo recuerdas?». Nunca bloquea ni quita el dominado; al jugarlo vuelve a su estado.
//  · «Repasar» (botón ↻, ruta #repaso): la única sesión de repaso a mano, automática (reviewSession). Da XP y cuenta
//    para meta y racha; no toca el dominio ni el anti-trampa.

import { daysBetween } from './dates.js';
import { noAuthorQuestion } from './catalog.js';
import { artKey, dueKeys } from './srs.js';
import { artistStatus, isKnownArtist } from './progress.js';
import { seenWorks } from './levels.js';

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

// ---------------------------------------------------------------- Repasar (sesión automática)

// Rótulo del botón (un verbo) y título de la sesión (un nombre).
export const REVIEW_NAME = 'Repasar';
export const REVIEW_TITLE = 'Repaso';
export const REVIEW_SIZE = 7;
// Cuadros vistos a partir de los que existe el repaso (el botón ↻ aparece y la sesión nunca sale vacía).
export const REVIEW_MIN = 3;
export const REVIEW_FALLADOS_MAX = 3;
export const REVIEW_STARTED_WORKS = 2;

const byDate = (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
const fallList = (progress) => (Array.isArray(progress.fallados) ? progress.fallados : []).filter((f) => f && typeof f.id === 'string');

// Cuadros ya vistos que se pueden preguntar, de pintores ya jugados (nunca de uno sin jugar): los que están en el repaso
// espaciado, en la colección o entre los vistos de su pintor.
export function reviewPool(progress, index) {
  const srs = progress.srs || {};
  const owned = progress.collection || {};
  const ids = new Set([
    ...Object.keys(srs).filter((k) => k.startsWith('art:')).map((k) => k.slice(4)),
    ...Object.keys(owned),
    ...Object.keys(progress.artists || {}).flatMap((id) => [...seenWorks(progress, id)]),
    ...fallList(progress).map((f) => f.id),
  ]);
  const known = new Map();
  const isKnown = (id) => {
    if (!known.has(id)) known.set(id, isKnownArtist(progress, index, id));
    return known.get(id);
  };
  return [...ids].map((id) => index.artwork(id)).filter((w) => w && !noAuthorQuestion(w) && isKnown(w.artistId));
}

// Pintores jugados y aún sin dominar (a medias), del peor al mejor resultado.
export function startedArtists(progress, index) {
  return index.path.filter((a) => artistStatus(progress, index, a.id) === 'started')
    .sort((a, b) => (Number(progress.artists[a.id]?.best) || 0) - (Number(progress.artists[b.id]?.best) || 0));
}

// Fallados en la cola que se pueden repasar (de pintores jugados, dominados o no).
export function reviewFallados(progress, index) {
  return fallList(progress).filter((f) => {
    const w = index.artwork(f.id);
    return w && !noAuthorQuestion(w) && isKnownArtist(progress, index, w.artistId);
  });
}

// La sesión «Repasar»: hasta REVIEW_SIZE cuadros distintos, en este orden: fallados (los más antiguos, como mucho 3),
// 2 vistos del pintor a medias con peor resultado, vencidos del repaso espaciado (caja más baja primero), 1 de un pintor
// apagado y, de relleno, lo que lleva más tiempo sin salir. { works: [ids], started: id del pintor a medias o null }.
export function reviewSession(progress, index, today) {
  const pool = reviewPool(progress, index);
  const inPool = new Map(pool.map((w) => [w.id, w]));
  const srs = progress.srs || {};
  const works = [];
  const add = (id) => {
    if (!inPool.has(id) || works.includes(id) || works.length >= REVIEW_SIZE) return false;
    works.push(id);
    return true;
  };
  // Lo que lleva más tiempo sin salir: la fecha de repaso más antigua (y la caja más baja); sin fecha, al final.
  const due = (w) => srs[artKey(w.id)]?.due || '9999-12-31';
  const byAge = (list) => list.slice().sort((a, b) => (due(a) < due(b) ? -1 : due(a) > due(b) ? 1 : (srs[artKey(a.id)]?.box || 0) - (srs[artKey(b.id)]?.box || 0)));
  // 1. Fallados.
  let n = 0;
  for (const f of reviewFallados(progress, index).slice().sort(byDate)) if (n < REVIEW_FALLADOS_MAX && add(f.id)) n += 1;
  // 2. El pintor a medias con peor resultado: 2 cuadros ya vistos suyos.
  const worst = startedArtists(progress, index)[0] || null;
  let started = null;
  if (worst) {
    const seen = seenWorks(progress, worst.id);
    const own = byAge(pool.filter((w) => w.artistId === worst.id && (seen.has(w.id) || srs[artKey(w.id)] || progress.collection?.[w.id])));
    let k = 0;
    for (const w of own) if (k < REVIEW_STARTED_WORKS && add(w.id)) k += 1;
    if (k || works.some((id) => inPool.get(id).artistId === worst.id)) started = worst.id;
  }
  // 3. Vencidos del repaso espaciado (dueKeys ya ordena por caja).
  for (const key of dueKeys(srs, today)) {
    const [kind, id] = key.split(':');
    if (kind === 'art') add(id);
    else if (kind === 'artist') {
      const w = byAge(pool.filter((x) => x.artistId === id)).find((x) => !works.includes(x.id));
      if (w) add(w.id);
    }
  }
  // 4. Un cuadro de un pintor apagado.
  const dormant = index.path.find((a) => isDormant(progress, a.id, today) && pool.some((w) => w.artistId === a.id && !works.includes(w.id)));
  if (dormant) {
    const w = worksBySrs(progress, index, dormant.id).find((x) => inPool.has(x.id) && !works.includes(x.id));
    if (w) add(w.id);
  }
  // 5. Relleno.
  byAge(pool).forEach((w) => add(w.id));
  return { works, started };
}

// ¿Existe el repaso? Desde REVIEW_MIN cuadros vistos (antes, el botón no aparece).
export function hasReview(progress, index, pool = reviewPool(progress, index)) {
  return pool.length >= REVIEW_MIN;
}

// ¿Hay algo pendiente (el punto del botón)? Fallados, vencidos del repaso espaciado o pintores a medias.
export function reviewPending(progress, index, today) {
  const all = reviewPool(progress, index);
  if (!hasReview(progress, index, all)) return false;
  if (startedArtists(progress, index).length) return true;
  if (reviewFallados(progress, index).length) return true;
  const pool = new Set(all.map((w) => w.id));
  return dueKeys(progress.srs || {}, today).some((key) => {
    const [kind, id] = key.split(':');
    return kind === 'art' ? pool.has(id) : kind === 'artist' && isKnownArtist(progress, index, id);
  });
}

// Entrada del repaso, en una frase: «Repasamos a Miguel Ángel y 5 cuadros que ya has visto», «Repasamos a Miguel Ángel» o, sin pintor a
// medias, «Repasamos 7 cuadros que ya has visto». session: la de reviewSession.
export function reviewIntroText(session, index) {
  const artist = session.started ? index.artist(session.started) : null;
  if (!artist) return `Repasamos ${session.works.length} cuadros que ya has visto`;
  const others = session.works.filter((id) => index.artwork(id)?.artistId !== artist.id).length;
  // El nombre no se parte entre dos líneas (espacios duros).
  const who = (artist.short || artist.name).replace(/ /g, '\u00a0');
  if (!others) return `Repasamos a ${who}`;
  return `Repasamos a ${who} y ${others === 1 ? 'un cuadro que ya has visto' : `${others}\u00a0cuadros que ya has visto`}`;
}
