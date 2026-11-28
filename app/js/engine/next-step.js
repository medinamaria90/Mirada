// Siguiente paso recomendado al cerrar una sesión: un solo botón principal, sin arrancar nada solo ni cuentas atrás.
// Gana la primera regla que se cumple:
//   1. etapa o sala por debajo del 50 % → «Repetir»;
//   1 ter. una época (o una rama) recién terminada y su cierre sin ver → «Cerrar el Renacimiento» (engine/era-end.js): la
//      pantalla de capítulo terminado, una sola vez; desde ella, «Cruzar a <época>» sigue el camino;
//   1 bis. se entró a jugar desde una pantalla con un objetivo (el rango del Perfil, los logros) → «Volver al perfil»;
// (El contexto de un pintor manda ANTES de jugar: la última tarjeta de su historia ofrece artistStep. Al TERMINAR su ronda la
// intención está cumplida y vale la guía global; repetirlo va como secundario, «Repetir <pintor>», en result-actions.js.)
//   2. esta sesión cumple la meta del día → «Por hoy, hecho», con «Volver al camino»;
//   2 bis. un pintor o una época que se le está olvidando (engine/recall.js: fallos recientes) → «Repasar a Vermeer» /
//      «Repasar el Barroco» (nunca tras otra sesión así ni el mismo dos veces seguidas);
//   3. repaso que traía un pintor a medias (y sigue a medias) → su ronda, «Sigue: <pintor>» (avanza, no «vuelve»);
//   4. 3 o más pintores a medias, o 5 o más fallados, sin repaso ni ahora ni en la sesión anterior → «Repasar»;
//   5. nivel «a fondo» superado con el siguiente abierto, o rama con siguiente → «Siguiente: <etapa>» / «Siguiente en la rama»;
//   5 bis. pendiente atrás: si la parada abierta ya es de una época posterior y en una anterior queda su Prueba de época
//      abierta y sin superar, o un pintor a medias que es lo único que la tiene cerrada, se recomienda eso («Prueba de
//      época: Renacimiento», «Sigue: Miguel Ángel»). No siempre: nunca dos veces seguidas (`prevStep`), para no frenar;
//   5 ter. puerta de época cerrada solo por sus imprescindibles (engine/essentials.js) y nada abierto → «Te falta conocer
//      las pinturas negras de Goya» (al nivel o, si su pintor está a medias, a su ronda);
//   5 quater. cada DEEPEN_EVERY pintores nuevos, un nivel «a fondo» pendiente de cualquier época ya recorrida, ponderado y en
//      rotación (engine/deepen.js): «Profundiza en Rafael: nivel 3». Siempre saltable;
//   6. una parada abierta y sin jugar → «Sigue: <pintor>» (con su miniatura);
//   7. camino dominado y reto semanal pendiente → «Reto semanal»; si no, el nivel que recomienda el rango del Perfil
//      (rank-goals.js rankFocus: «Siguiente: <pintor> · nivel N») y, con el camino dominado, «Repasar» (nunca dos seguidos).
// Si no, «Volver al camino». El botón principal siempre avanza en el juego (empieza la ronda, sin pasar por el mapa). Con 50-74 % no se recomienda repetir: eso va como acción secundaria (result-actions.js).
// Devuelve { kind, to, label, artistId? }. Puro (las rutas son texto: ui/router.js no toca el DOM al importarse).

import { UNLOCK_MIN, MASTERY, gateSteps, gateBefore, stepPassed, stepStatus, isPathMastered, artistStatus, hasMovementReview, isReviewUnlocked } from './progress.js';
import { gateEssentials, essentialNeed, essentialOpen } from './essentials.js';
import { currentOffer } from './deepen.js';
import { deepStatus } from './levels.js';
import { pendingClosure, closureRoute, closureLabel } from './era-end.js';
import { branchAfterRound } from './branches.js';
import { reviewSession, startedArtists, reviewFallados, REVIEW_MIN } from './review.js';
import { isoWeek } from './dates.js';
import { rankFor } from './ranks.js';
import { rankConditions, rankFocus } from './rank-goals.js';
import { deepRoute, stageRoute } from '../ui/router.js';
import { forgottenSubject, recallRoute, recallLabel, ARTIST, MOVEMENT } from './recall.js';

