// Niveles «a fondo» por importancia (decisión de María, 28/11): los imprescindibles van primero (nivel 2 y, si el pintor
// tiene varios, los siguientes), cada nivel conserva su historia, y lo hecho con la numeración antigua no se pierde
// (state/level-order.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { essentialsOf, essentialOpen } from '../app/js/engine/essentials.js';
import { deepStatus } from '../app/js/engine/levels.js';
import { emptyProgress } from '../app/js/engine/progress.js';
import { levelStory } from '../app/js/engine/stories.js';
import { migrate, defaultState, SCHEMA_VERSION } from '../app/js/state/schema.js';
import { LEVEL_REMAP, LEVEL_ORDER, remapLevelKey, migrateStoryKeys, STORIES_ORDER_MARK } from '../app/js/state/level-order.js';
import { realIndex } from './helpers-real.js';

const here = dirname(fileURLToPath(import.meta.url));
const real = realIndex();
const storyDir = join(here, '..', 'app', 'data', 'historias');
const story = (id) => (existsSync(join(storyDir, `${id}.json`)) ? JSON.parse(readFileSync(join(storyDir, `${id}.json`), 'utf8')) : null);
const STORY_TEXT_MAX = 180;
const TODAY = '2026-11-28';
const done = () => ({ plays: 1, best: 1, mastered: true, last: TODAY });
const essentials = real.essentials || [];
const essentialLevels = (artistId) => essentials.filter((e) => e.artistId === artistId).map((e) => e.level).sort((a, b) => a - b);

test('orden: los imprescindibles de cada pintor son su nivel 2 y los inmediatamente siguientes', () => {
  const artists = [...new Set(essentials.map((e) => e.artistId))];
  for (const id of artists) {
    const levels = essentialLevels(id);
    assert.deepEqual(levels, levels.map((_, i) => 2 + i), `${id}: imprescindibles en ${levels.join(', ')}`);
  }
  const at = (id, title) => essentials.find((e) => e.artistId === id && e.title.includes(title))?.level;
  assert.equal(at('goya', 'pinturas negras'), 2);
  assert.equal(at('velazquez', 'Meninas'), 2);
  assert.equal(at('van-gogh', 'Arlés'), 2);
});

test('orden: en cada época, un imprescindible de nivel 3 o más va detrás de los anteriores de su pintor', () => {
  // Así «Te falta conocer…» (la guía y el candado) siempre apunta a un nivel que ya se puede abrir.
  for (const m of real.visibleMovements) {
    const list = essentialsOf(real, m.id);
    list.forEach((e, i) => {
      const before = list.slice(0, i).filter((x) => x.artistId === e.artistId).map((x) => x.level);
      for (let lv = 2; lv < e.level; lv += 1) assert.ok(before.includes(lv), `${m.id}: ${e.artistId} nivel ${e.level} antes que el ${lv}`);
    });
  }
});

test('orden: sin atajos; un imprescindible de nivel 3 se abre al dominar el 2, y lo empezado sigue abierto', () => {
  const e = essentials.find((x) => x.artistId === 'velazquez' && x.level === 3);
  const p = emptyProgress();
  p.artists.velazquez = done();
  assert.equal(essentialOpen(p, real, e), false);
  p.deep['velazquez:2'] = done();
  assert.equal(essentialOpen(p, real, e), true);
  const q = emptyProgress();
  q.deep['velazquez:4'] = { plays: 1, best: 0.5, mastered: false, last: TODAY };
  q.artists.velazquez = done();
  assert.equal(deepStatus(q, real, 'velazquez', 4), 'started');
});

test('imprescindibles: apuntan a niveles que existen', () => {
  for (const e of essentials) assert.ok(real.deepLevels(e.artistId).some((l) => l.id === e.level), `${e.artistId}:${e.level}`);
});

test('historias: cada nivel «a fondo» tiene su historia y su primera tarjeta cabe en 180 letras', () => {
  for (const a of real.artists) {
    for (const lv of real.deepLevels(a.id)) {
      const s = levelStory(story(a.id), lv.id);
      assert.ok(s, `${a.id} nivel ${lv.id} sin historia`);
      assert.ok(s.cards[0].text.length <= STORY_TEXT_MAX, `${a.id} nivel ${lv.id}: ${s.cards[0].text.length}`);
    }
  }
});

test('mapa antiguo → nuevo: una permutación por pintor de los niveles que tiene, sin tocar el nivel 1', () => {
  for (const [id, map] of Object.entries(LEVEL_REMAP)) {
    const have = real.deepLevels(id).map((l) => l.id).sort((a, b) => a - b);
    assert.deepEqual(Object.keys(map).map(Number).sort((a, b) => a - b), have, `${id}: niveles antiguos`);
    assert.deepEqual(Object.values(map).sort((a, b) => a - b), have, `${id}: niveles nuevos`);
    assert.ok(!(1 in map), id);
  }
  assert.equal(remapLevelKey('goya:6'), 'goya:2');
  assert.equal(remapLevelKey('velazquez:5'), 'velazquez:2');
  assert.equal(remapLevelKey('goya:1'), 'goya:1');
  assert.equal(remapLevelKey('caravaggio:3'), 'caravaggio:3');
});

