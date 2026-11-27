// Siguiente paso recomendado al cerrar una sesión: un solo botón principal, sin arrancar nada solo ni cuentas atrás.
// Gana la primera regla que se cumple:
//   1. etapa o sala por debajo del 50 % → «Repetir»;
//   1 bis. se entró a jugar desde una pantalla con un objetivo (el rango del Perfil, los logros) → «Volver al perfil»;
//   2. esta sesión cumple la meta del día → «Por hoy, hecho», con «Volver al camino»;
//   3. repaso que traía un pintor a medias (y sigue a medias) → «Volver a <pintor>»;
//   4. 3 o más pintores a medias, o 5 o más fallados, sin repaso ni ahora ni en la sesión anterior → «Repasar»;
//   5. nivel «a fondo» superado con el siguiente abierto, o rama con siguiente → «Siguiente: <etapa>» / «Siguiente en la rama»;
//   6. una parada abierta y sin jugar → «Sigue: <pintor>» (con su miniatura);
//   7. camino dominado y reto semanal pendiente → «Reto semanal»; si no, el nivel que recomienda el rango del Perfil
//      (rank-goals.js rankFocus: «Siguiente: <pintor> · nivel N») y, con el camino dominado, «Repasar» (nunca dos seguidos).
// Si no, «Seguir» (al camino). Con 50-74 % no se recomienda repetir: eso va como acción secundaria (result-actions.js).
// Devuelve { kind, to, label, artistId? }. Puro (las rutas son texto: ui/router.js no toca el DOM al importarse).

import { UNLOCK_MIN, gateSteps, stepStatus, isPathMastered, artistStatus } from './progress.js';
import { deepStatus } from './levels.js';
import { branchAfterRound } from './branches.js';
import { reviewSession, startedArtists, reviewFallados, REVIEW_MIN } from './review.js';
import { isoWeek } from './dates.js';
import { rankFor } from './ranks.js';
import { rankConditions, rankFocus } from './rank-goals.js';
import { deepRoute, stageRoute } from '../ui/router.js';

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

// Vuelta a la pantalla con un objetivo desde la que se entró a jugar (ui/router.js GOAL_SCREENS).
export const ORIGIN_LABEL = { perfil: 'Volver al perfil', logros: 'Volver a logros' };

export function nextStep(progress, index, today, { plan = {}, outcome = null, goalJustMet = false, prevKind = null, branchId = '', week = '', origin = '' } = {}) {
  const kind = plan.kind;
  let reviewCount = null;
  const count = () => (reviewCount ??= reviewSession(progress, index, today).works.length);
  const isDeep = kind === 'stage' && plan.level >= 2;
  // 1. Ronda floja de una etapa o sala.
  if ((kind === 'stage' || kind === 'sala') && outcome && outcome.accuracy < UNLOCK_MIN) {
    const to = kind === 'sala' ? `sala-${plan.movementId}` : isDeep ? deepRoute(plan.artistId, plan.level) : stageRoute(plan.artistId, branchId);
    return { kind: 'retry', to, label: 'Repetir' };
  }
  // 1 bis. Vuelta al objetivo.
  if (ORIGIN_LABEL[origin]) return { kind: 'origin', to: origin, label: ORIGIN_LABEL[origin] };
  // 2. Meta del día cumplida en esta sesión.
  if (goalJustMet) return { kind: 'done', to: HOME_ROUTE, label: BACK_LABEL };
  // 3. Repaso con un pintor a medias.
  if (isReviewKind(kind) && plan.started && index.artist(plan.started) && artistStatus(progress, index, plan.started) === 'started') {
    return { kind: 'painter', to: stageRoute(plan.started), label: `Volver a ${shortName(index.artist(plan.started))}`, artistId: plan.started };
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
  // 6. Parada abierta y sin jugar.
  const open = gateSteps(progress, index.steps).find((s) => stepStatus(progress, index, s) === 'available');
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
  return { kind: 'path', to: HOME_ROUTE, label: 'Seguir' };
}
