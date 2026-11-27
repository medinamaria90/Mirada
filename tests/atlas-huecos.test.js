// Atlas de miniaturas (tools/make_atlas.py): si al paquete de imágenes le falta la de alguna obra, el despliegue no
// se cae; avisa, deja un hueco neutro con sus proporciones y sigue. Solo falla si faltan demasiadas (paquete roto).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = join(root, 'tools', 'make_atlas.py');
const hasPillow = spawnSync('python3', ['-c', 'import PIL']).status === 0;
const SIDE = 100; // imágenes pequeñas: el paquete no las amplía, así que miden lo mismo que en el catálogo

// App mínima con `total` obras en una hoja; solo las de `present` tienen imagen.
function sandbox(total, present) {
  const app = mkdtempSync(join(tmpdir(), 'mirada-atlas-'));
  mkdirSync(join(app, 'data'));
  mkdirSync(join(app, 'img'));
  const artworks = Array.from({ length: total }, (_, i) => ({
    id: `w${i + 1}`, w: SIDE, h: SIDE, thumb: [0, 4 + i * 110, 4, SIDE, SIDE],
  }));
  const cat = { atlas: { cell: 110, sheets: ['img/s/0.jpg'], size: [[total * 110 + 8, 110]] }, artworks };
  writeFileSync(join(app, 'data', 'catalog.json'), JSON.stringify(cat));
  const paint = `from PIL import Image\nimport sys\nfor p in sys.argv[1:]: Image.new("RGB", (${SIDE}, ${SIDE}), (90, 60, 30)).save(p, "JPEG")`;
  execFileSync('python3', ['-c', paint, ...present.map((id) => join(app, 'img', `${id}.jpg`))]);
  return app;
}

const run = (app) => spawnSync('python3', ['-I', SCRIPT, app], { encoding: 'utf8' });

test('una imagen que falta deja un hueco neutro y el atlas se pinta igual', { skip: !hasPillow && 'sin Pillow' }, () => {
  const ids = Array.from({ length: 25 }, (_, i) => `w${i + 1}`);
  const app = sandbox(25, ids.filter((id) => id !== 'w7'));
  try {
    const r = run(app);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stderr, /w7\.jpg no está/);
    assert.match(r.stdout, /sin_imagen=1/);
    assert.ok(existsSync(join(app, 'img', 's', '0.jpg')), 'la hoja del atlas existe');
    for (const dir of ['t', 'g', 'm']) assert.ok(existsSync(join(app, 'img', dir, 'w7.jpg')), `hueco en img/${dir}`);
    assert.ok(existsSync(join(app, 'img', 'w7.jpg')), 'la imagen grande también tiene su hueco: el visor no se rompe');
  } finally {
    rmSync(app, { recursive: true, force: true });
  }
});

test('si faltan demasiadas imágenes, falla: el paquete no es de este catálogo', { skip: !hasPillow && 'sin Pillow' }, () => {
  const app = sandbox(4, ['w1']);
  try {
    const r = run(app);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /faltan 3 de 4/);
  } finally {
    rmSync(app, { recursive: true, force: true });
  }
});
