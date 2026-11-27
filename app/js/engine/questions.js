// Generación de preguntas de los tres tipos (§1) con distractores por parecido.
// Puro: recibe el índice del catálogo y un RNG con semilla.

import { isSpoiler, noAuthorQuestion, RELAX_STEPS, RELAX_MAX, MOVEMENT_HARD_GAP, ODD_TRIES, isOddOne } from './catalog.js';

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
// opts.work: la obra por la que se pregunta (da la familia y el año de referencia; si no, los del pintor).
export function pickDistractorArtists(index, target, count, difficulty, rng, exclude = [], include = [], opts = {}) {
  const banned = new Set([target.id, ...exclude]);
  const ref = opts.work ? index.refOfWork(opts.work) : index.refOfArtist(target);
  const eligible = eligibleArtists(index, ref, banned, count);
  const usedNames = new Set([target.name]);
  const forced = [];
  for (const id of include) {
    const a = typeof id === 'string' ? index.artist(id) : id;
    if (!a || banned.has(a.id) || !index.relation(ref, a, RELAX_MAX) || usedNames.has(a.name) || !index.worksOf(a.id).length || forced.length >= count) continue;
    forced.push(a);
    banned.add(a.id);
    usedNames.add(a.name);
  }
  const groups = [[], [], [], []];
  for (const a of index.artists) {
    if (banned.has(a.id) || !eligible.has(a.id) || !index.worksOf(a.id).length) continue;
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

// Pintores que pueden hacer de falsa: los de la familia de la buena dentro del tope de años; si no
// llegan, los de las familias cercanas y, al final, un tope más holgado (nunca otra familia ni mezcla de
// antiguos con modernos). Sin familias en el catálogo, todos.
function eligibleArtists(index, ref, banned, count) {
  const pool = index.artists.filter((a) => !banned.has(a.id) && index.worksOf(a.id).length);
  let ids = new Set(pool.map((a) => a.id));
  if (!ref) return ids;
  for (const relax of RELAX_STEPS) {
    const rel = pool.map((a) => [a, index.relation(ref, a, relax)]).filter(([, r]) => r);
    const strict = rel.filter(([, r]) => r === 'strict');
    const picked = strict.length >= count ? strict : rel;
    ids = new Set(picked.map(([a]) => a.id));
    if (new Set(picked.map(([a]) => a.name)).size >= count) break;
  }
  return ids;
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
  const pick = () => (opts.preferred && opts.preferred.length
    ? preferredDistractors(index, artist, opts.preferred, difficulty, rng, artwork)
    : pickDistractorArtists(index, artist, OPTION_COUNT - 1, difficulty, rng, opts.exclude || [], opts.include || [], { work: artwork }));
  let distractors = pick();
  for (let i = 1; i < ODD_TRIES && !(opts.preferred && opts.preferred.length) && isOddOne([artist, ...distractors].map((a) => index.refOfArtist(a)), 0); i++) distractors = pick();
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

function preferredDistractors(index, artist, preferred, difficulty, rng, work) {
  if (!preferred || !preferred.length) return pickDistractorArtists(index, artist, OPTION_COUNT - 1, difficulty, rng, [], [], { work });
  const ref = index.refOfWork(work);
  preferred = preferred.filter((a) => index.relation(ref, a, RELAX_MAX));
  const names = new Set([artist.name]);
  const chosen = [];
  for (const a of preferred) {
    if (chosen.length >= OPTION_COUNT - 1) break;
    if (a.id === artist.id || names.has(a.name) || !index.worksOf(a.id).length) continue;
    names.add(a.name);
    chosen.push(a);
  }
  if (chosen.length < OPTION_COUNT - 1) {
    const rest = pickDistractorArtists(index, artist, OPTION_COUNT - 1 - chosen.length, difficulty, rng, chosen.map((a) => a.id), [], { work })
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
  const artist = index.artist(artwork.artistId);
  const correct = index.movement(artist.movementId);
  // Las ramas-movimiento (gótico, ukiyo-e) solo salen como opción cuando son la respuesta.
  // Solo salen movimientos de la familia de la obra y compatibles con su época.
  const ref = index.refOfWork(artwork);
  const list = index.movements.filter((m) => (!m.branch || m === correct) && (m === correct || (index.movementAllowed(ref, m) && (!ref || Math.abs(m.order - correct.order) <= MOVEMENT_HARD_GAP))));
  if (list.length < 3 || isSpoiler(artwork) || (ref && correct.family && !index.movementAllowed(ref, correct))) return null;
  const pos = list.indexOf(correct);
  const need = Math.min(OPTION_COUNT - 1, list.length - 1);
  const gapOf = (m) => Math.abs(list.indexOf(m) - pos);
  const neighbours = list.filter((m) => gapOf(m) === 1);
  // Posición (0-3, de la más antigua a la más reciente) que ocupará la buena entre las opciones; el vecino
  // contiguo obligatorio se toma del lado que deje sitio a esa posición.
  const target = rng.int(OPTION_COUNT);
  const side = neighbours.filter((m) => (target === 0 ? list.indexOf(m) > pos : target === OPTION_COUNT - 1 ? list.indexOf(m) < pos : true));
  const others = [rng.pick(side.length ? side : neighbours)];
  for (const id of opts.include || []) {
    const m = index.movement(id);
    if (m && list.includes(m) && m !== correct && !others.includes(m) && others.length < need) others.push(m);
  }
  const rest = rng.shuffle(list.filter((m) => m !== correct && !others.includes(m)));
  const near = clamp(difficulty, 0, 1) >= MOVEMENT_NEAR_FROM;
  const pool = near ? rest.filter((m) => gapOf(m) <= MOVEMENT_MAX_GAP) : rest;
  const fallback = rest.filter((m) => !pool.includes(m)).sort((a, b) => gapOf(a) - gapOf(b));
  // Las opciones van en orden cronológico. Para que la buena no caiga casi siempre en el centro (los
  // distractores suelen ser épocas vecinas), se sortea la posición que ocupará y se eligen los distractores
  // por arriba y por abajo en consecuencia (lo que permitan los extremos de la línea del tiempo).
  const ordered = [...pool, ...fallback];
  const earlier = ordered.filter((m) => list.indexOf(m) < pos);
  const later = ordered.filter((m) => list.indexOf(m) > pos);
  const slots = need - others.length;
  const placedBefore = others.filter((m) => list.indexOf(m) < pos).length;
  let nBefore = Math.min(earlier.length, clamp(target - placedBefore, 0, slots));
  let nAfter = Math.min(later.length, slots - nBefore);
  nBefore = Math.min(earlier.length, slots - nAfter);
  others.push(...earlier.slice(0, nBefore), ...later.slice(0, nAfter));
  const options = [correct, ...others].sort((x, y) => list.indexOf(x) - list.indexOf(y)).map((m) => ({ id: m.id, label: m.name }));
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
  const ref = index.refOfWork(artwork);
  const fits = (w) => index.workRelation(ref, w, RELAX_MAX);
  const fixed = (opts.includeWorks || [])
    .map((id) => index.artwork(id))
    .filter((w) => w && w.artistId !== artist.id && !noAuthorQuestion(w) && fits(w))
    .filter((w, i, list) => list.findIndex((x) => x.artistId === w.artistId) === i)
    .slice(0, OPTION_COUNT - 1);
  const free = (a) => index.worksOf(a.id).filter((w) => !noAuthorQuestion(w) && !avoid.has(w.id) && fits(w));
  // Pintores sin obras libres (todas en la ronda o con firma) no sirven de relleno.
  const spent = index.artists.filter((a) => !free(a).length).map((a) => a.id);
  const exclude = [...spent, ...fixed.map((w) => w.artistId), ...(opts.exclude || [])];
  const pick = () => {
    const distractors = pickDistractorArtists(index, artist, OPTION_COUNT - 1 - fixed.length, difficulty, rng, exclude,
      (opts.include || []).filter((id) => !exclude.includes(id)), { work: artwork });
    return [...fixed, ...distractors.map((a) => rng.pick(free(a)))];
  };
  let works = pick();
  for (let i = 1; i < ODD_TRIES && isOddOne([artwork, ...works].map((w) => index.refOfWork(w)), 0); i++) works = pick();
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
// movimiento no cambian (opciones en orden cronológico) y, si la otra mecánica no es posible, se barajan.
export const RETRY_DIFFICULTY = 0.4;
export function retryQuestion(index, q, rng) {
  // Las de movimiento mantienen el orden cronológico (solo las otras barajan sus opciones); «¿Quién fue antes?» vuelve igual.
  if (q.type === 'movement' || q.type === 'before') return { ...q };
  const shuffled = { ...q, options: rng.shuffle(q.options) };
  const work = index.artwork(q.type === 'which' ? q.targetArtworkId : q.artworkId);
  if (!work) return shuffled;
  const other = q.type === 'who'
    ? makeWhichQuestion(index, work, RETRY_DIFFICULTY, rng, [])
    : makeWhoQuestion(index, work, RETRY_DIFFICULTY, rng);
  return other ? { ...other, isNew: q.isNew, phase: q.phase } : shuffled;
}

// Artworks que aparecen en pantalla en una pregunta (para precarga y fallos de imagen).
export function artworksInQuestion(q) {
  if (q.type === 'which' || q.type === 'before') return q.options.map((o) => o.artworkId);
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
