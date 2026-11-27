// Cronología sin años (engine/chrono.js): antes, después o a la vez entre pintores, solo con los ya conocidos, y preguntas
// solo cuando la distancia es grande (del orden de un siglo).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildIndex } from '../app/js/engine/catalog.js';
import { emptyProgress } from '../app/js/engine/progress.js';
import { createRng } from '../app/js/engine/rng.js';
import {
  relation, isAskable, relationPhrase, ribbonPositions, timeOf, beforePair, knownArtists, centuryOf,
  REL, RIBBON_EDGE, RIBBON_MIN_GAP, ASK_GAP,
} from '../app/js/engine/chrono.js';

const here = dirname(fileURLToPath(import.meta.url));
const real = buildIndex(JSON.parse(readFileSync(join(here, '..', 'app', 'data', 'catalog.json'), 'utf8')));
const A = (id) => real.artist(id);

// Progreso con estos pintores ya vistos (dominados).
function knowing(ids) {
  const p = emptyProgress();
  for (const id of ids) p.artists[id] = { plays: 1, best: 1, mastered: true };
  return p;
}

test('regla: antes si murió antes de que el otro cumpliera 25 o nació 20 años antes; si no, a la vez', () => {
  assert.equal(relation(A('masaccio'), A('piero')), REL.BEFORE); // Masaccio murió con Piero de 13
  assert.equal(relation(A('piero'), A('masaccio')), REL.AFTER);
  assert.equal(relation(A('parmigianino'), A('bronzino')), REL.TOGETHER); // los dos de 1503
  assert.equal(relation(A('ribera'), A('artemisia')), REL.TOGETHER);
  assert.equal(relation(A('leonardo'), A('rafael')), REL.BEFORE); // 31 años mayor
  assert.equal(relation({ born: 1500 }, A('rafael')), null);
});

test('solo se pregunta con mucha distancia (un siglo sí, diez años no) y nunca entre contemporáneos', () => {
  assert.ok(ASK_GAP >= 80 && ASK_GAP <= 100);
  assert.ok(isAskable(A('botticelli'), A('caravaggio')), 'más de un siglo');
  assert.ok(isAskable(A('giotto'), A('velazquez')));
  assert.ok(isAskable(A('masaccio'), A('goya')));
  assert.ok(!isAskable(A('masaccio'), A('piero')), '14 años: no aporta');
  assert.ok(!isAskable(A('leonardo'), A('rafael')), 'mismo Renacimiento, 31 años');
  assert.ok(!isAskable(A('parmigianino'), A('bronzino')));
  assert.ok(!isAskable(A('goya'), A('ingres')), 'épocas distintas pero 34 años');
  assert.ok(!isAskable(A('van-der-weyden'), A('botticelli')), 'otra escuela, pero menos de medio siglo');
});

test('frases sacadas de las fechas, sin años sueltos', () => {
  assert.equal(relationPhrase(A('masaccio'), A('piero')), 'Cuando murió Masaccio, Piero della Francesca tenía 13 años.');
  assert.equal(relationPhrase(A('piero'), A('masaccio')), 'Cuando murió Masaccio, Piero della Francesca tenía 13 años.');
  assert.equal(relationPhrase(A('giotto'), A('velazquez')), 'Entre Giotto y Velázquez hay más de dos siglos.');
  assert.equal(relationPhrase(A('masaccio'), A('botticelli')), 'Cuando nació Botticelli, Masaccio ya había muerto.');
  assert.equal(relationPhrase(A('ribera'), A('artemisia')), 'Ribera y Artemisia vivieron a la vez.');
  for (const a of real.artists) for (const b of [A('rafael'), A('goya')]) assert.ok(!/ayer|mañana/i.test(relationPhrase(a, b)));
});

test('cinta: en orden, dentro de los bordes y sin pegarse', () => {
  const at = ribbonPositions([1401, 1415, 1445, 1446]);
  assert.equal(at[0], RIBBON_EDGE);
  assert.ok(at.every((x, i) => i === 0 || x - at[i - 1] >= RIBBON_MIN_GAP - 0.1), JSON.stringify(at));
  assert.ok(at.at(-1) <= 100 - RIBBON_EDGE);
  assert.deepEqual(ribbonPositions([1500]), [50]);
});

