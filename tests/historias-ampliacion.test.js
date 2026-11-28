// Niveles de ampliación («a fondo», nivel 2 en adelante): todo pintor que los tenga lleva una historia nueva en cada uno,
// que no repite la del nivel 1 (decisión de María, 28/11; contenido/historias/README.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildIndex } from '../app/js/engine/catalog.js';
import { levelStory } from '../app/js/engine/stories.js';

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, '..', 'app', 'data', 'historias');
const index = buildIndex(JSON.parse(readFileSync(join(here, '..', 'app', 'data', 'catalog.json'), 'utf8')));
const told = JSON.parse(readFileSync(join(dataDir, 'index.json'), 'utf8'));
const story = (id) => (existsSync(join(dataDir, `${id}.json`)) ? JSON.parse(readFileSync(join(dataDir, `${id}.json`), 'utf8')) : null);

// Excepciones justificadas ({ pintor: motivo }) de pintores con niveles de ampliación sin historia. Hoy, ninguna.
const PENDING = {};

const words = (t) => new Set(String(t).toLowerCase().match(/\p{L}{4,}/gu) || []);
const overlap = (a, b) => {
  const [x, y] = [words(a), words(b)];
  const common = [...x].filter((w) => y.has(w)).length;
  return common / Math.max(1, Math.min(x.size, y.size));
};
const SAME_TEXT = 0.6; // más de este parecido de palabras con una tarjeta del nivel 1 es repetirla

test('historias: todo pintor con niveles de ampliación tiene historia en cada uno (salvo los pendientes anotados)', () => {
  const missing = [];
  for (const a of index.artists) {
    if (PENDING[a.id]) continue;
    for (const lv of index.deepLevels(a.id)) {
      if (!(told[a.id] || []).includes(lv.id) || !levelStory(story(a.id), lv.id)) missing.push(`${a.id} nivel ${lv.id}`);
    }
  }
  assert.deepEqual(missing, [], `sin historia de ampliación: ${missing.join(', ')}`);
});

test('historias: la lista de pendientes no guarda pintores que ya tienen todas sus historias o que no tienen ampliación', () => {
  const stale = Object.keys(PENDING).filter((id) => {
    const deep = index.deepLevels(id);
    return !deep.length || deep.every((lv) => (told[id] || []).includes(lv.id));
  });
  assert.deepEqual(stale, [], `quita de PENDING: ${stale.join(', ')}`);
});

test('historias: una historia de ampliación no repite tarjetas del nivel 1', () => {
  const repeated = [];
  for (const id of Object.keys(told)) {
    const st = story(id);
    const basic = levelStory(st, 1)?.cards || [];
    for (const lv of (st?.levels || []).filter((l) => l.level >= 2)) {
      for (const c of lv.cards) {
        if (basic.some((b) => overlap(b.text, c.text) > SAME_TEXT)) repeated.push(`${id} nivel ${lv.level}: «${c.text.slice(0, 40)}…»`);
      }
    }
  }
  assert.deepEqual(repeated, []);
});

test('historias: cada historia de ampliación trae su propio «Fíjate en…» (la app ya no cierra con la pista del nivel 1)', () => {
  const missing = [];
  for (const id of Object.keys(told)) {
    for (const lv of (story(id)?.levels || []).filter((l) => l.level >= 2)) {
      if (!lv.cards.some((c) => /f[ií]jate/i.test(c.text))) missing.push(`${id} nivel ${lv.level}`);
    }
  }
  assert.deepEqual(missing, []);
});
