// Las obras de pipeline/excluir.json (claves QID o w<número>) no pueden aparecer en ningún dato del catálogo:
// ni en la selección ni en obras.json del proceso, ni en los datos de la app.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
const excluded = new Set(Object.keys(read('pipeline/excluir.json')).map((k) => k.replace(/^w(?=\d+$)/, 'Q')));
const found = (qids) => [...new Set(qids)].filter((q) => excluded.has(q)).sort();
const toQid = (id) => id.replace(/^w(?=\d+$)/, 'Q');

test('excluir.json: ninguna obra excluida en catalogo/seleccion.json ni en catalogo/obras.json', () => {
  assert.deepEqual(found(read('catalogo/seleccion.json').map((s) => s.qid)), [], 'seleccion.json');
  assert.deepEqual(found(read('catalogo/obras.json').artworks.map((w) => w.source.wikidata)), [], 'obras.json');
});

test('excluir.json: ninguna obra excluida en los datos de la app', () => {
  assert.deepEqual(found(read('app/data/catalog.json').artworks.map((w) => toQid(w.id))), [], 'catalog.json');
  assert.deepEqual(found(Object.keys(read('app/data/catalog-ficha.json').ficha).map(toQid)), [], 'catalog-ficha.json');
});
