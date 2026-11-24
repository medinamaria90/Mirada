// Ficha de pintor al estilo Instagram y galería del pintor: rutas, portada sin spoilers, galería embebida con huecos,
// avatar, duración de las tarjetas de la historia y HTML del perfil (anillo de historia, «Ver sus n cuadros»).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildIndex } from '../app/js/engine/catalog.js';
import { emptyProgress } from '../app/js/engine/progress.js';
import { parseRoute } from '../app/js/ui/router.js';
import { coverWork, previewCells, avatarCrop, seenOf, PREVIEW_CELLS } from '../app/js/engine/painters.js';
import { cardDuration, CARD_BASE_MS } from '../app/js/engine/stories.js';
import { worksSpec } from '../app/js/ui/screens/artist-works.js';

const here = dirname(fileURLToPath(import.meta.url));
const real = buildIndex(JSON.parse(readFileSync(join(here, '..', 'app', 'data', 'catalog.json'), 'utf8')));
const DAY = '2026-11-25';

test('rutas: ficha (con y sin etapas), galería del pintor y de los invitados; ids con guiones', () => {
  assert.deepEqual(parseRoute('#pintor-el-greco'), { name: 'artist', artistId: 'el-greco', focus: '' });
  assert.deepEqual(parseRoute('#pintor-van-gogh-etapas'), { name: 'artist', artistId: 'van-gogh', focus: 'stages' });
  assert.deepEqual(parseRoute('#obras-goya'), { name: 'works', spec: { kind: 'artist', artistId: 'goya' } });
  assert.deepEqual(parseRoute('#obras-invitados-barroco'), { name: 'works', spec: { kind: 'guests', movementId: 'barroco' } });
  assert.equal(parseRoute('#obras-').name, 'invalid');
  assert.equal(parseRoute('#etapa-goya').name, 'stage');
  assert.equal(parseRoute('#galeria-barroco').name, 'gallery', 'la galería de la sala no se confunde con la del pintor');
});

test('portada: la obra más famosa de las vistas, nunca una no vista; sin vistas, ninguna', () => {
  const p = emptyProgress();
  assert.equal(coverWork(seenOf(p, real, 'goya')), null);
  const works = real.worksOf('goya');
  const famous = works.slice().sort((a, b) => (b.fame || 0) - (a.fame || 0))[0];
  const humble = works.find((w) => (w.fame || 0) < (famous.fame || 0));
  p.collection[humble.id] = DAY;
  assert.equal(coverWork(seenOf(p, real, 'goya')).id, humble.id, 'solo hay una vista: la famosa sin ver no sale');
  p.collection[famous.id] = DAY;
  assert.equal(coverWork(seenOf(p, real, 'goya')).id, famous.id);
});

test('galería embebida: las 6 primeras casillas, con huecos hasta completar y sin pasar de las que tiene', () => {
  const w = (n) => Array.from({ length: n }, (_, i) => ({ id: `w${i}` }));
  assert.deepEqual(previewCells(w(8), 20), { shown: w(8).slice(0, PREVIEW_CELLS), gaps: 0 });
  assert.deepEqual(previewCells(w(2), 20), { shown: w(2), gaps: 4 });
  assert.deepEqual(previewCells(w(2), 3), { shown: w(2), gaps: 1 }, 'como mucho tantos huecos como obras tiene el pintor');
  assert.deepEqual(previewCells([], 0), { shown: [], gaps: 0 });
});

test('avatar: detalle del cuadro según su focus, o la parte alta del centro', () => {
  assert.deepEqual(avatarCrop({ focus: [0.2, 0.8] }), { x: 20, y: 80 });
  assert.deepEqual(avatarCrop({}), { x: 50, y: 35 });
  assert.deepEqual(avatarCrop(null), { x: 50, y: 35 });
});

test('historia: cada tarjeta dura lo que se tarda en leerla', () => {
  assert.equal(cardDuration({ text: '' }), CARD_BASE_MS);
  assert.ok(cardDuration({ text: 'x'.repeat(180) }) > cardDuration({ text: 'x'.repeat(20) }));
  assert.ok(cardDuration({ text: 'x'.repeat(180) }) < 15000, 'ni eterna');
});

test('galería del pintor: todas las vistas por orden cronológico y el total; invitados juntos', () => {
  const p = emptyProgress();
  const works = real.worksOf('goya');
  for (const w of works.slice(0, 4)) p.collection[w.id] = DAY;
  const ctx = { index: real, store: { get: () => ({ progress: p }) } };
  const spec = worksSpec(ctx, { kind: 'artist', artistId: 'goya' });
  assert.equal(spec.works.length, 4);
  assert.equal(spec.total, works.length);
  const years = spec.works.map((w) => w.yearSort || 0);
  assert.deepEqual(years, [...years].sort((a, b) => a - b));
  assert.equal(worksSpec(ctx, { kind: 'artist', artistId: 'nadie' }), null);
  const guest = real.artists.find((a) => a.category === 'invitado');
  p.collection[real.worksOf(guest.id)[0].id] = DAY;
  const g = worksSpec(ctx, { kind: 'guests', movementId: guest.movementId });
  assert.equal(g.title, 'Invitados');
  assert.ok(g.works.length >= 1 && g.total >= g.works.length);
  assert.equal(worksSpec(ctx, { kind: 'guests', movementId: 'gotico-sin-invitados' }), null);
});
