// Aro de niveles (engine/level-ring.js y ui/deep-badges.js): un tramo por nivel con historia, el 1 incluido; sin historia no
// hay tramo; el título corto sale de la historia (único origen) y es el mismo en el catálogo y en la ronda.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildIndex } from '../app/js/engine/catalog.js';
import { emptyProgress } from '../app/js/engine/progress.js';
import { ringLevels, levelStates, levelRing, levelPlan, levelShort, ringLabel, FIRST_LEVEL_SHORT } from '../app/js/engine/level-ring.js';
import { stageTitle } from '../app/js/engine/painters.js';
import { ringSvg } from '../app/js/ui/deep-badges.js';

const here = dirname(fileURLToPath(import.meta.url));
const data = join(here, '..', 'app', 'data');
const real = buildIndex(JSON.parse(readFileSync(join(data, 'catalog.json'), 'utf8')));
const story = (id) => JSON.parse(readFileSync(join(data, 'historias', `${id}.json`), 'utf8'));
const masterAll = (p, id) => { for (const l of real.deepLevels(id)) p.deep[`${id}:${l.id}`] = { plays: 1, best: 1, mastered: true }; };

test('niveles del aro: el 1 («Quién fue») y las etapas con historia, con el título corto de su historia', () => {
  const levels = ringLevels(real, 'velazquez');
  assert.deepEqual(levels.map((l) => l.short), [FIRST_LEVEL_SHORT, 'Sevilla', 'La corte', 'Madrid', 'Roma']);
  const told = story('velazquez').levels.filter((l) => l.level >= 2);
  assert.deepEqual(levels.slice(1).map((l) => [l.level, l.short]), told.map((l) => [l.level, l.stage]), 'el mismo título en catálogo e historia');
  assert.equal(levelShort(real, 'velazquez', 3), 'La corte');
  assert.equal(stageTitle(real.artist('velazquez'), real.deepLevels('velazquez')[1]), 'La corte', 'la ronda usa el mismo título');
});

test('sin historia no hay tramo: un «Más obras» sin historia no suma al aro', () => {
  assert.ok(real.deepLevels('botticelli').length > 0, 'Botticelli tiene un nivel «a fondo»');
  assert.deepEqual(ringLevels(real, 'botticelli').map((l) => l.level), [1]);
  const p = emptyProgress();
  p.artists.botticelli = { plays: 1, mastered: true };
  assert.equal(levelRing(p, real, 'botticelli'), null, 'un solo nivel con historia: sin aro');
  // …pero tocarlo abre la tarjeta (nunca la ficha), con su «a fondo» por jugar.
  const plan = levelPlan(p, real, 'botticelli');
  assert.deepEqual([plan.at, plan.total, plan.next, plan.done], [2, 2, real.deepLevels('botticelli')[0].id, false]);
  assert.deepEqual(plan.levels.map((l) => l.state), ['done']);
  assert.equal(levelPlan(emptyProgress(), real, 'botticelli'), null, 'sin dominar, el toque entra directo');
});

test('estados: oro lo hecho, uno solo «siguiente» y el resto cerrado; con todo hecho, completo', () => {
  const p = emptyProgress();
  assert.equal(levelRing(p, real, 'velazquez'), null, 'sin dominar no hay aro');
  assert.deepEqual(levelStates(p, real, 'velazquez').map((l) => l.state), ['next', 'locked', 'locked', 'locked', 'locked']);
  p.artists.velazquez = { plays: 1, mastered: true };
  p.deep['velazquez:2'] = { plays: 1, best: 1, mastered: true };
  const ring = levelRing(p, real, 'velazquez');
  assert.deepEqual(ring.levels.map((l) => l.state), ['done', 'done', 'next', 'locked', 'locked']);
  assert.deepEqual([ring.at, ring.total, ring.next, ring.done], [3, 5, 3, false]);
  assert.equal(ringLabel(ring), 'Nivel 3 de 5 por jugar');
  masterAll(p, 'velazquez');
  const full = levelRing(p, real, 'velazquez');
  assert.equal(full.done, true, 'el aro no desaparece al completarlo');
  assert.ok(full.levels.every((l) => l.state === 'done'));
  assert.equal(ringLabel(full), 'Todos los niveles hechos');
});

test('SVG del aro: un tramo por nivel con su estado y halo solo si hay siguiente', () => {
  const svg = ringSvg([{ state: 'done' }, { state: 'next' }, { state: 'locked' }]);
  assert.equal((svg.match(/class="ring-arc/g) || []).length, 3);
  assert.deepEqual([...svg.matchAll(/ring-arc is-(\w+)/g)].map((m) => m[1]), ['done', 'next', 'locked']);
  assert.match(svg, /ring-halo/);
  assert.doesNotMatch(ringSvg([{ state: 'done' }, { state: 'done' }]), /ring-halo/);
});

test('todos los pintores: los tramos del aro tienen historia y van seguidos desde el nivel 1', () => {
  for (const a of real.artists) {
    const levels = ringLevels(real, a.id);
    if (levels.length < 2) continue;
    const told = new Map(story(a.id).levels.map((l) => [l.level, l.stage || '']));
    for (const l of levels) assert.ok(told.has(l.level), `${a.id}: tramo ${l.level} sin historia`);
    for (const l of levels.slice(1)) assert.ok(l.short.length <= 12 && l.short === told.get(l.level), `${a.id}: título corto ${l.short}`);
  }
});
