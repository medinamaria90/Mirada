// Épocas compartidas: la ruta que abre sus tarjetas, el enlace y sus páginas con vista previa (app/h/epoca-<id>.html).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseRoute, eraRoute } from '../app/js/ui/router.js';
import { eraUrl } from '../app/js/ui/story-share.js';

const here = dirname(fileURLToPath(import.meta.url));
const app = join(here, '..', 'app');
const json = (p) => JSON.parse(readFileSync(join(app, p), 'utf8'));

test('época compartida: la ruta lleva la época (con guiones)', () => {
  assert.deepEqual(parseRoute(`#${eraRoute('manierismo-y-norte')}`), { name: 'era', movementId: 'manierismo-y-norte' });
  assert.equal(parseRoute('#epoca-').name, 'invalid');
});

test('época compartida: el enlace va a su página, en la misma dirección de la app y sin nada más de quien comparte', () => {
  assert.equal(eraUrl('barroco', 'https://x.test/app/?a=1#movimiento-barroco'), 'https://x.test/app/h/epoca-barroco.html');
});

test('época compartida: se abre para quien no juega (no la tapa la bienvenida) y sin marcar la presentación como vista', () => {
  const main = readFileSync(join(app, 'js', 'main.js'), 'utf8');
  assert.match(main, /route\.name !== 'era'\) return welcome\(\)/);
  assert.match(main, /case 'era':.*mode: 'shared'/);
});

test('época compartida: cada época con tarjetas tiene su página con su imagen ligera, su frase y el salto a la app', () => {
  const eras = json('data/epocas/index.json');
  const cat = json('data/catalog.json');
  const movements = new Map(cat.movements.map((m) => [m.id, m]));
  const pages = readdirSync(join(app, 'h')).filter((f) => f.startsWith('epoca-'));
  assert.equal(pages.length, eras.length, 'páginas de más o de menos: python3 -I tools/share_pages.py');
  for (const id of eras) {
    const name = `epoca-${id}.html`;
    assert.ok(pages.includes(name), `falta app/h/${name}`);
    const html = readFileSync(join(app, 'h', name), 'utf8');
    const m = movements.get(id);
    assert.ok(m, `${id}: época fuera del catálogo`);
    assert.ok(html.includes(`<meta property="og:title" content="${m.name}">`), `${name}: título`);
    assert.ok(html.includes(`content="https://sfumato.dibulios.com/img/og/epoca-${id}.jpg"`), `${name}: imagen ligera`);
    assert.ok(html.includes(`location.replace('../#${eraRoute(id)}')`), `${name}: salto`);
  }
});
