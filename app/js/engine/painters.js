// Pintores como lista y como ficha: épocas visibles, búsqueda, estado, obras ya vistas (sin spoilers),
// líneas de vida y qué se puede jugar. Puro: no toca el DOM.

import { seenWorks, deepStatus } from './levels.js';
import { playStatusFrom } from './branches.js';
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

// Pintores que ya ha conocido: con algún nivel jugado o con la historia de su nivel 1 vista (`storySeen(id)`, que
// guarda la interfaz). Solo a estos se pregunta por autor en el repaso de una etapa (planner.planStage, opts.met).
export function metArtistIds(progress, index, storySeen = () => false) {
  return index.artists.filter((a) => (progress.artists?.[a.id]?.plays || 0) > 0 || storySeen(a.id)).map((a) => a.id);
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

// Lo que se puede jugar desde la ficha: su etapa (del camino o de una rama), si ya está abierta, con la regla de la
// ruta (branches.js → playStatus); y, si ya está dominado, la primera etapa «a fondo» abierta o en marcha (el botón
// principal es «Seguir: <etapa>» y no «Jugar otra vez»). branchId: ficha abierta desde una rama (manda el estado en
// esa rama). { stage: 'available' | 'started' | 'mastered' | null, next: { id, name } | null }
export function playTargets(progress, index, artistId, branchId = '') {
  const status = playStatusFrom(progress, index, artistId, branchId);
  const stage = status && status !== 'locked' ? status : null;
  const open = stage === 'mastered' && !branchId ? stageList(progress, index, artistId).find((s) => s.status === 'available' || s.status === 'started') : null;
  return { stage, next: open ? { id: open.id, name: open.name } : null };
}

// Nombre de una etapa «a fondo»: su título corto si tiene historia («La corte», el mismo del aro y de la historia); si no, el de
// los datos; si es genérico («Más obras»), con sus años («Hals (1610–1625)») o, sin años, «<Pintor> a fondo · n».
const GENERIC_STAGE = /^m[aá]s obras$/i;
export function stageTitle(artist, stage) {
  if (stage.short) return stage.short;
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
export const isSelfPortrait = (work) => SELF_PORTRAIT.test(work?.title || '');
// Autorretratos con más gente o con escenario («con Isabel Brant», «pintando a…», «ante el Kremlin»): el recorte por defecto
// enseñaría otra persona o una falda; solo valen con un `focus` revisado.
const WITH_SOMEONE = /\bcon\s+\p{Lu}/u; // «con Isabel Brant»
const CROWDED_WORDS = /\bcon\s+(un|una|su|sus)\s+(amig|espos|hij|marid|model|disc|famil)|\b(pintando|ante|delante|como|en el estudio)\b/i;
const crowded = (title) => WITH_SOMEONE.test(title) || CROWDED_WORDS.test(title);
const byFame = (a, b) => (b.fame || 0) - (a.fame || 0) || (a.yearSort || 0) - (b.yearSort || 0);

// Avatar del pintor, de obras ya vistas, nunca muy apaisadas: un autorretrato sencillo (título con «Autorretrato» o
// «self-portrait» y sin más gente) o con `focus`; si no, un retrato con `focus` revisado; si no, ninguno (monograma sobre el color
// de su movimiento). Nunca un recorte al azar de un paisaje, un barco o una falda. { work, x, y } o null.
// { selfOnly }: solo un autorretrato (la cara del pintor de verdad; un retrato de otro no vale, p. ej. en la historia).
export function avatarWork(seen, { selfOnly = false } = {}) {
  const fits = (w) => ratioOf(w) >= ROUND_RATIO[0] && ratioOf(w) <= ROUND_RATIO[1];
  const focused = (w) => Array.isArray(w.focus);
  const pick = (list) => list.slice().sort(byFame)[0];
  const candidates = seen.filter(fits);
  const self = pick(candidates.filter((w) => isSelfPortrait(w) && (focused(w) || !crowded(w.title))));
  const work = self || (selfOnly ? null : pick(candidates.filter((w) => PORTRAIT.test(w.title) && focused(w))));
  return work ? { work, ...avatarCrop(work) } : null;
}

// Lo que falta por ver de un pintor, en una frase (no una pared de casillas vacías): «Te faltan 24 · se desbloquean en sus
// etapas» si es un pintor dominado con niveles «a fondo»; si no, «… al jugar sus rondas». null si no falta nada.
// { text, toStages } (toStages: la frase se acompaña de un enlace a sus etapas).
export function missingNote(progress, index, artistId, seenCount, total) {
  const left = total - seenCount;
  if (left <= 0) return null;
  const one = left === 1;
  const toStages = isMastered(progress, artistId) && index.deepLevels(artistId).length > 0;
  const guest = index.artist(artistId)?.category === 'invitado';
  // Un invitado no tiene rondas propias: sus cuadros salen en las de su movimiento.
  const how = toStages ? `${one ? 'se desbloquea' : 'se desbloquean'} en sus etapas`
    : guest ? `${one ? 'sale' : 'salen'} en las rondas de su movimiento`
      : `${one ? 'se desbloquea' : 'se desbloquean'} al jugar sus rondas`;
  return { text: `${one ? 'Te falta 1' : `Te faltan ${left}`} · ${how}`, toStages };
}

// Obra con la que abre la historia de un pintor ya conocido: la más famosa de las que ha visto y que se deje enmarcar (ni muy
// altas ni muy apaisadas), sin retratos de otras personas (el de Castiglione no es Rafael). Sin ninguna, la de la tarjeta.
const OTHER_PORTRAIT = /^(retrato de|portrait of)/i;
export function openingWork(seen, fallback) {
  const ok = seen.filter((w) => ratioOf(w) >= 0.65 && ratioOf(w) <= 1.6 && !(OTHER_PORTRAIT.test(w.title) && !SELF_PORTRAIT.test(w.title)));
  return ok.sort(byFame)[0] || fallback;
}

// Monograma de un pintor: inicial del nombre de pila y del apellido principal, sin partículas ni segundos nombres
// («Bartolomé Esteban Murillo» → BM, «Vincent van Gogh» → VG, «Caspar David Friedrich» → CF); un solo nombre, su inicial.
const PARTICLES = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'da', 'das', 'di', 'do', 'du', 'van', 'von', 'der', 'den', 'ten', 'y', 'e', 'le', 'san', 'santa']);
const SUFFIX = /\s+(el\s+(viejo|joven)|the\s+(elder|younger))\s*$/i;
export function monogramOf(name) {
  const words = String(name || '').replace(SUFFIX, '').split(/\s+/).filter(Boolean);
  const main = words.filter((w) => !PARTICLES.has(w.toLowerCase()) && /^\p{L}/u.test(w));
  // «El Greco»: dos palabras y una es partícula, pero forma parte del nombre.
  const pick = main.length === 1 && words.length === 2 ? words : main.length ? main : words;
  const letter = (w) => [...w][0].toUpperCase();
  if (!pick.length) return '·';
  return pick.length === 1 ? letter(pick[0]) : letter(pick[0]) + letter(pick[pick.length - 1]);
}

