// Reto diario: las mismas 10 preguntas para todo el mundo en una fecha dada.
// Solo usa pintores con etapa propia y obras conocidas (nivel general).

import { planGeneral, planStage, planMovementReview, planSala } from './planner.js';

export function dailyPool(index) {
  const stageWorks = index.path.flatMap((a) => index.worksOf(a.id));
  const famous = stageWorks.filter((w) => (w.fame || 1) >= 2);
  return famous.length >= 10 ? famous : stageWorks;
}

// Ronda libre: 10 preguntas mezcladas de todo el camino (también sirve para retos `g<semilla>`).
export const FREE_DIFFICULTY = [0.35, 0.7];

export function planFree(index, seed) {
  return { kind: 'general', seed, questions: planGeneral(index, dailyPool(index), `general:${seed}`, FREE_DIFFICULTY) };
}

export function planDaily(index, dateKey) {
  const questions = planGeneral(index, dailyPool(index), `daily:${dateKey}`, [0.2, 0.55]);
  return { kind: 'daily', date: dateKey, questions };
}

// Reto semanal: 15 preguntas de todo el camino, iguales para todos en una semana ISO
// (semilla = semana, p. ej. '2026-W48'). Se comparte por enlace como el diario (`w202648`).
export const WEEKLY_SIZE = 15;
export const WEEKLY_DIFFICULTY = [0.35, 0.75];

export function planWeekly(index, weekKey) {
  const questions = planGeneral(index, dailyPool(index), `weekly:${weekKey}`, WEEKLY_DIFFICULTY, WEEKLY_SIZE);
  return { kind: 'weekly', week: weekKey, questions };
}

// Cuadrícula compartible: una fila de 10 casillas.
export function dailyGrid(firstTry) {
  return firstTry.map((ok) => (ok ? '🟩' : '⬜')).join('');
}

export function shareText({ title, score, total, grid, url }) {
  return [`${title} · ${score}/${total}`, grid, url].filter(Boolean).join('\n');
}

// --- Retos por enlace (engine/challenge.js los codifica) ----------------------------------

// Reconstruye la ronda del reto; null si el catálogo no la permite o si la puntuación del amigo
// no cabe en la ronda (enlace manipulado).
export function planChallenge(index, descriptor) {
  const plan = buildChallengePlan(index, descriptor);
  if (!plan || !plan.questions || !plan.questions.length) return null;
  const score = descriptor.score;
  if (score != null && (!Number.isInteger(score) || score < 0 || score > plan.questions.length)) return null;
  return plan;
}

function buildChallengePlan(index, descriptor) {
  if (!descriptor) return null;
  if (descriptor.kind === 'stage') {
    const artist = index.path[descriptor.idx];
    return artist ? planStage(index, artist.id, descriptor.seed) : null;
  }
  if (descriptor.kind === 'review') {
    const m = index.movements[descriptor.idx];
    return m ? planMovementReview(index, m.id, descriptor.seed) : null;
  }
  if (descriptor.kind === 'sala') {
    const m = index.movements[descriptor.idx];
    return m && index.isSala(m.id) ? planSala(index, m.id, descriptor.seed) : null;
  }
  if (descriptor.kind === 'daily') return planDaily(index, descriptor.date);
  if (descriptor.kind === 'weekly') return planWeekly(index, descriptor.week);
  if (descriptor.kind === 'general') {
    return planFree(index, descriptor.seed);
  }
  return null;
}
