// Acciones secundarias del resultado: como mucho una para seguir practicando (repetir, repasar o el reto
// semanal) además de compartir. Un solo botón principal («Seguir») y nada repetido.

import { isPathMastered } from '../../engine/progress.js';
import { review5Works, review5Label, REVIEW5_MIN } from '../../engine/review.js';
import { isoWeek } from '../../engine/dates.js';

// Otras rondas a mano, ya que la franja «Hoy» no existe: el repaso de lo aprendido (si hay material) y el reto
// semanal (con el camino dominado y sin hacer esta semana). No se ofrece la que se acaba de jugar.
export function extraRounds(ctx, plan) {
  const p = ctx.store.get().progress;
  const list = [];
  const ids = plan.kind === 'review5' ? [] : review5Works(p, ctx.index, ctx.today());
  if (ids.length >= REVIEW5_MIN) list.push({ to: 'repaso5', label: review5Label(p, ids), icon: 'repeat' });
  if (plan.kind !== 'weekly' && isPathMastered(p, ctx.index) && !p.weekly?.[isoWeek(ctx.dailyDay()).key]) list.push({ to: 'reto-semanal', label: 'Reto semanal', icon: 'target' });
  return list;
}

// La acción para seguir practicando, una sola y por prioridad: repetir la ronda si no salió, lo que pida el
// flujo (p. ej. «Repasar más» tras el repaso rápido) y, si no, otra ronda. Ninguna al cerrar el día ni en un reto.
export function practiceAction(ctx, plan, { retry = null, more = null, closing = false, duel = false } = {}) {
  if (closing || duel) return null;
  if (retry) return { to: retry, label: 'Repetir', icon: 'repeat' };
  if (more) return { to: more.to, label: more.label, icon: 'repeat' };
  return extraRounds(ctx, plan)[0] || null;
}
