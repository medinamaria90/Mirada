// Pintores como lista y como ficha: épocas visibles, búsqueda, estado, obras ya vistas (sin spoilers),
// líneas de vida y qué se puede jugar. Puro: no toca el DOM.

import { artistStatus } from './progress.js';
import { seenWorks, deepStatus } from './levels.js';
import { movementsChrono } from './movements.js';


// Sin tildes ni mayúsculas, para buscar «el greco» o «durero».
export const fold = (text) => String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// Obras de un pintor que ya se han visto: en la colección o en alguna ronda (`progress.artists[id].works`).
export function seenOf(progress, index, artistId) {
  const owned = progress.collection || {};
  const rounds = seenWorks(progress, artistId);
  return index.worksOf(artistId)
    .filter((w) => owned[w.id] || rounds.has(w.id))
    .sort((a, b) => (a.yearSort || 0) - (b.yearSort || 0));
}

// Estado de un pintor: 'mastered' | 'started' | 'new'.
// «Dominado» tiene UNA definición, la del motor: `progress.artists[id].mastered`, que se marca al superar una ronda de
// su etapa habiendo visto todas sus obras de nivel 1 (engine/levels.js, engine/finish.js) y con ≥ 75 % de aciertos. Es la misma
// que cuenta «pintores dominados» en el perfil (`artistStatus`) y la que pinta el check dorado de la lista. Las obras de los
// niveles «a fondo» no hacen falta para dominarlo, por eso «n/m» (todas sus obras) puede ser menor que m/m con el check.
export function isMastered(progress, artistId) {
  return Boolean(progress.artists?.[artistId]?.mastered);
}

// 'started': algo visto (colección o rondas). Sin nada visto, 'new': no se lista, no se revela quién viene.
export function painterState(progress, index, artistId) {
  if (isMastered(progress, artistId)) return 'mastered';
  return seenOf(progress, index, artistId).length ? 'started' : 'new';
}

// Lista por movimientos (cronológica): solo pintores con alguna obra vista (o dominados), con el encabezado
// «n de m pintores» (m = los del movimiento) y cuántos faltan por descubrir (sin decir quiénes). Un movimiento
// sin ningún pintor conocido no sale. `query` filtra por nombre solo entre los conocidos.
// [{ movement, known, total, hidden, artists: [{ artist, state, seen, total }] }]
export function painterGroups(progress, index, query = '') {
  const q = fold(query);
  const groups = [];
  for (const movement of movementsChrono(index)) {
    const all = index.artistsOf(movement.id).filter((a) => index.worksOf(a.id).length > 0)
      .sort((a, b) => (a.born || 0) - (b.born || 0) || a.order - b.order)
      .map((artist) => {
        const seen = seenOf(progress, index, artist.id);
        return { artist, state: painterState(progress, index, artist.id), seen: seen.length, total: index.worksOf(artist.id).length, avatar: avatarWork(seen) };
      });
    const known = all.filter((row) => row.state !== 'new');
    if (!known.length) continue;
    const artists = known.filter((row) => !q || fold(row.artist.name).includes(q) || fold(row.artist.short).includes(q));
    if (artists.length) groups.push({ movement, known: known.length, total: all.length, hidden: all.length - known.length, artists });
  }
  return groups;
}

// Primera frase de un texto (hasta el primer punto seguido de espacio o el final): la ficha resume y la historia cuenta.
export function firstSentence(text) {
  const m = /^.*?[.!?](?=\s|$)/.exec(String(text || '').trim());
  return m ? m[0] : String(text || '').trim();
}

// Líneas de vida de la ficha: UNA frase resumen, la primera de su historia de nivel 1 (con fuente; la historia cuenta el
// resto, así que no se repite palabra por palabra) y, sin historia o sin obras vistas, un dato seco del catálogo que no
// nombra ningún cuadro. [{ text, source }]
export function lifeLines(artist, story, movementName = '', { known = true } = {}) {
  const card = known ? story?.levels?.find((l) => l.level === 1)?.cards?.[0] : null;
  if (card) return [{ text: firstSentence(card.text), source: card.source || '' }];
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

// Nombre de una etapa «a fondo»: el de los datos y, si es genérico («Más obras»), «<Pintor> a fondo · n».
const GENERIC_STAGE = /^m[aá]s obras$/i;
export function stageTitle(artist, stage) {
  return GENERIC_STAGE.test(stage.name || '') ? `${artist.short || artist.name} a fondo · ${stage.id - 1}` : stage.name;
}

// Etapas (niveles «a fondo») de un pintor con su estado y su nombre, para la ficha.
export function stageList(progress, index, artistId) {
  const artist = index.artist(artistId);
  return index.deepLevels(artistId).map((l) => ({ id: l.id, name: stageTitle(artist, l), from: l.from, to: l.to, works: l.works.length, status: deepStatus(progress, index, artistId, l.id) }));
}

export const lifeSpan = (a) => (a.born && a.died ? `${a.born}–${a.died}` : '');

// Portada de la ficha: la obra más famosa de las ya vistas (nunca una no vista: sin spoilers). Null sin obras vistas.
export function coverWork(seen) {
  return seen.slice().sort(byFame)[0] || null;
}

// Galería embebida en la ficha: las primeras `limit` obras vistas (sin casillas vacías; lo que falta se resume en texto).
export const PREVIEW_CELLS = 6;
export function previewCells(seen, limit = PREVIEW_CELLS) {
  return seen.slice(0, limit);
}

// Zona del cuadro que hace de avatar: el `focus` de la obra si lo tiene (centro 0-1) o la parte alta del centro.
export function avatarCrop(work) {
  const f = Array.isArray(work?.focus) && work.focus.length >= 2 ? work.focus : null;
  return { x: Math.round((f ? f[0] : 0.5) * 100), y: Math.round((f ? f[1] : 0.35) * 100) };
}

const SELF_PORTRAIT = /autorretrato|self-?\s?portrait/i;
const PORTRAIT = /retrato|portrait/i;
const byFame = (a, b) => (b.fame || 0) - (a.fame || 0) || (a.yearSort || 0) - (b.yearSort || 0);

// Avatar del pintor, de obras ya vistas: un autorretrato (título con «Autorretrato» o «self-portrait»); si no, un retrato
// con encuadre revisado (`focus`); si tampoco, ninguno (iniciales sobre el color de su movimiento). Nunca un recorte al
// azar de un paisaje o un barco. { work, x, y } o null.
export function avatarWork(seen) {
  const pick = (list) => list.slice().sort(byFame)[0];
  const self = pick(seen.filter((w) => SELF_PORTRAIT.test(w.title)));
  const work = self || pick(seen.filter((w) => PORTRAIT.test(w.title) && Array.isArray(w.focus)));
  return work ? { work, ...avatarCrop(work) } : null;
}

// Lo que falta por ver de un pintor, en una frase (no una pared de casillas vacías): «Te faltan 24 · se desbloquean en sus
// etapas» si es un pintor dominado con niveles «a fondo»; si no, «… al jugar sus rondas». null si no falta nada.
// { text, toStages } (toStages: la frase se acompaña de un enlace a sus etapas).
export function missingNote(progress, index, artistId, seenCount, total) {
  const left = total - seenCount;
  if (left <= 0) return null;
  const toStages = isMastered(progress, artistId) && index.deepLevels(artistId).length > 0;
  return { text: `${left === 1 ? 'Te falta 1' : `Te faltan ${left}`} · ${toStages ? 'se desbloquean en sus etapas' : 'se desbloquean al jugar sus rondas'}`, toStages };
}
