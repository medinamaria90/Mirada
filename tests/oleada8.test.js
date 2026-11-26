// Oleada 8: la práctica no repite lo que «Conoce a» acaba de enseñar (catálogo real).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildIndex } from '../app/js/engine/catalog.js';
import { planStage, subjectOf, OWN_NEW } from '../app/js/engine/planner.js';

const here = dirname(fileURLToPath(import.meta.url));
const real = buildIndex(JSON.parse(readFileSync(join(here, '..', 'app', 'data', 'catalog.json'), 'utf8')));
const askable = (w) => !w.spoiler && !w.attributed;
const SEEDS = 40;

test('composición: una sola de calentamiento con lo visto; más vistas solo si se acaban las no vistas', () => {
  const table = {};
  for (const a of real.path) {
    const learnIds = new Set(real.learnWorks(a.id).map((w) => w.id));
    const unseen = real.newWorks(a.id).filter(askable).map((w) => w.id);
    let maxSeen = 0;
    for (let s = 1; s <= SEEDS; s++) {
      const plan = planStage(real, a.id, s);
      const own = plan.questions.filter((q) => q.artistId === a.id && q.type !== 'movement'); // la de movimiento puede llevar otra obra suya ya enseñada
      const first = plan.questions[0];
      assert.equal(first.artistId, a.id, `${a.id}/${s}: la primera es del pintor`);
      assert.ok(!learnIds.has(subjectOf(first)), `${a.id}/${s}: la primera no repite un cuadro de «Conoce a»`);
      assert.ok(learnIds.has(subjectOf(plan.questions[1])), `${a.id}/${s}: la segunda es de calentamiento (obra vista)`);
      const seen = new Set(own.map(subjectOf).filter((id) => learnIds.has(id)));
      const asked = new Set(own.map(subjectOf));
      if (seen.size > 1) {
        assert.ok(unseen.every((id) => asked.has(id)), `${a.id}/${s}: ${seen.size} vistas y quedaban obras sin ver`);
      }
      // Las vistas de más (no la de calentamiento, segunda) salen después de todas sus no vistas.
      const order = [...new Set(own.map(subjectOf))];
      const warmAt = order.indexOf(subjectOf(plan.questions[1]));
      const lastUnseen = Math.max(-1, ...order.map((id, i) => (unseen.includes(id) ? i : -1)));
      order.forEach((id, i) => {
        if (i !== warmAt && learnIds.has(id)) assert.ok(i > lastUnseen, `${a.id}/${s}: obra vista antes que una no vista`);
      });
      maxSeen = Math.max(maxSeen, seen.size);
    }
    table[a.id] = maxSeen;
  }
  // Oleada 9: una sola obra vista (la de calentamiento) en todas las etapas, también en la primera.
  for (const a of real.path) {
    if (real.learnWorks(a.id).filter(askable).length < 1) continue;
    assert.equal(table[a.id], 1, `${a.id}: ${table[a.id]} obras vistas preguntadas`);
  }
});

test('«Conoce a» enseña 3-4 cuadros de nivel 1 y quedan al menos OWN_NEW sin enseñar para preguntar', () => {
  for (const a of real.path) {
    const learn = real.learnWorks(a.id);
    const unseen = real.newWorks(a.id).filter(askable).length;
    assert.ok(unseen >= OWN_NEW, `${a.id}: enseña ${learn.length} y solo quedan ${unseen} sin ver`);
    assert.ok(learn.length >= 3 && learn.length <= 4, `${a.id}: ${learn.length} en «Conoce a»`);
    assert.ok(learn.every((w) => w.level === 1), `${a.id}: «Conoce a» solo con obras de nivel 1`);
  }
});

test('primera etapa: solo «¿Cuál es de X?» (un único pintor conocido) y una sola obra recién vista', () => {
  const first = real.path[0];
  const learnIds = new Set(real.learnWorks(first.id).map((w) => w.id));
  for (let s = 1; s <= SEEDS; s++) {
    const plan = planStage(real, first.id, s);
    assert.ok(plan.questions.every((q) => q.type === 'which'), `${s}: ${plan.questions.map((q) => q.type)}`);
    const seenQs = plan.questions.filter((q) => learnIds.has(subjectOf(q))).length;
    assert.ok(seenQs <= 1, `${s}: ${seenQs} preguntas con obras de «Conoce a»`);
    assert.ok(!learnIds.has(subjectOf(plan.questions[0])), `${s}: abre con una obra no vista`);
    assert.ok(plan.questions.slice(2, 4).every((q) => !learnIds.has(subjectOf(q))), `${s}: tras el calentamiento vienen obras no vistas`);
  }
});

test('las fases marcan obra vista o no vista y van mezcladas (sin bloque «cuadros nuevos» aparte)', () => {
  let mixed = 0;
  for (const a of real.path.slice(1)) {
    const plan = planStage(real, a.id, 5);
    for (const q of plan.questions) assert.equal(q.phase, real.artwork(subjectOf(q)).role === 'learn' ? 'practice' : 'fresh');
    const phases = plan.questions.map((q) => q.phase);
    const firstFresh = phases.indexOf('fresh');
    if (firstFresh >= 0 && phases.slice(firstFresh).includes('practice')) mixed++;
  }
  assert.ok(mixed >= real.path.length / 2, `rondas con fases mezcladas: ${mixed}`);
});
