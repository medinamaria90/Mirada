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
// fuente), `kind` y `tags` de obra; `traits` y `traitTags` de pintor; `tagLabels` y `negableTags`
// del vocabulario visual. Se añaden a los objetos del índice; lo que no encaja se ignora.
const MAX_TEXT = 140;
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
  for (const [id, traits] of Object.entries(text.traits || {})) {
    const a = index.artist(id);
    if (a && Array.isArray(traits)) { a.traits = traits.filter((t) => typeof t === 'string').slice(0, 6); n++; }
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

  const stageArtistsByMovement = new Map();
  const artistsByMovement = new Map();
  for (const m of movements) {
    const all = artists.filter((a) => a.movementId === m.id).sort((a, b) => a.order - b.order);
    artistsByMovement.set(m.id, all);
    stageArtistsByMovement.set(m.id, all.filter((a) => isStageArtist(a, worksByArtist.get(a.id))));
  }
  // Orden global del camino: movimientos cronológicos y, dentro, el orden del catálogo.
  // `path` solo lleva pintores con etapa (los índices de los retos `s<idx>` dependen de él).
  const path = movements.flatMap((m) => stageArtistsByMovement.get(m.id));
  const pathIndex = new Map(path.map((a, i) => [a.id, i]));

  // Movimientos sin pintores con etapa pero con obras suficientes: una «sala» (§ oleada 3).
  const salaIds = new Set(
    movements
      .filter((m) => !stageArtistsByMovement.get(m.id).length)
      .filter((m) => isSalaMovement(artistsByMovement.get(m.id), worksByArtist))
      .map((m) => m.id),
  );
  // Paradas del camino: pintores con etapa y salas, en orden cronológico.
  const steps = movements.flatMap((m) => (salaIds.has(m.id)
    ? [{ type: 'sala', id: m.id, movementId: m.id }]
    : stageArtistsByMovement.get(m.id).map((a) => ({ type: 'artist', id: a.id, movementId: m.id }))));
  const stepIndex = new Map(steps.map((s, i) => [`${s.type}:${s.id}`, i]));
  const visibleMovements = movements.filter((m) => salaIds.has(m.id) || stageArtistsByMovement.get(m.id).length);

  return {
    movements,
    artists,
    artworks,
    movement: (id) => movementById.get(id),
    artist: (id) => artistById.get(id),
    artwork: (id) => artworkById.get(id),
    worksOf: (artistId) => worksByArtist.get(artistId) || [],
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
