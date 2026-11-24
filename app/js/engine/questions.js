// Generación de preguntas de los tres tipos (§1) con distractores por parecido.
// Puro: recibe el índice del catálogo y un RNG con semilla.

import { isSpoiler, noAuthorQuestion } from './catalog.js';

export { isSpoiler, isAttributed, noAuthorQuestion } from './catalog.js';

export const QUESTION_TYPES = ['who', 'movement', 'which'];
export const OPTION_COUNT = 4;

// Grado de parecido entre dos pintores: 3 confundibles, 2 mismo movimiento,
// 1 movimiento contiguo, 0 lejanos.
export function similarity(index, a, b) {
  if (a.similarTo?.includes(b.id) || b.similarTo?.includes(a.id)) return 3;
  if (a.movementId === b.movementId) return 2;
  const ma = index.movement(a.movementId);
  const mb = index.movement(b.movementId);
  if (ma && mb && Math.abs(ma.order - mb.order) === 1) return 1;
  return 0;
}

// Parecido medio buscado según la dificultad (0..1): de casi nada (0,15) a muy parecido (2,5).
export function targetSimilarity(difficulty) {
  return 0.15 + 2.35 * clamp(difficulty, 0, 1);
}

// Hasta esta dificultad, como mucho un distractor «confundible» (parecido 3) por pregunta.
export const SIMILAR_CAP_UNTIL = 0.5;

// difficulty 0..1: con 0 se eligen pintores muy distintos; con 1, los más parecidos.
// Se busca que el parecido medio de los distractores sea targetSimilarity(difficulty): cada
// hueco pide un nivel (redondeo aleatorio) y, si no hay pintores de ese nivel, se toma el más
// cercano y la diferencia se compensa en los huecos siguientes. Así la curva es continua.
// include: pintores que deben salir sí o sí (p. ej. el de la etapa en una pregunta de repaso);
// cuentan para el parecido medio y los demás huecos compensan.
export function pickDistractorArtists(index, target, count, difficulty, rng, exclude = [], include = []) {
  const banned = new Set([target.id, ...exclude]);
  const usedNames = new Set([target.name]);
  const forced = [];
  for (const id of include) {
    const a = typeof id === 'string' ? index.artist(id) : id;
    if (!a || banned.has(a.id) || usedNames.has(a.name) || !index.worksOf(a.id).length || forced.length >= count) continue;
    forced.push(a);
    banned.add(a.id);
    usedNames.add(a.name);
  }
  const groups = [[], [], [], []];
  for (const a of index.artists) {
    if (banned.has(a.id) || !index.worksOf(a.id).length) continue;
    groups[similarity(index, target, a)].push(a);
  }
  for (let i = 0; i < 4; i++) groups[i] = rng.shuffle(groups[i]);
  const d = clamp(difficulty, 0, 1);
  const topCap = d < SIMILAR_CAP_UNTIL ? 1 : count;
  const goal = count * targetSimilarity(d);
  const chosen = forced.slice();
  let achieved = forced.reduce((n, a) => n + similarity(index, target, a), 0);
  let tops = forced.filter((a) => similarity(index, target, a) === 3).length;
  const take = (level) => {
    if (level < 0 || level > 3 || (level === 3 && tops >= topCap)) return null;
    const g = groups[level];
    while (g.length) {
      const a = g.shift();
      if (usedNames.has(a.name)) continue;
      return a;
    }
    return null;
  };
  for (let k = chosen.length; k < count; k++) {
    const desired = clamp((goal - achieved) / (count - k), 0, 3);
    const lo = Math.floor(desired);
    let level = Math.min(3, lo + (rng.next() < desired - lo ? 1 : 0));
    if (level === 3 && tops >= topCap) level = 2;
    let picked = null;
    let got = level;
    for (let dist = 0; dist <= 3 && !picked; dist++) {
      const order = dist === 0 ? [level] : rng.next() < 0.5 ? [level - dist, level + dist] : [level + dist, level - dist];
      for (const l of order) {
        picked = take(l);
        if (picked) { got = l; break; }
      }
    }
    if (!picked) break;
    usedNames.add(picked.name);
    chosen.push(picked);
    achieved += got;
    if (got === 3) tops += 1;
  }
  return chosen;
}

// Parecido medio de los distractores de una pregunta (para medir la curva de dificultad).
export function questionSimilarity(index, q) {
  const target = index.artist(q.artistId);
  if (!target || q.type === 'movement') return null;
  const others = q.type === 'which'
    ? q.options.filter((o) => o.id !== q.answerId).map((o) => index.artist(index.artwork(o.artworkId).artistId))
    : q.options.filter((o) => o.id !== q.answerId).map((o) => index.artist(o.id));
  if (!others.length) return null;
  return others.reduce((n, a) => n + similarity(index, target, a), 0) / others.length;
}