export const REVIEW_ROUTE = 'repaso';
export const HOME_ROUTE = 'inicio';
export const BACK_LABEL = 'Volver al camino';
export const DONE_TITLE = 'Por hoy, hecho';
// Umbrales de la regla 4.
export const STARTED_FOR_REVIEW = 3;
export const FALLADOS_FOR_REVIEW = 5;

export const isReviewKind = (kind) => kind === 'srs';

const shortName = (artist) => artist.short || artist.name;

function stepRoute(index, step) {
  return step.type === 'sala' ? `sala-${step.id}` : stageRoute(step.id);
}

// ¿Se puede proponer «Repasar»? Nunca tras un repaso, ni ahora ni en la sesión anterior. `count`: cuántos cuadros traería la
// sesión (se calcula una sola vez por llamada a nextStep).
function canReview(count, plan, prevKind) {
  if (isReviewKind(plan?.kind) || isReviewKind(prevKind)) return false;
  return count() >= REVIEW_MIN;
}

const review = () => ({ kind: 'review', to: REVIEW_ROUTE, label: 'Repasar' });

// La sesión «Repasar a Vermeer» / «Repasar el Barroco» (ui/screens/recall.js).
const recallOf = (index, type, id) => ({ kind: 'recall', to: recallRoute(type, id), label: recallLabel(index, type, id), ...(type === MOVEMENT ? { movementId: id } : { artistId: id }) });

// Regla 2 bis: lo que se le está olvidando, o null.
export function recallStep(progress, index, today) {
  const s = forgottenSubject(progress, index, today);
  return s ? recallOf(index, s.type, s.id) : null;
}

// Vuelta a la pantalla con un objetivo desde la que se entró a jugar (ui/router.js GOAL_SCREENS).
export const ORIGIN_LABEL = { perfil: 'Volver al perfil', logros: 'Volver a logros' };

// Lo que queda atrás (regla 5 bis): la época más antigua, anterior a la de `open`, con su Prueba de época abierta y sin
// superar o cerrada solo por pintores ya jugados (a medias). null si no hay nada.
export function backDebt(progress, index, open) {
  const era = open ? index.movementOf?.(open.id)?.id || (open.type === 'sala' ? open.id : null) : null;
  const order = index.visibleMovements.map((m) => m.id);
  const at = order.indexOf(era);
  if (at <= 0) return null;
  for (const id of order.slice(0, at)) {
    const m = index.movement(id);
    if (!m || !hasMovementReview(index, id)) continue;
    if (isReviewUnlocked(progress, index, id)) {
      if ((Number(progress.reviews?.[id]?.best) || 0) < MASTERY) return { kind: 'debt', to: `repaso-${id}`, label: `Prueba del ${String(m.name).split(' y ')[0]}`, movementId: id };
      continue;
    }
    const pending = gateSteps(progress, index.stepsOf(id)).filter((s) => s.type === 'artist' && artistStatus(progress, index, s.id) !== 'mastered');
    if (pending.length && pending.every((s) => artistStatus(progress, index, s.id) === 'started')) {
      const a = index.artist(pending[0].id);
      return { kind: 'debt', to: stageRoute(a.id), label: `Sigue: ${shortName(a)}`, artistId: a.id };
    }
  }
  return null;
}

// A dónde lleva un imprescindible: a su nivel o, si su pintor aún no tiene el nivel 1 dominado, a su ronda.
export function essentialRoute(progress, index, e) {
  return essentialOpen(progress, index, e) ? deepRoute(e.artistId, e.level) : stageRoute(e.artistId);
}

