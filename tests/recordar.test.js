// «Recordar» a un pintor o una época (engine/recall.js, engine/recall-session.js) y «No lo sé» en las rondas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { realIndex } from './helpers-real.js';
import { emptyProgress } from '../app/js/engine/progress.js';
import { finishRound } from '../app/js/engine/finish.js';
import { nextStep, mapGuide, artistStep } from '../app/js/engine/next-step.js';
import { createRound, answerRound } from '../app/js/engine/round.js';
import { xpForAnswer } from '../app/js/engine/progress.js';
import { migrate, SCHEMA_VERSION } from '../app/js/state/schema.js';
import {
  logAnswers, recallStats, forgottenSubject, forgetSlips, RECALL_SLIPS, RECALL_DUNNO_WEIGHT, RECALL_LOG_MAX, CONFUSION_MIN,
} from '../app/js/engine/recall.js';
import { recallParts, planRecall, suggestedStory, firstStoryLevel, eraKeyCards, contrastLine, RECALL_ROUND } from '../app/js/engine/recall-session.js';
import { parseRoute } from '../app/js/ui/router.js';

const index = realIndex();
const TODAY = '2026-11-28';
const A = 'vermeer';
const B = 'rembrandt';
const NEW = 'velazquez';
const work = (id, k = 0) => index.worksOf(id).filter((w) => w.role === 'learn')[k] || index.worksOf(id)[k];

// Partida con los pintores dados dominados (y sus obras de nivel 1 vistas).
function learned(...ids) {
  const p = emptyProgress();
  for (const id of ids) {
    p.artists[id] = { plays: 2, best: 1, mastered: true, last: '2026-11-01', works: index.worksOf(id).map((w) => w.id) };
    for (const w of index.worksOf(id)) p.collection[w.id] = '2026-11-01';
  }
  return p;
}

// Pregunta «¿Quién lo pintó?» sobre una obra de `id` con `others` como opciones.
const who = (id, others = [B, 'goya', 'murillo'], k = 0) => ({
  type: 'who', artworkId: work(id, k).id, artistId: id, answerId: id, options: [id, ...others].map((x) => ({ id: x, label: x })),
});
const movementQ = (id, k = 0) => {
  const w = work(id, k);
  const m = index.artist(id).movementId;
  return { type: 'movement', artworkId: w.id, artistId: id, answerId: m, options: [m, 'renacimiento', 'romanticismo', 'rococo-neoclasicismo'].map((x) => ({ id: x, label: x })) };
};
const wrong = (q, chosen) => ({ q, correct: false, retry: false, chosen });
const right = (q) => ({ q, correct: true, retry: false, chosen: q.answerId });

test('detección: con RECALL_SLIPS fallos recientes se le olvida; con menos, no', () => {
  const p = learned(A, B);
  const fails = (n) => Array.from({ length: n }, (_, k) => wrong(who(A, [B, 'goya', 'murillo'], k % 2), B));
  p.slips = logAnswers([], fails(RECALL_SLIPS - 1), index, TODAY);
  assert.equal(forgottenSubject(p, index, TODAY), null);
  p.slips = logAnswers([], fails(RECALL_SLIPS), index, TODAY);
  const s = forgottenSubject(p, index, TODAY);
  assert.equal(s.type, 'artist');
  assert.equal(s.id, A);
  // Lo elegía en lugar de Vermeer: también cuenta para Rembrandt y es su confusión.
  assert.equal(s.confused, B);
  assert.equal(recallStats(p.slips, TODAY).get(`artist:${B}`).slips, RECALL_SLIPS);
});

test('detección: lo viejo (fuera de la ventana) y lo del propio pintor de la ronda no cuentan', () => {
  const p = learned(A, B);
  const fails = Array.from({ length: 4 }, () => wrong(who(A), 'goya'));
  p.slips = logAnswers([], fails, index, '2026-10-01');
  assert.equal(forgottenSubject(p, index, TODAY), null);
  p.slips = logAnswers([], fails, index, TODAY, { round: { artistId: A } });
  assert.equal(forgottenSubject(p, index, TODAY), null);
  // Un pintor sin dominar (aprendiéndolo) tampoco se propone.
  p.slips = logAnswers([], Array.from({ length: 4 }, () => wrong(who(NEW), 'goya')), index, TODAY);
  assert.equal(forgottenSubject(p, index, TODAY), null);
});

test('detección: nunca el mismo dos veces seguidas', () => {
  const p = learned(A, B);
  p.slips = logAnswers([], Array.from({ length: 3 }, () => wrong(who(A), 'goya')), index, TODAY);
  p.recall = { last: `artist:${A}`, date: TODAY };
  assert.equal(forgottenSubject(p, index, TODAY), null);
});

