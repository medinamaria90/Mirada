// Vocabulario (decisión de María, 27/11): nada de «dominar»/«dominado» en los textos que se ven; lo que se aprende es a
// reconocer, y cada frase se escribe como se habla («Pintores que reconoces», «Faltan 2 pintores»). Los ids internos
// (`mastered`) se quedan. Busca en todo el código de la app, fuera de los comentarios.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = join(dirname(fileURLToPath(import.meta.url)), '..', 'app');
const files = (dir) => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? files(p) : /\.(js|html)$/.test(n) ? [p] : [];
});
// «dominio público», «domingo», «dominico» o «Dominique» no son el verbo.
const VERB = /domin(?!io|go|ic|iq)/i;

test('ningún texto visible dice «dominar» ni «dominado»', () => {
  const hits = [];
  for (const f of [...files(join(app, 'js')), ...readdirSync(app).filter((n) => n.endsWith('.html')).map((n) => join(app, n))]) {
    readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
      const code = line.replace(/\/\/.*$/, '').replace(/^\s*\*.*$/, '').replace(/\/\*.*?\*\//g, '');
      if (VERB.test(code)) hits.push(`${f.slice(app.length)}:${i + 1}: ${line.trim().slice(0, 100)}`);
    });
  }
  assert.deepEqual(hits, []);
});
