// Variante «mapa» del botón «Repasar» (shell.js REVIEW_PLACE = 'map'): píldora fija abajo a la izquierda del camino,
// simétrica a «Tu parada» (map-return.js), con ↻, «Repasar» y el punto coral si hay algo pendiente. Devuelve cómo quitarla.

import { icons } from '../icons.js';
import { REVIEW_PLACE, reviewState } from '../shell.js';

export function mountReviewPill(ctx, el) {
  const review = REVIEW_PLACE === 'map' ? reviewState(ctx) : null;
  if (!review) return () => {};
  const link = document.createElement('a');
  link.className = 'map-review';
  link.href = '#repaso';
  link.setAttribute('aria-label', `Repasar${review.pending ? ', hay cuadros pendientes' : ''}`);
  link.innerHTML = `<span class="map-review-icon" aria-hidden="true">${icons.repeat(20)}${review.pending ? '<span class="chip-dot"></span>' : ''}</span><span class="map-review-text">Repasar</span>`;
  el.append(link);
  return () => link.remove();
}
