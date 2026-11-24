// Oleada 9: primera etapa (Leonardo) sin repetir cuadros y con una sola obra recién vista; regla de
// dominio de la primera etapa; composición de las demás etapas (catálogo real).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildIndex } from '../app/js/engine/catalog.js';
import { planStage, subjectOf, FIRST_STAGE_ROUND, STAGE_ROUND } from '../app/js/engine/planner.js';
import { firstStageOwnMastered, stageRoundMastered, emptyProgress } from '../app/js/engine/progress.js';
import { finishRound } from '../app/js/engine/finish.js';
import { BOTS, roundContext, masteryProbability } from './lib/antibot.js';

const here = dirname(fileURLToPath(import.meta.url));
const real = buildIndex(JSON.parse(readFileSync(join(here, '..', 'app', 'data', 'catalog.json'), 'utf8')));
const first = real.path[0];
const TODAY = '2026-11-24';

test('Leonardo: «Conoce a» enseña La Gioconda y La dama del armiño; quedan 4 obras sin ver para preguntar', () => {
  assert.equal(first.id, 'leonardo');
  assert.deepEqual(real.learnWorks('leonardo').map((w) => w.id).sort(), ['a154', 'a66']);
  const unseen = real.newWorks('leonardo').filter((w) => !w.spoiler && !w.attributed).map((w) => w.id).sort();
  assert.deepEqual(unseen, ['a201', 'a235', 'a82', 'a93']);
});

test('Leonardo: 5 preguntas, 5 cuadros distintos, solo el primero recién visto, una «¿Quién?» en medio', () => {
  for (let s = 1; s <= 80; s++) {
    const qs = planStage(real, 'leonardo', s).questions;
    assert.equal(qs.length, FIRST_STAGE_ROUND, `${s}`);
    const subjects = qs.map(subjectOf);
    assert.equal(new Set(subjects).size, qs.length, `${s}: cuadro repetido ${subjects}`);
    assert.equal(subjects[0], 'a154', `${s}: calentamiento con La Gioconda`);
    assert.equal(qs.filter((q) => !q.isNew).length, 1, `${s}: una sola recién vista`);
    const types = qs.map((q) => q.type);
    assert.equal(types.filter((t) => t === 'who').length, 1, `${s}: ${types}`);
    assert.ok(types[0] !== 'who' && types[types.length - 1] !== 'who', `${s}: ${types}`);
    assert.ok(qs.every((q) => !real.artwork(subjectOf(q)).spoiler && !real.artwork(subjectOf(q)).attributed));
  }
});

test('primera etapa: el «¿Quién?» no cuenta; 3 de 4 «¿Cuál?» con el calentamiento acertado', () => {
  const qs = planStage(real, 'leonardo', 3).questions;
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
  const out = finishRound(emptyProgress(), real, { kind: 'stage', artistId: 'leonardo', answers, firstTry: answers.map((a) => a.correct) }, TODAY);
  assert.equal(out.mastered, true);
  assert.equal(stageRoundMastered(answers, 'leonardo', 0.8, { first: true }), true);
});

test('primera etapa: ningún bot pasa del 5 % con la regla adaptada (cálculo exacto, 200 semillas)', () => {
  for (const [name, bot] of Object.entries(BOTS)) {
    let sum = 0;
    for (let s = 1; s <= 200; s++) {
      const qs = planStage(real, 'leonardo', s).questions;
      const ctx = roundContext(real, qs, { stageArtist: 'leonardo', stageMovement: first.movementId, learned: [] });
      sum += masteryProbability(bot, qs, ctx, 0, { ownArtist: 'leonardo', ownRule: firstStageOwnMastered });
    }
    assert.ok(sum / 200 <= 0.05, `${name}: ${(sum / 2).toFixed(1)} %`);
  }
});

test('demás etapas: 8 preguntas (7 con un solo pintor antes) y ninguna obra recién vista salvo la de calentamiento', () => {
  for (const a of real.path.slice(1)) {
    const learnIds = new Set(real.learnWorks(a.id).map((w) => w.id));
    for (let s = 1; s <= 10; s++) {
      const qs = planStage(real, a.id, s).questions;
      const expected = real.pathIndex(a.id) === 1 ? STAGE_ROUND - 1 : STAGE_ROUND;
      assert.equal(qs.length, expected, `${a.id}/${s}: ${qs.length}`);
      assert.equal(qs.filter((q) => learnIds.has(subjectOf(q))).length, 1, `${a.id}/${s}`);
    }
  }
});
