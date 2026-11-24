// Regla de CLAUDE.md: ningún color escrito a mano fuera del archivo de variables CSS, tampoco en JS.
// Sin navegador: lee los archivos y busca colores hexadecimales y rgb()/rgba().
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const app = join(here, '..', 'app');

// Colores que quedan en el CSS fuera de los bloques :root de brand.css (las máscaras #000 que
// desvanecen texto). Es un techo heredado: solo puede bajar, nunca subir.
const CSS_COLORS_MAX = 4;

const HEX = /#[0-9a-f]{3,8}\b/gi;
const RGB = /\brgba?\(/g;

function jsFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? jsFiles(p) : name.endsWith('.js') ? [p] : [];
  });
}

test('colores: ningún .js de app/js lleva un color hexadecimal ni rgb()', () => {
  const found = [];
  for (const file of jsFiles(join(app, 'js'))) {
    const src = readFileSync(file, 'utf8');
    src.split('\n').forEach((line, i) => {
      if (HEX.test(line) || RGB.test(line)) found.push(`${file.slice(app.length + 1)}:${i + 1}: ${line.trim()}`);
      HEX.lastIndex = 0;
      RGB.lastIndex = 0;
    });
  }
  assert.deepEqual(found, []);
});

test('colores: el CSS solo los define en los :root de brand.css (los que quedan fuera no aumentan)', () => {
  const cssDir = join(app, 'css');
  const brand = readFileSync(join(cssDir, 'brand.css'), 'utf8');
  // Los bloques :root de brand.css (tema claro, oscuro dentro de @media y oscuro forzado por data-theme)
  // son el archivo de variables; el selector puede llevar [data-theme] o :not().
  const outside = readdirSync(cssDir).filter((f) => f.endsWith('.css'))
    .map((f) => readFileSync(join(cssDir, f), 'utf8').replace(/:root[^{}]*\{[^}]*\}/g, '')).join('\n');
  const hex = outside.match(HEX) || [];
  const rgb = outside.match(RGB) || [];
  const n = hex.length + rgb.length;
  assert.ok(n <= CSS_COLORS_MAX, `${n} colores a mano fuera de :root (techo ${CSS_COLORS_MAX}): ${[...hex, ...rgb].join(' ')}`);
  // Y en :root tiene que haber variables de verdad (si alguien borra el bloque, el techo no vale).
  // Claro, oscuro por el sistema (dentro de @media) y oscuro forzado ([data-theme="dark"]).
  assert.ok((brand.match(/:root[^{}]*\{[^}]*\}/g) || []).length >= 3, 'faltan los bloques :root claro y oscuro en brand.css');
});
