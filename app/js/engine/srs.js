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

// --- Errores que vuelven (cola progress.fallados: { id, date, times, hits }) ---------------------
// Un cuadro fallado a la primera entra en la cola y sale al acertarse FALLADO_HITS veces desde el
// último fallo (el reintento de la misma ronda cuenta como una). Lo que vuelve a preguntarse se
// planifica en engine/fallados.js. (Aquí y no allí: progress.js lo usa y va en la cadena de arranque.)
export const FALLADO_HITS = 2;
export const FALLADOS_MAX = 30;

function subjectOf(q) {
  return q.type === 'which' ? q.targetArtworkId : q.artworkId;
}

export function cleanFallados(list) {
  return (Array.isArray(list) ? list : []).filter((f) => f && typeof f.id === 'string');
}

// answers: [{ q, correct, retry }]. skip(a): respuestas que no cuentan (pintores aún no vistos).
export function updateFallados(list, answers, today, skip = () => false) {
  const byId = new Map(cleanFallados(list).map((f) => [f.id, { ...f }]));
  for (const a of answers) {
    if (!a || !a.q || skip(a)) continue;
    const id = subjectOf(a.q);
    if (!id) continue;
    const entry = byId.get(id);
    if (!a.correct) {
      // El reintento fallado de la misma ronda no es un fallo nuevo.
      if (a.retry && entry) continue;
      byId.delete(id);
      byId.set(id, { id, date: today, times: (entry?.times || 0) + 1, hits: 0 });
    } else if (entry) {
      const hits = (entry.hits || 0) + 1;
      if (hits >= FALLADO_HITS) byId.delete(id);
      else byId.set(id, { ...entry, hits });
    }
  }
  return [...byId.values()].slice(-FALLADOS_MAX);
}
