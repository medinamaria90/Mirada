// Lupa del día (portada): nombre propio y, una vez resuelta, una fila compacta con miniatura en
// lugar del recorte grande con la pregunta (que se confundía con el reto diario). Sin navegador:
// el módulo construye HTML y se comprueba el texto.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildIndex } from '../app/js/engine/catalog.js';
import { emptyProgress } from '../app/js/engine/progress.js';
import { planDetail, DETAIL_FAME } from '../app/js/engine/goals.js';
import { icons } from '../app/js/ui/icons.js';
import { detailCard, detailRow, DETAIL_NAME } from '../app/js/ui/screens/home-detail.js';

const here = dirname(fileURLToPath(import.meta.url));
const app = join(here, '..', 'app');
const real = buildIndex(JSON.parse(readFileSync(join(app, 'data', 'catalog.json'), 'utf8')));
const TODAY = '2026-11-24';

function learnedProgress() {
  const p = emptyProgress();
  for (const w of real.artworks) if ((w.fame || 0) >= DETAIL_FAME) p.collection[w.id] = TODAY;
  return p;
}

function ctxWith(progress) {
  return { index: real, store: { get: () => ({ progress }) }, dailyDay: () => TODAY };
}

test('lupa del día: pendiente, recorte grande con la pregunta, el nombre nuevo y el icono de lupa', () => {
  const p = learnedProgress();
  const html = detailCard(ctxWith(p));
  assert.ok(html.includes(DETAIL_NAME) && DETAIL_NAME === 'Lupa del día');
  assert.ok(html.includes('class="detail-crop"'), 'sin recorte grande');
  assert.ok(html.includes('¿De quién es?'), 'sin pregunta');
  assert.equal((html.match(/data-action="detail"/g) || []).length, 4, 'cuatro opciones');
  assert.ok(html.includes(icons.loupe(14)), 'sin el icono de lupa');
  assert.ok(!html.includes('data-zoom'), 'sin responder no se puede ampliar (desvelaría el cuadro)');
  assert.ok(!html.includes('is-done'));
  const row = detailRow(ctxWith(p), planDetail(p, real, TODAY));
  assert.ok(row.includes('<details') && row.includes(DETAIL_NAME) && row.includes('¿De quién es?'));
});

test('lupa del día: resuelta, la portada pinta una fila compacta pulsable y no el recorte grande', () => {
  const p = learnedProgress();
  const plan = planDetail(p, real, TODAY);
  const w = real.artwork(plan.artworkId);
  const a = real.artist(w.artistId);
  p.detail[TODAY] = { artworkId: plan.artworkId, correct: true };
  for (const html of [detailCard(ctxWith(p)), detailRow(ctxWith(p), plan)]) {
    assert.ok(html.includes('card-detail is-done'), 'la tarjeta no se encoge');
    assert.ok(!html.includes('detail-crop') && !html.includes('¿De quién es?') && !html.includes('detail-option'), 'sigue pareciendo una pregunta');
    assert.ok(!html.includes('<details'), 'resuelta no va plegada');
    assert.ok(html.includes(`class="detail-done" data-zoom="${w.id}"`), 'toda la fila abre el visor');
    assert.ok(html.includes('art-sheet') && html.includes('detail-thumb'), 'sin miniatura del atlas');
    assert.ok(html.includes(DETAIL_NAME) && html.includes(icons.loupe(14)));
    assert.ok(html.includes(`<em>${w.title}</em> · ${a.short || a.name}`), 'falta «Título · Pintor» en una línea');
    assert.ok(!html.includes('Es de '), 'la fila no repite la respuesta del reto');
  }
});

test('lupa del día: resuelta, enseña la obra guardada aunque lo aprendido después cambie el plan', () => {
  const p = learnedProgress();
  const other = real.artworks.find((w) => (w.fame || 0) >= DETAIL_FAME && w.id !== planDetail(p, real, TODAY).artworkId && real.pathIndex(w.artistId) >= 0);
  p.detail[TODAY] = { artworkId: other.id, correct: false };
  const html = detailCard(ctxWith(p));
  assert.ok(html.includes(`data-zoom="${other.id}"`) && html.includes(`<em>${other.title}</em>`));
});

test('lupa del día: la app ya no dice «Detalle del día» en ningún sitio', () => {
  const files = (dir) => readdirSync(dir).flatMap((name) => {
    const f = join(dir, name);
    return statSync(f).isDirectory() ? files(f) : /\.(js|css|html)$/.test(name) ? [f] : [];
  });
  const found = [...files(join(app, 'js')), ...files(join(app, 'css')), join(app, 'index.html')]
    .filter((f) => /detalle del día/i.test(readFileSync(f, 'utf8')));
  assert.deepEqual(found, []);
});
