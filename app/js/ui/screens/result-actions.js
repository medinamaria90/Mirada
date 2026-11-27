// Acciones secundarias del resultado: como mucho una para seguir practicando (repetir, el Cuadro del día, repasar o el reto semanal)
// además de «Volver al camino» y compartir. Un solo botón principal (engine/next-step.js) y nada repetido.

import { isPathMastered } from '../../engine/progress.js';
import { reviewSession, REVIEW_MIN, REVIEW_NAME } from '../../engine/review.js';
import { isReviewKind } from '../../engine/next-step.js';
import { isoWeek } from '../../engine/dates.js';
import { cuadroNudge, CUADRO_ROUTE } from '../../engine/cuadro-dia.js';

// Otras rondas a mano: el Cuadro del día (pendiente, una vez al día y nunca tras una ronda floja: `weak`), «Repasar» (si hay
// material y no se viene de un repaso: nunca dos seguidos) y el reto semanal (con el camino dominado y sin hacer esta semana).
// No se ofrece la que se acaba de jugar.
export function extraRounds(ctx, plan, { prevKind = null, weak = false } = {}) {
  const p = ctx.store.get().progress;
  const list = [];
  if (cuadroNudge(p, ctx.dailyDay(), { weak })) list.push({ to: CUADRO_ROUTE, label: 'Cuadro del día', icon: 'frames' });
  const reviewed = isReviewKind(plan.kind) || isReviewKind(prevKind);
  if (!reviewed && reviewSession(p, ctx.index, ctx.today()).works.length >= REVIEW_MIN) list.push({ to: 'repaso', label: REVIEW_NAME, icon: 'repeat' });
  if (plan.kind !== 'weekly' && isPathMastered(p, ctx.index) && !p.weekly?.[isoWeek(ctx.dailyDay()).key]) list.push({ to: 'reto-semanal', label: 'Reto semanal', icon: 'target' });
  return list;
}

// La acción para seguir practicando, una sola y por prioridad: repetir la ronda si no salió y, si no, otra ronda. Ninguna
// al cerrar el día ni en un duelo; nunca la misma que el botón principal (`main`: su ruta).
export function practiceAction(ctx, plan, { retry = null, closing = false, duel = false, prevKind = null, main = '', weak = false } = {}) {
  if (closing || duel) return null;
  if (retry && retry !== main) return { to: retry, label: 'Repetir' };
  return extraRounds(ctx, plan, { prevKind, weak }).find((r) => r.to !== main) || null;
}
