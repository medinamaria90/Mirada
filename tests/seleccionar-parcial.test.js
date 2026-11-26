// Proceso del catálogo: `seleccionar.py <pintor ...>` solo vuelve a elegir esos pintores y deja el resto de
// catalogo/seleccion.json como estaba (incluida su fama), para no deshacer ajustes hechos a mano.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAINTER = 'piero';

// Copia del proceso en una carpeta temporal con las candidatas de `painter` (sin red).
function sandbox(painter) {
  const dir = mkdtempSync(join(tmpdir(), 'mirada-sel-'));
  cpSync(join(root, 'pipeline'), join(dir, 'pipeline'), {
    recursive: true,
    filter: (src) => !src.includes(`${join('pipeline', 'out')}`) && !src.includes('__pycache__'),
  });
  mkdirSync(join(dir, 'pipeline', 'out', 'candidates'), { recursive: true });
  cpSync(join(root, 'pipeline', 'out', 'painters_resolved.json'), join(dir, 'pipeline', 'out', 'painters_resolved.json'));
  cpSync(join(root, 'pipeline', 'out', 'candidates', `${painter}.json`), join(dir, 'pipeline', 'out', 'candidates', `${painter}.json`));
  mkdirSync(join(dir, 'catalogo'));
  cpSync(join(root, 'catalogo', 'seleccion.json'), join(dir, 'catalogo', 'seleccion.json'));
  return dir;
}

test('seleccionar con un pintor no toca a los demás', () => {
  const dir = sandbox(PAINTER);
  try {
    const before = JSON.parse(readFileSync(join(dir, 'catalogo', 'seleccion.json'), 'utf8'));

    execFileSync('python3', [join(dir, 'pipeline', 'seleccionar.py'), PAINTER], { env: { ...process.env, PYTHONUTF8: '1' } });
    const after = JSON.parse(readFileSync(join(dir, 'catalogo', 'seleccion.json'), 'utf8'));

    const others = (list) => list.filter((s) => s.pintorId !== PAINTER);
    assert.deepEqual(others(after), others(before));
    assert.ok(after.some((s) => s.pintorId === PAINTER), 'el pintor pedido sigue en la selección');
    assert.throws(() => execFileSync('python3', [join(dir, 'pipeline', 'seleccionar.py'), 'nadie'], { stdio: 'pipe' }));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('una obra fijada a una etapa (ajustes.json) va a su «a fondo», no al básico, aunque sea forzada', () => {
  const dir = sandbox('giotto');
  try {
    execFileSync('python3', [join(dir, 'pipeline', 'seleccionar.py'), 'giotto'], { env: { ...process.env, PYTHONUTF8: '1' } });
    const sel = JSON.parse(readFileSync(join(dir, 'catalogo', 'seleccion.json'), 'utf8')).filter((s) => s.pintorId === 'giotto');
    const level = (qid) => sel.find((s) => s.qid === qid)?.level;
    // Frescos de la capilla Scrovegni: Huida a Egipto (forzada y fijada), Visitación y la Virgen de la Anunciación.
    for (const qid of ['Q549172', 'Q734197', 'Q61989282']) assert.equal(level(qid), 3, qid);
    assert.equal(sel.filter((s) => s.level === 1).length, 8, 'el básico de un gran maestro sigue con 8 obras');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
