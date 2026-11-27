// Planificación de rondas: etapa de pintor, repaso de movimiento, repaso espaciado
// y ronda general. Todo determinista a partir de una semilla.

import { createRng } from './rng.js';
import { makeQuestion, makeWhoQuestion, makeMovementQuestion, isSpoiler, noAuthorQuestion } from './questions.js';
import { salaLearnWorks, SALA_LEARN, levelOf, RELAX_MAX } from './catalog.js';
import { REVIEW5_SIZE } from './review.js';
import { withBeforeQuestion } from './question-before.js';

// Ejecución de una ronda (cola, reintentos y puntuación): engine/round.js.
export { createRound, currentItem, answerRound, roundDone, roundProgress, roundScore } from './round.js';

export { salaLearnWorks, SALA_LEARN };

export const MIN_ROUND = 6; // preguntas mínimas de una etapa (salvo la primera: FIRST_STAGE_ROUND)
export const STAGE_ROUND = 8; // preguntas de una etapa (propias + repaso)
export const FIRST_STAGE_ROUND = 4; // primera etapa: calentamiento + 3 obras no vistas, sin repetir, todo «¿Cuál es de X?»
export const ROUND_SIZE = 10;
// Catálogo grande (con niveles): ronda de 9 (8 con un solo pintor aprendido antes); «≥ 75 %» son 7 de 9.
export const STAGE_ROUND_LEVELS = 9;
// Obras no enseñadas que se preguntan en la ronda del pintor, además del calentamiento: primero las de nivel
// 1 que aún no ha visto, luego las de nivel 2 o más (ración de «a fondo») y, si no quedan, las ya vistas.
export const OWN_NEW = 3;
export const GUEST_SHARE = 0.35; // probabilidad de que una pregunta de repaso «nueva» sea de un invitado del camino
export const OWN_DEEP_MAX = 6; // preguntas propias de una ronda «a fondo» (todas las obras de su nivel)

// Curva de dificultad del camino: 0,05 en la primera parada → 0,75 en la última, lineal por
// parada (pintores y salas). Dentro de cada ronda sube ROUND_SPAN de forma continua.
export const CURVE_START = 0.05;
export const CURVE_END = 0.75;
export const ROUND_SPAN = 0.1;