test('detección: el registro no crece sin fin', () => {
  const many = Array.from({ length: RECALL_LOG_MAX + 30 }, () => right(who(A)));
  assert.equal(logAnswers([], many, index, TODAY).length, RECALL_LOG_MAX);
});

test('detección de épocas: fallos de «¿De qué movimiento es?» y la época que confunde', () => {
  const p = learned(A, B);
  const m = index.artist(A).movementId;
  p.slips = logAnswers([], Array.from({ length: 3 }, (_, k) => wrong(movementQ(A, k % 2), 'rococo-neoclasicismo')), index, TODAY);
  const s = forgottenSubject(p, index, TODAY);
  assert.deepEqual([s.type, s.id, s.confused], ['movement', m, 'rococo-neoclasicismo']);
});

test('pintor y época a la vez: gana lo que más falla', () => {
  const p = learned(A, B);
  const authors = Array.from({ length: 3 }, () => wrong(who(A), 'goya'));
  const eras = Array.from({ length: 4 }, () => wrong(movementQ(A), 'romanticismo'));
  p.slips = logAnswers([], [...authors, ...eras], index, TODAY);
  assert.equal(forgottenSubject(p, index, TODAY).type, 'movement');
  p.slips = logAnswers([], [...authors, ...authors], index, TODAY);
  assert.equal(forgottenSubject(p, index, TODAY).type, 'artist');
});

test('nextStep: «Recordar» va detrás de «Repetir» y de «Por hoy, hecho» y delante del repaso', () => {
  const p = learned(A, B);
  p.slips = logAnswers([], Array.from({ length: 3 }, () => wrong(who(A), B)), index, TODAY);
  const step = nextStep(p, index, TODAY, { plan: { kind: 'map' } });
  assert.deepEqual([step.kind, step.to, step.label, step.artistId], ['recall', `repasar-${A}`, 'Repasar a Vermeer', A]);
  // Ronda floja de una etapa: primero repetir.
  const retry = nextStep(p, index, TODAY, { plan: { kind: 'stage', artistId: NEW }, outcome: { accuracy: 0.3, events: [] } });
  assert.equal(retry.kind, 'retry');
  // Meta del día cumplida: «Por hoy, hecho».
  assert.equal(nextStep(p, index, TODAY, { plan: { kind: 'stage', artistId: NEW }, outcome: { accuracy: 0.9, events: [] }, goalJustMet: true }).kind, 'done');
  // Con mucho pendiente (repaso general), «Recordar» va antes.
  p.fallados = index.worksOf(B).slice(0, 6).map((w) => ({ id: w.id, date: TODAY, times: 1, hits: 0 }));
  assert.equal(nextStep(p, index, TODAY, { plan: { kind: 'stage', artistId: NEW }, outcome: { accuracy: 0.9, events: [] } }).kind, 'recall');
  // Justo tras una sesión «Recordar», no otra.
  assert.notEqual(nextStep(p, index, TODAY, { plan: { kind: 'recall', artistId: B }, outcome: { accuracy: 1, events: [] } }).kind, 'recall');
  // El mapa también la propone, con su ruta.
  assert.equal(mapGuide(p, index, TODAY, {}).to, `repasar-${A}`);
});

test('una sola acción por pintor: «Repasar a X» (con prioridad si se le olvida) o «Nivel N de X» si tiene uno nuevo', () => {
  const p = learned(A, B);
  // Vermeer tiene un nivel 2 abierto: sin olvidos, eso es lo que toca.
  assert.equal(artistStep(p, index, A, TODAY).label, 'Nivel 2 de Vermeer');
  p.slips = logAnswers([], Array.from({ length: 3 }, () => wrong(who(A), B)), index, TODAY);
  const step = artistStep(p, index, A, TODAY);
  assert.deepEqual([step.kind, step.label, step.to], ['recall', 'Repasar a Vermeer', `repasar-${A}`]);
  // A otro pintor no le afecta.
  assert.notEqual(artistStep(p, index, 'goya', TODAY)?.kind, 'recall');
});

test('nextStep: la época se propone como «Recordar el Barroco»', () => {
  const p = learned(A, B);
  p.slips = logAnswers([], Array.from({ length: 3 }, () => wrong(movementQ(A), 'romanticismo')), index, TODAY);
  const step = nextStep(p, index, TODAY, { plan: { kind: 'map' } });
  assert.deepEqual([step.kind, step.to, step.label], ['recall', 'repasar-epoca-barroco', 'Repasar el Barroco']);
});

