// Índices de consulta sobre el catálogo (§4). Puro: no toca el DOM.

const SAFE_ID = /^[a-z0-9-]+$/i;
const SAFE_SRC = /^img\/[a-z0-9/_.-]+\.jpg$/;

// Miniatura de una obra: región [hoja, x, y, w, h] del atlas (§4) → { src, x, y, w, h, sw, sh };
// una ruta suelta → { src } (la imagen entera); si no hay, null y se usa `img`.
export function resolveThumb(thumb, atlas) {
  if (typeof thumb === 'string') return SAFE_SRC.test(thumb) ? { src: thumb } : null;
  if (!Array.isArray(thumb) || thumb.length !== 5 || !atlas || !Array.isArray(atlas.sheets)) return null;
  const [k, x, y, w, h] = thumb.map(Number);
  const src = atlas.sheets[k];
  const size = Array.isArray(atlas.size) ? atlas.size[k] : null;
  if (typeof src !== 'string' || !SAFE_SRC.test(src) || !size || ![x, y, w, h].every(Number.isFinite) || w <= 0 || h <= 0) return null;
  return { src, x, y, w, h, sw: Number(size[0]), sh: Number(size[1]) };
}

// Textos que llegan después de pintar (data/catalog-text.json): `look`/`looks` (pistas con
// fuente), `kind` y `tags` de obra; `traits`, `traitTags` y `why` («por qué importa», con fuente) de pintor; `tagLabels` y `negableTags`
// del vocabulario visual. Se añaden a los objetos del índice; lo que no encaja se ignora.
const MAX_TEXT = 140;
// Dato curioso de una obra (hoja de feedback) y explicación larga (página de la obra).
const MAX_CURIO = 240;
const MAX_ABOUT_PARAS = 8;
const MAX_ABOUT_PARA = 1200;
const MAX_TAGS = 12;
const MAX_NEGABLE = 60;
const MAX_LOOKS = 2;
const KINDS = ['tipico', 'atipico', 'memoria'];
const SAFE_TAG = /^[a-z-]{2,24}$/;
// Etiquetas: lista o cadena separada por espacios (así viaja en el archivo); '' = sin etiquetas.
const tagList = (v) => {
  const list = Array.isArray(v) ? v : typeof v === 'string' ? v.split(' ').filter(Boolean) : null;
  return list ? list.filter((t) => typeof t === 'string' && SAFE_TAG.test(t)).slice(0, MAX_TAGS) : null;
};

export function mergeCatalogText(index, text) {
  if (!text || typeof text !== 'object') return 0;
  let n = 0;
  for (const [id, look] of Object.entries(text.look || {})) {
    const w = index.artwork(id);
    if (w && typeof look === 'string' && look.length <= MAX_TEXT) { w.look = look; n++; }
  }
  for (const [id, looks] of Object.entries(text.looks || {})) {
    const w = index.artwork(id);
    if (!w || !Array.isArray(looks)) continue;
    const list = looks
      .filter((l) => l && typeof l.text === 'string' && l.text.length <= MAX_TEXT)
      .map((l) => ({ text: l.text, source: typeof l.source === 'string' ? l.source : '' }))
      .slice(0, MAX_LOOKS);
    if (list.length) { w.looks = list; if (!w.look) w.look = list[0].text; n++; }
  }
  for (const [id, kind] of Object.entries(text.kind || {})) {
    const w = index.artwork(id);
    if (w && KINDS.includes(kind)) { w.kind = kind; n++; }
  }
  for (const [id, tags] of Object.entries(text.tags || {})) {
    const w = index.artwork(id);
    const list = tagList(tags);
    if (w && list) { w.tags = list; n++; }
  }
  for (const [id, curio] of Object.entries(text.curio || {})) {
    const w = index.artwork(id);
    if (w && curio && typeof curio.text === 'string' && curio.text.length <= MAX_CURIO) { w.curio = { text: curio.text, source: typeof curio.source === 'string' ? curio.source : '' }; n++; }
  }
  for (const [id, traits] of Object.entries(text.traits || {})) {
    const a = index.artist(id);
    if (a && Array.isArray(traits)) { a.traits = traits.filter((t) => typeof t === 'string').slice(0, 6); n++; }
  }
  for (const [id, why] of Object.entries(text.why || {})) {
    const a = index.artist(id);
    if (a && why && typeof why.text === 'string' && why.text.length <= MAX_TEXT) { a.why = { text: why.text, source: typeof why.source === 'string' ? why.source : '' }; n++; }
  }
  for (const [id, tags] of Object.entries(text.traitTags || {})) {
    const a = index.artist(id);
    if (a && Array.isArray(tags)) { a.traitTags = tags.map(tagList).slice(0, 7); n++; }
  }
  if (text.tagLabels && typeof text.tagLabels === 'object') {
    index.tagLabels = Object.fromEntries(Object.entries(text.tagLabels).filter(([k, v]) => SAFE_TAG.test(k) && typeof v === 'string' && v.length <= 40));
    n++;
  }
  if (Array.isArray(text.negableTags)) {
    index.negableTags = text.negableTags.filter((t) => typeof t === 'string' && SAFE_TAG.test(t)).slice(0, MAX_NEGABLE);
    n++;
  }
  return n;
}

