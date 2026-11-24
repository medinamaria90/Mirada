// Historias al empezar un nivel: formato, encuadre del detalle, avance entre tarjetas y marca de vistas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildIndex } from '../app/js/engine/catalog.js';
import { levelStory, cropOf, step, storyKey, MAX_CARDS, MAX_TEXT, sourceLabel } from '../app/js/engine/stories.js';

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, '..', 'app', 'data', 'historias');
const real = buildIndex(JSON.parse(readFileSync(join(here, '..', 'app', 'data', 'catalog.json'), 'utf8')));
const story = (n) => JSON.parse(readFileSync(join(dataDir, `${n}.json`), 'utf8'));

test('historias: nivel 1 con 1 a 3 tarjetas de hasta 180 caracteres; sin nivel o sin pintor, nada', () => {
  const lv = levelStory(story('goya'), 1);
  assert.ok(lv.cards.length >= 1 && lv.cards.length <= MAX_CARDS);
  assert.ok(lv.cards.every((c) => c.text.length <= MAX_TEXT));
  assert.equal(levelStory(story('goya'), 99), null);
  assert.equal(levelStory(null, 1), null);
  assert.equal(levelStory({ levels: [{ level: 1, cards: [{ text: 'x'.repeat(MAX_TEXT + 1), artwork: 'w1' }] }] }, 1), null, 'texto demasiado largo');
  const four = { levels: [{ level: 1, title: 't', cards: [1, 2, 3, 4].map((n) => ({ text: `t${n}`, artwork: 'w1' })) }] };
  assert.equal(levelStory(four, 1).cards.length, MAX_CARDS);
});

test('historias: las etapas «a fondo» (nivel 2 en adelante) llevan el nombre de su etapa', () => {
  const lv = levelStory(story('goya'), 2);
  assert.ok(lv && lv.stage, 'sin nombre de etapa');
  assert.equal(lv.stage, real.deepLevels('goya').find((l) => l.id === 2).name);
});

test('historias: cada tarjeta enseña una obra del catálogo y del mismo pintor o de su nivel básico', () => {
  for (const f of readdirSync(dataDir).filter((n) => n !== 'index.json')) {
    const st = story(f.slice(0, -5));
    for (const lv of st.levels) {
      for (const c of lv.cards) {
        const w = real.artwork(c.artwork);
        assert.ok(w, `${f}: obra ${c.artwork} fuera del catálogo`);
        assert.equal(w.artistId, st.artistId, `${f}: obra de otro pintor`);
        assert.ok(w.level === lv.level || w.level === 1, `${f} nivel ${lv.level}: obra de nivel ${w.level}`);
        if (lv.level === 1) assert.equal(w.level, 1);
      }
    }
  }
});

test('historias: encuadre [x, y, zoom] acotado; sin focus, la obra entera', () => {
  assert.deepEqual(cropOf(undefined), { whole: true, x: 50, y: 50, zoom: 1 });
  assert.deepEqual(cropOf([0.5, 0.45, 1.5]), { whole: false, x: 50, y: 45, zoom: 1.5 });
  const wild = cropOf([-2, 9, 50]);
  assert.deepEqual([wild.x, wild.y, wild.zoom], [0, 100, 3]);
  assert.equal(cropOf([0.2, 0.3]).zoom, 1.5);
});

test('historias: pasar de tarjeta avanza, termina tras la última y atrás no baja de la primera', () => {
  assert.deepEqual(step(0, 3, 1), { pos: 1 });
  assert.deepEqual(step(2, 3, 1), { end: true, pos: 2 });
  assert.deepEqual(step(0, 3, -1), { pos: 0 });
  assert.deepEqual(step(2, 3, -1), { pos: 1 });
  assert.equal(storyKey('goya', 2), 'goya:2');
  assert.equal(sourceLabel('https://es.wikipedia.org/wiki/Goya'), 'Wikipedia');
});

test('historias: la marca de vistas se guarda por pintor y nivel (y vale en la sesión sin almacenamiento)', async () => {
  const store = {};
  globalThis.window = { localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } } };
  const { storySeen, markStorySeen, STORIES_KEY } = await import('../app/js/state/stories-seen.js');
  assert.equal(storySeen('x:1'), false);
  markStorySeen('x:1');
  assert.equal(storySeen('x:1'), true);
  assert.equal(storySeen('x:2'), false);
  assert.deepEqual(JSON.parse(store[STORIES_KEY]), ['x:1']);
  globalThis.window = { get localStorage() { throw new Error('bloqueado'); } };
  markStorySeen('y:1');
  assert.equal(storySeen('y:1'), true);
  delete globalThis.window;
});
