// Encuadre de las obras en las vistas que recortan (engine/framing.js): caja del recorte, qué obras piden foco revisado y
// que ninguna del catálogo se quede sin él (tools/recortes.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { coverBox, needsFocus } from '../app/js/engine/framing.js';
import { pendingFocus, storyWorks } from '../tools/recortes.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(readFileSync(join(here, '..', 'app', 'data', 'catalog.json'), 'utf8'));

test('encuadre: el punto de foco cae donde se pide sin dejar huecos y las obras muy recortadas piden foco revisado', () => {
  const b = coverBox(1, 0.5, [0.75, 0.5], 1, [0.5, 0.4]);
  assert.deepEqual(b, { left: -100, top: 0, width: 200, height: 100 }, 'el foco (x 0,75) queda en el centro');
  assert.equal(coverBox(1, 0.5, [0.99, 0.5]).left, -100, 'sin salirse por la derecha');
  assert.equal(coverBox(1, 0.5, [0.01, 0.5]).left, 0, 'ni por la izquierda');
  assert.equal(needsFocus({ w: 847, h: 1600 }), true, 'Inmaculada de Aranjuez: la casilla de la pregunta le cortaría la cabeza');
  assert.equal(needsFocus({ w: 847, h: 1600, focus: [0.5, 0.2] }), false);
  assert.equal(needsFocus({ w: 1100, h: 1600 }), false, 'en la casilla apenas se recorta');
  assert.equal(needsFocus({ w: 1100, h: 1600 }, { inStory: true }), true, 'en la historia iría entera sin foco: se revisa');
  assert.equal(needsFocus({ w: 1100, h: 1600, whole: true }, { inStory: true }), false, 'revisada: mejor entera');
});

test('encuadre: toda obra muy recortada en alguna vista tiene foco revisado (tools/recortes.mjs da la lista)', () => {
  const pending = pendingFocus(catalog.artworks, storyWorks());
  assert.deepEqual(pending.map((w) => w.id), [], 'revisa estas obras y apunta su foco en contenido/focos.json');
});