// Categorías con etapa propia en el camino común (catálogo grande, SPEC §4 ter).
const STAGE_CATEGORIES = ['gran-maestro', 'maestro'];
export const levelOf = (w) => (Number.isInteger(w.level) ? w.level : 1);

// Ficha de museo (data/catalog-ficha.json, se pide aparte: pesa más que el resto): museo, ciudad, país,
// técnica, medidas y fuente de cada obra. Solo se aceptan cadenas cortas; lo demás se ignora.
const FICHA_KEYS = ['museum', 'city', 'country', 'technique', 'dimensions'];
const MAX_FICHA = 120;

export function mergeCatalogFicha(index, data) {
  let n = 0;
  for (const [id, f] of Object.entries((data && data.ficha) || {})) {
    const w = index.artwork(id);
    if (!w || !f || typeof f !== 'object') continue;
    for (const k of FICHA_KEYS) if (typeof f[k] === 'string' && f[k].length <= MAX_FICHA) w[k] = f[k];
    if (f.source && typeof f.source === 'object') {
      w.source = Object.fromEntries(['wikidata', 'file', 'license'].filter((k) => typeof f.source[k] === 'string').map((k) => [k, f.source[k]]));
    }
    const paras = f.about && Array.isArray(f.about.text)
      ? f.about.text.filter((t) => typeof t === 'string' && t.length <= MAX_ABOUT_PARA).slice(0, MAX_ABOUT_PARAS) : [];
    if (paras.length) w.about = { text: paras, source: typeof f.about.source === 'string' ? f.about.source : '' };
    n++;
  }
  return n;
}

// --- Familias visuales: qué obras y pintores pueden salir juntos como opciones de una pregunta. ---
// Los datos (familias, topes, cortes) viven en catalogo/familias.json y llegan en catalog.json (`families`,
// `family` de movimientos y pintores). Sin `families`, todo vale.
// Años de margen con los que se relaja el tope si una familia no tiene relleno suficiente.
export const RELAX_STEPS = [1, 1.5, 2.5];
export const RELAX_MAX = RELAX_STEPS.at(-1);
// Distancia máxima, en posiciones de la línea del tiempo, entre el movimiento bueno y los de relleno.
export const MOVEMENT_HARD_GAP = 4;

// Intentos para que la buena no sea «la rara» de las cuatro.
export const ODD_TRIES = 16;
const FAMILY_GAP = 1000;

// ¿Es la opción `good` la más distinta de las otras (por familia y, después, por años)? Cuenta los empates.
// Si las falsas se agrupan en un lado del tiempo, la buena queda en el extremo y se delata sola.
export function isOddOne(refs, good = 0) {
  if (refs.some((r) => !r)) return false;
  const total = refs.map((a) => refs.reduce((n, b) => n + (a.family === b.family ? 0 : FAMILY_GAP) + Math.abs(a.year - b.year), 0));
  return total[good] >= Math.max(...total);
}

const median = (list) => {
  const v = list.slice().sort((a, b) => a - b);
  return v.length ? v[Math.floor((v.length - 1) / 2)] : 0;
};

