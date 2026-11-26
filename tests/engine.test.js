import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng, hashString } from '../app/js/engine/rng.js';
import {
  makeWhoQuestion, makeMovementQuestion, makeWhichQuestion, pickDistractorArtists, similarity, questionAlt,
} from '../app/js/engine/questions.js';
import {
  planStage, planMovementReview, planSrsReview, createRound, answerRound, roundDone, roundScore, currentItem,
} from '../app/js/engine/planner.js';
import { recordAnswer, dueKeys } from '../app/js/engine/srs.js';
import { daysBetween, addDays, weekOf, dayKey, expandDay } from '../app/js/engine/dates.js';
import { planDaily, dailyGrid, DAILY_SIZE } from '../app/js/engine/daily.js';
import { encodeChallenge, decodeChallenge, tokenForRound } from '../app/js/engine/challenge.js';
import { planChallenge } from '../app/js/engine/daily.js';
import { sampleIndex, bigIndex } from './helpers.js';

function assertValidQuestion(index, q) {
  assert.ok(q, 'pregunta generada');
  assert.equal(q.options.length, 4, 'cuatro opciones');
  const ids = q.options.map((o) => o.id);
  assert.equal(new Set(ids).size, 4, 'opciones únicas');
  assert.equal(ids.filter((id) => id === q.answerId).length, 1, 'exactamente una correcta');
  if (q.type === 'who') {
    for (const id of ids) assert.ok(index.artist(id), 'opción es un pintor válido');
    assert.equal(index.artwork(q.artworkId).artistId, q.answerId);
  }
  if (q.type === 'which') {
    const owners = q.options.map((o) => index.artwork(o.artworkId).artistId);
    assert.equal(owners.filter((a) => a === q.artistId).length, 1, 'solo una miniatura del pintor');
  }
  if (q.type === 'movement') {
    for (const id of ids) assert.ok(index.movement(id));
  }
  // No revela la respuesta en el enunciado ni en el alt.
  if (q.type !== 'which') {
    const artist = index.artist(q.artistId);
    const art = index.artwork(q.artworkId);
    for (const text of [q.prompt, questionAlt(q)]) {
      assert.ok(!text.includes(artist.name) && !text.includes(artist.short) && !text.includes(art.title));
    }
  } else {
    q.options.forEach((o, i) => assert.ok(!questionAlt(q, i).includes(index.artwork(o.artworkId).title)));
  }
}

test('RNG determinista con la misma semilla y distinto con otra', () => {
  const a = createRng(42);
  const b = createRng(42);
  const c = createRng(43);
  const sa = Array.from({ length: 5 }, () => a.next());
  const sb = Array.from({ length: 5 }, () => b.next());
  const sc = Array.from({ length: 5 }, () => c.next());
  assert.deepEqual(sa, sb);
  assert.notDeepEqual(sa, sc);
  assert.ok(sa.every((v) => v >= 0 && v < 1));
  assert.equal(hashString('abc'), hashString('abc'));
  assert.deepEqual(createRng('x').shuffle([1, 2, 3, 4, 5]), createRng('x').shuffle([1, 2, 3, 4, 5]));
  assert.deepEqual(createRng('x').shuffle([1, 2, 3, 4, 5]).sort(), [1, 2, 3, 4, 5]);
});

test('preguntas válidas de los tres tipos en muchas semillas', () => {
  const index = bigIndex();
  for (let s = 0; s < 200; s++) {
    const rng = createRng(s);
    const art = rng.pick(index.artworks.filter((w) => !index.artist(w.artistId).guest));
    const d = rng.next();
    assertValidQuestion(index, makeWhoQuestion(index, art, d, rng));
    assertValidQuestion(index, makeMovementQuestion(index, art, d, rng));
    assertValidQuestion(index, makeWhichQuestion(index, art, d, rng));
  }
});

test('con el catálogo de muestra (2 movimientos) no hay pregunta de movimiento y todo es válido', () => {
  const index = sampleIndex();
  const art = index.artworks[0];
  assert.equal(makeMovementQuestion(index, art, 0.5, createRng(1)), null);
  for (const a of index.path) {
    const plan = planStage(index, a.id, 7);
    for (const q of plan.questions) assertValidQuestion(index, q);
  }
});

test('distractores por parecido: con dificultad alta, mismo movimiento o confundibles', () => {
  const index = bigIndex();
  const target = index.artist('p32');
  let close = 0;
  let far = 0;
  for (let s = 0; s < 100; s++) {
    close += pickDistractorArtists(index, target, 3, 1, createRng(s)).filter((a) => similarity(index, target, a) >= 2).length;
    far += pickDistractorArtists(index, target, 3, 0, createRng(s)).filter((a) => similarity(index, target, a) >= 2).length;
  }
  assert.ok(close > 250, `dificultad alta elige parecidos (${close})`);
  assert.ok(far < 30, `dificultad baja elige lejanos (${far})`);
  // Nunca incluye al propio pintor
  for (let s = 0; s < 50; s++) assert.ok(!pickDistractorArtists(index, target, 3, 0.5, createRng(s)).some((a) => a.id === target.id));
});

