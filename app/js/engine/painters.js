// Pintores como lista y como ficha: épocas visibles, búsqueda, estado, obras ya vistas (sin spoilers),
// líneas de vida y qué se puede jugar. Puro: no toca el DOM.

import { movementReached } from './branches.js';
import { artistStatus } from './progress.js';
import { seenWorks, deepStatus } from './levels.js';

export const MAX_LIFE_LINES = 4;

// Sin tildes ni mayúsculas, para buscar «el greco» o «durero».
export const fold = (text) => String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// ¿Ha llegado la jugadora a esa época? Las ramas-movimiento (Gótico, Estampa japonesa) siguen a la época en
// la que se abren.
export function eraReached(progress, index, movement) {
  return movementReached(progress, index, movement.branch ? movement.opensAt : movement.id);
}

// Obras de un pintor que ya se han visto: en la colección o en alguna ronda (`progress.artists[id].works`).
export function seenOf(progress, index, artistId) {
  const owned = progress.collection || {};
  const rounds = seenWorks(progress, artistId);
  return index.worksOf(artistId)
    .filter((w) => owned[w.id] || rounds.has(w.id))
    .sort((a, b) => (a.yearSort || 0) - (b.yearSort || 0));
}

// 'mastered' (dominado) | 'started' (en marcha o con algo visto) | 'new' (aún sin ver).
export function painterState(progress, index, artistId) {
  const rec = progress.artists?.[artistId];
  if (rec?.mastered) return 'mastered';
  if (rec?.plays || seenOf(progress, index, artistId).length) return 'started';
  return 'new';
}

// Lista por épocas (cronológica) de los pintores de épocas ya alcanzadas, más cualquiera con algo visto.
// `query` filtra por nombre. [{ movement, artists: [{ artist, state, seen, total }] }]
export function painterGroups(progress, index, query = '') {
  const q = fold(query);
  const groups = [];
  for (const movement of index.movements) {
    const reached = eraReached(progress, index, movement);
    const artists = index.artistsOf(movement.id)
      .slice()
      .sort((a, b) => (a.born || 0) - (b.born || 0) || a.order - b.order)
      .map((artist) => ({ artist, state: painterState(progress, index, artist.id), seen: seenOf(progress, index, artist.id).length, total: index.worksOf(artist.id).length }))
      .filter((row) => row.total > 0 && (reached || row.state !== 'new'))
      .filter((row) => !q || fold(row.artist.name).includes(q) || fold(row.artist.short).includes(q));
    if (artists.length) groups.push({ movement, artists });
  }
  return groups;
}

// Líneas de vida: las tarjetas del nivel básico de su historia (con fuente) y, si no hay, un dato seco
// del catálogo. [{ text, source }]
export function lifeLines(artist, story, movementName = '') {
  const cards = story?.levels?.find((l) => l.level === 1)?.cards || [];
  const lines = cards.slice(0, MAX_LIFE_LINES).map((c) => ({ text: c.text, source: c.source || '' }));
  if (lines.length) return lines;
  const years = artist.born && artist.died ? ` (${artist.born}–${artist.died})` : '';
  const where = artist.country ? `, ${artist.country}` : '';
  const era = movementName ? ` · ${movementName}` : '';
  return [{ text: `${artist.name}${years}${where}${era}.`, source: artist.qid ? `https://www.wikidata.org/wiki/${artist.qid}` : '' }];
}

// Lo que se puede jugar desde la ficha: su etapa del camino, si es una parada ya abierta.
// { stage: 'available' | 'started' | 'mastered' | null }
export function playTargets(progress, index, artistId) {
  const onPath = index.pathIndex(artistId) >= 0;
  const status = onPath ? artistStatus(progress, index, artistId) : 'locked';
  return { stage: onPath && status !== 'locked' ? status : null };
}

// Etapas (niveles «a fondo») de un pintor con su estado, para la ficha de los grandes maestros.
export function stageList(progress, index, artistId) {
  return index.deepLevels(artistId).map((l) => ({ id: l.id, name: l.name, from: l.from, to: l.to, works: l.works.length, status: deepStatus(progress, index, artistId, l.id) }));
}

export const lifeSpan = (a) => (a.born && a.died ? `${a.born}–${a.died}` : '');