// Variante de color (0-4) de un monograma, según el id del pintor: dentro de un mismo movimiento no son discos iguales.
export function monogramVariant(id) {
  let h = 0;
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 5;
}

// Sello de categoría: oro para los grandes maestros, plata para los maestros (también los de las ramas: Cimabue, Duccio,
// Hokusai… son los maestros de su rama) y bronce para los artistas invitados. Sin género en el catálogo: las pintoras con
// sello de maestra van con nombre.
const TIERS = {
  'gran-maestro': { tier: 'gold', label: 'Gran maestro', labelF: 'Gran maestra' },
  maestro: { tier: 'silver', label: 'Maestro', labelF: 'Maestra' },
  rama: { tier: 'silver', label: 'Maestro', labelF: 'Maestra' },
  invitado: { tier: 'bronze', label: 'Artista invitado', labelF: 'Artista invitada' },
};
const PAINTRESSES = new Set(['artemisia', 'morisot', 'sofonisba', 'leyster', 'vigee-le-brun', 'bonheur', 'cassatt']);
export function tierOf(artist) {
  const t = TIERS[artist?.category];
  return t ? { tier: t.tier, label: PAINTRESSES.has(artist.id) ? t.labelF : t.label } : null;
}
// Los que merecen su momento al dominarlos por primera vez (oro y plata).
export const isMasterTier = (artist) => ['gold', 'silver'].includes(tierOf(artist)?.tier);
