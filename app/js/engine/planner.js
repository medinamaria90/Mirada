// Planificación de rondas: etapa de pintor, repaso de movimiento, repaso espaciado
// y ronda general. Todo determinista a partir de una semilla.

import { createRng } from './rng.js';
import { makeQuestion, makeWhoQuestion, makeMovementQuestion, isSpoiler, noAuthorQuestion } from './questions.js';
import { salaLearnWorks, SALA_LEARN } from './catalog.js';

export { salaLearnWorks, SALA_LEARN };

export const MIN_ROUND = 6; // preguntas mínimas de una etapa (salvo la primera: FIRST_STAGE_ROUND)
export const STAGE_ROUND = 8; // preguntas de una etapa (propias + repaso)
export const FIRST_STAGE_ROUND = 5; // primera etapa: calentamiento + 4 obras no vistas, sin repetir
export const ROUND_SIZE = 10;

// Curva de dificultad del camino: 0,05 en la primera parada → 0,75 en la última, lineal por
// parada (pintores y salas). Dentro de cada ronda sube ROUND_SPAN de forma continua.
export const CURVE_START = 0.05;
export const CURVE_END = 0.75;
export const ROUND_SPAN = 0.1;

export function stepDifficulty(index, type, id) {
  const i = index.stepIndex(type, id);
  const n = Math.max(1, index.steps.length - 1);
  return CURVE_START + (CURVE_END - CURVE_START) * (Math.max(0, i) / n);
}

export function baseDifficulty(index, artistId) {
  return stepDifficulty(index, 'artist', artistId);
}

function rampAt(base, i, n) {
  return base + ROUND_SPAN * (n <= 1 ? 0 : i / (n - 1));
}

// Etapa de un pintor. Para que no se pueda «dominar» sin mirar el cuadro:
//  · Las preguntas «¿Quién lo pintó?» se reparten: al menos la mitad tienen como respuesta a un
//    pintor ya aprendido (repaso intercalado) y en ellas el pintor de la etapa sale de distractor;
//    en las del pintor de la etapa sale de distractor un pintor ya aprendido y el resto son pintores
//    aún no aprendidos (así no se acierta por descarte sin haber estudiado al de la etapa).
//  · «¿Cuál es de X?» del pintor de la etapa: el relleno es de pintores aún no aprendidos (y como
//    mucho uno aprendido). Una de un pintor anterior lleva una obra del de la etapa de relleno.
//  · «¿De qué movimiento es?»: la respuesta varía entre los movimientos ya vistos (a veces el de
//    la etapa, con una obra de un pintor ya aprendido de ese movimiento o del propio); el de la
//    etapa y el anterior más cercano salen siempre entre las opciones.
//  · En la primera etapa (nadie antes) casi todo es «¿Cuál es de X?» con obras del pintor.
// Una obra por pregunta, sin repetir; la dificultad sube en rampa continua.
export const OWN_MAX = 3; // preguntas sobre obras del pintor: calentamiento + OWN_FRESH no vistas
export const OWN_FRESH = 2; // obras no vistas del pintor por ronda (salvo en la primera etapa)
export const FIRST_STAGE_WHO = 1; // «¿Quién lo pintó?» en la primera etapa (la respuesta es siempre el pintor)
// Probabilidad de que la de movimiento tenga como respuesta el movimiento de la etapa.
export const MOVEMENT_CURRENT_SHARE = 0.34;

export function planStage(index, artistId, seed) {
  const artist = index.artist(artistId);
  if (!artist) return null;
  const rng = createRng(`stage:${artistId}:${seed}`);
  const base = baseDifficulty(index, artistId);
  const learn = index.learnWorks(artistId).slice().sort((a, b) => b.fame - a.fame);
  const before = index.path.slice(0, Math.max(0, index.pathIndex(artistId)));
  const slots = before.length
    ? stageSlots(index, artist, learn, before, rng)
    : firstStageSlots(index, artist, learn, rng);
  const avoid = slots.map((s) => s.work.id).concat(slots.flatMap((s) => s.includeWorks || []));
  // Fase de cada pregunta: «practice» si el cuadro se enseña en «Conoce a» de su pintor y «fresh» si
  // no. Las dos van mezcladas en la ronda (sin pantalla intermedia).
  const questions = buildSlots(index, slots, base, rng, avoid)
    .map((q) => ({ ...q, phase: index.artwork(subjectOf(q))?.role === 'learn' ? 'practice' : 'fresh' }));
  const practice = questions.filter((q) => q.phase === 'practice');
  const fresh = questions.filter((q) => q.phase === 'fresh');
  return { kind: 'stage', artistId, seed, learn, practice, fresh, questions };
}

