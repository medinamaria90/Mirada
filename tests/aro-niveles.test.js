// Aro de niveles (engine/level-ring.js y ui/deep-badges.js): un tramo y un círculo por nivel, tenga o no historia, el 1
// incluido; el título corto sale de la historia si la hay (único origen) y es el mismo en el catálogo, la tarjeta y la ronda.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildIndex } from '../app/js/engine/catalog.js';
import { emptyProgress } from '../app/js/engine/progress.js';
import { ringLevels, levelStates, levelRing, levelShort, ringLabel, FIRST_LEVEL_SHORT } from '../app/js/engine/level-ring.js';
import { stageTitle } from '../app/js/engine/painters.js';
import { ringSvg } from '../app/js/ui/deep-badges.js';

const here = dirname(fileURLToPath(import.meta.url));
const data = join(here, '..', 'app', 'data');
const real = buildIndex(JSON.parse(readFileSync(join(data, 'catalog.json'), 'utf8')));
const storyPath = (id) => join(data, 'historias', `${id}.json`);
const story = (id) => (existsSync(storyPath(id)) ? JSON.parse(readFileSync(storyPath(id), 'utf8')) : { levels: [] });
const masterAll = (p, id) => { for (const l of real.deepLevels(id)) p.deep[`${id}:${l.id}`] = { plays: 1, best: 1, mastered: true }; };

test('niveles del aro: el 1 («Quién fue») y las etapas con historia, con el título corto de su historia', () => {
  const levels = ringLevels(real, 'velazquez');
  assert.deepEqual(levels.map((l) => l.short), [FIRST_LEVEL_SHORT, 'Sevilla', 'La corte', 'Madrid', 'Roma']);
  const told = story('velazquez').levels.filter((l) => l.level >= 2);
  assert.deepEqual(levels.slice(1).map((l) => [l.level, l.short]), told.map((l) => [l.level, l.stage]), 'el mismo título en catálogo e historia');
  assert.equal(levelShort(real, 'velazquez', 3), 'La corte');
  assert.equal(stageTitle(real.artist('velazquez'), real.deepLevels('velazquez')[1]), 'La corte', 'la ronda usa el mismo título');
});

test('un pintor con una sola etapa «a fondo» tiene dos tramos y dos círculos, con su título corto (Berruguete, Botticelli)', () => {
  assert.deepEqual(ringLevels(real, 'berruguete').map((l) => [l.level, l.short]), [[1, FIRST_LEVEL_SHORT], [2, 'Castilla']]);
  assert.deepEqual(ringLevels(real, 'botticelli').map((l) => l.short), [FIRST_LEVEL_SHORT, 'Savonarola']);
  const p = emptyProgress();
  assert.equal(levelRing(p, real, 'berruguete'), null, 'sin dominar, el toque entra directo');
  p.artists.berruguete = { plays: 1, mastered: true };
  const ring = levelRing(p, real, 'berruguete');
  assert.deepEqual([ring.at, ring.total, ring.next, ring.done], [2, 2, 2, false], '«Nivel 2 de 2» cuenta los dos círculos');
  assert.deepEqual(ring.levels.map((l) => l.state), ['done', 'next']);
  assert.equal(stageTitle(real.artist('berruguete'), real.deepLevels('berruguete')[0]), 'Castilla', 'la ronda usa el mismo título');
});

test('un pintor con un solo nivel no tiene aro ni tarjeta: entra directo', () => {
  const one = real.artists.find((a) => !a.guest && real.deepLevels(a.id).length === 0);
  const p = emptyProgress();
  p.artists[one.id] = { plays: 1, mastered: true };
  assert.equal(levelRing(p, real, one.id), null);
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

test('todos los pintores: un tramo por nivel, con título corto de ≤ 12 letras distinto en cada uno y el de su historia si la hay', () => {
  for (const a of real.artists) {
    const levels = ringLevels(real, a.id);
    assert.equal(levels.length, real.deepLevels(a.id).length + 1, `${a.id}: un tramo por nivel`);
    const told = new Map(story(a.id).levels.map((l) => [l.level, l.stage || '']));
    for (const l of levels.slice(1)) {
      assert.ok(l.short && l.short.length <= 12, `${a.id}: título corto ${l.short}`);
      if (told.has(l.level)) assert.equal(l.short, told.get(l.level), `${a.id}: título corto distinto del de su historia`);
    }
    assert.equal(new Set(levels.map((l) => l.short)).size, levels.length, `${a.id}: títulos cortos repetidos`);
  }
});
