// Resultado: sin franja «Hoy», el Repaso de 5 y el reto semanal se ofrecen al terminar una ronda
// (no el que se acaba de jugar) y el reto diario tiene 5 preguntas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildIndex } from '../app/js/engine/catalog.js';
import { emptyProgress } from '../app/js/engine/progress.js';
import { planDaily, DAILY_SIZE, dailyGrid } from '../app/js/engine/daily.js';
import { extraRounds } from '../app/js/ui/screens/result.js';

const here = dirname(fileURLToPath(import.meta.url));
const real = buildIndex(JSON.parse(readFileSync(join(here, '..', 'app', 'data', 'catalog.json'), 'utf8')));
const DAY = '2026-11-24';

function ctxWith(progress) {
  return { index: real, store: { get: () => ({ progress }) }, today: () => DAY, dailyDay: () => DAY };
}

function masteredAll() {
  const p = emptyProgress();
  for (const a of real.path) p.artists[a.id] = { plays: 1, best: 1, mastered: true, works: real.worksOf(a.id).map((w) => w.id) };
  for (const m of real.movements) { const s = real.stepsOf(m.id).find((x) => x.type === 'sala'); if (s) p.salas[m.id] = { plays: 1, best: 1, mastered: true }; }
  return p;
}

test('resultado: sin nada que repasar ni camino dominado no se ofrece ninguna otra ronda', () => {
  assert.deepEqual(extraRounds(ctxWith(emptyProgress()), { kind: 'stage' }), []);
});

test('resultado: con el camino dominado se ofrece el reto semanal, salvo si ya está hecho o es la ronda jugada', () => {
  const p = masteredAll();
  const ids = (plan) => extraRounds(ctxWith(p), plan).map((r) => r.to);
  assert.ok(ids({ kind: 'stage' }).includes('reto-semanal'));
  assert.ok(!ids({ kind: 'weekly' }).includes('reto-semanal'));
  p.weekly = { '2026-W48': { score: 10, total: 15 } };
  assert.ok(!ids({ kind: 'stage' }).includes('reto-semanal'));
});

test('reto diario: 5 preguntas y 5 casillas al compartir', () => {
  assert.equal(DAILY_SIZE, 5);
  const plan = planDaily(real, DAY);
  assert.equal(plan.questions.length, 5);
  assert.equal(dailyGrid(plan.questions.map(() => true)), '🟩🟩🟩🟩🟩');
});