export function buildFamilies(catalog, artistById, worksByArtist) {
  const data = catalog.families;
  if (!data || !Array.isArray(data.list)) return null;
  const byId = new Map(data.list.map((f) => [f.id, f]));
  const cutoff = Number.isFinite(data.cutoff) ? data.cutoff : 1800;
  const fam = (id) => byId.get(id) || null;
  const artistYear = new Map();
  const yearOfArtist = (a) => {
    if (!artistYear.has(a.id)) artistYear.set(a.id, median((worksByArtist.get(a.id) || []).map((w) => w.yearSort).filter(Number.isFinite)) || (a.born || 0) + 35);
    return artistYear.get(a.id);
  };
  // Familia de una obra: la del pintor, salvo los que cambian de familia en una fecha (Kandinsky).
  const familyOfWork = (a, w) => (a.familyFrom && w.yearSort >= a.familyFrom.year ? a.familyFrom.family : a.family);
  // Como candidato, un pintor «partido» cuenta con su familia posterior (la más estricta).
  const refOfArtist = (a) => ({ family: a.familyFrom ? a.familyFrom.family : a.family, year: yearOfArtist(a), artistId: a.id });
  const refOfWork = (w) => {
    const a = artistById.get(w.artistId);
    return { family: familyOfWork(a, w), year: w.yearSort, artistId: a.id };
  };
  const old = (r) => r.year < cutoff;
  // 'strict' (misma familia), 'near' (familia cercana de relleno) o null (no pueden salir juntas).
  const relation = (target, other, relax = 1) => {
    const ft = fam(target.family);
    const fo = fam(other.family);
    if (!ft || !fo) return 'strict';
    if ((ft.moderna && old(other)) || (fo.moderna && old(target))) return null;
    let kind = null;
    if (ft.id === fo.id) kind = 'strict';
    else if ((ft.cercanas || []).includes(fo.id)) kind = 'near';
    if (!kind) return null;
    const caps = [ft.tope, kind === 'near' ? fo.tope : null].filter(Number.isFinite);
    if (caps.length && Math.abs(target.year - other.year) > Math.min(...caps) * relax) return null;
    return kind;
  };
  // ¿Puede salir el movimiento `m` como opción en una pregunta sobre la obra `ref`?
  const movementAllowed = (ref, m) => {
    const f = fam(ref.family);
    if (!f || !m.family) return true;
    if (m.family !== (f.familiaMovimiento || f.id)) return false;
    if (old(ref) && m.vanguardias) return false;
    return !(f.moderna && Number.isFinite(m.hasta) && m.hasta <= cutoff);
  };
  return { cutoff, family: fam, refOfArtist, refOfWork, relation, movementAllowed, yearOfArtist };
}

