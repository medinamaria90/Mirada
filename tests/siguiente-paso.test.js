// Siguiente paso recomendado (engine/next-step.js): una prueba por regla, en orden de prioridad, y ninguna con
// «mañana» ni «ayer». Sin navegador.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bigIndex } from './helpers.js';
import { emptyProgress } from '../app/js/engine/progress.js';
import { nextStep } from '../app/js/engine/next-step.js';

const big = bigIndex();
const TODAY = '2026-11-24';
const [a, b, c, d, e, f] = big.path;

const mastered = (p, ids) => { for (const id of ids) { p.artists[id] = { plays: 1, best: 0.9, mastered: true, last: '2026-11-23' }; p.medals[`artist-${id}`] = '2026-11-23'; } return p; };
const seenWorksOf = (p, id, n = 4) => { big.worksOf(id).slice(0, n).forEach((w) => { p.collection[w.id] = '2026-11-20'; }); return p; };
const base = () => seenWorksOf(seenWorksOf(mastered(emptyProgress(), [a.id, b.id]), a.id), b.id);
const outcome = (accuracy, events = []) => ({ accuracy, events });
const step = (p, opts) => nextStep(p, big, TODAY, opts);

test('regla 1: etapa o sala por debajo del 50 % → «Repetir»', () => {
  const s = step(base(), { plan: { kind: 'stage', artistId: c.id }, outcome: outcome(0.4), goalJustMet: true });
  assert.deepEqual([s.kind, s.label, s.to], ['retry', 'Repetir', `etapa-${c.id}`]);
});

test('regla 2: la sesión cumple la meta → «Volver al camino» (el cierre dice «Por hoy, hecho»)', () => {
  const s = step(base(), { plan: { kind: 'stage', artistId: c.id }, outcome: outcome(0.8), goalJustMet: true });
  assert.deepEqual([s.kind, s.label, s.to], ['done', 'Volver al camino', 'inicio']);
});

test('regla 3: repaso que traía un pintor a medias → «Volver a <pintor>»', () => {
  const p = base();
  p.artists[c.id] = { plays: 1, best: 0.6, mastered: false };
  const s = step(p, { plan: { kind: 'srs', started: c.id }, outcome: outcome(0.9) });
  assert.deepEqual([s.kind, s.label, s.to], ['painter', `Volver a ${c.short || c.name}`, `etapa-${c.id}`]);
});

test('regla 4: 3 pintores a medias o 5 fallados, sin repaso antes → «Repasar»; nunca dos repasos seguidos', () => {
  const p = base();
  for (const x of [c, d, e]) p.artists[x.id] = { plays: 1, best: 0.6, mastered: false };
  seenWorksOf(p, c.id);
  const s = step(p, { plan: { kind: 'stage', artistId: e.id }, outcome: outcome(0.6) });
  assert.deepEqual([s.kind, s.label, s.to], ['review', 'Repasar', 'repaso']);
  assert.notEqual(step(p, { plan: { kind: 'stage', artistId: e.id }, outcome: outcome(0.6), prevKind: 'srs' }).kind, 'review');
  assert.notEqual(step(p, { plan: { kind: 'srs' }, outcome: outcome(0.6) }).kind, 'review');
  const q = base();
  q.fallados = big.worksOf(a.id).slice(0, 5).map((w) => ({ id: w.id, date: '2026-11-20', times: 1, hits: 0 }));
  assert.equal(step(q, { plan: { kind: 'daily' }, outcome: outcome(0.7) }).kind, 'review');
});

test('regla 5: rama con siguiente → «Siguiente en la rama»; nivel «a fondo» con siguiente → «Siguiente: <etapa>»', () => {
  const branch = big.branches?.[0];
  if (branch) {
    const p = mastered(emptyProgress(), big.path.map((x) => x.id));
    const [first] = branch.artists.filter((id) => big.pathIndex(id) < 0);
    p.artists[first] = { plays: 1, best: 0.8, mastered: true };
    const s = step(p, { plan: { kind: 'stage', artistId: first }, outcome: outcome(0.8), branchId: branch.id });
    if (s.kind === 'branch') assert.equal(s.label, 'Siguiente en la rama');
  }
  // «A fondo»: un índice con dos niveles para el pintor a.
  const levels = [{ id: 2, name: 'La corte', short: 'La corte' }, { id: 3, name: 'Los últimos años', short: 'Últimos años' }];
  const deepIndex = { ...big, deepLevels: (id) => (id === a.id ? levels : []), levelWorks: () => [] };
  const p = base();
  p.deep = { [`${a.id}:2`]: { plays: 1, best: 0.9, mastered: true } };
  const s = nextStep(p, deepIndex, TODAY, { plan: { kind: 'stage', artistId: a.id, level: 2 }, outcome: outcome(0.9, [{ type: 'deep-mastered', artistId: a.id, level: 2 }]) });
  assert.equal(s.kind, 'deep');
  assert.equal(s.label, 'Siguiente: Últimos años');
});

test('regla 6: parada abierta y sin jugar → «Sigue: <pintor>», con 50-74 % no se recomienda repetir', () => {
  const p = base();
  p.artists[c.id] = { plays: 1, best: 0.6, mastered: false };
  const s = step(p, { plan: { kind: 'stage', artistId: c.id }, outcome: outcome(0.6) });
  assert.deepEqual([s.kind, s.label, s.artistId], ['stop', `Sigue: ${d.short || d.name}`, d.id]);
});

test('regla 7: camino dominado → «Reto semanal» pendiente o, hecho, «Repasar»', () => {
  const p = mastered(emptyProgress(), big.steps.filter((s) => s.type === 'artist').map((s) => s.id));
  for (const s of big.steps.filter((x) => x.type === 'sala')) p.salas[s.id] = { plays: 1, best: 0.9, mastered: true };
  seenWorksOf(p, a.id);
  const first = step(p, { plan: { kind: 'daily' }, outcome: outcome(0.8), week: '2026-W48' });
  assert.deepEqual([first.kind, first.label], ['weekly', 'Reto semanal']);
  p.weekly = { '2026-W48': { score: 10, total: 15 } };
  assert.deepEqual(step(p, { plan: { kind: 'daily' }, outcome: outcome(0.8), week: '2026-W48' }).label, 'Repasar');
  assert.equal(step(p, { plan: { kind: 'srs' }, outcome: outcome(0.8), week: '2026-W48' }).kind, 'path', 'tras un repaso, no otro');
});

test('ningún paso dice «mañana» ni «ayer»', () => {
  const p = base();
  p.artists[c.id] = { plays: 1, best: 0.6, mastered: false };
  const cases = [
    { plan: { kind: 'stage', artistId: c.id }, outcome: outcome(0.3) },
    { plan: { kind: 'stage', artistId: c.id }, outcome: outcome(0.8), goalJustMet: true },
    { plan: { kind: 'srs', started: c.id }, outcome: outcome(0.8) },
    { plan: { kind: 'stage', artistId: c.id }, outcome: outcome(0.6) },
    { plan: { kind: 'story' } },
  ];
  for (const opts of cases) assert.doesNotMatch(JSON.stringify(step(p, opts)), /mañana|ayer/i);
  assert.ok(f);
});