test('pintores conocidos = los ya vistos por el usuario', () => {
  assert.deepEqual(knownArtists(emptyProgress(), real), []);
  assert.deepEqual(knownArtists(knowing(['botticelli', 'masaccio']), real, 'masaccio').map((a) => a.id), ['botticelli']);
  // Con `met` (historia vista o nivel jugado, como las preguntas por autor), solo esos.
  assert.deepEqual(knownArtists(knowing(['botticelli', 'masaccio']), real, '', ['masaccio']).map((a) => a.id), ['masaccio']);
});

test('«Su tiempo»: vecinos conocidos con barras de vida, frase y siglos del eje', () => {
  const t = timeOf(real, knowing(['botticelli', 'masaccio', 'piero']), 'piero');
  assert.deepEqual(t.neighbours.map((n) => n.id), ['masaccio', 'piero', 'botticelli']);
  assert.equal(t.phrase, 'Llegó después de Masaccio y coincidió con Botticelli.');
  const me = t.neighbours.find((n) => n.current);
  assert.equal(me.relation, null);
  assert.ok(t.neighbours.every((n) => n.from >= 0 && n.to <= 100 && n.from < n.to));
  assert.deepEqual(t.axis.map((x) => x.label), ['XV', 'XVI']);
  const alone = timeOf(real, emptyProgress(), 'piero');
  assert.deepEqual(alone.neighbours.map((n) => n.id), ['piero']);
  assert.equal(alone.phrase, '');
  assert.equal(centuryOf(1401), 'XV');
  assert.equal(centuryOf(1900), 'XIX');
});

test('«¿Quién fue antes?»: solo parejas de conocidos de otra época', () => {
  const rng = createRng('pareja');
  assert.equal(beforePair([A('parmigianino'), A('bronzino'), A('rafael')], rng), null);
  for (let i = 0; i < 20; i++) {
    const pair = beforePair([A('masaccio'), A('piero'), A('goya'), A('velazquez')], rng);
    assert.ok(isAskable(pair.earlier, pair.later) && relation(pair.earlier, pair.later) === REL.BEFORE);
  }
});

const { planSrsReview, planReview5 } = await import('../app/js/engine/planner.js');
const { makeBeforeQuestion, BEFORE_TYPE, BEFORE_SHARE } = await import('../app/js/engine/question-before.js');
const { feedbackFor } = await import('../app/js/engine/feedback.js');
const { retryQuestion, artworksInQuestion } = await import('../app/js/engine/questions.js');
const { makeSession, withSession, readSession } = await import('../app/js/state/session.js');
const { finishRound } = await import('../app/js/engine/finish.js');

const KNOWN = ['giotto', 'masaccio', 'botticelli', 'rafael', 'velazquez', 'goya', 'monet'].map(A);
const dueOf = (n) => real.path.slice(0, n).map((a) => `artist:${a.id}`);

test('repasos: «¿Quién fue antes?» como mucho una por ronda, no en todas y nunca la primera', () => {
  let withIt = 0;
  const SEEDS = 200;
  for (let s = 1; s <= SEEDS; s++) {
    const plain = planSrsReview(real, dueOf(8), s);
    const plan = planSrsReview(real, dueOf(8), s, undefined, { known: KNOWN });
    const before = plan.questions.filter((q) => q.type === BEFORE_TYPE);
    assert.ok(before.length <= 1);
    assert.equal(plain.questions.filter((q) => q.type === BEFORE_TYPE).length, 0, 'sin conocidos, nunca');
    // El resto del repaso no cambia.
    assert.deepEqual(plan.questions.filter((q) => q.type !== BEFORE_TYPE), plain.questions);
    if (!before.length) continue;
    withIt++;
    assert.notEqual(plan.questions[0].type, BEFORE_TYPE);
    const [q] = before;
    assert.ok(isAskable(A(q.answerId), A(q.laterId)) && relation(A(q.answerId), A(q.laterId)) === REL.BEFORE);
    assert.ok(q.options.every((o) => real.artwork(o.artworkId).artistId === o.id));
  }
  assert.ok(withIt > 0 && withIt < SEEDS * (BEFORE_SHARE + 0.1), `${withIt} de ${SEEDS}`);
  // Con contemporáneos solamente, nunca (sería una trampa).
  for (let s = 1; s <= 30; s++) {
    const plan = planReview5(real, real.worksOf('parmigianino').slice(0, 5).map((w) => w.id), s, { known: [A('parmigianino'), A('bronzino')] });
    assert.ok(!plan.questions.some((q) => q.type === BEFORE_TYPE));
  }
});