export function subjectOf(q) {
  return q.type === 'which' ? q.targetArtworkId : q.artworkId;
}

const clean = (works) => works.filter((w) => !noAuthorQuestion(w));

// Tipos alternos empezando al azar: la mitad (redondeo al azar) de cada tipo.
function alternate(n, rng, a = 'who', b = 'which') {
  const first = rng.next() < 0.5 ? a : b;
  const second = first === a ? b : a;
  return Array.from({ length: n }, (_, i) => (i % 2 ? second : first));
}

// Obras del pintor que se preguntan en su etapa. «Conoce a» acaba de enseñar sus obras `learn`:
// solo la primera (la más conocida) vuelve como calentamiento; el resto de preguntas propias son
// obras que no se han enseñado (hasta `fresh`). Nunca se vuelve a preguntar otra obra recién vista:
// si faltan, la ronda se completa con repaso de pintores anteriores.
// `reserve`: una obra suya que no se pregunta, para el relleno de un «¿Cuál es de X?» de repaso.
export function pickOwnWorks(index, artistId, learn, rng, fresh = OWN_FRESH) {
  const ownLearn = clean(learn);
  const ownNew = rng.shuffle(clean(index.newWorks(artistId)));
  const warm = ownLearn.slice(0, 1);
  const freshWorks = ownNew.slice(0, warm.length ? fresh : fresh + 1);
  // De relleno, mejor una vista: así las no vistas que sobren pueden salir en «¿De qué movimiento es?».
  const reserve = ownLearn[1] || ownNew[freshWorks.length] || null;
  return { warm, fresh: freshWorks, reserve };
}

// Obras propias sobrantes para «¿De qué movimiento es?»: mejor las que no se han enseñado.
function spareWorks(works) {
  const unseen = works.filter((w) => w.role !== 'learn');
  return unseen.length ? unseen : works;
}

// Mezcla dos listas alternando (a, b, a, b…) y añade lo que sobre de la más larga.
function interleave(a, b) {
  const out = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i]) out.push(a[i]);
    if (b[i]) out.push(b[i]);
  }
  return out;
}

// Tamaño de la ronda: STAGE_ROUND; con un solo pintor aprendido antes (sus obras se acaban y casi
// todas salieron en su ronda como no vistas), una menos.
function stageRoundSize(before) {
  return before.length < 2 ? STAGE_ROUND - 1 : STAGE_ROUND;
}