test('sesión de pintor: rasgos, cuadros, contraste solo si hay confusión y mini-ronda', () => {
  const p = learned(A, B);
  p.artists.goya = { plays: 1 };
  p.slips = logAnswers([], Array.from({ length: 3 }, () => wrong(who(A), B)), index, TODAY);
  const subject = forgottenSubject(p, index, TODAY);
  const seen = index.worksOf(A);
  const parts = recallParts(p, index, subject, TODAY, { seen });
  assert.ok(parts.traits.length >= 2 && parts.traits.length <= 3);
  assert.ok(parts.works.length >= 2 && parts.works.length <= 3);
  assert.equal(parts.rival, B);
  assert.ok(parts.contrast.text.length <= 180);
  assert.match(parts.contrast.text, /Vermeer.*Rembrandt/);
  assert.equal(parts.contrast.works.length, 2);
  assert.notEqual(index.artwork(parts.contrast.works[0].id).artistId, index.artwork(parts.contrast.works[1].id).artistId);
  const plan = planRecall(p, index, parts, 7, { seen });
  assert.equal(plan.kind, 'recall');
  assert.ok(plan.questions.length >= 4 && plan.questions.length <= RECALL_ROUND);
  assert.ok(plan.questions.every((q) => q.phase === 'recall'));
  // Sin confusión (fallos sin elegir a nadie en concreto), no hay tarjeta de contraste.
  const q = logAnswers([], [wrong(who(A), 'goya'), wrong(who(A), 'murillo'), wrong(who(A), 'zurbaran')], index, TODAY);
  const lone = recallParts({ ...p, slips: q }, index, forgottenSubject({ ...p, slips: q }, index, TODAY), TODAY, { seen });
  assert.equal(lone.contrast, null);
  assert.ok(CONFUSION_MIN >= 2);
});

test('sesión de época: tarjetas clave y contraste con un cuadro de cada una', () => {
  const cards = [{ kicker: 'Curiosidad', text: 'x', artwork: 'w1' }, { kicker: 'Fíjate en', text: 'f', artwork: 'w2' }, { kicker: 'Cuándo y dónde', text: 'c', artwork: 'w3' }];
  assert.deepEqual(eraKeyCards(cards).map((c) => c.kicker), ['Cuándo y dónde', 'Fíjate en']);
  const p = learned(A, B, 'watteau');
  p.slips = logAnswers([], Array.from({ length: 3 }, () => wrong(movementQ(A), 'rococo-neoclasicismo')), index, TODAY);
  const parts = recallParts(p, index, forgottenSubject(p, index, TODAY), TODAY);
  assert.equal(parts.type, 'movement');
  assert.match(parts.contrast.text, /^En el Barroco, .+\. En el Rococó y Neoclasicismo, .+\.$/);
  const plan = planRecall(p, index, parts, 3);
  assert.ok(plan.questions.length >= 4);
  assert.ok(plan.questions.every((q) => q.type === 'movement'));
  assert.equal(contrastLine('artist', { traits: [] }, { traits: ['x'] }), '');
});

test('historia sugerida: la etapa donde se concentran los fallos; si no, la primera sin ver; solo una', () => {
  assert.equal(suggestedStory([1]), null);
  assert.equal(suggestedStory([1, 2, 3, 4], [3, 3, 1]), 3);
  assert.equal(suggestedStory([1, 2, 3, 4], [1, 1, 3]), 2);
  assert.equal(suggestedStory([1, 2, 3], [], (l) => l === 2), 3);
  assert.equal(suggestedStory([1, 2, 3], [], () => true), 2);
  // «Repasar a X» empieza por la historia del nivel donde se concentran los fallos; si no, por la de nivel 1.
  assert.equal(firstStoryLevel([1, 2, 3, 4], [3, 3, 1]), 3);
  assert.equal(firstStoryLevel([1, 2, 3, 4], [1, 2, 3]), 1);
  assert.equal(firstStoryLevel([1], [1, 1, 1]), 1);
});

test('al terminar «Recordar», la cuenta de ese pintor vuelve a cero y queda como último', () => {
  const p = learned(A, B);
  p.slips = logAnswers([], [...Array.from({ length: 3 }, () => wrong(who(A), B)), wrong(who('goya'), 'murillo')], index, TODAY);
  const qs = [right(who(A)), right(who(A, undefined, 1))];
  const out = finishRound(p, index, { kind: 'recall', recallType: 'artist', artistId: A, answers: qs, firstTry: [true, true] }, TODAY);
  const stats = recallStats(out.progress.slips, TODAY);
  assert.equal(stats.get(`artist:${A}`), undefined);
  assert.equal(stats.get('artist:goya').slips, 1);
  assert.equal(out.progress.recall.last, `artist:${A}`);
  assert.equal(forgetSlips(p.slips, 'artist', A).length, 1);
  // Una ronda normal apunta sus respuestas.
  const next = finishRound(out.progress, index, { kind: 'srs', answers: [wrong(who(A), B)], firstTry: [false] }, TODAY);
  assert.equal(recallStats(next.progress.slips, TODAY).get(`artist:${A}`).slips, 1);
});

