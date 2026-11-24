// Repaso «más machacón sin deprimir» (v12): días de gracia, cuadros fallados que vuelven, cuadro de
// repaso escondido en cada etapa, pintores dormidos, repaso de 5 y cierre del día. Sin navegador: el
// motor se prueba directamente y las pantallas, por el HTML que construyen.
import { test } from 'node:test';
import assert from 'node:assert/strict';

// accentStyle y compañía leen variables CSS del documento: lo mínimo para que no haga falta navegador.
globalThis.document = { documentElement: {} };
globalThis.getComputedStyle = () => ({ getPropertyValue: () => '#000000' });
const { graceSavedText } = await import('../app/js/ui/screens/result.js');
const { graceLine } = await import('../app/js/ui/screens/profile.js');

test('racha a salvo: textos del resultado y del perfil coherentes con los días de gracia', () => {
  assert.equal(graceSavedText(0), '');
  assert.equal(graceSavedText(1), 'Racha a salvo: te quedaba un día de gracia');
  assert.equal(graceSavedText(2), 'Racha a salvo: te quedaban dos días de gracia');
  assert.equal(graceLine(2), 'Te quedan 2 días de gracia esta semana');
  assert.equal(graceLine(1), 'Te queda 1 día de gracia esta semana');
  assert.equal(graceLine(0), 'Sin días de gracia hasta el lunes');
  for (const t of [graceSavedText(1), graceSavedText(2), graceLine(0), graceLine(1), graceLine(2)]) {
    assert.doesNotMatch(t, /ayer|mañana/i);
  }
});

// ---------------------------------------------------------------- 2. Errores que vuelven
const { bigIndex } = await import('./helpers.js');
const { createRng } = await import('../app/js/engine/rng.js');
const { makeWhoQuestion, makeWhichQuestion, makeMovementQuestion, retryQuestion } = await import('../app/js/engine/questions.js');
const { planStage, createRound, answerRound, roundDone } = await import('../app/js/engine/planner.js');
const { emptyProgress, finishRound } = await import('../app/js/engine/progress.js');
const { updateFallados, falladoQuestion, oldestFallado, FALLADO_HITS } = await import('../app/js/engine/fallados.js');
const { makeSession, readSession } = await import('../app/js/state/session.js');

const big = bigIndex();
const workOf = (artistId, k = 0) => big.worksOf(artistId)[k];
const who = (w, seed = 1) => makeWhoQuestion(big, w, 0.3, createRng(`t${seed}`));

test('fallados: entra al fallar a la primera, el reintento acertado cuenta y sale al acertar dos veces', () => {
  const w = workOf('p11');
  const q = who(w);
  let list = updateFallados([], [{ q, correct: false, retry: false }], '2026-11-20');
  assert.deepEqual(list, [{ id: w.id, date: '2026-11-20', times: 1, hits: 0 }]);
  list = updateFallados(list, [{ q, correct: false, retry: true }], '2026-11-20');
  assert.equal(list[0].times, 1, 'el reintento fallado no es un fallo nuevo');
  list = updateFallados(list, [{ q, correct: true, retry: true }], '2026-11-20');
  assert.equal(list[0].hits, 1);
  // Otro fallo reinicia la cuenta de aciertos.
  list = updateFallados(list, [{ q, correct: false, retry: false }], '2026-11-21');
  assert.deepEqual(list[0], { id: w.id, date: '2026-11-21', times: 2, hits: 0 });
  for (let i = 0; i < FALLADO_HITS; i++) list = updateFallados(list, [{ q, correct: true, retry: false }], '2026-11-22');
  assert.deepEqual(list, [], 'sale al acertarse dos veces');
  // Lo que no cuenta (pintores aún no vistos) no entra.
  assert.deepEqual(updateFallados([], [{ q, correct: false, retry: false }], '2026-11-20', () => true), []);
});

test('reintento al final de la ronda: el mismo cuadro con otra mecánica', () => {
  const rng = createRng('retry');
  const w = workOf('p21', 1);
  const q1 = who(w);
  const r1 = retryQuestion(big, q1, rng);
  assert.equal(r1.type, 'which');
  assert.equal(r1.targetArtworkId, w.id);
  assert.equal(r1.options.length, 4);
  const q2 = makeWhichQuestion(big, w, 0.3, rng);
  const r2 = retryQuestion(big, q2, rng);
  assert.equal(r2.type, 'who');
  assert.equal(r2.artworkId, w.id);
  const q3 = makeMovementQuestion(big, w, 0.3, rng);
  const r3 = retryQuestion(big, q3, rng);
  assert.equal(r3.type, 'movement');
  assert.deepEqual(r3.options.map((o) => o.id).sort(), q3.options.map((o) => o.id).sort());
});

test('pregunta extra de un fallado: al final, como reintento (no cuenta para aciertos ni dominio)', () => {
  const plan = planStage(big, 'p13', 5);
  const old = workOf('p11', 4);
  const p = { ...emptyProgress(), fallados: [{ id: workOf('p12', 4).id, date: '2026-11-19', times: 1, hits: 0 }, { id: old.id, date: '2026-11-10', times: 2, hits: 1 }] };
  const extra = falladoQuestion(p, big, plan.questions, 5, () => true);
  assert.ok(extra, 'no hay pregunta extra');
  assert.equal(extra.type === 'which' ? extra.targetArtworkId : extra.artworkId, old.id, 'no es el más antiguo');
  assert.equal(oldestFallado(p, big, { accept: (w) => w.artistId !== 'p11' }).id, workOf('p12', 4).id);
  let round = createRound(plan.questions, [extra]);
  assert.equal(round.queue.length, plan.questions.length + 1);
  assert.equal(round.firstTry.length, plan.questions.length);
  assert.equal(round.queue.at(-1).retry, true);
  const answers = [];
  while (!roundDone(round)) {
    const item = round.queue[round.pos];
    const correct = item.q === extra ? false : true;
    round = answerRound(round, correct);
    answers.push({ q: item.q, correct, retry: item.retry, combo: 0 });
  }
  assert.equal(round.queue.length, plan.questions.length + 1, 'el extra fallado no se repite otra vez');
  assert.ok(round.firstTry.every((v) => v === true), 'el extra no cuenta para los aciertos');
  const out = finishRound(p, big, { kind: 'stage', artistId: 'p13', answers, firstTry: round.firstTry }, '2026-11-20');
  assert.equal(out.accuracy, 1);
  assert.equal(out.progress.stats.answered, plan.questions.length, 'el extra no cuenta en la precisión');
  assert.equal(out.progress.fallados.find((f) => f.id === old.id).times, 2, 'fallar el extra no suma otro fallo');
  assert.equal(out.progress.seen.p13, '2026-11-20');
  // La ronda guardada con el extra se puede retomar.
  const session = makeSession({ route: 'etapa-p13', title: 'P13', kind: 'stage', plan: { kind: 'stage', seed: 5, artistId: 'p13' } },
    { round: { ...createRound(plan.questions, [extra]), pos: plan.questions.length }, answers: [], xpLive: 0 }, 1000);
  const back = readSession({ session }, big, 2000);
  assert.ok(back && back.round.queue.at(-1).retry, 'la ronda con extra no se retoma');
});
