// Preguntas de concepto tras las tarjetas de una época (medallón) o de un tramo (rombo). Puro.
// El banco (contenido/preguntas-concepto.json → data/preguntas-concepto.json) lo diseñó un experto: cada pregunta se apoya
// en cuadros del catálogo y cada opción lleva su porqué. Tipos: «¿Cuál de estos cuadros es de…?» (cual, cuatro cuadros),
// «¿Qué tienen en común?» (comun), «¿Qué cambia respecto a lo anterior?» (cambia) y «¿Por qué rompe con lo anterior?»
// (rompe). Se pueden saltar y no desbloquean nada; sus respuestas cuentan para «Repasar el Barroco» (engine/recall.js).

import { makeMovementQuestion } from './questions.js';
import { isSpoiler } from './catalog.js';
import { isKnownArtist } from './progress.js';
import { logAnswers, isLearned, MOVEMENT } from './recall.js';

export const CONCEPT_TYPE = 'concept';
export const ERA = 'epoca';
export const TRAMO = 'tramo';
export const CUAL = 'cual';
// Tras las tarjetas de la época: tres preguntas, dos «¿De qué época es?» con cuadros de pintores ya conocidos (si los hay)
// y una de concepto; sin pintores conocidos, las tres de concepto. Tras las de un tramo, dos de concepto.
export const ERA_QUIZ = 3;
export const ERA_IMAGE = 2;
export const TRAMO_QUIZ = 2;
// Dificultad de las «¿De qué época es?»: desde la mitad, los distractores son épocas cercanas (engine/questions.js).
export const ERA_IMAGE_DIFFICULTY = 0.6;
// Preguntas recordadas para rotar (progress.concepts.recent, de la más antigua a la más reciente).
export const RECENT_MAX = 24;

// Preguntas válidas del banco ([] si no es un banco).
export function cleanBank(data) {
  const list = data && Array.isArray(data.questions) ? data.questions : [];
  return list.filter((q) => q && typeof q.id === 'string' && Array.isArray(q.options) && q.options.length >= 2
    && q.options.some((o) => o && o.id === q.answer) && typeof q.prompt === 'string');
}

// Las del banco para una época (scope ERA, id: movimiento) o un tramo (scope TRAMO, id: su clave).
export function bankFor(bank, scope, id) {
  return bank.filter((q) => q.scope === scope && (scope === ERA ? q.movementId === id && !q.tramo : q.tramo === id));
}

// Obras que se ven en una pregunta del banco (las de arriba y, en «¿Cuál…?», las de las opciones).
export function itemWorks(item) {
  return [...(item.works || []), ...item.options.map((o) => o.work).filter(Boolean)];
}

// Que todas sus obras existan (y, en las opciones de «¿Cuál…?», que ninguna delate al autor con su firma).
function usable(index, item) {
  if (!(item.works || []).every((id) => index.artwork(id))) return false;
  return item.kind !== CUAL || item.options.every((o) => index.artwork(o.work) && !isSpoiler(index.artwork(o.work)));
}

// Elige n preguntas: primero las menos recientes (nunca preguntadas, las primeras), luego las que usan cuadros de las
// tarjetas recién vistas (cardWorks) y, a igualdad, al azar; sin repetir cuadros dentro de la misma tanda y variando el tipo.
// recent: ids ya preguntados, de la más antigua a la más reciente.
export function pickConcepts(list, n, rng, { recent = [], cardWorks = new Set() } = {}) {
  const age = (q) => recent.lastIndexOf(q.id);
  const fromCards = (q) => (itemWorks(q).some((w) => cardWorks.has(w)) ? 0 : 1);
  const ranked = rng.shuffle(list.slice()).sort((a, b) => age(a) - age(b) || fromCards(a) - fromCards(b));
  const chosen = [];
  const used = new Set();
  const take = (pass) => {
    for (const q of ranked) {
      if (chosen.length >= n || chosen.includes(q)) continue;
      const clash = itemWorks(q).some((w) => used.has(w));
      const sameKind = chosen.some((c) => c.kind === q.kind);
      if (pass === 0 && (clash || sameKind)) continue;
      if (pass === 1 && clash) continue;
      chosen.push(q);
      itemWorks(q).forEach((w) => used.add(w));
    }
  };
  [0, 1, 2].forEach(take);
  return chosen;
}