function stageSlots(index, artist, learn, before, rng) {
  const { warm, fresh: ownFresh, reserve } = pickOwnWorks(index, artist.id, learn, rng);
  // Calentamiento (obra vista) primero; luego sus obras no vistas.
  const ownWorks = [...warm, ...ownFresh].map((w) => ({ w, phase: w.role === 'learn' ? 'practice' : 'fresh' }));
  const ownTypes = alternate(ownWorks.length, rng);
  // Con solo 2 obras suyas, la ya vista va en «¿Cuál es de X?» (relleno sin aprender: por descarte,
  // 1 de cada 4) y la nueva en «¿Quién?». La regla de dominio perdona un fallo si se acierta esa
  // (progress.ownRoundMastered).
  if (ownWorks.length === 2) {
    const anchor = Math.max(0, ownWorks.findIndex((o) => o.phase === 'practice'));
    ownWorks.forEach((_, i) => { ownTypes[i] = i === anchor ? 'which' : 'who'; });
  }
  // Con un solo pintor aprendido antes, todas las «¿Quién?» llevarían a los dos: solo una propia
  // (la segunda), para que elegir siempre la opción más repetida no baste.
  if (before.length < 2 && ownWorks.length === 3) ownWorks.forEach((_, i) => { ownTypes[i] = i === 1 ? 'who' : 'which'; });
  const ownWho = ownTypes.filter((t) => t === 'who').length;

  // Pintores ya aprendidos: primero los recientes (más parecidos), luego el resto.
  const recent = rng.shuffle(before.slice(-4));
  const older = rng.shuffle(before.slice(0, -4));
  const helpers = [...recent, ...older];
  const used = new Set([...index.worksOf(artist.id).map((w) => w.id)]);
  let cursor = 0;
  const pickWork = (prefer, filter = () => true) => {
    for (let tries = 0; tries < helpers.length; tries++) {
      const a = helpers[cursor++ % helpers.length];
      if (!filter(a)) continue;
      const pool = clean(index.worksOf(a.id)).filter((w) => !used.has(w.id));
      const pref = pool.filter((w) => w.role === prefer);
      const w = pref.length ? rng.pick(pref) : pool.length ? rng.pick(pool) : null;
      if (w) { used.add(w.id); return w; }
    }
    return null;
  };

  // Repaso: tantas «¿Quién lo pintó?» como las del pintor (mínimo 2), una de movimiento si hay un
  // movimiento anterior distinto y «¿Cuál es de X?» de pintores anteriores (una o las que falten
  // para llegar al tamaño de la ronda).
  const review = [];
  const reviewWho = Math.max(2, ownWho);
  const phaseAt = (i) => (i % 2 ? 'fresh' : 'practice');
  for (let i = 0; i < reviewWho; i++) {
    const w = pickWork(phaseAt(i) === 'practice' ? 'learn' : 'new');
    // Con el de la etapa y otro pintor ya aprendido de distractores: elegir siempre al aprendido
    // (o al más reciente) no basta.
    const mates = before.filter((a) => a.id !== w?.artistId);
    if (w) review.push({ work: w, type: 'who', phase: phaseAt(i), include: [artist.id, ...(mates.length ? [rng.pick(mates).id] : [])] });
  }
  const movementSlot = movementReviewSlot(index, artist, before, rng, pickWork, {
    spare: spareWorks(index.worksOf(artist.id).filter((w) => !isSpoiler(w) && w !== reserve && !ownWorks.some((o) => o.w === w))),
  });
  const reviewWhich = Math.max(1, stageRoundSize(before) - ownWorks.length - review.length - (movementSlot ? 1 : 0));
  for (let i = 0; i < reviewWhich; i++) {
    const whichWork = pickWork('learn');
    if (!whichWork) break;
    review.push({ work: whichWork, type: 'which', phase: 'practice', include: [], includeWorks: i === 0 && reserve ? [reserve.id] : [] });
  }
  if (movementSlot) review.push(movementSlot);

  // En las preguntas del pintor: «¿Quién?» con un pintor ya aprendido (el más reciente que pueda)
  // y el resto aún no aprendidos; «¿Cuál?» con relleno de pintores aún no aprendidos.
  const recentFirst = before.slice().reverse();
  const learnedIds = before.map((a) => a.id);
  const own = ownWorks.map(({ w, phase }, i) => {
    if (ownTypes[i] !== 'who') return { work: w, type: 'which', phase, include: [], exclude: learnedIds };
    const helper = recentFirst[i % Math.min(2, recentFirst.length)].id;
    return { work: w, type: 'who', phase, include: [helper], exclude: learnedIds.filter((id) => id !== helper) };
  });

  // Orden: el calentamiento y, después, repaso y obras suyas alternos (el repaso de obras vistas
  // antes que el de obras nuevas).
  const [first, ...ownRest] = own;
  const reviewOrdered = [...review.filter((r) => r.phase === 'practice'), ...rng.shuffle(review.filter((r) => r.phase !== 'practice'))];
  return [first, ...interleave(reviewOrdered, ownRest)].filter(Boolean);
}

