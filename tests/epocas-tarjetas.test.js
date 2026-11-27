// Tarjetas de época (ui/screens/era-cards.js): cada época con JSON carga todas sus tarjetas, y un fallo de red no la
// deja sin tarjetas el resto de la sesión.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';
import { loadCards, cardsOf } from '../app/js/ui/screens/era-cards.js';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'app', 'data', 'epocas');
const files = readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'index.json');
const read = (f) => JSON.parse(readFileSync(join(dir, f), 'utf8'));
const ok = (body) => ({ ok: true, status: 200, json: async () => body });

// fetch de mentira que sirve los archivos de app/data/epocas.
function serve() {
  globalThis.fetch = async (url) => ok(read(basename(new URL(url).pathname)));
}

test('tarjetas de época: el índice lista exactamente las épocas con archivo', () => {
  assert.deepEqual([...read('index.json')].sort(), files.map((f) => f.replace(/\.json$/, '')).sort());
});

test('tarjetas de época: cada archivo es de su época y trae sus tarjetas completas', () => {
  for (const f of files) {
    const id = f.replace(/\.json$/, '');
    const data = read(f);
    assert.equal(data.movementId, id, `${f}: movementId no coincide con el archivo`);
    assert.ok(data.cards.length >= 8, `${f}: faltan tarjetas`);
    assert.equal(cardsOf(data, id)?.length, data.cards.length, `${f}: alguna tarjeta sin kicker o texto`);
  }
});

test('tarjetas de época: loadCards carga todas las tarjetas de cada época', async () => {
  serve();
  for (const f of files) {
    const id = f.replace(/\.json$/, '');
    const cards = await loadCards(id);
    assert.equal(cards.length, read(f).cards.length, `${id}: no cargan sus tarjetas`);
  }
});

test('tarjetas de época: tras un fallo de red se reintenta (no se queda sin tarjetas)', async () => {
  const id = 'epoca-de-prueba';
  const body = { movementId: id, cards: [{ kicker: 'Curiosidad', text: 'Texto.' }] };
  let fails = 1;
  globalThis.fetch = async () => (fails-- > 0 ? { ok: false, status: 502, json: async () => ({}) } : ok(body));
  const warn = console.warn;
  console.warn = () => {};
  try {
    assert.deepEqual(await loadCards(id), []);
    assert.equal((await loadCards(id)).length, 1);
  } finally {
    console.warn = warn;
  }
});

test('tarjetas de época: datos de otra época o sin tarjetas no valen', () => {
  assert.equal(cardsOf({ movementId: 'barroco', cards: [{ kicker: 'a', text: 'b' }] }, 'gotico'), null);
  assert.equal(cardsOf({ movementId: 'gotico', cards: [] }, 'gotico'), null);
  assert.equal(cardsOf(null, 'gotico'), null);
});