test('planificador de etapa: conocer → una de calentamiento con lo visto → obras no vistas mezcladas con repaso, sin repetir obra', () => {
  const index = bigIndex();
  const artistId = 'p22';
  const plan = planStage(index, artistId, 123);
  assert.ok(plan.learn.length >= 2 && plan.learn.every((w) => w.role === 'learn' && w.artistId === artistId));
  const learnIds = new Set(plan.learn.map((w) => w.id));
  const subjectOf = (q) => (q.type === 'which' ? q.targetArtworkId : q.artworkId);
  const own = plan.questions.filter((q) => q.artistId === artistId);
  assert.equal(plan.questions[0].artistId, artistId, 'empieza por el pintor recién visto');
  assert.ok(!learnIds.has(subjectOf(plan.questions[0])), 'la primera no repite un cuadro recién enseñado');
  assert.ok(learnIds.has(subjectOf(plan.questions[1])), 'la segunda es de calentamiento con una obra vista');
  const seenOwn = own.filter((q) => learnIds.has(subjectOf(q)));
  const unseenAvailable = index.newWorks(artistId).length;
  assert.ok(seenOwn.length === 1 || unseenAvailable < own.length - 1, `vistas preguntadas: ${seenOwn.length}`);
  assert.ok(own.length >= 3, 'preguntas sobre obras suyas');
  const ownTypes = new Set(own.map((q) => q.type));
  assert.ok(ownTypes.has('who') && ownTypes.has('which'), 'mezcla de tipos');
  assert.ok(plan.questions.slice(1, 3).some((q) => q.artistId !== artistId), 'repaso intercalado desde el principio');
  assert.ok(plan.fresh.filter((q) => q.artistId === artistId).every((q) => q.isNew), 'las nuevas del pintor son obras no vistas');
  assert.ok(plan.fresh.some((q) => q.artistId !== artistId), 'mezcla con un pintor ya aprendido');
  for (const q of plan.questions) assert.equal(q.phase, index.artwork(subjectOf(q)).role === 'learn' ? 'practice' : 'fresh');
  const subjects = plan.questions.map(subjectOf);
  assert.equal(new Set(subjects).size, subjects.length, 'ninguna obra repetida');
  assert.deepEqual(planStage(index, artistId, 123), plan, 'determinista');
});

test('etapa sin trampa: «¿Quién lo pintó?» repartido, el pintor de la etapa de distractor y movimiento de otros', () => {
  const index = bigIndex();
  for (const artistId of ['p22', 'p31', 'p53']) {
    const artist = index.artist(artistId);
    for (let seed = 1; seed <= 30; seed++) {
      const plan = planStage(index, artistId, seed);
      const who = plan.questions.filter((q) => q.type === 'who');
      const other = who.filter((q) => q.answerId !== artistId);
      assert.ok(other.length * 2 >= who.length, `${artistId}/${seed}: ${other.length} de ${who.length} con otra respuesta`);
      for (const q of other) assert.ok(q.options.some((o) => o.id === artistId), 'el pintor de la etapa sale de distractor');
      const learnedBefore = (id) => index.pathIndex(id) >= 0 && index.pathIndex(id) < index.pathIndex(artistId);
      for (const q of who.filter((x) => x.answerId === artistId)) {
        assert.ok(q.options.some((o) => learnedBefore(o.id)), 'un pintor ya aprendido de distractor');
      }
      for (const q of plan.questions.filter((x) => x.type === 'movement')) {
        assert.ok(q.options.some((o) => o.id === artist.movementId), 'el movimiento de la etapa sale entre las opciones');
        const subject = index.artist(index.artwork(q.artworkId).artistId);
        assert.ok(subject.id === artistId || learnedBefore(subject.id), 'la obra es de un pintor ya visto o del propio');
      }
      const whichOther = plan.questions.filter((q) => q.type === 'which' && q.artistId !== artistId);
      assert.ok(whichOther.length >= 1, '«¿Cuál es de X?» de un pintor anterior');
    }
  }
});

test('ronda: los fallos reaparecen al final una sola vez y no cuentan como acierto', () => {
  const index = bigIndex();
  const plan = planStage(index, 'p11', 5);
  let round = createRound(plan.questions);
  const n = plan.questions.length;
  const failedId = currentItem(round).q;
  round = answerRound(round, false);
  for (let i = 1; i < n; i++) round = answerRound(round, true);
  assert.ok(!roundDone(round));
  const retry = currentItem(round);
  assert.equal(retry.retry, true);
  assert.equal(retry.q.answerId, failedId.answerId);
  round = answerRound(round, false); // fallar el reintento no lo vuelve a encolar
  assert.ok(roundDone(round));
  assert.equal(roundScore(round), n - 1);
  assert.equal(round.firstTry[0], false);
});