// «¿De qué movimiento es?» de repaso. La respuesta se reparte entre los movimientos ya vistos
// (uniforme entre los anteriores) y, con MOVEMENT_CURRENT_SHARE, el de la etapa (obra de un pintor
// ya aprendido de ese movimiento o, si no hay, una obra del propio que no se pregunta en la ronda).
// Solo si hay algún movimiento anterior ya visto (si no, la respuesta sería siempre la de la etapa).
function prevMovementIds(index, artist, before) {
  const orderOf = (a) => index.movement(a.movementId)?.order ?? 0;
  const own = orderOf(artist);
  return [...new Set(before.filter((a) => orderOf(a) < own).map((a) => a.movementId))];
}

function movementReviewSlot(index, artist, before, rng, pickWork, { spare = [] } = {}) {
  const prevMovs = prevMovementIds(index, artist, before);
  if (!prevMovs.length) return null;
  const nearest = prevMovs.slice().sort((a, b) => index.movement(b).order - index.movement(a).order)[0];
  const peers = before.filter((a) => a.movementId === artist.movementId);
  const canCurrent = peers.length > 0 || spare.length > 0;
  // Con una sola respuesta posible, la pregunta se acertaría sin mirar: no se hace.
  if (prevMovs.length + (canCurrent ? 1 : 0) < 2) return null;
  let work = null;
  if (canCurrent && rng.next() < MOVEMENT_CURRENT_SHARE) {
    work = peers.length ? pickWork('new', (a) => a.movementId === artist.movementId) : null;
    if (!work && spare.length) work = rng.pick(spare);
  }
  if (!work) {
    const target = rng.pick(prevMovs);
    work = pickWork('new', (a) => a.movementId === target) || pickWork('new', (a) => prevMovs.includes(a.movementId));
  }
  if (!work) return null;
  const correct = index.artist(work.artistId).movementId;
  const includeMovements = [artist.movementId, nearest].filter((id) => id !== correct);
  return { work, type: 'movement', phase: 'fresh', includeMovements };
}

// Primera etapa: no hay nadie aprendido antes. «¿Quién lo pintó?» siempre tendría la misma
// respuesta (no prueba nada y no cuenta para dominar: progress.firstStageOwnMastered), así que casi
// todo es «¿Cuál es de X?» (sus obras entre otras muy distintas) y solo FIRST_STAGE_WHO «¿Quién?»,
// nunca la primera ni la última. Calentamiento con su obra más conocida y, después, solo obras no
// vistas (FIRST_STAGE_ROUND − 1). Solo en catálogos pequeños, si no llegan, se recurre a las otras
// vistas y, como último recurso, se repiten obras con otras miniaturas.
function firstStageSlots(index, artist, learn, rng) {
  const ownLearn = clean(learn);
  const ownNew = rng.shuffle(clean(index.newWorks(artist.id)));
  const freshCount = FIRST_STAGE_ROUND - Math.min(1, ownLearn.length);
  const works = [...ownLearn.slice(0, 1), ...ownNew.slice(0, freshCount)];
  for (const w of ownLearn.slice(1)) if (works.length < FIRST_STAGE_ROUND) works.push(w);
  // Un relleno del mismo movimiento (mejor un invitado) para que no se acierte solo por la época.
  const peers = index.artistsOf(artist.movementId).filter((a) => a.id !== artist.id && clean(index.worksOf(a.id)).length);
  const guests = peers.filter((a) => index.pathIndex(a.id) < 0);
  const peerPool = guests.length ? guests : peers;
  const include = () => (peerPool.length ? [rng.pick(peerPool).id] : []);
  const unseenAt = works.map((w, i) => (i > 0 && w.role !== 'learn' ? i : -1)).filter((i) => i > 0);
  const whoChoices = unseenAt.length > 1 ? unseenAt.slice(0, -1) : unseenAt;
  const whoAt = FIRST_STAGE_WHO > 0 && whoChoices.length ? rng.pick(whoChoices) : -1;
  const slots = works.map((w, i) => ({ work: w, phase: w.role === 'learn' ? 'practice' : 'fresh', type: i === whoAt ? 'who' : 'which', include: include() }));
  // Catálogos muy pequeños: se repiten obras (primero las no vistas) con otras miniaturas.
  const again = [...ownNew, ...ownLearn.slice(1), ...ownLearn.slice(0, 1)];
  for (let k = 0; slots.length < FIRST_STAGE_ROUND && again.length && k < FIRST_STAGE_ROUND; k++) {
    const w = again[k % again.length];
    slots.push({ work: w, phase: w.role === 'learn' ? 'practice' : 'fresh', type: 'which', include: include() });
  }
  return slots;
}