test('«¿Quién fue antes?»: respuesta con frase y mini cinta, reintento igual y se guarda y retoma la ronda', () => {
  const rng = createRng('antes');
  const q = { ...makeBeforeQuestion(real, KNOWN, rng), phase: 'srs' };
  const ok = feedbackFor(real, q, true, new Map(), null);
  assert.ok(ok.lines[0].length > 10 && !ok.chosen);
  assert.equal(ok.ribbon[0].id, q.answerId);
  assert.ok(ok.ribbon[0].current && ok.ribbon.at(-1).id === q.laterId);
  const bad = feedbackFor(real, q, false, new Map(), null, { chosenId: q.laterId });
  assert.match(bad.title, /^Antes fue /);
  assert.deepEqual(retryQuestion(real, q, rng), q);
  assert.deepEqual(artworksInQuestion(q), q.options.map((o) => o.artworkId));
  // Guardar y retomar.
  const round = { queue: [{ q, base: 0, retry: false }], pos: 0, baseCount: 1, firstTry: [null], combo: 0, bestCombo: 0 };
  const now = Date.now();
  const state = withSession({}, makeSession({ route: 'repaso', kind: 'srs', plan: { kind: 'srs', seed: 1 } }, { round, answers: [] }, now));
  const back = readSession(state, real, now + 1000);
  assert.deepEqual(back.round.queue[0].q, q);
  // Una respuesta que no es ninguna de las dos opciones no se acepta.
  const forged = withSession({}, makeSession({ route: 'repaso', kind: 'srs', plan: {} }, { round: { ...round, queue: [{ q: { ...q, answerId: 'goya' }, base: 0, retry: false }] }, answers: [] }, now));
  assert.equal(readSession(forged, real, now + 1000), null);
  // Al terminar cuenta como respuesta, pero no toca colección, repaso espaciado ni fallados.
  const p = finishRound(emptyProgress(), real, { kind: 'srs', answers: [{ q, correct: false, retry: false, combo: 0 }], firstTry: [false] }, '2026-11-26');
  assert.equal(p.progress.stats.answered, 1);
  assert.deepEqual(p.progress.collection, {});
  assert.deepEqual(p.progress.fallados, []);
  assert.deepEqual(p.progress.srs, {});
});

const { artistStatus, nextStep } = await import('../app/js/engine/progress.js');

test('orden del Alto Renacimiento (Leonardo → Miguel Ángel → Rafael) sin perder el progreso guardado por ids', () => {
  assert.deepEqual(real.path.slice(4, 7).map((a) => a.id), ['leonardo', 'miguel-angel', 'rafael']);
  // Partida de antes del cambio: ya había dominado a Rafael (iba antes que Leonardo).
  const p = knowing(['botticelli', 'masaccio', 'piero', 'berruguete', 'rafael']);
  assert.equal(artistStatus(p, real, 'rafael'), 'mastered', 'sigue dominado y se puede volver a jugar (la ruta mira el estado)');
  assert.equal(artistStatus(p, real, 'leonardo'), 'available');
  assert.equal(nextStep(p, real)?.id, 'leonardo');
  assert.equal(artistStatus(p, real, 'miguel-angel'), 'locked');
});