export function stepDifficulty(index, type, id) {
  const i = type === 'artist' && index.stepIndex(type, id) < 0 ? index.difficultyStep(id) : index.stepIndex(type, id);
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
// Con menos pintores conocidos que estos, no hay «¿Quién lo pintó?» ni «¿De qué movimiento es?»: la
// respuesta sería siempre el mismo pintor (o movimiento) y no enseña nada. Solo «¿Cuál es de X?».
export const MIN_PAINTERS_FOR_OTHER_QUESTIONS = 2;

// Pintores que conoce el jugador en una ronda de etapa: los anteriores del camino más el de la etapa.
export function knownPainters(before, stageArtistId) {
  return new Set([...before.map((a) => a.id), stageArtistId]).size;
}

// ¿Valen «¿Quién?» y «¿De qué movimiento?» con `count` pintores conocidos?
export function allowsOtherQuestions(count) {
  return count >= MIN_PAINTERS_FOR_OTHER_QUESTIONS;
}
// Probabilidad de que la de movimiento tenga como respuesta el movimiento de la etapa.
export const MOVEMENT_CURRENT_SHARE = 0.34;

// Pintores anteriores que de verdad ya han salido: las preguntas por autor («¿Quién lo pintó?» con él de respuesta,
// «¿Cuál es de X?») y el repaso solo usan a estos. `met`: ids de los pintores conocidos (historia vista o nivel
// jugado); sin él, se dan por conocidos todos los anteriores.
export function metOnly(before, met) {
  if (!met) return before;
  const ids = new Set(met);
  return before.filter((a) => ids.has(a.id));
}

// opts.branchId: rama desde la que se juega (da el orden de los pintores anteriores). opts.met: ver metOnly.
// opts.review: obras de pintores anteriores que van, en ese orden, en las primeras preguntas de
// repaso (el cuadro de repaso elegido por antigüedad: engine/review.js). Sin cambiar nada más: mismo
// número de preguntas, mismos tipos y mismos distractores que cualquier otra ronda.
export function planStage(index, artistId, seed, opts = {}) {
  const artist = index.artist(artistId);
  if (!artist) return null;
  const rng = createRng(`stage:${artistId}:${seed}`);
  const base = baseDifficulty(index, artistId);
  const learn = index.learnWorks(artistId).slice().sort((a, b) => b.fame - a.fame);
  // Nivel 1 = «Conoce a» + ronda del pintor; 2..n = ronda «a fondo» de su etapa (todas sus obras).
  const level = Number.isInteger(opts.level) && opts.level >= 2 ? opts.level : 1;
  const seen = new Set(opts.seen || []);
  const before = metOnly(opts.before || (index.pathIndex(artistId) >= 0
    ? index.path.slice(0, index.pathIndex(artistId))
    : index.branchBefore(artistId, opts.branchId)), opts.met);
  const onlyWhich = !allowsOtherQuestions(knownPainters(before, artistId));
  const own = ownSelection(index, artist, learn, rng, { level, seen, first: onlyWhich });
  const planned = !onlyWhich
    ? stageSlots(index, artist, learn, before, rng, opts.review || [], own)
    : firstStageSlots(index, artist, learn, rng, own);
  // La historia (opts.shown) y «Conoce a» (nivel 1, salvo opts.learnShown === false: tras la historia no sale) acaban de
  // enseñar sus cuadros: la ronda no abre con uno de ellos.
  const learnShown = level === 1 && opts.learnShown !== false;
  const shown = new Set([...(opts.shown || []), ...(learnShown ? learn.map((w) => w.id) : [])]);
  const slots = freshFirst(planned, shown, artistId);
  const avoid = slots.map((s) => s.work.id).concat(slots.flatMap((s) => s.includeWorks || []));
  // Fase de cada pregunta: «practice» si el cuadro se enseña en «Conoce a» de su pintor y «fresh» si
  // no. Las dos van mezcladas en la ronda (sin pantalla intermedia).
  const built = buildSlots(index, slots, base, rng, avoid);
  const questions = (onlyWhich ? balanceAnswerPositions(built, rng) : built)
    .map((q) => ({ ...q, phase: index.artwork(subjectOf(q))?.role === 'learn' ? 'practice' : 'fresh' }));
  const practice = questions.filter((q) => q.phase === 'practice');
  const fresh = questions.filter((q) => q.phase === 'fresh');
  return { kind: 'stage', artistId, seed, ...(level > 1 ? { level } : {}), learn, practice, fresh, questions };
}

// Si la primera pregunta es de un cuadro recién enseñado, pasa delante la primera que no lo sea (mejor una del propio
// pintor); la recién enseñada queda segunda. Sin ninguna así, el orden no cambia.
export function freshFirst(slots, shown, artistId) {
  if (!slots.length || !shown.has(slots[0].work.id)) return slots;
  const ok = (s) => !shown.has(s.work.id);
  let k = slots.findIndex((s) => ok(s) && s.work.artistId === artistId);
  if (k < 0) k = slots.findIndex(ok);
  if (k < 0) return slots;
  return [slots[k], ...slots.slice(0, k), ...slots.slice(k + 1)];
}

// Solo «¿Cuál es de X?» (primera etapa): la respuesta ocupa cada posición una vez (en orden al azar),
// así elegir siempre la misma casilla no sirve de nada ni por mala suerte del sorteo.
function balanceAnswerPositions(questions, rng) {
  const order = rng.shuffle(Array.from({ length: Math.max(...questions.map((q) => q.options.length), 0) }, (_, i) => i));
  return questions.map((q, i) => {
    const at = order[i % order.length];
    if (at >= q.options.length) return q;
    const rest = q.options.filter((o) => o.id !== q.answerId);
    const answer = q.options.find((o) => o.id === q.answerId);
    return { ...q, options: [...rest.slice(0, at), answer, ...rest.slice(at)] };
  });
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

// Selección de obras propias de una ronda. Sin niveles (catálogos pequeños): pickOwnWorks. Con niveles:
//  · nivel 1: calentamiento (una de «Conoce a») + OWN_NEW obras no enseñadas (nivel 1 no vistas, después nivel 2+);
//  · «a fondo» (level ≥ 2): las obras de ese nivel, primero las no vistas (hasta OWN_DEEP_MAX).
function ownSelection(index, artist, learn, rng, { level, seen, first: noBefore }) {
  if (!index.hasLevels) return pickOwnWorks(index, artist.id, learn, rng);
  const unseenFirst = (list) => [...rng.shuffle(list.filter((w) => !seen.has(w.id))), ...rng.shuffle(list.filter((w) => seen.has(w.id)))];
  if (level >= 2) {
    const pool = unseenFirst(clean(index.levelWorks(artist.id, level)));
    return { warm: [], fresh: pool.slice(0, OWN_DEEP_MAX), reserve: pool[OWN_DEEP_MAX] || clean(learn)[0] || null };
  }
  const warm = clean(learn).slice(0, 1);
  const works = clean(index.worksOf(artist.id)).filter((w) => w.role === 'new');
  const byLevel = (l) => unseenFirst(works.filter((w) => (l === 1 ? levelOf(w) === 1 : levelOf(w) >= 2)));
  const pool = [...byLevel(1).filter((w) => !seen.has(w.id)), ...byLevel(2).filter((w) => !seen.has(w.id)),
    ...byLevel(1).filter((w) => seen.has(w.id)), ...byLevel(2).filter((w) => seen.has(w.id))];
  // Sin calentamiento (no hay obra de «Conoce a»), una no vista más para llegar al mismo número.
  const fresh = pool.slice(0, OWN_NEW + (!warm.length ? 1 : 0));
  const reserve = clean(learn)[1] || pool[fresh.length] || null;
  return { warm, fresh, reserve };
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
function stageRoundSize(before, index) {
  const size = index.hasLevels ? STAGE_ROUND_LEVELS : STAGE_ROUND;
  return before.length < 2 ? size - 1 : size;
}

function stageSlots(index, artist, learn, before, rng, reviewIds, selection) {
  const { warm, fresh: ownFresh, reserve } = selection;
  // Calentamiento (obra vista) primero; luego sus obras no vistas.
  const ownWorks = [...warm, ...ownFresh].map((w) => ({ w, phase: w.role === 'learn' ? 'practice' : 'fresh' }));
  const ownTypes = alternate(ownWorks.length, rng);
  // Con muchas obras propias, como mucho dos «¿Quién?» (y una con un solo pintor aprendido): el resto,
  // «¿Cuál es de X?», para que el repaso de pintores anteriores siga siendo la mitad de los «¿Quién?».
  if (index.hasLevels && ownWorks.length >= 4) {
    let who = 0;
    ownTypes.forEach((t, i) => { if (t === 'who' && ++who > (before.length < 2 ? 1 : 2)) ownTypes[i] = 'which'; });
  }
  // Con solo 2 obras suyas, la ya vista va en «¿Cuál es de X?» (relleno sin aprender: por descarte,
  // 1 de cada 4) y la nueva en «¿Quién?». La regla de dominio perdona un fallo si se acierta esa
  // (progress.ownRoundMastered).
  if (ownWorks.length === 2) {
    const anchor = Math.max(0, ownWorks.findIndex((o) => o.phase === 'practice'));
    ownWorks.forEach((_, i) => { ownTypes[i] = i === anchor ? 'which' : 'who'; });
  }
  // Con un solo pintor aprendido antes, todas las «¿Quién?» llevarían a los dos: solo una propia
  // (la segunda), para que elegir siempre la opción más repetida no baste.
  if (before.length < 2 && ownWorks.length === 3 && !index.hasLevels) ownWorks.forEach((_, i) => { ownTypes[i] = i === 1 ? 'who' : 'which'; });
  const ownWho = ownTypes.filter((t) => t === 'who').length;

  // Pintores ya aprendidos: primero los recientes (más parecidos), luego el resto.
  const recent = rng.shuffle(before.slice(-4));
  const older = rng.shuffle(before.slice(0, -4));
  const helpers = [...recent, ...older];
  const used = new Set([...index.worksOf(artist.id).map((w) => w.id)]);
  let cursor = 0;
  const beforeIds = new Set(before.map((a) => a.id));
  const hints = reviewIds.map((id) => index.artwork(id)).filter((w) => w && beforeIds.has(w.artistId) && !noAuthorQuestion(w));
  // Invitados del camino ya presentados: sus obras (nunca enseñadas) salen intercaladas en el repaso.
  const guestPool = index.hasLevels ? rng.shuffle(index.guestsUpTo(artist.id).flatMap((g) => clean(index.worksOf(g.id)).filter((w) => w.role === 'new'))) : [];
  const pickWork = (prefer, filter = () => true) => {
    const h = hints.findIndex((w) => !used.has(w.id) && filter(index.artist(w.artistId)));
    if (h >= 0) {
      const [w] = hints.splice(h, 1);
      used.add(w.id);
      return w;
    }
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
  // Catálogo grande: el repaso es de obras ya enseñadas (las nuevas de cada ronda son las propias) y, de
  // vez en cuando, una obra de un invitado del camino, que nunca se ha enseñado.
  const phaseAt = (i) => (index.hasLevels ? 'practice' : i % 2 ? 'fresh' : 'practice');
  for (let i = 0; i < reviewWho; i++) {
    const guest = guestPool.length && rng.next() < GUEST_SHARE ? guestPool.shift() : null;
    if (guest) used.add(guest.id);
    const w = guest || pickWork(phaseAt(i) === 'practice' ? 'learn' : 'new');
    // Con el de la etapa y otro pintor ya aprendido de distractores: elegir siempre al aprendido
    // (o al más reciente) no basta.
    const mates = before.filter((a) => a.id !== w?.artistId && (!w || index.relation(index.refOfWork(w), a, RELAX_MAX)));
    if (w) review.push({ work: w, type: 'who', phase: guest ? 'fresh' : phaseAt(i), include: [artist.id, ...(mates.length ? [rng.pick(mates).id] : [])] });
  }
  const movementSlot = movementReviewSlot(index, artist, before, rng, pickWork, {
    spare: index.hasLevels
      ? clean(learn).filter((w) => w !== reserve && !ownWorks.some((o) => o.w === w))
      : spareWorks(index.worksOf(artist.id).filter((w) => !isSpoiler(w) && w !== reserve && !ownWorks.some((o) => o.w === w))),
  });
  const reviewWhich = Math.max(index.hasLevels ? 0 : 1, stageRoundSize(before, index) - ownWorks.length - review.length - (movementSlot ? 1 : 0));
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
    // El ayudante, de la familia de la obra (si hay alguno): un aprendido de otra familia no puede salir.
    const kin = recentFirst.filter((a) => index.relation(index.refOfWork(w), a, RELAX_MAX));
    const pool = kin.length ? kin : recentFirst;
    const helper = pool[i % Math.min(2, pool.length)].id;
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
    work = peers.length ? pickWork(index.hasLevels ? 'learn' : 'new', (a) => a.movementId === artist.movementId) : null;
    if (!work && spare.length) work = rng.pick(spare);
  }
  if (!work) {
    const target = rng.pick(prevMovs);
    const prefer = index.hasLevels ? 'learn' : 'new';
    work = pickWork(prefer, (a) => a.movementId === target) || pickWork(prefer, (a) => prevMovs.includes(a.movementId));
  }
  if (!work) return null;
  const correct = index.artist(work.artistId).movementId;
  const includeMovements = [artist.movementId, nearest].filter((id) => id !== correct);
  return { work, type: 'movement', phase: work.role === 'learn' ? 'practice' : 'fresh', includeMovements };
}

// Primera etapa: no hay nadie aprendido antes. «¿Quién lo pintó?» siempre tendría la misma
// respuesta (no prueba nada), así que todo es «¿Cuál es de X?» (sus obras entre otras muy distintas).
// Calentamiento con su obra más conocida y, después, solo obras no
// vistas (FIRST_STAGE_ROUND − 1). Solo en catálogos pequeños, si no llegan, se recurre a las otras
// vistas y, como último recurso, se repiten obras con otras miniaturas.
function firstStageSlots(index, artist, learn, rng, own) {
  const ownLearn = clean(learn);
  const ownNew = index.hasLevels ? own.fresh : rng.shuffle(clean(index.newWorks(artist.id)));
  const freshCount = FIRST_STAGE_ROUND - Math.min(1, ownLearn.length);
  const works = index.hasLevels
    ? [...own.warm, ...own.fresh].slice(0, FIRST_STAGE_ROUND)
    : [...ownLearn.slice(0, 1), ...ownNew.slice(0, freshCount)];
  for (const w of ownLearn.slice(1)) if (works.length < FIRST_STAGE_ROUND) works.push(w);
  // Un relleno del mismo movimiento (mejor un invitado) para que no se acierte solo por la época.
  const peers = index.artistsOf(artist.movementId).filter((a) => a.id !== artist.id && clean(index.worksOf(a.id)).length);
  const guests = peers.filter((a) => index.pathIndex(a.id) < 0);
  const peerPool = guests.length ? guests : peers;
  const include = () => (peerPool.length ? [rng.pick(peerPool).id] : []);
  const slots = works.map((w, i) => ({ work: w, phase: w.role === 'learn' ? 'practice' : 'fresh', type: 'which', include: include() }));
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
    // Con otro pintor del mismo movimiento entre las opciones: quien no mira no puede quedarse con «el único
    // pintor conocido» (en un catálogo grande, casi todo el relleno son pintores aún no vistos).
    const mates = stage.filter((x) => x.id !== w.artistId);
    const include = mates.length && p.type !== 'movement' ? [rng.pick(mates).id] : [];
    const q = makeQuestion(p.type, index, w, 0.75 + 0.2 * (i / ROUND_SIZE), rng, { avoid: [...avoid], includeMovements: [movementId], include });
    if (q && q.type === 'which') q.options.forEach((o) => avoid.add(o.artworkId));
    return tag(q, 'review');
  });
  return { kind: 'review', movementId, seed, questions: questions.filter(Boolean) };
}

// Ronda de repaso espaciado con los elementos que tocan hoy (max: preguntas como mucho; el repaso
// rápido del inicio usa 3).
export const SRS_MAX = 8;
export { QUICK_REVIEW } from './srs.js';

// opts.known: pintores que conoce el usuario (engine/chrono.js knownArtists); con ellos, a veces una «¿Quién fue antes?».
export function planSrsReview(index, dueKeys, seed, max = SRS_MAX, opts = {}) {
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
  const onlyWhich = !allowsOtherQuestions(new Set(works.map((w) => w.artistId)).size);
  const questions = rng.shuffle(works).map((w, i) => {
    const q = makeQuestion(onlyWhich || i % 4 === 3 ? 'which' : 'who', index, w, 0.6, rng, { avoid: [...avoid] });
    if (q && q.type === 'which') q.options.forEach((o) => avoid.add(o.artworkId));
    return tag(q, 'srs');
  });
  // Semilla aparte: añadirla no cambia el resto del repaso.
  const all = withBeforeQuestion(index, questions.filter(Boolean), opts.known, createRng(`antes:${seed}`), 'srs');
  return { kind: 'srs', seed, questions: all };
}

// «Repaso de 5» (engine/review.js elige los cuadros): las mismas preguntas que el repaso espaciado.
export function planReview5(index, workIds, seed, opts = {}) {
  return { ...planSrsReview(index, workIds.map((id) => `art:${id}`), seed, REVIEW5_SIZE, opts), kind: 'review5' };
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