// Genera las preguntas de una lista de huecos con la dificultad en rampa continua. Las miniaturas
// de relleno de «¿Cuál es de X?» no repiten obras de la ronda ni entre sí.
function buildSlots(index, slots, base, rng, avoidIds = []) {
  const avoid = new Set(avoidIds);
  const out = [];
  slots.forEach((s, i) => {
    for (const id of s.includeWorks || []) avoid.delete(id);
    const d = rampAt(base, i, slots.length);
    const opts = { avoid: [...avoid], include: s.include, exclude: s.exclude, includeWorks: s.includeWorks, includeMovements: s.includeMovements };
    let q = makeQuestion(s.type, index, s.work, d, rng, opts);
    // Catálogos pequeños: si no hay bastantes pintores aún no aprendidos, se admite cualquiera.
    if (s.exclude && (!q || q.type !== s.type)) q = makeQuestion(s.type, index, s.work, d, rng, { ...opts, exclude: [] });
    for (const id of s.includeWorks || []) avoid.add(id);
    if (!q) return;
    if (q.type === 'which') q.options.forEach((o) => avoid.add(o.artworkId));
    out.push(tag(q, s.phase));
  });
  return out;
}

// Sala de un movimiento sin pintores con etapa: conocer el movimiento (3-4 obras de invitados
// distintos) → preguntas sobre esas obras → obras no vistas. Tipos: «¿De qué movimiento es?» y
// «¿Quién lo pintó?» entre los invitados con al menos 2 obras.
export const SALA_FRESH = 5;
export const SALA_CONTRAST = 2;

// Obras (sin firma) de pintores con etapa de movimientos anteriores, una por pintor distinto y, en
// lo posible, de movimientos distintos elegidos al azar (si fuera siempre el anterior más cercano,
// se acertaría sin mirar).
function contrastWorks(index, movementId, n, rng) {
  const order = index.movement(movementId)?.order ?? 0;
  const orderOf = (a) => index.movement(a.movementId)?.order ?? 0;
  const artists = rng.shuffle(index.path.filter((a) => orderOf(a) < order));
  const out = [];
  const movs = new Set();
  for (const pass of [0, 1]) {
    for (const a of artists) {
      if (out.length >= n) break;
      if (out.some((w) => w.artistId === a.id) || (pass === 0 && movs.has(a.movementId))) continue;
      const pool = index.worksOf(a.id).filter((w) => !isSpoiler(w));
      if (!pool.length) continue;
      out.push(rng.pick(pool));
      movs.add(a.movementId);
    }
  }
  return out;
}

