// Tarjetas de época: las ocho fijas en orden y, como mucho, una extra con kicker propio (tools/sync_epocas.py).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const KICKERS = ['Cuándo y dónde', 'Por qué surge', 'Qué cambia', 'Cómo se pintaba', 'Fíjate en', 'Sus grandes temas', 'Qué nos dejó', 'Curiosidad'];
const card = (kicker) => ({ kicker, text: 'Texto corto.', artwork: 'w1', source: 'https://example.org' });

// Errores de check() para unas tarjetas, sin catálogo (solo formato).
function errors(kickers) {
  const data = JSON.stringify({ movementId: 'x', cards: kickers.map(card) });
  const code = 'import json,sys; sys.path.insert(0, sys.argv[1]); import sync_epocas as s; '
    + 'print(json.dumps(s.check(json.loads(sys.argv[2]), "x", None, None)))';
  return JSON.parse(execFileSync('python3', ['-I', '-c', code, join(root, 'tools'), data], { encoding: 'utf8' }));
}

test('épocas: ocho tarjetas en orden, válidas', () => {
  assert.deepEqual(errors(KICKERS), []);
});

test('épocas: una tarjeta extra con kicker propio se admite en cualquier sitio', () => {
  assert.deepEqual(errors([...KICKERS.slice(0, 2), 'Mientras, en el sur', ...KICKERS.slice(2)]), []);
  assert.deepEqual(errors([...KICKERS, 'Y después']), []);
});

test('épocas: dos extras, un kicker repetido o uno que falta, no', () => {
  assert.ok(errors([...KICKERS, 'Una', 'Otra']).length > 0);
  assert.ok(errors([...KICKERS.slice(0, 2), 'Por qué surge', ...KICKERS.slice(2)]).length > 0);
  assert.ok(errors([...KICKERS.slice(0, 7), 'Extra']).length > 0);
  assert.ok(errors([KICKERS[1], KICKERS[0], ...KICKERS.slice(2)]).length > 0);
});

test('épocas: manierismo y norte cuenta los dos caminos (nueve tarjetas, la del sur tras «Por qué surge»)', () => {
  const { cards } = JSON.parse(readFileSync(join(root, 'app', 'data', 'epocas', 'manierismo-y-norte.json'), 'utf8'));
  assert.equal(cards.length, 9);
  assert.equal(cards[2].kicker, 'Mientras, en el sur');
});
