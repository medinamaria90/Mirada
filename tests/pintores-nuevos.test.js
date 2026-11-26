// Pintores que trae una actualización (engine/roster.js): la partida que ya existía los ve como nuevos y, si llegan a un
// tramo que ya tenía superado, son paradas extra que no frenan nada. Las partidas nuevas los conocen todos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyProgress, artistStatus, movementStatus, nextStep, isPathMastered, isStepUnlocked } from '../app/js/engine/progress.js';
import { tramoOpen, tramoPending, branchStatus, branchProgress } from '../app/js/engine/branches.js';
import { reconcileRoster, rosterIds, isFresh, markRosterSeen, markRosterTold, emptyRoster, ADDED_2026_11 } from '../app/js/engine/roster.js';
import { newInSight, newToTell } from '../app/js/engine/roster-news.js';
import { migrate, defaultState, SCHEMA_VERSION } from '../app/js/state/schema.js';
import { realIndex } from './helpers-real.js';

const real = realIndex();
const DAY = '2026-11-20';
const done = { plays: 2, best: 0.9, mastered: true, last: DAY };

// Partida de antes de la actualización: Botticelli, Berruguete y Rafael dominados.
function legacy() {
  const p = { ...emptyProgress(), roster: emptyRoster('legacy') };
  for (const id of ['botticelli', 'berruguete', 'rafael']) p.artists[id] = { ...done };
  return reconcileRoster(p, real);
}

test('pintores nuevos: los añadidos existen en el catálogo y están en el camino o en las ramas', () => {
  const ids = new Set(rosterIds(real));
  // Todos existen; los que no tienen parada ni rama (invitados, como Memling) no entran en la lista.
  for (const id of ADDED_2026_11) assert.ok(real.artist(id), id);
  assert.ok(ADDED_2026_11.filter((id) => ids.has(id)).length >= ADDED_2026_11.length - 1);
  assert.ok(real.pathIndex('masaccio') >= 0 && real.pathIndex('piero') >= 0);
});

test('pintores nuevos: Masaccio y Piero, en un tramo superado, son paradas extra que no frenan nada', () => {
  const p = legacy();
  assert.deepEqual(p.roster.extra.filter((id) => ['masaccio', 'piero'].includes(id)).sort(), ['masaccio', 'piero']);
  // Se pueden jugar cuando se quiera.
  assert.equal(artistStatus(p, real, 'masaccio'), 'available');
  assert.equal(artistStatus(p, real, 'piero'), 'available');
  // El tramo sigue superado y el Gótico, abierto.
  assert.ok(tramoOpen(p, real, 'renacimiento'));
  assert.deepEqual(tramoPending(p, real, 'renacimiento'), []);
  assert.ok(branchProgress(p, real, 'gotico').open);
  assert.ok(branchStatus(p, real, 'gotico').some((r) => !r.onPath && r.status === 'available'));
  // Rafael sigue abierto y la siguiente parada es Leonardo (no se vuelve atrás a las extra).
  assert.ok(isStepUnlocked(p, real, { type: 'artist', id: 'rafael' }));
  assert.equal(nextStep(p, real)?.id, 'leonardo');
});

test('pintores nuevos: las extra no cuentan para el repaso ni para la época completa', () => {
  const p = legacy();
  for (const s of real.stepsOf('renacimiento')) if (!p.roster.extra.includes(s.id)) p.artists[s.id] = { ...done };
  assert.equal(movementStatus(p, real, 'renacimiento'), 'mastered');
  for (const s of real.steps) if (!p.roster.extra.includes(s.id)) (s.type === 'sala' ? (p.salas[s.id] = { ...done }) : (p.artists[s.id] = { ...done }));
  assert.ok(isPathMastered(p, real));
});

test('pintores nuevos: en un tramo sin superar cuentan como siempre', () => {
  const p = { ...emptyProgress(), roster: emptyRoster('legacy') };
  p.artists.botticelli = { ...done };
  const out = reconcileRoster(p, real);
  assert.ok(!out.roster.extra.includes('masaccio'), 'Berruguete aún no dominado: Masaccio cuenta');
  assert.ok(out.roster.fresh.includes('masaccio'), 'pero lleva «Nuevo»');
  assert.ok(!tramoOpen(out, real, 'renacimiento'));
});

test('pintores nuevos: «Nuevo» hasta jugarlo o abrir su ficha; el aviso, una vez y solo de los que ya se ven', () => {
  let p = legacy();
  assert.ok(isFresh(p, 'masaccio') && isFresh(p, 'matisse'));
  const sight = newInSight(p, real);
  assert.ok(sight.includes('masaccio') && sight.includes('piero'));
  assert.ok(!sight.includes('matisse'), 'Matisse queda lejos: aún no se anuncia');
  assert.equal(sight[0], 'masaccio', 'en orden del camino');
  p = markRosterTold(p, sight);
  assert.deepEqual(newToTell(p, real), []);
  p = markRosterSeen(p, 'masaccio');
  assert.ok(!isFresh(p, 'masaccio'));
  p.artists.piero = { plays: 1, best: 0.3, mastered: false, last: DAY };
  assert.ok(!isFresh(p, 'piero'), 'jugado: sin etiqueta');
  // Y Piero sigue siendo extra aunque no esté dominado: no frena a Rafael.
  assert.ok(isStepUnlocked(p, real, { type: 'artist', id: 'rafael' }));
});

test('pintores nuevos: partida nueva conoce a todos (sin avisos ni extra) y la próxima actualización sí avisa', () => {
  const p = reconcileRoster(defaultState().progress, real);
  assert.equal(p.roster.seed, 'done');
  assert.deepEqual(p.roster.extra, []);
  assert.deepEqual(p.roster.fresh, []);
  assert.equal(p.roster.known.length, rosterIds(real).length);
  assert.equal(reconcileRoster(p, real), p, 'sin cambios: el mismo objeto');
  // Simula una actualización: un pintor que no conocía, con progreso ya hecho.
  const later = { ...p, artists: { botticelli: { ...done }, masaccio: { ...done }, berruguete: { ...done } }, roster: { ...p.roster, known: p.roster.known.filter((id) => id !== 'piero') } };
  const out = reconcileRoster(later, real);
  assert.ok(out.roster.fresh.includes('piero') && out.roster.extra.includes('piero'));
});

test('pintores nuevos: migración 9 → 10 deja la semilla de partida antigua; el resto se conserva', () => {
  assert.equal(SCHEMA_VERSION, 10);
  const out = migrate({ version: 9, onboarded: true, progress: { xp: 50, artists: { botticelli: { ...done } } } });
  assert.equal(out.version, 10);
  assert.equal(out.progress.roster.seed, 'legacy');
  assert.equal(out.progress.xp, 50);
  assert.equal(defaultState().progress.roster.seed, 'new');
});
