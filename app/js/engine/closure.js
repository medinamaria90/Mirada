// Cierre del día (al cumplir la meta diaria): lo aprendido hoy y la próxima parada. Puro.

import { nextStep } from './progress.js';

// Cuadros como mucho en la tira de miniaturas del cierre.
export const CLOSURE_THUMBS = 4;

// { artists: [ids de pintores conocidos o dominados hoy], works: [ids de cuadros reconocidos por
//   primera vez hoy, del más reciente], next: { type, id, name } | null }
export function daySummary(progress, index, today) {
  const artists = index.path
    .filter((a) => progress.artists?.[a.id]?.since === today || progress.medals?.[`artist-${a.id}`] === today)
    .map((a) => a.id);
  const works = Object.entries(progress.collection || {})
    .filter(([id, day]) => day === today && index.artwork(id))
    .map(([id]) => id)
    .reverse();
  const step = nextStep(progress, index);
  const next = !step ? null : {
    type: step.type,
    id: step.id,
    name: step.type === 'sala' ? index.movement(step.id)?.name : index.artist(step.id)?.name,
  };
  return { artists, works, next: next && next.name ? next : null };
}

// «Vermeer», «Vermeer y Rembrandt», «Vermeer, Rembrandt y Hals».
export function listNames(names) {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
}
