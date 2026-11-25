// Arranque del inicio: main.js precarga (modulepreload) justo los módulos del inicio que no están en su cadena
// estática, para que no se pidan en cascada. Sin navegador: se comparan las listas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { homeOnlyModules } from '../tools/home-graph.mjs';

const here = dirname(fileURLToPath(import.meta.url));

test('arranque: main.js precarga los módulos del inicio (ni uno de más ni de menos)', () => {
  const main = readFileSync(join(here, '..', 'app', 'js', 'main.js'), 'utf8');
  const list = [...main.match(/const HOME_MODULES = \[([^\]]*)\]/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1]).sort();
  assert.deepEqual(list, homeOnlyModules());
  assert.ok(/else if \(atHome\) \{\s*preloadModules\(HOME_MODULES\);/.test(main), 'la precarga no va solo al abrir en el inicio');
});
