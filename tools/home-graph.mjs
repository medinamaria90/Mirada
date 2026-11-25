// Módulos del inicio que no están en la cadena estática de main.js: los que main.js precarga
// (<link rel="modulepreload">) al abrir la app en el inicio, para que no se pidan en cascada.
//   node tools/home-graph.mjs     → lista (la prueba tests/arranque-mapa.test.js comprueba que coincide)
import { readFileSync } from 'node:fs';
import { dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'app');
const IMPORT = /^\s*import\s(?:[^;]*?\sfrom\s)?'([^']+)'/gm;

export function staticGraph(entry, seen = new Set()) {
  if (seen.has(entry)) return seen;
  seen.add(entry);
  for (const m of readFileSync(entry, 'utf8').matchAll(IMPORT)) staticGraph(resolve(dirname(entry), m[1]), seen);
  return seen;
}

export function homeOnlyModules() {
  const main = staticGraph(resolve(app, 'js/main.js'));
  return [...staticGraph(resolve(app, 'js/ui/screens/home.js'))].filter((f) => !main.has(f))
    .map((f) => relative(resolve(app, 'js'), f).split(sep).join('/')).sort();
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) console.log(homeOnlyModules().join('\n'));
