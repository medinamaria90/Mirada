// Oleada 9: primera etapa (Botticelli, la que abre el camino) sin repetir cuadros y con una sola obra recién vista; regla de
// dominio de la primera etapa; composición de las demás etapas (catálogo real).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildIndex } from '../app/js/engine/catalog.js';
import { planStage, subjectOf, FIRST_STAGE_ROUND, STAGE_ROUND_LEVELS } from '../app/js/engine/planner.js';
import { firstStageOwnMastered, stageRoundMastered, emptyProgress } from '../app/js/engine/progress.js';
import { finishRound } from '../app/js/engine/finish.js';
import { BOTS, roundContext, masteryProbability } from './lib/antibot.js';

const here = dirname(fileURLToPath(import.meta.url));
const real = buildIndex(JSON.parse(readFileSync(join(here, '..', 'app', 'data', 'catalog.json'), 'utf8')));
const first = real.path[0];
const TODAY = '2026-11-24';

test('Botticelli abre el camino: «Conoce a» enseña 4 obras de nivel 1; quedan 3 de nivel 1 sin ver para preguntar', () => {
  assert.equal(first.id, 'botticelli');
  assert.equal(real.path[2].id, 'rafael');
  assert.equal(real.path[3].id, 'leonardo');
  const learn = real.learnWorks(first.id);
  assert.equal(learn.length, 4);
  assert.ok(learn.every((w) => w.level === 1));
  const unseen = real.newWorks(first.id).filter((w) => w.level === 1 && !w.spoiler && !w.attributed);
  assert.ok(unseen.length >= 3, `${unseen.length} obras de nivel 1 sin ver`);
});

test('primera etapa: 5 preguntas, 5 cuadros distintos, solo el primero recién visto, una «¿Quién?» en medio', () => {
  const learn = real.learnWorks(first.id).slice().sort((a, b) => b.fame - a.fame);
  const warmId = learn.find((w) => !w.spoiler && !w.attributed).id;
  for (let s = 1; s <= 80; s++) {
    const qs = planStage(real, first.id, s).questions;
    assert.equal(qs.length, FIRST_STAGE_ROUND, `${s}`);
    const subjects = qs.map(subjectOf);
    assert.equal(new Set(subjects).size, qs.length, `${s}: cuadro repetido ${subjects}`);
    assert.equal(subjects[0], warmId, `${s}: calentamiento con la obra más conocida de «Conoce a»`);
    assert.equal(qs.filter((q) => !q.isNew).length, 1, `${s}: una sola recién vista`);
    const types = qs.map((q) => q.type);
    assert.equal(types.filter((t) => t === 'who').length, 1, `${s}: ${types}`);
    assert.ok(types[0] !== 'who' && types[types.length - 1] !== 'who', `${s}: ${types}`);
    assert.ok(qs.every((q) => !real.artwork(subjectOf(q)).spoiler && !real.artwork(subjectOf(q)).attributed));
  }
});

test('primera etapa: el «¿Quién?» no cuenta; 3 de 4 «¿Cuál?» con el calentamiento acertado', () => {
  const qs = planStage(real, first.id, 3).questions;
  const ans = (ok) => qs.map((q, i) => ({ q, correct: ok(q, i), retry: false, combo: 1 }));
  const who = (q) => q.type === 'who';
  const warm = (q) => !q.isNew;
  const own = (a) => a.filter((x) => !x.retry);
  assert.equal(firstStageOwnMastered(own(ans(() => true))), true);
  assert.equal(firstStageOwnMastered(own(ans((q) => !who(q)))), true, 'fallar el «¿Quién?» no impide dominar');
  let missed = false;
  assert.equal(firstStageOwnMastered(own(ans((q) => who(q) || warm(q) || (missed ? true : !(missed = true))))), true, 'un fallo en no vistas');
  assert.equal(firstStageOwnMastered(own(ans((q) => !warm(q)))), false, 'sin el calentamiento no');
  let k = 0;
  assert.equal(firstStageOwnMastered(own(ans((q) => who(q) || warm(q) || k++ >= 2))), false, 'dos fallos en no vistas no');
  // finishRound usa la regla de la primera etapa.
  const answers = ans((q) => !who(q));
  const out = finishRound(emptyProgress(), real, { kind: 'stage', artistId: first.id, answers, firstTry: answers.map((a) => a.correct) }, TODAY);
  assert.equal(out.mastered, true);
  assert.equal(stageRoundMastered(answers, first.id, 0.8, { first: true }), true);
});

test('primera etapa: ningún bot pasa del 5 % con la regla adaptada (cálculo exacto, 300 semillas)', () => {
  for (const [name, bot] of Object.entries(BOTS)) {
    let sum = 0;
    for (let s = 1; s <= 300; s++) {
      const qs = planStage(real, first.id, s).questions;
      const ctx = roundContext(real, qs, { stageArtist: first.id, stageMovement: first.movementId, learned: [] });
      sum += masteryProbability(bot, qs, ctx, 0, { ownArtist: first.id, ownRule: firstStageOwnMastered });
    }
    assert.ok(sum / 300 <= 0.05, `${name}: ${(sum / 3).toFixed(1)} %`);
  }
});

test('demás etapas: 9 preguntas (8 con un solo pintor antes) y una sola obra recién vista del pintor, salvo la de movimiento', () => {
  for (const a of real.path.slice(1)) {
    const learnIds = new Set(real.learnWorks(a.id).map((w) => w.id));
    for (let s = 1; s <= 10; s++) {
      const qs = planStage(real, a.id, s).questions;
      const expected = real.pathIndex(a.id) === 1 ? STAGE_ROUND_LEVELS - 1 : STAGE_ROUND_LEVELS;
      assert.equal(qs.length, expected, `${a.id}/${s}: ${qs.length}`);
      assert.equal(qs.filter((q) => q.type !== 'movement' && learnIds.has(subjectOf(q)) && q.artistId === a.id).length, 1, `${a.id}/${s}`);
    }
  }
});