export function buildIndex(catalog) {
  const movements = (catalog.movements || []).slice().sort((a, b) => a.order - b.order);
  const movementById = new Map(movements.map((m) => [m.id, m]));
  const artists = (catalog.artists || []).filter((a) => movementById.has(a.movementId) && SAFE_ID.test(a.id));
  const artistById = new Map(artists.map((a) => [a.id, a]));
  const atlas = catalog.atlas || null;
  const artworks = (catalog.artworks || [])
    .filter((w) => artistById.has(w.artistId))
    .map((w) => ({ ...w, thumb: resolveThumb(w.thumb, atlas) }));
  const artworkById = new Map(artworks.map((w) => [w.id, w]));

  const worksByArtist = new Map(artists.map((a) => [a.id, []]));
  for (const w of artworks) worksByArtist.get(w.artistId).push(w);

  // ¿El catálogo trae niveles (`level`)? Los catálogos pequeños y las fixtures no: se juega como antes.
  const hasLevels = artworks.some((w) => Number.isInteger(w.level));
  const stageArtistsByMovement = new Map();
  const artistsByMovement = new Map();
  for (const m of movements) {
    const all = artists.filter((a) => a.movementId === m.id).sort((a, b) => a.order - b.order);
    artistsByMovement.set(m.id, all);
    stageArtistsByMovement.set(m.id, m.branch ? [] : all.filter((a) => isStageArtist(a, worksByArtist.get(a.id))));
  }
  // Orden global del camino: movimientos cronológicos y, dentro, el orden del catálogo.
  // `path` solo lleva pintores con etapa (los índices de los retos `s<idx>` dependen de él).
  const path = movements.flatMap((m) => stageArtistsByMovement.get(m.id));
  const pathIndex = new Map(path.map((a, i) => [a.id, i]));

  // Movimientos sin pintores con etapa pero con obras suficientes: una «sala» (§ oleada 3).
  const salaIds = new Set(
    movements
      .filter((m) => !m.branch && !stageArtistsByMovement.get(m.id).length)
      .filter((m) => isSalaMovement(artistsByMovement.get(m.id), worksByArtist))
      .map((m) => m.id),
  );
  // Paradas del camino: pintores con etapa y salas, en orden cronológico.
  const steps = movements.flatMap((m) => (salaIds.has(m.id)
    ? [{ type: 'sala', id: m.id, movementId: m.id }]
    : stageArtistsByMovement.get(m.id).map((a) => ({ type: 'artist', id: a.id, movementId: m.id }))));
  const stepIndex = new Map(steps.map((s, i) => [`${s.type}:${s.id}`, i]));
  const visibleMovements = movements.filter((m) => salaIds.has(m.id) || stageArtistsByMovement.get(m.id).length);

  // Ramas (catálogo grande): listas cronológicas de pintores que se abren por tramos de época.
  const branches = (Array.isArray(catalog.branches) ? catalog.branches : [])
    .map((b) => ({ ...b, artists: (b.artists || []).filter((id) => artistById.has(id)) }))
    .filter((b) => SAFE_ID.test(b.id) && b.artists.length);
  const branchById = new Map(branches.map((b) => [b.id, b]));
  // Invitados del camino común (`onPath` sin etapa): salen intercalados, junto al pintor con etapa de
  // su movimiento más cercano por fecha de nacimiento (no antes que el primero).
  const guestsAt = new Map();
  for (const g of artists.filter((a) => a.onPath && !pathIndex.has(a.id) && worksByArtist.get(a.id).length)) {
    const mates = stageArtistsByMovement.get(g.movementId) || [];
    const host = mates.filter((a) => (a.born || 0) <= (g.born || 0)).pop() || mates[0];
    if (!host) continue;
    if (!guestsAt.has(host.id)) guestsAt.set(host.id, []);
    guestsAt.get(host.id).push(g);
  }
  // Pintores que preceden a uno de rama dentro de su rama (la primera que lo lista).
  const branchBefore = (artistId) => {
    const b = branches.find((x) => x.artists.includes(artistId));
    return b ? b.artists.slice(0, b.artists.indexOf(artistId)).map((id) => artistById.get(id)) : [];
  };

  const families = buildFamilies(catalog, artistById, worksByArtist);

  return {
    movements,
    artists,
    artworks,
    families,
    // Familias visuales (este mismo archivo): referencia de una obra o pintor y si pueden salir juntos.
    refOfWork: (w) => (families ? families.refOfWork(w) : null),
    refOfArtist: (a) => (families ? families.refOfArtist(a) : null),
    relation: (ref, artist, relax = 1) => (families && ref ? families.relation(ref, families.refOfArtist(artist), relax) : 'strict'),
    workRelation: (ref, work, relax = 1) => (families && ref ? families.relation(ref, families.refOfWork(work), relax) : 'strict'),
    movementAllowed: (ref, m) => (families && ref ? families.movementAllowed(ref, m) : true),
    movement: (id) => movementById.get(id),
    artist: (id) => artistById.get(id),
    artwork: (id) => artworkById.get(id),
    worksOf: (artistId) => worksByArtist.get(artistId) || [],
    hasLevels,
    // Obras del nivel `level` (1 = básico; 2..n = «a fondo»).
    levelWorks: (artistId, level) => (worksByArtist.get(artistId) || []).filter((w) => levelOf(w) === level),
    // Niveles «a fondo» del pintor: [{ id, name, from, to, source, works }] (las etapas con obras).
    deepLevels: (artistId) => ((artistById.get(artistId)?.stages) || [])
      .map((s) => ({ ...s, works: (worksByArtist.get(artistId) || []).filter((w) => levelOf(w) === s.id) }))
      .filter((s) => s.id >= 2 && s.works.length)
      .sort((a, b) => a.id - b.id),
    branches,
    branch: (id) => branchById.get(id),
    branchesOf: (artistId) => branches.filter((b) => b.artists.includes(artistId)),
    branchBefore,
    guestsAt: (artistId) => guestsAt.get(artistId) || [],
    // Invitados del camino ya presentados al llegar a la etapa de `artistId` (incluida).
    guestsUpTo: (artistId) => path.slice(0, pathIndex.get(artistId) + 1).flatMap((a) => guestsAt.get(a.id) || []),
    // Posición de dificultad de un pintor: su parada y, fuera del camino, la del pintor del camino más cercano.
    difficultyStep: (artistId) => {
      if (pathIndex.has(artistId)) return pathIndex.get(artistId);
      const a = artistById.get(artistId);
      const peers = a ? (stageArtistsByMovement.get(a.movementId) || []) : [];
      const near = peers.filter((p) => (p.born || 0) <= (a.born || 0)).pop() || peers[0];
      return near ? pathIndex.get(near.id) : 0;
    },
    learnWorks: (artistId) => (worksByArtist.get(artistId) || []).filter((w) => w.role === 'learn'),
    newWorks: (artistId) => (worksByArtist.get(artistId) || []).filter((w) => w.role === 'new'),
    stageArtists: (movementId) => stageArtistsByMovement.get(movementId) || [],
    artistsOf: (movementId) => artistsByMovement.get(movementId) || [],
    path,
    pathIndex: (artistId) => (pathIndex.has(artistId) ? pathIndex.get(artistId) : -1),
    steps,
    stepIndex: (type, id) => (stepIndex.has(`${type}:${id}`) ? stepIndex.get(`${type}:${id}`) : -1),
    stepsOf: (movementId) => steps.filter((s) => s.movementId === movementId),
    visibleMovements,
    isSala: (movementId) => salaIds.has(movementId),
    worksOfMovement: (movementId) => (artistsByMovement.get(movementId) || []).flatMap((a) => worksByArtist.get(a.id)),
    // Invitados de una sala con al menos 2 obras: protagonistas de «¿Quién lo pintó?».
    salaArtists: (movementId) => (artistsByMovement.get(movementId) || []).filter((a) => worksByArtist.get(a.id).length >= 2),
    movementOf: (artistId) => movementById.get(artistById.get(artistId)?.movementId),
  };
}

