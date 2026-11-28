// Preguntas de concepto tras las tarjetas de una época (medallón) o de un tramo (rombo): engine/concepts.js,
// ui/concept-quiz.js, ui/concept-question.js y su enganche en flows.js y sign-cards.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { realIndex } from './helpers-real.js';
import { emptyProgress } from '../app/js/engine/progress.js';
import { createRng } from '../app/js/engine/rng.js';
import { createRound, answerRound } from '../app/js/engine/round.js';
import { recallStats, forgottenSubject, logAnswers, RECALL_SLIPS } from '../app/js/engine/recall.js';
import { retryQuestion, artworksInQuestion } from '../app/js/engine/questions.js';
import {
  cleanBank, bankFor, planConcepts, pickConcepts, conceptQuestion, conceptFeedback, finishConcepts, recentConcepts,
  ERA, TRAMO, ERA_QUIZ, TRAMO_QUIZ, CONCEPT_TYPE,
} from '../app/js/engine/concepts.js';
import { parseRoute, conceptsRoute, tramoSlug } from '../app/js/ui/router.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const app = join(root, 'app');
const src = (...p) => readFileSync(join(app, 'js', ...p), 'utf8');
const index = realIndex();
const bank = cleanBank(JSON.parse(readFileSync(join(app, 'data', 'preguntas-concepto.json'), 'utf8')));
const TODAY = '2026-11-28';
const tramos = [...new Set(index.path.map((a) => a.section).filter(Boolean))];

function learned(...ids) {
  const p = emptyProgress();
  for (const id of ids) p.artists[id] = { plays: 2, best: 1, mastered: true, last: '2026-11-01', works: [] };
  return p;
}
// Responde una tanda: right(q) dice si se acierta; si no, se elige la primera opción mala.
function answer(questions, right = () => false) {
  return questions.map((q) => {
    const ok = right(q);
    return { q, correct: ok, retry: false, chosen: ok ? q.answerId : q.options.find((o) => o.id !== q.answerId).id };
  });
}

test('el banco cubre cada época del camino (3-5) y cada tramo (2-3), y el contenido publicado es igual al de contenido/', () => {
  for (const m of index.visibleMovements) {
    const n = bankFor(bank, ERA, m.id).length;
    assert.ok(n >= 3 && n <= 5, `${m.id}: ${n}`);
  }
  for (const key of tramos) {
    const n = bankFor(bank, TRAMO, key).length;
    assert.ok(n >= 2 && n <= 3, `${key}: ${n}`);
  }
  const source = JSON.parse(readFileSync(join(root, 'contenido', 'preguntas-concepto.json'), 'utf8'));
  assert.deepEqual(cleanBank(source), bank);
});

test('cada pregunta: opciones con su porqué (≤180), fuente y sin fechas sueltas; las «¿Cuál…?» con la buena de la época', () => {
  for (const q of bank) {
    assert.ok(q.source.startsWith('https://'), q.id);
    assert.doesNotMatch(q.prompt, /\b1\d{3}\b/, q.id);
    for (const o of q.options) {
      assert.ok(o.why && o.why.length <= 180, `${q.id}/${o.id}`);
      if (o.text) assert.doesNotMatch(o.text, /\b1\d{3}\b/, `${q.id}/${o.id}`);
    }
    if (q.kind === 'cual') {
      for (const o of q.options) {
        const era = index.artist(index.artwork(o.work).artistId).movementId;
        assert.equal(era === q.movementId, o.id === q.answer, `${q.id}/${o.id}`);
      }
    }
  }
});

test('al llegar a una época sin pintores conocidos, tres preguntas de concepto que prefieren los cuadros de sus tarjetas', () => {
  const cards = JSON.parse(readFileSync(join(app, 'data', 'epocas', 'barroco.json'), 'utf8')).cards;
  const cardWorks = new Set(cards.map((c) => c.artwork));
  const qs = planConcepts(emptyProgress(), index, bank, ERA, 'barroco', createRng('a'), { cardWorks });
  assert.equal(qs.length, ERA_QUIZ);
  assert.ok(qs.every((q) => q.type === CONCEPT_TYPE));
  assert.ok(qs.every((q) => artworksInQuestion(q).some((id) => cardWorks.has(id))), 'todas usan algún cuadro de las tarjetas');
  // Sin cuadros repetidos en la tanda.
  const all = qs.flatMap((q) => artworksInQuestion(q));
  assert.equal(new Set(all).size, all.length);
});

test('con pintores de la época ya conocidos: dos «¿De qué época es?» con sus cuadros y una de concepto', () => {
  const p = learned('caravaggio', 'velazquez', 'rembrandt');
  const qs = planConcepts(p, index, bank, ERA, 'barroco', createRng('b'));
  assert.equal(qs.length, ERA_QUIZ);
  const images = qs.filter((q) => q.type === 'movement');
  assert.equal(images.length, 2);
  assert.ok(images.every((q) => q.answerId === 'barroco' && ['caravaggio', 'velazquez', 'rembrandt'].includes(q.artistId)));
  assert.equal(qs.filter((q) => q.type === CONCEPT_TYPE).length, 1);
});

