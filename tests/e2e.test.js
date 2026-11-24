// Recorrido de interfaz en Chrome headless dentro de `node --test`, solo si se pide:
//   MIRADA_E2E=1 node --test tests/
// Sin la variable se salta (la suite normal sigue siendo rápida y sin navegador). Ejecuta el modo
// «humo» de tests/e2e.sh (~1 min: arranque, una etapa completa con teclado, resultado, perfil y
// auditorías de contraste y táctiles, y el visor de un cuadro) en un puerto libre desde 8941 y falla si encuentra algún
// problema. Capturas en una carpeta temporal. El recorrido completo: bash tests/e2e.sh.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const enabled = process.env.MIRADA_E2E === '1';

test('interfaz: humo en Chrome (MIRADA_E2E_MODE=smoke tests/e2e.sh)', {
  skip: enabled ? false : 'recorrido de interfaz omitido: ejecuta con MIRADA_E2E=1 para incluirlo',
  timeout: 5 * 60 * 1000,
}, () => {
  const out = mkdtempSync(join(tmpdir(), 'mirada-humo-'));
  const run = spawnSync('bash', [join(here, 'e2e.sh'), out, 'humo-'], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, MIRADA_E2E_MODE: 'smoke' },
  });
  let report = null;
  try {
    report = JSON.parse(run.stdout.slice(run.stdout.indexOf('{')));
  } catch {
    report = null;
  }
  const problems = report ? report.problems : [run.stderr.slice(-2000) || run.stdout.slice(-2000)];
  assert.equal(run.status, 0, `el recorrido de interfaz encontró problemas:\n${problems.join('\n')}`);
  assert.deepEqual(problems, []);
});
