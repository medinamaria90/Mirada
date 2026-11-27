// Al tocar cualquier cosa en Android no debe aparecer el rectángulo azul del navegador (se hereda desde html).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('sin destello azul al tocar: la regla global está en html', () => {
  const css = readFileSync(new URL('../app/css/main.css', import.meta.url), 'utf8');
  assert.match(css, /^html\s*\{[^}]*-webkit-tap-highlight-color:\s*transparent/m);
});