// opts.preferred: pintores, en orden de preferencia, que salen primero como distractores (salas).
// opts.include: pintores que deben salir como distractores.
// opts.exclude: pintores que no deben salir.
export function makeWhoQuestion(index, artwork, difficulty, rng, opts = {}) {
  if (noAuthorQuestion(artwork)) return null;
  const artist = index.artist(artwork.artistId);
  const distractors = opts.preferred && opts.preferred.length
    ? preferredDistractors(index, artist, opts.preferred, difficulty, rng)
    : pickDistractorArtists(index, artist, OPTION_COUNT - 1, difficulty, rng, opts.exclude || [], opts.include || []);
  if (distractors.length < OPTION_COUNT - 1) return null;
  const options = rng.shuffle([artist, ...distractors]).map((a) => ({ id: a.id, label: a.name }));
  return {
    type: 'who',
    prompt: '¿Quién lo pintó?',
    artworkId: artwork.id,
    artistId: artist.id,
    options,
    answerId: artist.id,
    isNew: artwork.role === 'new',
  };
}

function preferredDistractors(index, artist, preferred, difficulty, rng) {
  if (!preferred || !preferred.length) return pickDistractorArtists(index, artist, OPTION_COUNT - 1, difficulty, rng);
  const names = new Set([artist.name]);
  const chosen = [];
  for (const a of preferred) {
    if (chosen.length >= OPTION_COUNT - 1) break;
    if (a.id === artist.id || names.has(a.name) || !index.worksOf(a.id).length) continue;
    names.add(a.name);
    chosen.push(a);
  }
  if (chosen.length < OPTION_COUNT - 1) {
    const rest = pickDistractorArtists(index, artist, OPTION_COUNT - 1 - chosen.length, difficulty, rng, chosen.map((a) => a.id))
      .filter((a) => !names.has(a.name));
    chosen.push(...rest);
  }
  return chosen;
}

// Opciones de movimiento: desde el principio, al menos una contigua en el tiempo (para que no se
// acierte por descarte); a partir de la mitad del camino, las demás a 3 movimientos como mucho.
export const MOVEMENT_NEAR_FROM = 0.5;
export const MOVEMENT_MAX_GAP = 3;

// opts.include: ids de movimiento que deben salir como distractores (p. ej. el de la etapa).
export function makeMovementQuestion(index, artwork, difficulty, rng, opts = {}) {
  const list = index.movements;
  if (list.length < 3 || isSpoiler(artwork)) return null;
  const artist = index.artist(artwork.artistId);
  const correct = index.movement(artist.movementId);
  const pos = list.indexOf(correct);
  const need = Math.min(OPTION_COUNT - 1, list.length - 1);
  const gapOf = (m) => Math.abs(list.indexOf(m) - pos);
  const neighbours = list.filter((m) => gapOf(m) === 1);
  const others = [rng.pick(neighbours)];
  for (const id of opts.include || []) {
    const m = index.movement(id);
    if (m && m !== correct && !others.includes(m) && others.length < need) others.push(m);
  }
  const rest = rng.shuffle(list.filter((m) => m !== correct && !others.includes(m)));
  const near = clamp(difficulty, 0, 1) >= MOVEMENT_NEAR_FROM;
  const pool = near ? rest.filter((m) => gapOf(m) <= MOVEMENT_MAX_GAP) : rest;
  const fallback = rest.filter((m) => !pool.includes(m)).sort((a, b) => gapOf(a) - gapOf(b));
  others.push(...[...pool, ...fallback].slice(0, need - others.length));
  const options = rng.shuffle([correct, ...others]).map((m) => ({ id: m.id, label: m.name }));
  return {
    type: 'movement',
    prompt: '¿De qué movimiento es?',
    artworkId: artwork.id,
    artistId: artist.id,
    options,
    answerId: correct.id,
    isNew: artwork.role === 'new',
  };
}

