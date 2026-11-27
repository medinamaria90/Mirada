// Hojas del arranque: un index.html viejo en la caché del móvil no puede dejar el mapa sin estilos (ui/lazy-css.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BOOT_CSS, missingCss } from '../app/js/ui/lazy-css.js';

const html = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');

test('BOOT_CSS son justo las hojas que enlaza index.html', () => {
  const linked = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1]).filter((h) => h.startsWith('css/'));
  assert.deepEqual(linked, BOOT_CSS);
});

test('missingCss: pide solo las que faltan, con href relativo o absoluto', () => {
  assert.deepEqual(missingCss(['css/brand.css', 'https://x.org/css/main.css', 'css/mapa-vivo.css', 'css/mapa-vida.css']), ['css/mapa-carteles.css']);
  assert.deepEqual(missingCss(BOOT_CSS), []);
});
