// catalogo/obras.json sale de catalogo/seleccion.json (menos pipeline/excluir.json) al pasar pipeline/build.py:
// si la selección guardada se desfasa (p. ej. se restaura una versión vieja), el siguiente build borraría obras.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
const excluded = new Set(Object.keys(read('pipeline/excluir.json')).map((k) => k.replace(/^w(?=\d+$)/, 'Q')));
const selected = read('catalogo/seleccion.json').filter((s) => !excluded.has(s.qid));
const obras = read('catalogo/obras.json').artworks;

test('seleccion.json y obras.json tienen las mismas obras, en el mismo orden', () => {
  assert.deepEqual(obras.map((w) => w.id), selected.map((s) => s.id));
});

test('nivel y etapa de obras.json coinciden con los de la selección', () => {
  const sel = new Map(selected.map((s) => [s.id, s]));
  const distintas = obras.filter((w) => w.level !== sel.get(w.id)?.level || (w.stage ?? null) !== (sel.get(w.id)?.etapa ?? null));
  assert.deepEqual(distintas.map((w) => w.id), []);
});

test('las obras forzadas en extra.json (menos las excluidas) están en la selección', () => {
  const ids = new Set(selected.map((s) => s.qid));
  const faltan = Object.values(read('pipeline/extra.json')).flatMap((o) => Object.keys(o))
    .filter((q) => !excluded.has(q) && !ids.has(q));
  assert.deepEqual(faltan, []);
});

test('el número de obras de cada pintor en obras.json es el real', () => {
  const o = read('catalogo/obras.json');
  const malos = o.artists.filter((a) => a.works !== obras.filter((w) => w.artistId === a.id).length).map((a) => a.id);
  assert.deepEqual(malos, []);
});