// Pregunta lista para la ronda (ui/screens/lesson.js) a partir de una del banco: opciones barajadas y sin delatar nada
// (las de «¿Cuál…?» no llevan texto; el título y el autor salen al responder).
export function conceptQuestion(index, item, rng) {
  const options = rng.shuffle(item.options.map((o) => {
    const work = o.work ? index.artwork(o.work) : null;
    const artist = work ? index.artist(work.artistId) : null;
    return {
      id: o.id,
      label: o.text || '',
      why: o.why,
      ...(work ? { artworkId: work.id } : {}),
      ...(artist ? { movementId: artist.movementId } : {}),
    };
  }));
  const right = options.find((o) => o.id === item.answer);
  const works = item.works || [];
  return {
    type: CONCEPT_TYPE,
    kind: item.kind,
    conceptId: item.id,
    prompt: item.prompt,
    movementId: item.movementId,
    artistId: null,
    artworkId: works[0] || right.artworkId || null,
    works,
    labels: item.labels || [],
    options,
    answerId: item.answer,
    isNew: false,
  };
}

// Cuadros que aparecen en pantalla (para precargar y para el visor): los de arriba o los de las opciones.
export const conceptWorks = (q) => (q.kind === CUAL ? q.options.map((o) => o.artworkId) : q.works);

// «¿De qué época es?» con cuadros de pintores de la época que ya conoce (uno por pintor), como mucho `max`.
export function knownEraQuestions(progress, index, movementId, rng, max = ERA_IMAGE) {
  const known = rng.shuffle(index.stageArtists(movementId).filter((a) => isKnownArtist(progress, index, a.id)));
  const out = [];
  for (const a of known) {
    if (out.length >= max) break;
    const pool = index.worksOf(a.id).filter((w) => !isSpoiler(w));
    const q = pool.length ? makeMovementQuestion(index, rng.pick(pool), ERA_IMAGE_DIFFICULTY, rng) : null;
    if (q && q.answerId === movementId) out.push({ ...q, prompt: '¿De qué época es?', isNew: false });
  }
  return out;
}

// La tanda de preguntas tras las tarjetas. scope ERA: dos de imagen con pintores conocidos (si los hay) y el resto de
// concepto; TRAMO: dos de concepto. cardWorks: cuadros de las tarjetas recién vistas (se prefieren).
export function planConcepts(progress, index, bank, scope, id, rng, { cardWorks = new Set() } = {}) {
  const recent = recentConcepts(progress);
  const total = scope === ERA ? ERA_QUIZ : TRAMO_QUIZ;
  const images = scope === ERA ? knownEraQuestions(progress, index, id, rng) : [];
  const pool = [...bankFor(bank, scope, id), ...(scope === ERA ? bankFor(bank, TRAMO, firstTramo(index, id)) : [])]
    .filter((q) => usable(index, q));
  const used = new Set(images.map((q) => q.artworkId));
  const free = pool.filter((q) => !itemWorks(q).some((w) => used.has(w)));
  const concepts = pickConcepts(free, Math.max(0, total - images.length), rng, { recent, cardWorks })
    .map((item) => conceptQuestion(index, item, rng));
  // La de concepto va al final: primero se mira, luego se piensa.
  return [...images, ...concepts];
}

// El primer tramo de una época no tiene cartel propio (va con el medallón, engine/progress.js hasTramoSign): sus preguntas
// entran en la tanda de la época.
export function firstTramo(index, movementId) {
  return index.stageArtists(movementId)[0]?.section || '';
}

export function recentConcepts(progress) {
  const list = progress?.concepts?.recent;
  return Array.isArray(list) ? list.filter((id) => typeof id === 'string') : [];
}

// Lo que enseña la hoja tras responder: el acierto, o por qué la elegida no era y por qué sí la buena.
export function conceptFeedback(q, correct, chosenId, praise) {
  const right = q.options.find((o) => o.id === q.answerId);
  const chosen = chosenId ? q.options.find((o) => o.id === chosenId) : null;
  if (correct) return { title: praise, lines: [right.why] };
  if (!chosen) return { title: 'Era esta', lines: [right.why] };
  return { title: 'No es esa', lines: [chosen.why, right.why] };
}

// Tanda terminada: sus respuestas cuentan para «Repasar…» (engine/recall.js) y sus preguntas pasan al final de la cola de
// rotación. Si la época aún no está aprendida, lo de esa época no cuenta como olvido (aprender no es olvidar). Puro.
export function finishConcepts(progress, index, answers, today, movementId) {
  const learned = isLearned(progress, index, MOVEMENT, movementId);
  const slips = logAnswers(progress.slips, answers, index, today, { round: { movementId: learned ? '' : movementId } });
  const asked = answers.filter((a) => !a.retry && a.q.type === CONCEPT_TYPE).map((a) => a.q.conceptId);
  const recent = [...recentConcepts(progress).filter((id) => !asked.includes(id)), ...asked].slice(-RECENT_MAX);
  return { ...progress, slips, concepts: { ...(progress.concepts || {}), recent } };
}
