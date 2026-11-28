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

// Pintores con niveles de ampliación que aún no tienen su historia, con el motivo. Se vacía por tandas.
const PENDING = {
  // Tanda 2 (barroco a romanticismo, en el camino)
  ...Object.fromEntries(['artemisia', 'ribera', 'van-dyck', 'hals', 'vermeer', 'watteau', 'fragonard', 'melendez', 'david',
    'ingres', 'friedrich', 'turner', 'gericault', 'delacroix', 'madrazo'].map((id) => [id, 'tanda 2'])),
  // Tanda 3 (realismo a vanguardias, en el camino)
  ...Object.fromEntries(['millet', 'courbet', 'rosales', 'fortuny', 'repin', 'manet', 'degas', 'renoir', 'pissarro', 'morisot',
    'sisley', 'cezanne', 'seurat', 'gauguin', 'lautrec', 'klimt', 'munch', 'romero-de-torres', 'matisse', 'kandinsky',
    'juan-gris'].map((id) => [id, 'tanda 3'])),
  // Tanda 4 (ramas e invitados fuera del camino)
  ...Object.fromEntries(['duccio', 'simone-martini', 'uccello', 'filippo-lippi', 'perugino', 'pontormo', 'arcimboldo', 'hogarth',
    'vigee-le-brun', 'cassatt', 'utamaro', 'hokusai', 'sharaku', 'hiroshige', 'kuniyoshi'].map((id) => [id, 'tanda 4'])),
};

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
