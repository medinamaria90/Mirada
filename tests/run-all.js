// Permite `node --test tests/`: Node 22 trata la carpeta como módulo y carga este archivo,
// que importa todos los *.test.js de la carpeta (incluidos los de otros agentes).
import { readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
for (const file of readdirSync(here).filter((f) => f.endsWith('.test.js')).sort()) {
  await import(pathToFileURL(join(here, file)).href);
}