test('migración: un estado anterior recibe el registro vacío sin perder progreso', () => {
  const old = { version: SCHEMA_VERSION, onboarded: true, progress: { ...learned(A), slips: undefined, recall: undefined }, settings: {}, session: {} };
  delete old.progress.slips;
  delete old.progress.recall;
  const s = migrate(old);
  assert.deepEqual(s.progress.slips, []);
  assert.equal(s.progress.recall.last, '');
  assert.equal(s.progress.artists[A].mastered, true);
});

test('rutas de «Repasar»', () => {
  assert.deepEqual(parseRoute('#repasar-vermeer'), { name: 'recall', recallType: 'artist', id: 'vermeer' });
  assert.deepEqual(parseRoute('#repasar-epoca-barroco'), { name: 'recall', recallType: 'movement', id: 'barroco' });
  // No se confunde con la Prueba de época (#repaso-<movimiento>).
  assert.equal(parseRoute('#repaso-barroco').name, 'review');
});

// ---------------------------------------------------------------- «No lo sé»
test('«No lo sé»: no da puntos, no cuenta como acierto y rompe «seguidas» como un fallo', () => {
  const qs = [who(A), who(A, undefined, 1), who(B)];
  let r = createRound(qs);
  r = answerRound(r, true);
  r = answerRound(r, true);
  assert.equal(r.combo, 2);
  // «No lo sé» se registra como fallo (correct: false): la racha vuelve a 0 y la pregunta vuelve al final.
  r = answerRound(r, false);
  assert.equal(r.combo, 0);
  assert.equal(r.firstTry[2], false);
  assert.equal(r.queue.length, 4);
  assert.equal(xpForAnswer({ correct: false, isNew: true, combo: 3 }), 0);
  const p = learned(A, B);
  const out = finishRound(p, index, { kind: 'srs', answers: [right(qs[0]), { q: qs[2], correct: false, retry: false, chosen: null, dunno: true }], firstTry: [true, false] }, TODAY);
  assert.equal(out.score, 1);
  assert.equal(out.accuracy, 0.5);
});

test('«No lo sé» pesa doble para «Recordar»', () => {
  const p = learned(A, B);
  const dunno = { q: who(A), correct: false, retry: false, chosen: null, dunno: true };
  p.slips = logAnswers([], [dunno], index, TODAY);
  assert.equal(recallStats(p.slips, TODAY).get(`artist:${A}`).slips, RECALL_DUNNO_WEIGHT);
  assert.equal(forgottenSubject(p, index, TODAY), null);
  // Dos «No lo sé» bastan para proponerlo (antes que tres fallos).
  p.slips = logAnswers([], [dunno, dunno], index, TODAY);
  assert.equal(forgottenSubject(p, index, TODAY).id, A);
  assert.ok(2 * RECALL_DUNNO_WEIGHT >= RECALL_SLIPS);
});

test('tarjetas de la sesión: «Seguir» destacado e «Ir a las preguntas» en cada una; ver una historia sola acaba en «Volver»', async () => {
  const { copyHtml } = await import('../app/js/ui/story-card.js');
  const card = { text: 'Hola', artwork: 'w1' };
  const questions = 'Ir a las preguntas';
  const first = copyHtml(card, null, { last: false, questions });
  assert.match(first, /btn-primary[^>]*data-deck="next">Seguir/);
  assert.match(first, /data-deck="questions">Ir a las preguntas/);
  const last = copyHtml(card, null, { last: true, questions, suggest: 'Más de Velázquez: La corte ›' });
  assert.match(last, /story-suggest[^>]*>Más de Velázquez: La corte ›/);
  assert.match(last, /data-deck="play">Seguir/);
  // En un nivel, tras la historia solo vienen las preguntas: la última lleva «Ir a las preguntas» como principal y
  // «Más sobre…» (la ficha) como secundario.
  const level = copyHtml(card, null, { last: true, questions, questionsEnd: true, about: 'Más sobre Velázquez ›' });
  assert.doesNotMatch(level, /Seguir/);
  assert.match(level, /btn-primary[^>]*data-deck="play">Ir a las preguntas/);
  assert.match(level, /deck-secondary" data-deck="more">Más sobre Velázquez ›/);
  // Solo ver: «Volver» y, desde la ficha, repasar ese nivel.
  const watch = copyHtml(card, null, { last: true, endLabel: 'Volver', questions });
  assert.match(watch, /data-deck="play">Volver/);
  assert.match(watch, /data-deck="questions">Ir a las preguntas/);
});
