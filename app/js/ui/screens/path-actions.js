// Acciones del mapa del camino (portada y ramas): paradas, carteles, desvíos y la nota de lo que falta en lo cerrado.

import { $, prefersReducedMotion } from '../dom.js';
import { branchRoute } from '../router.js';
import { zoomInto } from '../map-zoom.js';
import { showLockNote } from './lock-note.js';

export { showLockNote };

// La hoja del mapa (época cerrada, cómo se juega) se carga al primer toque: no cuenta en el arranque.
const sheet = (ctx, fn, b) => {
  ctx.audio.sfx('tap');
  import('../map-sheet.js').then((m) => m[fn](ctx, b.dataset.id, b)).catch((err) => console.error(err));
};

// La tarjeta del nodo de un pintor con niveles se carga al primer toque. branchId: rama desde la que se abre.
export const levelCard = (ctx, b, branchId = '') => {
  ctx.audio.sfx('tap');
  import('../level-card.js').then((m) => m.openLevelCard(ctx, b, branchId)).catch((err) => console.error(err));
};

// Acciones de las paradas, para onAction en la portada.
export function pathActions(ctx) {
  const guarded = (route) => (b) => {
    ctx.audio.sfx('tap');
    if (b.dataset.status === 'locked') return showLockNote(b);
    return ctx.go(`${route}-${b.dataset.id}`);
  };
  return {
    // Dominado con niveles (aro): su tarjeta, con sus historias y «Jugar».
    stage: (b, ev) => (b.dataset.card ? levelCard(ctx, b) : guarded('etapa')(b, ev)),
    sala: guarded('sala'),
    review: guarded('repaso'),
    intro: (b) => {
      ctx.audio.sfx('tap');
      ctx.go(`movimiento-${b.dataset.id}`);
    },
    gallery: (b) => {
      ctx.audio.sfx('tap');
      ctx.go(`galeria-${b.dataset.id}`);
    },
    'era-lock': (b) => sheet(ctx, 'openEraSheet', b),
    start: (b) => sheet(ctx, 'openIntroSheet', b),
    'goto-current': (_, ev) => {
      ev.preventDefault();
      const target = $('.stage-spot.is-current .stage') || $('.stage.is-available, .stage.is-started');
      if (!target) return;
      target.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'instant' : 'smooth' });
      target.focus({ preventScroll: true });
    },
    // Cartel de un tramo o de una rama: sus tarjetas (sign-cards.js, cargado al primer toque).
    cartel: (b) => {
      ctx.audio.sfx('tap');
      import('../sign-cards.js').then((m) => m.openSignCards(ctx, b.dataset.kind, b.dataset.id, b)).catch((err) => console.error(err));
    },
    // Rama abierta: se entra en su pantalla con un acercamiento; cerrada, una nota con lo que falta.
    branch: (b) => {
      ctx.audio.sfx('tap');
      if (b.dataset.status === 'locked') return showLockNote(b);
      return zoomInto(b, () => ctx.go(branchRoute(b.dataset.id)));
    },
  };
}