export function planSala(index, movementId, seed) {
  const movement = index.movement(movementId);
  if (!movement || !index.isSala(movementId)) return null;
  const rng = createRng(`sala:${movementId}:${seed}`);
  const learn = salaLearnWorks(index, movementId);
  const seen = new Set(learn.map((w) => w.id));
  const leads = index.salaArtists(movementId);
  const leadIds = new Set(leads.map((a) => a.id));
  const guests = index.artistsOf(movementId).filter((a) => index.worksOf(a.id).length);
  const others = guests.filter((a) => !leadIds.has(a.id));
  const preferred = () => [...rng.shuffle(leads), ...rng.shuffle(others)];
  const canWho = (w) => leadIds.has(w.artistId) && !noAuthorQuestion(w);

  const base = stepDifficulty(index, 'sala', movementId);
  const make = (w, wantWho, i, total) => {
    const d = rampAt(base, i, Math.max(2, total));
    let q = wantWho && canWho(w) ? makeWhoQuestion(index, w, d, rng, { preferred: preferred() }) : null;
    if (!q) q = makeMovementQuestion(index, w, d, rng);
    if (!q && canWho(w)) q = makeWhoQuestion(index, w, d, rng, { preferred: preferred() });
    return q ? { ...q, isNew: !seen.has(w.id) } : null;
  };

  const practice = rng.shuffle(learn)
    .map((w, i) => tag(make(w, i % 2 === 1, i, learn.length), 'practice'))
    .filter(Boolean);
  // Obras no vistas: primero las de los protagonistas (sirven para «¿Quién lo pintó?»).
  const rest = index.worksOfMovement(movementId).filter((w) => !seen.has(w.id));
  const whoPool = rng.shuffle(rest.filter(canWho));
  const otherPool = rng.shuffle(rest.filter((w) => !canWho(w)));
  // Contraste: obras de movimientos anteriores ya vistos con este movimiento entre las opciones,
  // para que «¿De qué movimiento es?» no tenga siempre la misma respuesta.
  const contrast = contrastWorks(index, movementId, SALA_CONTRAST, rng);
  const ownFresh = SALA_FRESH - contrast.length;
  const freshWorks = spreadByArtist([...whoPool.slice(0, 3), ...otherPool, ...whoPool.slice(3)].slice(0, ownFresh), ownFresh, rng, false);
  const ownQs = freshWorks.map((w, i) => make(w, canWho(w) && i % 3 !== 2, i, SALA_FRESH)).filter(Boolean);
  const contrastQs = contrast
    .map((w, i) => makeMovementQuestion(index, w, rampAt(base, ownQs.length + i, SALA_FRESH), rng, { include: [movementId] }))
    .filter(Boolean)
    .map((q) => ({ ...q, isNew: false }));
  const fresh = rng.shuffle([...ownQs, ...contrastQs]).map((q) => tag(q, 'fresh'));
  return { kind: 'sala', movementId, seed, learn, practice, fresh, questions: [...practice, ...fresh] };
}

// Repaso de un movimiento: «¿Quién lo pintó?» y «¿Cuál es de X?» con obras de sus pintores y
// «¿De qué movimiento es?» con obras de movimientos anteriores (el repasado sale entre las opciones;
// preguntar siempre por él sería regalar el punto). En el primer movimiento no hay preguntas de movimiento.
export function planMovementReview(index, movementId, seed) {
  const movement = index.movement(movementId);
  if (!movement) return null;
  const rng = createRng(`review:${movementId}:${seed}`);
  const stage = index.stageArtists(movementId);
  const works = rng.shuffle(stage.flatMap((a) => index.worksOf(a.id)).filter((w) => !noAuthorQuestion(w)));
  const types = ['who', 'who', 'movement', 'which', 'who', 'movement', 'who', 'which', 'who', 'movement'];
  const contrast = contrastWorks(index, movementId, types.filter((t) => t === 'movement').length, rng);
  const ownTypes = types.map((t) => (t === 'movement' && !contrast.length ? 'which' : t));
  let k = 0;
  const plan = ownTypes.map((t) => (t === 'movement' ? (contrast[k++] ? { type: t, work: contrast[k - 1] } : { type: 'which' }) : { type: t }));
  const picked = spreadByArtist(works, plan.filter((p) => !p.work).length, rng);
  let j = 0;
  const avoid = new Set([...picked, ...contrast].map((w) => w.id));
  const questions = plan.map((p, i) => {
    const w = p.work || picked[j++];
    if (!w) return null;
    const q = makeQuestion(p.type, index, w, 0.75 + 0.2 * (i / ROUND_SIZE), rng, { avoid: [...avoid], includeMovements: [movementId] });
    if (q && q.type === 'which') q.options.forEach((o) => avoid.add(o.artworkId));
    return tag(q, 'review');
  });
  return { kind: 'review', movementId, seed, questions: questions.filter(Boolean) };
}

// Ronda de repaso espaciado con los elementos que tocan hoy (max: preguntas como mucho; el repaso
// rápido del inicio usa 3).
export const SRS_MAX = 8;
export { QUICK_REVIEW } from './srs.js';

