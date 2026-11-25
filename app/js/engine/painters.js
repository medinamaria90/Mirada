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
        return { artist, state: painterState(progress, index, artist.id), seen: seen.length, total: index.worksOf(artist.id).length, avatar: avatarWork(seen), cover: coverWork(seen) };
      });
    const known = all.filter((row) => row.state !== 'new');
    if (!known.length) continue;
    const artists = known.filter((row) => !q || fold(row.artist.name).includes(q) || fold(row.artist.short).includes(q));
    if (artists.length) groups.push({ movement, known: known.length, total: all.length, hidden: all.length - known.length, artists });
  }
  return groups;
}

// Datos clave de la ficha (el relato es de la historia): cuántos cuadros hay, cuántos se han visto y cuántas etapas «a fondo» tiene
// (las mismas que se listan). Son contadores de la app: no llevan fuente. [{ label, value }]
export function factsOf(index, artist, seenCount) {
  const facts = [{ label: 'Cuadros', value: index.worksOf(artist.id).length }];
  if (seenCount > 0) facts.push({ label: 'Vistos', value: seenCount });
  const deep = index.deepLevels(artist.id).length;
  if (deep > 0) facts.push({ label: 'A fondo', value: deep });
  return facts;
}

// Fuente de las fechas y el país del pintor (curados y comprobados con Wikidata): enlace a su ficha de Wikidata, o ''.
export const wikidataUrl = (artist) => (artist.qid ? `https://www.wikidata.org/wiki/${artist.qid}` : '');

// Lo que se puede jugar desde la ficha: su etapa del camino, si es una parada ya abierta; y, si ya está dominado, la primera etapa
// «a fondo» abierta o en marcha (el botón principal es «Seguir: <etapa>» y no «Jugar otra vez»).
// { stage: 'available' | 'started' | 'mastered' | null, next: { id, name } | null }
export function playTargets(progress, index, artistId) {
  const onPath = index.pathIndex(artistId) >= 0;
  const status = onPath ? artistStatus(progress, index, artistId) : 'locked';
  const stage = onPath && status !== 'locked' ? status : null;
  const open = stage === 'mastered' ? stageList(progress, index, artistId).find((s) => s.status === 'available' || s.status === 'started') : null;
  return { stage, next: open ? { id: open.id, name: open.name } : null };
}

// Nombre de una etapa «a fondo»: el de los datos; si es genérico («Más obras»), con sus años («Hals (1610–1625)») o, sin años,
// «<Pintor> a fondo · n».
const GENERIC_STAGE = /^m[aá]s obras$/i;
export function stageTitle(artist, stage) {
  if (!GENERIC_STAGE.test(stage.name || '')) return stage.name;
  const who = artist.short || artist.name;
  return stage.from && stage.to ? `${who} (${stage.from}–${stage.to})` : `${who} a fondo · ${stage.id - 1}`;
}

// Etapas (niveles «a fondo») de un pintor con su estado y su nombre, para la ficha.
export function stageList(progress, index, artistId) {
  const artist = index.artist(artistId);
  return index.deepLevels(artistId).map((l) => ({ id: l.id, name: stageTitle(artist, l), from: l.from, to: l.to, works: l.works.length, status: deepStatus(progress, index, artistId, l.id) }));
}

export const lifeSpan = (a) => (a.born && a.died ? `${a.born}–${a.died}` : '');

// Proporción (ancho/alto) de una obra.
const ratioOf = (w) => (w.w && w.h ? w.w / w.h : 1);
// Valen de avatar o de portada las obras que no son muy apaisadas (trípticos, frisos): recortadas dejan marcos y cortes.
const ROUND_RATIO = [0.55, 1.3];
const BANNER_FALLBACK_MAX = 1.7;

// Portada de la ficha: la obra más famosa de las ya vistas (nunca una no vista: sin spoilers), con preferencia por las
// que no son muy apaisadas (un tríptico con marcos blancos no hace de portada). Null sin obras vistas o si solo hay frisos.
export function coverWork(seen) {
  const ok = (w) => ratioOf(w) >= ROUND_RATIO[0] && ratioOf(w) <= ROUND_RATIO[1];
  const best = seen.filter(ok).sort(byFame)[0] || seen.filter((w) => ratioOf(w) <= BANNER_FALLBACK_MAX).sort(byFame)[0];
  return best || null;
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
// Autorretratos con más gente o con escenario («con Isabel Brant», «pintando a…», «ante el Kremlin»): el recorte por defecto
// enseñaría otra persona o una falda; solo valen con un `focus` revisado.
const WITH_SOMEONE = /\bcon\s+\p{Lu}/u; // «con Isabel Brant»
const CROWDED_WORDS = /\bcon\s+(un|una|su|sus)\s+(amig|espos|hij|marid|model|disc|famil)|\b(pintando|ante|delante|como|en el estudio)\b/i;
const crowded = (title) => WITH_SOMEONE.test(title) || CROWDED_WORDS.test(title);
const byFame = (a, b) => (b.fame || 0) - (a.fame || 0) || (a.yearSort || 0) - (b.yearSort || 0);

// Avatar del pintor, de obras ya vistas, nunca muy apaisadas: un autorretrato sencillo (título con «Autorretrato» o
// «self-portrait» y sin más gente) o con `focus`; si no, un retrato con `focus` revisado; si no, ninguno (monograma sobre el color
// de su movimiento). Nunca un recorte al azar de un paisaje, un barco o una falda. { work, x, y } o null.
export function avatarWork(seen) {
  const fits = (w) => ratioOf(w) >= ROUND_RATIO[0] && ratioOf(w) <= ROUND_RATIO[1];
  const focused = (w) => Array.isArray(w.focus);
  const pick = (list) => list.slice().sort(byFame)[0];
  const candidates = seen.filter(fits);
  const self = pick(candidates.filter((w) => SELF_PORTRAIT.test(w.title) && (focused(w) || !crowded(w.title))));
  const work = self || pick(candidates.filter((w) => PORTRAIT.test(w.title) && focused(w)));
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

// Obra con la que abre la historia de un pintor ya conocido: la más famosa de las que ha visto y que se deje enmarcar (ni muy
// altas ni muy apaisadas), sin retratos de otras personas (el de Castiglione no es Rafael). Sin ninguna, la de la tarjeta.
const OTHER_PORTRAIT = /^(retrato de|portrait of)/i;
export function openingWork(seen, fallback) {
  const ok = seen.filter((w) => ratioOf(w) >= 0.65 && ratioOf(w) <= 1.6 && !(OTHER_PORTRAIT.test(w.title) && !SELF_PORTRAIT.test(w.title)));
  return ok.sort(byFame)[0] || fallback;
}