// Puerta de época cerrada solo por imprescindibles: el primero que falta (de más peso). null si no es el caso.
export function gateEssential(progress, index) {
  const step = gateSteps(progress, index.steps).find((s) => stepStatus(progress, index, s) === 'locked');
  const gate = step && gateBefore(progress, index, step);
  if (!gate || !stepPassed(progress, gate)) return null;
  return gateEssentials(progress, index, step, gate)[0] || null;
}

// Lo que toca con un pintor concreto, una sola acción que dice de quién: si se le está olvidando (con `today`), «Repasar a
// Vermeer»; si no, su siguiente nivel «a fondo» abierto («Nivel 2 de Vermeer») o, ya dominado, «Repasar a Vermeer» (la misma
// sesión: su historia, cómo reconocerlo y sus preguntas). Sin dominar, su nivel 1.
export function artistStep(progress, index, artistId, today = '') {
  const a = index.artist(artistId);
  if (!a) return null;
  const recall = today ? recallStep(progress, index, today) : null;
  if (recall && recall.artistId === artistId) return recall;
  if (progress.artists?.[artistId]?.mastered) {
    const next = index.deepLevels(artistId).find((l) => !['mastered', 'locked'].includes(deepStatus(progress, index, artistId, l.id)));
    if (next) return { kind: 'deep', to: deepRoute(artistId, next.id), label: `Nivel ${next.id} de ${shortName(a)}`, artistId };
  }
  if (progress.artists?.[artistId]?.mastered) return recallOf(index, ARTIST, artistId);
  return { kind: 'practice', to: stageRoute(artistId), label: `Nivel 1 de ${shortName(a)}`, artistId };
}

