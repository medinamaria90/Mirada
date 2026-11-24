// Repetición espaciada tipo Leitner. Claves: 'art:<id>' (obra) y 'artist:<id>' (pintor).
// Caja 1..5; acertar sube de caja y aleja el próximo repaso; fallar vuelve a la caja 1.

import { addDays } from './dates.js';

export const INTERVALS = [0, 1, 3, 7, 14, 30]; // días por caja (índice = caja)
export const MAX_BOX = 5;
// Preguntas del repaso rápido del inicio (planner.planSrsReview).
export const QUICK_REVIEW = 3;

export function recordAnswer(srs, key, correct, today) {
  const prev = srs[key];
  const box = correct ? Math.min(MAX_BOX, (prev?.box || 0) + 1) : 1;
  return { ...srs, [key]: { box, due: addDays(today, INTERVALS[box]) } };
}

export function dueKeys(srs, today) {
  return Object.entries(srs)
    .filter(([, v]) => v && v.due <= today)
    .sort((a, b) => a[1].box - b[1].box || (a[1].due < b[1].due ? -1 : 1))
    .map(([k]) => k);
}

export function artKey(id) {
  return `art:${id}`;
}

export function artistKey(id) {
  return `artist:${id}`;
}