// Estado guardado antes del cambio (versión actual, sin la marca levelOrder).
function oldSave() {
  const s = defaultState();
  delete s.progress.levelOrder;
  s.progress.xp = 900;
  s.progress.artists.goya = done();
  s.progress.artists.velazquez = done();
  s.progress.deep = {
    'goya:2': { plays: 2, best: 0.9, mastered: true, last: TODAY }, // cartones (antes 2, ahora 5)
    'goya:6': { plays: 1, best: 0.8, mastered: true, last: TODAY }, // pinturas negras (antes 6, ahora 2)
    'velazquez:3': { plays: 1, best: 0.5, mastered: false, last: TODAY }, // la corte (antes 3, ahora 5)
    'caravaggio:2': { plays: 1, best: 1, mastered: true, last: TODAY }, // no cambia
  };
  s.progress.deepen = { at: 3, count: 2, recent: ['goya:3', 'rafael:3'], pending: 'goya:4', skips: { 'van-gogh:4': [TODAY] } };
  s.progress.medals = { 'artist-goya': TODAY };
  return s;
}

test('migración: lo hecho con la numeración antigua se conserva con la nueva (niveles, récords, medallas y «Profundiza»)', () => {
  const s = migrate(JSON.parse(JSON.stringify(oldSave())));
  assert.equal(s.version, SCHEMA_VERSION, 'sin versión nueva: un móvil con la app en caché no lo rechaza');
  assert.equal(s.progress.levelOrder, LEVEL_ORDER);
  assert.deepEqual(s.progress.deep['goya:5'], { plays: 2, best: 0.9, mastered: true, last: TODAY });
  assert.deepEqual(s.progress.deep['goya:2'], { plays: 1, best: 0.8, mastered: true, last: TODAY });
  assert.equal(s.progress.deep['goya:6'], undefined);
  assert.equal(s.progress.deep['velazquez:5'].plays, 1);
  assert.equal(s.progress.deep['caravaggio:2'].mastered, true);
  assert.deepEqual(s.progress.deepen.recent, ['goya:6', 'rafael:2']);
  assert.equal(s.progress.deepen.pending, 'goya:4');
  assert.deepEqual(s.progress.deepen.skips, { 'van-gogh:2': [TODAY] });
  assert.deepEqual(s.progress.medals, { 'artist-goya': TODAY });
  assert.equal(s.progress.xp, 900);
  // Con el catálogo nuevo: las pinturas negras cuentan como hechas y el nivel siguiente queda abierto.
  assert.equal(deepStatus(s.progress, real, 'goya', 2), 'mastered');
  assert.equal(deepStatus(s.progress, real, 'goya', 3), 'available');
});

test('migración: se aplica una sola vez; un estado nuevo o ya traducido no se toca', () => {
  const once = migrate(JSON.parse(JSON.stringify(oldSave())));
  const twice = migrate(JSON.parse(JSON.stringify(once)));
  assert.deepEqual(twice.progress.deep, once.progress.deep);
  const fresh = migrate(null);
  assert.equal(fresh.progress.levelOrder, LEVEL_ORDER);
  fresh.progress.deep['goya:2'] = done();
  assert.ok(migrate(JSON.parse(JSON.stringify(fresh))).progress.deep['goya:2'], 'lo jugado con la numeración nueva sigue igual');
});

test('migración: una ronda «a fondo» a medias de un pintor que cambia de orden se descarta; las demás se conservan', () => {
  const s = oldSave();
  s.session = { route: 'a-fondo-goya-6', kind: 'stage', plan: { kind: 'stage', artistId: 'goya', level: 6 } };
  assert.deepEqual(migrate(JSON.parse(JSON.stringify(s))).session, {});
  const t = oldSave();
  t.session = { route: 'a-fondo-caravaggio-3', kind: 'stage', plan: { kind: 'stage', artistId: 'caravaggio', level: 3 } };
  assert.equal(migrate(JSON.parse(JSON.stringify(t))).session.route, 'a-fondo-caravaggio-3');
});

test('historias vistas: las claves antiguas se traducen una vez y quedan marcadas', () => {
  const { keys, changed } = migrateStoryKeys(['goya:1', 'goya:6', 'velazquez:5', 'caravaggio:2']);
  assert.equal(changed, true);
  assert.deepEqual(keys, ['goya:1', 'goya:2', 'velazquez:2', 'caravaggio:2', STORIES_ORDER_MARK]);
  const again = migrateStoryKeys(keys);
  assert.equal(again.changed, false);
  assert.deepEqual(again.keys, keys);
});
