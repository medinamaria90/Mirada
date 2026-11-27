// Como app nativa: mantener pulsado no selecciona texto ni saca el menú Traducir/Copiar; los campos y las páginas de lectura sí permiten seleccionar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../app/css/main.css', import.meta.url), 'utf8');

test('toda la interfaz: sin selección ni menú de pulsación larga (regla en html)', () => {
  assert.match(css, /^html\s*\{[^}]*-webkit-user-select:\s*none;\s*user-select:\s*none;\s*-webkit-touch-callout:\s*none/m);
});

test('las imágenes no se pueden arrastrar', () => {
  assert.match(css, /^img\s*\{[^}]*-webkit-user-drag:\s*none/m);
});

test('campos de texto y páginas de lectura reactivan la selección', () => {
  const m = css.match(/^(input, textarea[^{]*)\{([^}]*)\}/m);
  assert.ok(m, 'falta la regla de excepciones');
  for (const sel of ['input', 'textarea', '[contenteditable', '.cr-body', '.ab-text']) assert.ok(m[1].includes(sel), sel);
  assert.match(m[2], /-webkit-user-select:\s*text;\s*user-select:\s*text/);
});

test('las historias siguen sin selección', () => {
  assert.match(readFileSync(new URL('../app/css/historias.css', import.meta.url), 'utf8'), /\.story \*\s*\{[^}]*user-select:\s*none/);
});
