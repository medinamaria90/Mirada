// Embudo sin repeticiones: la ronda de un pintor no abre con un cuadro que acaba de salir en su historia o en «Conoce a».
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildIndex } from '../app/js/engine/catalog.js';
import { planStage, subjectOf, freshFirst } from '../app/js/engine/planner.js';

const here = dirname(fileURLToPath(import.meta.url));
const real = buildIndex(JSON.parse(readFileSync(join(here, '..', 'app', 'data', 'catalog.json'), 'utf8')));
const storyWorks = (id, level) => {
  const st = JSON.parse(readFileSync(join(here, '..', 'app', 'data', 'historias', `${id}.json`), 'utf8'));
  return st.levels.find((l) => l.level === level).cards.map((c) => c.artwork);
};

test('embudo: con la historia de Rafael (Castiglione incluido) y «Conoce a», la primera pregunta es de otro cuadro', () => {
  const shown = storyWorks('rafael', 1);
  for (let s = 1; s <= 30; s++) {
    const plan = planStage(real, 'rafael', s, { shown });
    const recent = new Set([...shown, ...plan.learn.map((w) => w.id)]);
    const first = plan.questions[0];
    assert.equal(first.artistId, 'rafael', `${s}: abre con el pintor`);
    assert.ok(!recent.has(subjectOf(first)), `${s}: abre con ${subjectOf(first)}, recién enseñado`);
  }
});

test('embudo: niveles «a fondo» tampoco abren con un cuadro de su historia', () => {
  const level = real.deepLevels('goya')[0].id;
  const shown = storyWorks('goya', level);
  for (let s = 1; s <= 30; s++) {
    const first = planStage(real, 'goya', s, { level, shown }).questions[0];
    assert.ok(!shown.includes(subjectOf(first)), `${s}: abre con ${subjectOf(first)}`);
  }
});

test('freshFirst: adelanta la primera no enseñada (mejor del pintor) y, si todas lo son, no toca el orden', () => {
  const slot = (id, artistId = 'a') => ({ work: { id, artistId } });
  const order = (list) => list.map((s) => s.work.id).join(',');
  assert.equal(order(freshFirst([slot('x'), slot('o', 'b'), slot('n')], new Set(['x']), 'a')), 'n,x,o');
  assert.equal(order(freshFirst([slot('x'), slot('o', 'b')], new Set(['x']), 'a')), 'o,x');
  assert.equal(order(freshFirst([slot('x'), slot('y')], new Set(['x', 'y']), 'a')), 'x,y');
  assert.equal(order(freshFirst([slot('n'), slot('x')], new Set(['x']), 'a')), 'n,x');
});