export function nextStep(progress, index, today, { plan = {}, outcome = null, goalJustMet = false, prevKind = null, prevStep = null, branchId = '', week = '', origin = '' } = {}) {
  const kind = plan.kind;
  let reviewCount = null;
  const count = () => (reviewCount ??= reviewSession(progress, index, today).works.length);
  const isDeep = kind === 'stage' && plan.level >= 2;
  // 1. Ronda floja de una etapa o sala.
  if ((kind === 'stage' || kind === 'sala') && outcome && outcome.accuracy < UNLOCK_MIN) {
    const to = kind === 'sala' ? `sala-${plan.movementId}` : isDeep ? deepRoute(plan.artistId, plan.level) : stageRoute(plan.artistId, branchId);
    return { kind: 'retry', to, label: 'Repetir' };
  }
  // 1 ter. Capítulo terminado (época o rama) con su cierre sin ver.
  const closure = pendingClosure(progress, index);
  if (closure) return { kind: 'closure', to: closureRoute(closure.key), label: closureLabel(index, closure), closure: closure.key };
  // 1 bis. Vuelta al objetivo.
  if (ORIGIN_LABEL[origin]) return { kind: 'origin', to: origin, label: ORIGIN_LABEL[origin] };
  // 2. Meta del día cumplida en esta sesión.
  if (goalJustMet) return { kind: 'done', to: HOME_ROUTE, label: BACK_LABEL };
  // 2 bis. Algo que se le está olvidando.
  const recall = kind === 'recall' ? null : recallStep(progress, index, today);
  if (recall) return recall;
  // 3. Repaso con un pintor a medias.
  if (isReviewKind(kind) && plan.started && index.artist(plan.started) && artistStatus(progress, index, plan.started) === 'started') {
    return { kind: 'stop', to: stageRoute(plan.started), label: `Sigue: ${shortName(index.artist(plan.started))}`, artistId: plan.started };
  }
  // 4. Mucho pendiente.
  const many = startedArtists(progress, index).length >= STARTED_FOR_REVIEW || reviewFallados(progress, index).length >= FALLADOS_FOR_REVIEW;
  if (many && canReview(count, plan, prevKind)) return review();
  // 5. Lo que sigue en el nivel o en la rama.
  const deepDone = outcome?.events?.find((e) => e.type === 'deep-mastered');
  if (deepDone) {
    const next = index.deepLevels(deepDone.artistId).find((l) => l.id > deepDone.level);
    if (next && deepStatus(progress, index, deepDone.artistId, next.id) !== 'locked') {
      return { kind: 'deep', to: deepRoute(deepDone.artistId, next.id), label: `Siguiente: ${next.short || next.name}` };
    }
  }
  if (kind === 'stage' && !isDeep && plan.artistId) {
    const inBranch = branchAfterRound(progress, index, plan.artistId, branchId);
    if (inBranch?.next && index.artist(inBranch.next)) {
      return { kind: 'branch', to: stageRoute(inBranch.next, inBranch.branch.id), label: 'Siguiente en la rama', artistId: inBranch.next };
    }
  }
  const open = gateSteps(progress, index.steps).find((s) => stepStatus(progress, index, s) === 'available');
  // 5 ter. Puerta cerrada por sus imprescindibles.
  const must = open ? null : gateEssential(progress, index);
  if (must) return { kind: 'essential', to: essentialRoute(progress, index, must), label: essentialNeed(must), artistId: must.artistId };
  // 5 bis. Pendiente atrás, de vez en cuando (nunca dos veces seguidas).
  const debt = prevStep === 'debt' ? null : backDebt(progress, index, open);
  if (debt) return debt;
  // 5 quater. Profundizar, intercalado.
  const offer = currentOffer(progress, index, today);
  if (offer && index.artist(offer.artistId)) {
    return { kind: 'deepen', to: deepRoute(offer.artistId, offer.level), label: `Profundiza en ${shortName(index.artist(offer.artistId))}: nivel ${offer.level}`, artistId: offer.artistId, offer: offer.key };
  }
  // 6. Parada abierta y sin jugar.
  if (open) {
    const name = open.type === 'sala' ? index.movement(open.id)?.name : index.artist(open.id) && shortName(index.artist(open.id));
    if (name) return { kind: 'stop', to: stepRoute(index, open), label: `Sigue: ${name}`, ...(open.type === 'artist' ? { artistId: open.id } : { movementId: open.id }) };
  }
  // 7. Camino dominado: el reto semanal si está pendiente; si no (o sin camino dominado y nada abierto), lo que pide el
  // rango (6 bis, lo mismo que recomienda su tarjeta del Perfil) y, al final, «Repasar».
  const mastered = isPathMastered(progress, index);
  if (mastered && kind !== 'weekly' && !progress.weekly?.[week || isoWeek(today).key]) return { kind: 'weekly', to: 'reto-semanal', label: 'Reto semanal' };
  const rank = rankFor(progress, index);
  const focus = rank.next ? rankFocus(progress, index, rank.next, rankConditions(rank.next, rank.stats)) : null;
  const same = focus?.choice && plan.artistId === focus.choice.artistId && plan.level === focus.choice.level;
  if (focus?.choice && !same && index.artist(focus.choice.artistId)) {
    const a = index.artist(focus.choice.artistId);
    return { kind: 'rank', to: deepRoute(a.id, focus.choice.level), label: `Siguiente: ${shortName(a)} · nivel ${focus.choice.level}`, artistId: a.id };
  }
  if (mastered && canReview(count, plan, prevKind)) return review();
  return { kind: 'path', to: HOME_ROUTE, label: BACK_LABEL };
}

// Lo que recomienda el mapa (el mismo criterio que el resultado, sin una ronda recién jugada): la parada abierta, «Repasar»
// con mucho pendiente o lo que pide el rango. null si lo que toca es la parada actual («Tú») o nada.
export function mapGuide(progress, index, today, { currentKey = '', prevKind = null, prevStep = null, week = '' } = {}) {
  const step = nextStep(progress, index, today, { plan: { kind: 'map' }, prevKind, prevStep, week });
  if (step.kind === 'path') return null;
  const key = step.artistId ? `artist:${step.artistId}` : step.movementId ? `sala:${step.movementId}` : '';
  if (step.kind === 'stop' && key === currentKey) return null;
  return step;
}