test('el primer tramo de cada época va con el medallón: sus preguntas entran en la tanda de la época', () => {
  const seen = new Set();
  for (let i = 0; i < 30; i++) {
    planConcepts(emptyProgress(), index, bank, ERA, 'renacimiento', createRng(`m${i}`)).forEach((q) => seen.add(q.conceptId));
  }
  assert.ok(bankFor(bank, TRAMO, 'Nace el Renacimiento').some((q) => seen.has(q.id)));
  assert.ok(bankFor(bank, ERA, 'renacimiento').some((q) => seen.has(q.id)));
});

test('tras las tarjetas de un tramo, dos preguntas de concepto de ese tramo', () => {
  for (const key of tramos) {
    const qs = planConcepts(emptyProgress(), index, bank, TRAMO, key, createRng(key));
    assert.equal(qs.length, TRAMO_QUIZ, key);
    assert.ok(qs.every((x) => x.options.map((o) => o.id).join('') === 'abcd'), 'las letras se reparten tras barajar');
    assert.ok(qs.every((q) => q.type === CONCEPT_TYPE && bankFor(bank, TRAMO, key).some((b) => b.id === q.conceptId)), key);
  }
});

test('no dan la respuesta antes de tiempo: las opciones de «¿Cuál…?» no llevan texto y ninguna obra delata al autor', () => {
  for (const item of bank) {
    const q = conceptQuestion(index, item, createRng(item.id));
    if (q.kind === 'cual') {
      assert.ok(q.options.every((o) => o.label === '' && o.artworkId && !index.artwork(o.artworkId).spoiler), item.id);
    }
    for (const id of q.works) {
      const w = index.artwork(id);
      assert.ok(!w.spoiler || (w.signs && w.signs.length), `${item.id}: ${id} con firma sin velo`);
    }
  }
  const html = src('ui', 'concept-question.js');
  assert.match(html, /veilsHtml\(w\)/, 'las firmas van veladas');
  assert.match(html, /cq-title[^`]*"><\/p>/, 'el título empieza vacío');
});

test('no se repite la misma pregunta seguida: rota por las menos recientes', () => {
  let p = emptyProgress();
  let last = null;
  for (let round = 0; round < 6; round++) {
    const qs = planConcepts(p, index, bank, ERA, 'impresionismo', createRng(`r${round}`));
    if (last) {
      assert.notEqual(qs[0].conceptId, last, 'la primera no es la última de la vez anterior');
      assert.ok(!qs.some((q) => q.conceptId === last), 'la más reciente descansa una tanda');
    }
    p = finishConcepts(p, index, answer(qs, () => true), TODAY, 'impresionismo');
    last = qs[qs.length - 1].conceptId;
  }
  // En un tramo de dos, el orden alterna: nunca dos veces la misma seguida.
  let q = emptyProgress();
  let prev = null;
  for (let round = 0; round < 4; round++) {
    const qs = planConcepts(q, index, bank, TRAMO, 'Luz en la oscuridad', createRng(`t${round}`));
    if (prev) assert.notEqual(qs[0].conceptId, prev);
    q = finishConcepts(q, index, answer(qs, () => true), TODAY, 'barroco');
    prev = qs[qs.length - 1].conceptId;
  }
  assert.ok(recentConcepts(q).length <= 24);
  // Reabierto el cartel, una sola pregunta (la menos reciente): nunca las mismas dos otra vez.
  const again = planConcepts(q, index, bank, TRAMO, 'Pintores de reyes', createRng('re'));
  assert.equal(again.length, 2, 'la primera vez en ese tramo, dos');
  const after = finishConcepts(q, index, answer(again, () => true), TODAY, 'barroco');
  const once = planConcepts(after, index, bank, TRAMO, 'Pintores de reyes', createRng('re2'));
  assert.deepEqual(once.map((x) => x.conceptId), [again[0].conceptId]);
  // pickConcepts por sí solo: lo nunca preguntado va primero.
  const list = bankFor(bank, ERA, 'realismo');
  const picked = pickConcepts(list, 3, createRng('x'), { recent: list.slice(0, 3).map((x) => x.id) });
  assert.equal(picked[0].id, list[3].id);
});

test('alimentan «Repasar el Barroco»: los fallos cuentan para la época (si ya la aprendió) y la confundida', () => {
  let p = learned('caravaggio');
  const cual = bank.find((b) => b.id === 'barroco-cual');
  for (let i = 0; i < RECALL_SLIPS; i++) {
    const q = conceptQuestion(index, cual, createRng(`s${i}`));
    const wrong = q.options.find((o) => o.id !== q.answerId);
    p = finishConcepts(p, index, [{ q, correct: false, retry: false, chosen: wrong.id }], TODAY, 'barroco');
  }
  const stat = recallStats(p.slips, TODAY).get('movement:barroco');
  assert.equal(stat.slips, RECALL_SLIPS);
  const found = forgottenSubject(p, index, TODAY);
  assert.deepEqual([found.type, found.id], ['movement', 'barroco']);
  // Lo elegido por error (un cuadro de otra época) cuenta para esa otra época.
  assert.ok([...recallStats(p.slips, TODAY).keys()].some((k) => k !== 'movement:barroco' && k.startsWith('movement:')));
  // Época aún no aprendida (recién llegada): fallar no es olvidar.
  const fresh = finishConcepts(emptyProgress(), index, answer([conceptQuestion(index, cual, createRng('f'))]), TODAY, 'barroco');
  assert.equal(recallStats(fresh.slips, TODAY).get('movement:barroco')?.slips || 0, 0);
  // Las de texto también cuentan (sin época confundida).
  const comun = conceptQuestion(index, bank.find((b) => b.id === 'barroco-comun'), createRng('c'));
  const log = logAnswers([], answer([comun]), index, TODAY);
  assert.deepEqual([log[0].t, log[0].a, log[0].ok, log[0].c], ['m', 'barroco', 0, undefined]);
});

test('se pueden saltar y no desbloquean nada: sin reintentos, sin puntos y sin tocar pintores, medallas ni colección', () => {
  const q = conceptQuestion(index, bank[0], createRng('k'));
  let round = createRound([q]);
  round = answerRound(round, false, null);
  assert.equal(round.queue.length, 1, 'sin reintento al final');
  assert.deepEqual(retryQuestion(index, q, createRng('k')), q);
  const before = learned('caravaggio');
  const after = finishConcepts(before, index, answer([q]), TODAY, q.movementId);
  for (const key of ['artists', 'medals', 'collection', 'xp', 'stats', 'srs', 'intros', 'signs']) assert.deepEqual(after[key], before[key], key);
  const quiz = src('ui', 'concept-quiz.js');
  assert.match(quiz, /noRetry: true/);
  assert.match(quiz, /noPoints: true/);
  assert.match(quiz, /onQuit: \(\) => end\(null\)/, 'salir con la X sigue adelante sin apuntar nada');
  assert.match(quiz, /skippable: true/, 'la X salta sin la hoja «¿Salir de la ronda?»');
  const lesson = src('ui', 'screens', 'lesson.js');
  assert.match(lesson, /quit: \(\) => \(config\.skippable \? leaveRound\(\) : openQuit\(true\)\)/);
  assert.match(lesson, /'Saltar las preguntas'/);
});

test('salen tras las tarjetas: «Ir a las preguntas» al llegar a la última tarjeta de la época y del tramo', () => {
  const deck = src('ui', 'deck-nav.js');
  assert.match(deck, /const ask = last && Boolean\(questions\?\.ready\) && Boolean\(end\);/, 'solo en la última tarjeta');
  assert.match(deck, /primary\.textContent = ask \? DECK_LABEL\.questions : last \? endLabel : DECK_LABEL\.next;/);
  assert.match(deck, /else if \(what === 'end'\) onEnd\(\);/, 'en la última, «Seguir» (o «Volver al camino») salta las preguntas');
  const flows = src('ui', 'screens', 'flows.js');
  assert.match(flows, /eraQuestions\(ctx, el, movement, cards/);
  assert.match(flows, /mode === 'shared' \? null/, 'una época compartida no ofrece preguntas');
  assert.match(flows, /onQuestions \}\)\)/, 'el tramo como paso del camino lleva preguntas y luego el pintor');
  const signs = src('ui', 'sign-cards.js');
  assert.match(signs, /if \(silent \|\| toQuestions\) return;/, 'ir a las preguntas no salta al pintor ni vuelve al camino');
  // Desde el cartel del mapa, su propia ruta.
  const key = 'El óleo en Flandes';
  assert.equal(tramoSlug(key), 'el-oleo-en-flandes');
  assert.deepEqual(parseRoute(conceptsRoute(key, 'van-eyck')), { name: 'concepts', slug: 'el-oleo-en-flandes', next: 'van-eyck' });
  assert.deepEqual(parseRoute(conceptsRoute(key)), { name: 'concepts', slug: 'el-oleo-en-flandes', next: '' });
});

test('las opciones se barajan: la buena no cae siempre en el mismo sitio (en el banco es siempre la primera)', () => {
  const item = bank.find((b) => b.id === 'barroco-comun');
  const spots = new Set();
  for (let i = 0; i < 40; i++) {
    const q = conceptQuestion(index, item, createRng(`p${i}`));
    spots.add(q.options.findIndex((o) => o.id === q.answerId));
  }
  assert.equal(spots.size, 4);
});

test('la hoja explica: al acertar, el porqué de la buena; al fallar, por qué no la elegida y por qué sí la buena', () => {
  const q = conceptQuestion(index, bank.find((b) => b.kind === 'rompe'), createRng('h'));
  const right = q.options.find((o) => o.id === q.answerId);
  const wrong = q.options.find((o) => o.id !== q.answerId);
  assert.deepEqual(conceptFeedback(q, true, right.id, 'Eso es'), { title: 'Eso es', lines: [right.why] });
  assert.deepEqual(conceptFeedback(q, false, wrong.id, 'Eso es').lines, [wrong.why, right.why]);
  assert.deepEqual(conceptFeedback(q, false, null, 'Eso es').lines, [right.why]);
});
