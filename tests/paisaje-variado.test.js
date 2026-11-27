// Paisajes del mapa (tools/mapa_svg.py): las paradas sin viñeta propia no repiten el mismo edificio seguido ni en la misma
// columna, alternan lado y dejan algún hueco de prado vacío.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const noPython = spawnSync('python3', ['--version']).status !== 0;

test('paisajes: nunca el mismo edificio dos paradas seguidas ni en la misma columna, con lados alternos y huecos', { skip: noPython }, () => {
  const code = `
import json, subprocess, sys
sys.path.insert(0, 'tools')
import mapa_svg as S
lay = json.loads(subprocess.run(['node', 'tools/mapa-layout.mjs', 'app/data/catalog.json'], capture_output=True, text=True, check=True).stdout)
out = []
for era in lay['eras'] + lay['branches']:
    pts = [(q['x'], q['y'] - S.VINETA_SUBE) for q in era['points']]
    for opciones in (4, 5, 6):
        S.LIBRE['estrecho'] = set()
        hechas = []
        pool = [(lambda j: (lambda x, y, i: hechas.append((i, j, x > S.W / 2)) or []))(j) for j in range(opciones)]
        S.seguidas(pts, 0, pool, era['id'])
        out.append({'era': era['id'], 'n': len(pts), 'hechas': hechas})
print(json.dumps(out))
`;
  const res = spawnSync('python3', ['-I', '-c', code], { cwd: root, encoding: 'utf8' });
  assert.equal(res.status, 0, res.stderr);
  for (const { era, n, hechas } of JSON.parse(res.stdout)) {
    for (let k = 1; k < hechas.length; k++) {
      assert.notEqual(hechas[k][1], hechas[k - 1][1], `${era}: la misma viñeta dos veces seguidas (parada ${hechas[k][0]})`);
      if (k > 1) assert.notEqual(hechas[k][1], hechas[k - 2][1], `${era}: la misma viñeta a dos paradas (parada ${hechas[k][0]})`);
    }
    // En cada columna (lado del sendero), dos viñetas consecutivas nunca son la misma.
    for (const side of [true, false]) {
      const col = hechas.filter((h) => h[2] === side);
      for (let k = 1; k < col.length; k++) assert.notEqual(col[k][1], col[k - 1][1], `${era}: la misma viñeta en columna (parada ${col[k][0]})`);
    }
    if (n >= 6) assert.ok(hechas.length < n, `${era}: sin ningún hueco de prado`);
    if (hechas.length >= 4) assert.ok(new Set(hechas.map((h) => h[2])).size === 2, `${era}: todas las viñetas del mismo lado`);
  }
});
