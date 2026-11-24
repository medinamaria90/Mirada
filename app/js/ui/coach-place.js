// Dónde se coloca la tarjeta de la guía respecto a lo que señala, sin tapar el elemento. Puro.

export const COACH_GAP = 14;
export const COACH_MARGIN = 12;

// target: { top, left, width, height } (rectángulo en pantalla); card: { width, height };
// viewport: { width, height }. Devuelve { top, left, side: 'below' | 'above' }.
export function coachPlacement(target, card, viewport) {
  const roomBelow = viewport.height - (target.top + target.height) - COACH_GAP - COACH_MARGIN;
  const roomAbove = target.top - COACH_GAP - COACH_MARGIN;
  const below = roomBelow >= card.height || roomBelow >= roomAbove;
  const rawTop = below ? target.top + target.height + COACH_GAP : target.top - COACH_GAP - card.height;
  const top = Math.max(COACH_MARGIN, Math.min(viewport.height - card.height - COACH_MARGIN, rawTop));
  const center = target.left + target.width / 2 - card.width / 2;
  const left = Math.max(COACH_MARGIN, Math.min(viewport.width - card.width - COACH_MARGIN, center));
  return { top, left, side: below ? 'below' : 'above' };
}
