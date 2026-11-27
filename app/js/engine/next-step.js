// Siguiente paso recomendado al cerrar una sesión: un solo botón principal, sin arrancar nada solo ni cuentas atrás.
// Gana la primera regla que se cumple:
//   1. etapa o sala por debajo del 50 % → «Repetir»;
//   2. esta sesión cumple la meta del día → «Por hoy, hecho», con «Volver al camino»;
//   3. repaso que traía un pintor a medias (y sigue a medias) → «Volver a <pintor>»;
//   4. 3 o más pintores a medias, o 5 o más fallados, sin repaso ni ahora ni en la sesión anterior → «Repasar»;
//   5. nivel «a fondo» superado con el siguiente abierto, o rama con siguiente → «Siguiente: <etapa>» / «Siguiente en la rama»;
//   6. una parada abierta y sin jugar → «Sigue: <pintor>» (con su miniatura);
//   7. camino dominado → «Reto semanal» si está pendiente o, si no, «Repasar» (nunca dos repasos seguidos).
// Si no, «Seguir» (al camino). Con 50-74 % no se recomienda repetir: eso va como acción secundaria (result-actions.js).
// Devuelve { kind, to, label, artistId? }. Puro (las rutas son texto: ui/router.js no toca el DOM al importarse).

import { UNLOCK_MIN, gateSteps, stepStatus, isPathMastered, artistStatus } from './progress.js';
import { deepStatus } from './levels.js';
import { branchAfterRound } from './branches.js';
import { reviewSession, startedArtists, reviewFallados, REVIEW_MIN } from './review.js';
import { isoWeek } from './dates.js';
import { deepRoute, stageRoute } from '../ui/router.js';

export const REVIEW_ROUTE = 'repaso';
export const HOME_ROUTE = 'inicio';
export const BACK_LABEL = 'Volver al camino';
export const DONE_TITLE = 'Por hoy, hecho';
// Umbrales de la regla 4.
export const STARTED_FOR_REVIEW = 3;
export const FALLADOS_FOR_REVIEW = 5;

const REVIEW_KINDS = new Set(['srs', 'review5']);
export const isReviewKind = (kind) => REVIEW_KINDS.has(kind);

const shortName = (artist) => artist.short || artist.name;

function stepRoute(index, step) {
  return step.type === 'sala' ? `sala-${step.id}` : stageRoute(step.id);
}

function canReview(progress, index, today, plan, prevKind) {
  if (isReviewKind(plan?.kind) || isReviewKind(prevKind)) return false;
  return reviewSession(progress, index, today).works.length >= REVIEW_MIN;
}

const review = () => ({ kind: 'review', to: REVIEW_ROUTE, label: 'Repasar' });

export function nextStep(progress, index, today, { plan = {}, outcome = null, goalJustMet = false, prevKind = null, branchId = '', week = '' } = {}) {
  const kind = plan.kind;
  const isDeep = kind === 'stage' && plan.level >= 2;
  // 1. Ronda floja de una etapa o sala.
  if ((kind === 'stage' || kind === 'sala') && outcome && outcome.accuracy < UNLOCK_MIN) {
    const to = kind === 'sala' ? `sala-${plan.movementId}` : isDeep ? deepRoute(plan.artistId, plan.level) : stageRoute(plan.artistId, branchId);
    return { kind: 'retry', to, label: 'Repetir' };
  }
  // 2. Meta del día cumplida en esta sesión.
  if (goalJustMet) return { kind: 'done', to: HOME_ROUTE, label: BACK_LABEL };
  // 3. Repaso con un pintor a medias.
  if (isReviewKind(kind) && plan.started && index.artist(plan.started) && artistStatus(progress, index, plan.started) === 'started') {
    return { kind: 'painter', to: stageRoute(plan.started), label: `Volver a ${shortName(index.artist(plan.started))}`, artistId: plan.started };
  }
  // 4. Mucho pendiente.
  const many = startedArtists(progress, index).length >= STARTED_FOR_REVIEW || reviewFallados(progress, index).length >= FALLADOS_FOR_REVIEW;
  if (many && canReview(progress, index, today, plan, prevKind)) return review();
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
  // 7. Camino dominado.
  if (isPathMastered(progress, index)) {
    const key = week || isoWeek(today).key;
    if (kind !== 'weekly' && !progress.weekly?.[key]) return { kind: 'weekly', to: 'reto-semanal', label: 'Reto semanal' };
    if (canReview(progress, index, today, plan, prevKind)) return review();
  }
  return { kind: 'path', to: HOME_ROUTE, label: 'Seguir' };
}
