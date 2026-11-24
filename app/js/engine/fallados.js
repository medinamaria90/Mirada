// Errores que vuelven: la pregunta extra. Puro. El cuadro más antiguo de la cola progress.fallados
// (la lleva engine/srs.js) vuelve como pregunta extra al final de la ronda siguiente y del reto diario
// (no cuenta para aciertos, dominio ni anti-trampa, y da la XP reducida de un reintento).

import { createRng } from './rng.js';
import { makeQuestion, noAuthorQuestion, artworksInQuestion } from './questions.js';
import { cleanFallados } from './srs.js';

export { updateFallados, FALLADO_HITS, FALLADOS_MAX } from './srs.js';

// Dificultad de la pregunta extra: es un repaso, no una prueba.
export const FALLADO_DIFFICULTY = 0.4;

// Cuadro más antiguo de la cola que se puede preguntar: existe, no delata al autor, `accept(obra)` y
// no está ya en pantalla en `questions`.
export function oldestFallado(progress, index, { accept = () => true, questions = [] } = {}) {
  const onScreen = new Set(questions.flatMap((q) => artworksInQuestion(q)));
  const list = cleanFallados(progress.fallados).slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
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
