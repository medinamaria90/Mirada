// Errores que vuelven. Puro. Un cuadro fallado a la primera entra en la cola progress.fallados
// ({ id, date, times, hits }) y vuelve como pregunta extra al final de la ronda siguiente y del reto
// diario (no cuenta para aciertos, dominio ni anti-trampa, y da la XP reducida de un reintento). Sale
// de la cola al acertarse FALLADO_HITS veces desde el último fallo (el reintento de la misma ronda
// cuenta como una).

import { createRng } from './rng.js';
import { makeQuestion, noAuthorQuestion, artworksInQuestion } from './questions.js';

export const FALLADO_HITS = 2;
export const FALLADOS_MAX = 30;
// Dificultad de la pregunta extra: es un repaso, no una prueba.
export const FALLADO_DIFFICULTY = 0.4;

function subjectOf(q) {
  return q.type === 'which' ? q.targetArtworkId : q.artworkId;
}

function cleanList(list) {
  return (Array.isArray(list) ? list : []).filter((f) => f && typeof f.id === 'string');
}

// answers: [{ q, correct, retry }]. skip(a): respuestas que no cuentan (pintores aún no vistos).
export function updateFallados(list, answers, today, skip = () => false) {
  const byId = new Map(cleanList(list).map((f) => [f.id, { ...f }]));
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

// Cuadro más antiguo de la cola que se puede preguntar: existe, no delata al autor, `accept(obra)` y
// no está ya en pantalla en `questions`.
export function oldestFallado(progress, index, { accept = () => true, questions = [] } = {}) {
  const onScreen = new Set(questions.flatMap((q) => artworksInQuestion(q)));
  const list = cleanList(progress.fallados).slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  for (const f of list) {
    const w = index.artwork(f.id);
    if (w && !noAuthorQuestion(w) && !onScreen.has(w.id) && accept(w)) return w;
  }
  return null;
}

// Pregunta extra para el final de una ronda (o null). Otro tipo de pregunta que la habitual de
// «¿Quién lo pintó?» cuando se puede, y con miniaturas que no repiten las de la ronda.
export function falladoQuestion(progress, index, questions, seed, accept) {
  const w = oldestFallado(progress, index, { accept, questions });
  if (!w) return null;
  const rng = createRng(`fallado:${w.id}:${seed}`);
  const avoid = questions.flatMap((q) => artworksInQuestion(q));
  const q = makeQuestion(rng.next() < 0.5 ? 'which' : 'who', index, w, FALLADO_DIFFICULTY, rng, { avoid });
  return q ? { ...q, phase: 'again' } : null;
}