// "¿Cuál de estos es de X?": cuatro miniaturas, solo una del pintor. Las obras que delatan al autor
// (spoiler) no salen nunca en una pregunta, ni como opción correcta ni como relleno.
// opts.includeWorks: obras de relleno obligatorias (de otros pintores; p. ej. una del pintor de la
// etapa cuando se pregunta por uno anterior). opts.include: pintores de relleno obligatorios.
export function makeWhichQuestion(index, artwork, difficulty, rng, avoidArtworkIds = [], opts = {}) {
  if (noAuthorQuestion(artwork)) return null;
  const artist = index.artist(artwork.artistId);
  const avoid = new Set(avoidArtworkIds);
  const fixed = (opts.includeWorks || [])
    .map((id) => index.artwork(id))
    .filter((w) => w && w.artistId !== artist.id && !noAuthorQuestion(w))
    .filter((w, i, list) => list.findIndex((x) => x.artistId === w.artistId) === i)
    .slice(0, OPTION_COUNT - 1);
  const free = (a) => index.worksOf(a.id).filter((w) => !noAuthorQuestion(w) && !avoid.has(w.id));
  // Pintores sin obras libres (todas en la ronda o con firma) no sirven de relleno.
  const spent = index.artists.filter((a) => !free(a).length).map((a) => a.id);
  const exclude = [...spent, ...fixed.map((w) => w.artistId), ...(opts.exclude || [])];
  const distractors = pickDistractorArtists(index, artist, OPTION_COUNT - 1 - fixed.length, difficulty, rng, exclude,
    (opts.include || []).filter((id) => !exclude.includes(id)));
  const works = fixed.slice();
  for (const a of distractors) works.push(rng.pick(free(a)));
  if (works.length < OPTION_COUNT - 1) return null;
  const options = rng.shuffle([artwork, ...works]).map((w) => ({ id: w.id, artworkId: w.id, label: '' }));
  return {
    type: 'which',
    prompt: `¿Cuál es de ${artist.short || artist.name}?`,
    artworkId: null,
    artistId: artist.id,
    targetArtworkId: artwork.id,
    options,
    answerId: artwork.id,
    isNew: artwork.role === 'new',
  };
}

// Pregunta del tipo pedido; si no es posible (catálogo pequeño), prueba los otros tipos en orden
// fijo. null si ninguno sirve (también si la obra delata al autor: esas no se preguntan).
// opts.avoid: obras que no deben salir como miniaturas de relleno en «¿Cuál es de X?».
// opts.include / includeWorks / includeMovements: distractores obligatorios (ver cada tipo).
export function makeQuestion(type, index, artwork, difficulty, rng, opts = {}) {
  if (isSpoiler(artwork)) return null;
  const order = [type, ...['who', 'movement', 'which'].filter((t) => t !== type)];
  for (const t of order) {
    let q = null;
    if (t === 'who') q = makeWhoQuestion(index, artwork, difficulty, rng, { include: opts.include, exclude: opts.exclude });
    if (t === 'movement') q = makeMovementQuestion(index, artwork, difficulty, rng, { include: opts.includeMovements });
    if (t === 'which') q = makeWhichQuestion(index, artwork, difficulty, rng, opts.avoid || [], { include: opts.include, includeWorks: opts.includeWorks, exclude: opts.exclude });
    if (q) return q;
  }
  return null;
}

// Reintento al final de la ronda de un cuadro fallado: la misma obra con otra mecánica («¿Quién lo
// pintó?» ↔ «¿Cuál es de X?»), para que no baste con recordar la posición de la respuesta. Las de
// movimiento (y si la otra mecánica no es posible) solo barajan las opciones.
export const RETRY_DIFFICULTY = 0.4;
export function retryQuestion(index, q, rng) {
  const shuffled = { ...q, options: rng.shuffle(q.options) };
  if (q.type === 'movement') return shuffled;
  const work = index.artwork(q.type === 'which' ? q.targetArtworkId : q.artworkId);
  if (!work) return shuffled;
  const other = q.type === 'who'
    ? makeWhichQuestion(index, work, RETRY_DIFFICULTY, rng, [])
    : makeWhoQuestion(index, work, RETRY_DIFFICULTY, rng);
  return other ? { ...other, isNew: q.isNew, phase: q.phase } : shuffled;
}

// Artworks que aparecen en pantalla en una pregunta (para precarga y fallos de imagen).
export function artworksInQuestion(q) {
  if (q.type === 'which') return q.options.map((o) => o.artworkId);
  return [q.artworkId];
}

export function isCorrect(q, optionId) {
  return q.answerId === optionId;
}

// Texto de una opción de respuesta: la etiqueta y, en «¿De qué movimiento es?», el periodo del
// movimiento como detalle («Renacimiento» · «s. XV–XVI»). En las demás, sin detalle.
export function optionText(index, q, option) {
  const label = String(option?.label || '');
  if (q?.type !== 'movement') return { label, detail: '' };
  const m = index.movement(option.id);
  return { label, detail: m && typeof m.period === 'string' ? m.period : '' };
}

// Texto alternativo neutro: nunca revela autor ni título en las preguntas.
export function questionAlt(q, position = 0) {
  if (q.type === 'which') return `Opción ${position + 1}`;
  return 'Cuadro para identificar';
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}