test('repaso de movimiento incluye preguntas de movimiento y opciones válidas', () => {
  const index = bigIndex();
  const plan = planMovementReview(index, 'mov3', 9);
  assert.equal(plan.questions.length, 10);
  assert.ok(plan.questions.some((q) => q.type === 'movement'));
  plan.questions.forEach((q) => assertValidQuestion(index, q));
  // Los invitados aparecen como distractores en alguna semilla
  let guests = 0;
  for (let s = 0; s < 30; s++) {
    for (const q of planMovementReview(index, 'mov3', s).questions) {
      if (q.type === 'who') guests += q.options.filter((o) => index.artist(o.id).guest).length;
    }
  }
  assert.ok(guests > 0);
});

test('SRS Leitner: acertar aleja el repaso, fallar lo trae al día siguiente', () => {
  const today = '2026-11-23';
  let srs = recordAnswer({}, 'art:w1', true, today);
  assert.deepEqual(srs['art:w1'], { box: 1, due: '2026-11-24' });
  srs = recordAnswer(srs, 'art:w1', true, '2026-11-24');
  assert.deepEqual(srs['art:w1'], { box: 2, due: '2026-11-27' });
  srs = recordAnswer(srs, 'art:w1', false, '2026-11-27');
  assert.deepEqual(srs['art:w1'], { box: 1, due: '2026-11-28' });
  srs = recordAnswer(srs, 'art:w2', true, today);
  assert.deepEqual(dueKeys(srs, '2026-11-23'), []);
  assert.deepEqual(dueKeys(srs, '2026-11-24'), ['art:w2']);
  assert.deepEqual(dueKeys(srs, '2026-11-30').sort(), ['art:w1', 'art:w2']);
  const plan = planSrsReview(bigIndex(), ['art:w1', 'art:w2', 'artist:p33'], 1);
  assert.equal(plan.questions.length, 3);
});

test('fechas locales: diferencias, semana y validación', () => {
  assert.equal(daysBetween('2026-03-28', '2026-03-30'), 2); // cambio de hora en España
  assert.equal(daysBetween('2026-12-31', '2027-01-01'), 1);
  assert.equal(addDays('2026-02-28', 1), '2026-03-01');
  assert.deepEqual(weekOf('2026-11-23'), ['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29']);
  assert.equal(weekOf('2026-11-29')[0], '2026-11-23');
  assert.equal(dayKey(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
  assert.equal(expandDay('20261123'), '2026-11-23');
  assert.equal(expandDay('20261332'), null);
});

test('reto diario determinista por fecha y distinto entre fechas', () => {
  const index = bigIndex();
  const a = planDaily(index, '2026-11-23');
  const b = planDaily(index, '2026-11-23');
  const c = planDaily(index, '2026-11-24');
  assert.equal(a.questions.length, DAILY_SIZE);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a.questions, c.questions);
  a.questions.forEach((q) => assertValidQuestion(index, q));
  // Solo pintores con etapa (no invitados) como protagonistas
  assert.ok(a.questions.every((q) => !index.artist(q.artistId).guest));
  assert.equal(dailyGrid([true, false, true]), '🟩⬜🟩');
});

test('reto a un amigo: codificar y decodificar hash plano y reconstruir la misma ronda', () => {
  const index = bigIndex();
  const stage = planStage(index, 'p23', 987654321);
  const token = tokenForRound(index, stage);
  const hash = encodeChallenge(token, 7);
  assert.match(hash, /^[a-z0-9-]+$/);
  assert.ok(hash.startsWith('reto-'));
  const dec = decodeChallenge(`#${hash}`);
  assert.equal(dec.score, 7);
  assert.equal(dec.kind, 'stage');
  assert.deepEqual(planChallenge(index, dec).questions, stage.questions);

  const review = planMovementReview(index, 'mov2', 55);
  assert.deepEqual(planChallenge(index, decodeChallenge(encodeChallenge(tokenForRound(index, review), 3))).questions, review.questions);
  const daily = planDaily(index, '2026-11-23');
  const dd = decodeChallenge(encodeChallenge(tokenForRound(index, daily), DAILY_SIZE));
  assert.equal(dd.date, '2026-11-23');
  assert.deepEqual(planChallenge(index, dd).questions, daily.questions);

  for (const bad of ['', '#reto-', '#reto-diario', '#reto-zz-1', '#reto-s1x2-999', '#reto-d20261399-3', '#Reto-s1x2-3', '#reto-s1x2-3&x=1']) {
    assert.equal(decodeChallenge(bad), null, bad);
  }
  assert.equal(planChallenge(index, decodeChallenge('#reto-szzx1-3')), null, 'índice fuera de rango');
});