function isStageArtist(artist, works) {
  if (artist.category) return Boolean(artist.onPath) && STAGE_CATEGORIES.includes(artist.category);
  if (artist.guest) return false;
  const learn = works.filter((w) => w.role === 'learn').length;
  const fresh = works.filter((w) => w.role === 'new').length;
  return works.length >= 3 && learn >= 2 && fresh >= 1;
}

function isSalaMovement(artists, worksByArtist) {
  const withWorks = artists.filter((a) => worksByArtist.get(a.id).length);
  const total = withWorks.reduce((n, a) => n + worksByArtist.get(a.id).length, 0);
  return withWorks.length >= 2 && total >= 4;
}

// Obras cuya imagen lleva escrito el nombre del autor: no sirven para preguntar quién la pintó.
export function isSpoiler(artwork) {
  return Boolean(artwork && artwork.spoiler === true);
}

// Atribución discutida (`attributed: true`): sirve para «¿De qué movimiento es?», pero no para
// preguntas de autor («¿Quién lo pintó?», «¿Cuál es de X?»), ni como respuesta ni de relleno.
export function isAttributed(artwork) {
  return Boolean(artwork && artwork.attributed === true);
}

// No sirve para preguntar por el autor (lleva la firma o la atribución es dudosa).
export function noAuthorQuestion(artwork) {
  return isSpoiler(artwork) || isAttributed(artwork);
}

// Sala de un movimiento sin pintores con etapa: las obras que se enseñan (3-4 de invitados
// distintos). Vive aquí (y no en el planificador) porque el mapa la usa para la portada.
export const SALA_LEARN = 4;

export function salaLearnWorks(index, movementId) {
  const artists = index.artistsOf(movementId).filter((a) => index.worksOf(a.id).length);
  const lead = index.salaArtists(movementId).slice().sort((a, b) => index.worksOf(b.id).length - index.worksOf(a.id).length || a.order - b.order);
  const others = artists.filter((a) => !lead.includes(a));
  const best = (a) => index.worksOf(a.id).slice().sort((x, y) => (y.fame || 0) - (x.fame || 0) || (isSpoiler(x) - isSpoiler(y)) || x.yearSort - y.yearSort)[0];
  const picked = lead.slice(0, SALA_LEARN - 1).map(best);
  // El resto, de los invitados con obras más conocidas; en empate, los más tardíos (muestran la evolución).
  const extra = others.map(best).sort((x, y) => (y.fame || 0) - (x.fame || 0) || y.yearSort - x.yearSort);
  for (const w of [...extra, ...lead.slice(SALA_LEARN - 1).map(best)]) {
    if (picked.length >= SALA_LEARN) break;
    picked.push(w);
  }
  return picked.sort((a, b) => a.yearSort - b.yearSort);
}

export function isSafeId(id) {
  return typeof id === 'string' && SAFE_ID.test(id);
}
