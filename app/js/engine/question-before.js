// «¿Quién fue antes?» (docs/eval/ux-cronologia.md): dos pintores ya conocidos y de otra época (engine/chrono.js), cada uno con
// su cuadro más conocido. Va en los repasos de tarde en tarde: como mucho una por ronda y en pocas. Pura.

import { beforePair, relationPhrase, ribbonPositions } from './chrono.js';

export const BEFORE_TYPE = 'before';
export const BEFORE_PROMPT = '¿Quién fue antes?';
export const BEFORE_SHARE = 0.15; // probabilidad de que un repaso lleve una: es rara (decisión de María)
export const BEFORE_MIN_ROUND = 3; // preguntas mínimas del repaso para meterla

// El cuadro con el que se presenta un pintor: el más famoso de los que enseña «Conoce a» (ya visto por quien lo conoce), sin
// retratos de otras personas y, a igual fama, el de madurez (el más tardío).
const OTHER_PORTRAIT = /^(retrato de|portrait of)/i;
export function faceWork(index, artistId) {
  const pool = index.learnWorks(artistId).length ? index.learnWorks(artistId) : index.worksOf(artistId);
  const own = pool.filter((w) => !OTHER_PORTRAIT.test(w.title || ''));
  return (own.length ? own : pool).slice().sort((a, b) => (b.fame || 0) - (a.fame || 0) || (b.yearSort || 0) - (a.yearSort || 0))[0] || null;
}

// La pregunta, o null si no hay pareja de conocidos de otra época. known: artistas conocidos.
// { type, prompt, artistId (el anterior), laterId, middleId?, artworkId: null, options: [{ id, label, artworkId }], answerId, isNew }
export function makeBeforeQuestion(index, known, rng) {
  const pair = beforePair(known.filter((a) => faceWork(index, a.id)), rng);
  if (!pair) return null;
  const option = (a) => ({ id: a.id, label: a.short || a.name, artworkId: faceWork(index, a.id).id });
  const middle = middleOf(known, pair.earlier, pair.later);
  return {
    type: BEFORE_TYPE,
    prompt: BEFORE_PROMPT,
    artistId: pair.earlier.id,
    laterId: pair.later.id,
    artworkId: null,
    options: rng.shuffle([option(pair.earlier), option(pair.later)]),
    answerId: pair.earlier.id,
    isNew: false,
    ...(middle ? { middleId: middle.id } : {}),
  };
}

// Un conocido nacido entre los dos (el más cercano a la mitad), para la mini cinta de la respuesta; null si no hay.
export function middleOf(known, earlier, later) {
  const mid = (earlier.born + later.born) / 2;
  return known.filter((a) => a.born > earlier.born && a.born < later.born)
    .sort((a, b) => Math.abs(a.born - mid) - Math.abs(b.born - mid) || a.id.localeCompare(b.id))[0] || null;
}

// Respuesta: «Eso es» o quién fue antes, la frase de las fechas y la mini cinta (el anterior resaltado, el conocido de en
// medio si lo hay y el posterior). { title, lines, ribbon: [{ id, name, at, current }] }
export function beforeFeedback(index, q, correct, praise) {
  const earlier = index.artist(q.answerId);
  const later = index.artist(q.laterId);
  const middle = q.middleId ? index.artist(q.middleId) : null;
  const row = [earlier, ...(middle ? [middle] : []), later].filter(Boolean);
  const at = ribbonPositions(row.map((a) => a.born));
  const name = (a) => a.short || a.name;
  return {
    title: correct ? praise : `Antes fue ${name(earlier)}`,
    lines: [relationPhrase(earlier, later)],
    ribbon: row.map((a, i) => ({ id: a.id, name: name(a), at: at[i], current: a.id === earlier.id })),
  };
}

// Mete, con probabilidad BEFORE_SHARE, una «¿Quién fue antes?» en mitad de las preguntas de un repaso (nunca la primera).
export function withBeforeQuestion(index, questions, known, rng, phase) {
  if (questions.length < BEFORE_MIN_ROUND || !known?.length || rng.next() >= BEFORE_SHARE) return questions;
  const q = makeBeforeQuestion(index, known, rng);
  if (!q) return questions;
  const at = 1 + Math.floor(rng.next() * (questions.length - 1));
  return [...questions.slice(0, at), { ...q, phase }, ...questions.slice(at)];
}
