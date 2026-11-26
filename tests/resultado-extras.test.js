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

// ---------------------------------------------------------------- Acciones del resultado sin duplicados
const { renderResult } = await import('../app/js/ui/screens/result.js');
const { practiceAction } = await import('../app/js/ui/screens/result-actions.js');
const { REVIEW5_NAME, REVIEW5_MISSED } = await import('../app/js/engine/review.js');

// Pintores dominados con cuadros ya vistos: hay material para repasar lo aprendido.
function withReview() {
  const p = emptyProgress();
  for (const a of real.path.slice(0, 3)) {
    p.artists[a.id] = { plays: 1, best: 1, mastered: true, last: '2026-11-20' };
    for (const w of real.worksOf(a.id)) p.collection[w.id] = '2026-11-20';
  }
  return p;
}

function resultActions(progress, plan, outcome, opts = {}) {
  const el = { innerHTML: '', querySelector: () => null, addEventListener() {}, removeEventListener() {} };
  globalThis.window = { scrollTo() {}, matchMedia: () => ({ matches: true }) };
  globalThis.document = { documentElement: { classList: { contains: () => true } }, getElementById: () => null };
  globalThis.getComputedStyle = () => ({ getPropertyValue: () => '' });
  const ctx = { ...ctxWith(progress), store: { get: () => ({ progress, settings: { dailyGoal: 50 } }) }, audio: { sfx() {} } };
  renderResult(ctx, el, { plan, outcome, title: 'Ronda', accent: '', firstTry: [true, true, true], ...opts });
  return el.innerHTML.match(/<div class="result-actions">[^]*?<\/div>\s*<\/main>/)?.[0] || '';
}

test('resultado: tras dominar a un pintor, un solo botón para repasar (no dos iguales) y con nombre que se entiende', () => {
  const p = withReview();
  const veronese = real.artist('veronese');
  const outcome = { xp: 60, score: 8, total: 8, accuracy: 1, mastered: true, events: [] };
  const actions = resultActions(p, { kind: 'stage', artistId: veronese.id, seed: 3 }, outcome);
  assert.equal((actions.match(/data-to="repaso5"/g) || []).length, 1, actions);
  assert.ok(actions.includes(`<span>${REVIEW5_NAME}</span>`));
  assert.doesNotMatch(actions, /Repaso de 5/);
  assert.equal((actions.match(/data-primary/g) || []).length, 1, 'un solo botón principal');
});

test('resultado: una sola acción para practicar, por prioridad (repetir, la del flujo, otra ronda)', () => {
  const p = withReview();
  const ctx = ctxWith(p);
  assert.equal(practiceAction(ctx, { kind: 'stage' }, { retry: 'etapa-x', more: { to: 'repaso', label: 'Repasar más' } }).label, 'Repetir');
  assert.equal(practiceAction(ctx, { kind: 'srs' }, { more: { to: 'repaso', label: 'Repasar más' } }).to, 'repaso');
  assert.equal(practiceAction(ctx, { kind: 'stage' }).to, 'repaso5');
  assert.equal(practiceAction(ctx, { kind: 'stage' }, { closing: true }), null, 'al cerrar el día, sin llamadas a seguir jugando');
  assert.equal(practiceAction(ctx, { kind: 'stage' }, { duel: true }), null);
});

test('resultado: si entre los cuadros del repaso hay fallados, el botón lo dice', () => {
  const p = withReview();
  const w = real.worksOf(real.path[0].id)[0];
  p.fallados = [{ id: w.id, date: '2026-11-20', hits: 0 }];
  assert.equal(practiceAction(ctxWith(p), { kind: 'stage' }).label, REVIEW5_MISSED);
});
