// tools/monocromo.py: una escala de grises falla, una imagen de color pasa y la lista blanca de monocromas es un objeto.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('monocromo: mide 0 en grises y bastante en color', () => {
  const code = [
    'import sys; sys.path.insert(0, "tools")',
    'from PIL import Image; import monocromo as m',
    'g = Image.new("RGB", (40, 40), (120, 120, 120))',
    'c = Image.new("RGB", (40, 40), (200, 120, 60))',
    'assert m.colorfulness(g) < m.MAX_COLORFULNESS, "gris"',
    'assert m.colorfulness(c) > m.MAX_COLORFULNESS, "color"',
  ].join('\n');
  const r = spawnSync('python3', ['-c', code], { cwd: root, encoding: 'utf8' });
  if (r.status !== 0 && /No module named/.test(r.stderr)) return; // sin Pillow/numpy no se puede medir
  assert.equal(r.status, 0, r.stderr);
});

test('monocromo: la lista blanca es un objeto {id: motivo}', () => {
  const list = JSON.parse(readFileSync(join(root, 'tools/monocromas_permitidas.json'), 'utf8'));
  assert.equal(typeof list, 'object');
  for (const motivo of Object.values(list)) assert.ok(String(motivo).trim(), 'cada permitida lleva su motivo');
});