export function planSrsReview(index, dueKeys, seed, max = SRS_MAX) {
  const rng = createRng(`srs:${seed}`);
  const works = [];
  const seen = new Set();
  for (const key of dueKeys) {
    const [kind, id] = String(key).split(':');
    let w = null;
    if (kind === 'art') w = index.artwork(id);
    if (kind === 'artist' && index.artist(id)) {
      const pool = index.worksOf(id).filter((x) => !noAuthorQuestion(x) && !seen.has(x.id));
      w = pool.length ? rng.pick(pool) : null;
    }
    if (w && !noAuthorQuestion(w) && !seen.has(w.id)) {
      seen.add(w.id);
      works.push(w);
    }
    if (works.length >= max) break;
  }
  const avoid = new Set(works.map((w) => w.id));
  const questions = rng.shuffle(works).map((w, i) => {
    const q = makeQuestion(i % 4 === 3 ? 'which' : 'who', index, w, 0.6, rng, { avoid: [...avoid] });
    if (q && q.type === 'which') q.options.forEach((o) => avoid.add(o.artworkId));
    return tag(q, 'srs');
  });
  return { kind: 'srs', seed, questions: questions.filter(Boolean) };
}

// Ronda general de 10 preguntas sobre un conjunto de obras (reto diario y retos).
// count: número de preguntas (10; el reto semanal usa 15). Los tipos siguen el mismo patrón.
export function planGeneral(index, works, seedText, difficulty = [0.25, 0.6], count = ROUND_SIZE) {
  const rng = createRng(seedText);
  const types = ['who', 'who', 'which', 'who', 'movement', 'who', 'which', 'who', 'movement', 'who'];
  const picked = spreadByArtist(rng.shuffle(works.filter((w) => !noAuthorQuestion(w))), count, rng, false);
  const [lo, hi] = difficulty;
  const avoid = new Set(picked.map((w) => w.id));
  return picked
    .map((w, i) => {
      const q = makeQuestion(types[i % types.length], index, w, lo + (hi - lo) * (i / count), rng, { avoid: [...avoid] });
      if (q && q.type === 'which') q.options.forEach((o) => avoid.add(o.artworkId));
      return tag(q, 'general');
    })
    .filter(Boolean);
}

// Ejecución de una ronda (pura): los fallos vuelven al final una vez.
export function createRound(questions) {
  return {
    queue: questions.map((q, i) => ({ q, base: i, retry: false })),
    pos: 0,
    baseCount: questions.length,
    firstTry: Array(questions.length).fill(null),
    combo: 0,
    bestCombo: 0,
  };
}

export function currentItem(round) {
  return round.queue[round.pos] || null;
}

export function answerRound(round, correct, reshuffle = (q) => q) {
  const item = currentItem(round);
  if (!item) return round;
  const queue = round.queue.slice();
  const firstTry = round.firstTry.slice();
  if (!item.retry) firstTry[item.base] = correct;
  if (!correct && !item.retry) queue.push({ q: reshuffle(item.q), base: item.base, retry: true });
  const combo = correct ? round.combo + 1 : 0;
  return { ...round, queue, firstTry, pos: round.pos + 1, combo, bestCombo: Math.max(round.bestCombo, combo) };
}

export function roundDone(round) {
  return round.pos >= round.queue.length;
}

export function roundProgress(round) {
  return round.queue.length ? round.pos / round.queue.length : 1;
}

export function roundScore(round) {
  return round.firstTry.filter((v) => v === true).length;
}

export function reshuffleOptions(q, rng) {
  return { ...q, options: rng.shuffle(q.options) };
}

function tag(q, phase) {
  return q ? { ...q, phase } : null;
}

// Elige `n` obras evitando repetir pintor de forma consecutiva.
function spreadByArtist(works, n, rng, repeat = true) {
  const out = [];
  const pool = works.slice();
  while (out.length < n && pool.length) {
    const last = out[out.length - 1]?.artistId;
    let i = pool.findIndex((w) => w.artistId !== last);
    if (i < 0) i = 0;
    out.push(pool.splice(i, 1)[0]);
  }
  // Si faltan obras, repite con otro orden.
  while (repeat && out.length < n && works.length) out.push(rng.pick(works));
  return out;
}
