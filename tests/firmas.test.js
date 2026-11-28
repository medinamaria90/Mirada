// Firmas que se tapan en las preguntas de autor (contenido/firmas.json): obras del catálogo, cajas [x0, y0, x1, y1] dentro
// de la imagen (de 0 a 1), y que incluyen las firmas que ya tapaba el Cuadro del día y las obras marcadas como spoiler.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
const { obras } = read('contenido/firmas.json');
const catalog = read('app/data/catalog.json');
const ids = new Set(catalog.artworks.map((w) => w.id));

test('firmas: solo obras del catálogo, cada una con al menos una caja', () => {
  assert.ok(Object.keys(obras).length > 0);
  for (const [id, boxes] of Object.entries(obras)) {
    assert.ok(ids.has(id), `${id} no está en el catálogo`);
    assert.ok(Array.isArray(boxes) && boxes.length > 0, `${id} sin cajas`);
  }
});

test('firmas: cajas [x0, y0, x1, y1] en fracciones de la imagen, con x0 < x1 e y0 < y1', () => {
  for (const [id, boxes] of Object.entries(obras)) {
    for (const b of boxes) {
      assert.ok(Array.isArray(b) && b.length === 4, `${id}: caja sin 4 números`);
      assert.ok(b.every((v) => typeof v === 'number' && v >= 0 && v <= 1), `${id}: caja fuera de [0, 1] ${b}`);
      assert.ok(b[0] < b[2] && b[1] < b[3], `${id}: caja vacía o al revés ${b}`);
    }
  }
});

test('firmas: incluye las del Cuadro del día y las obras con spoiler', () => {
  for (const d of read('contenido/cuadro-del-dia/calendario.json').days) {
    if (d.signature) assert.ok((obras[d.artwork] || []).some((b) => b.join() === d.signature.join()), `falta ${d.artwork}`);
  }
  for (const w of catalog.artworks.filter((x) => x.spoiler)) assert.ok(obras[w.id], `falta la obra con spoiler ${w.id}`);
});
