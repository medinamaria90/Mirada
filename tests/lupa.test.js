// Franja «Hoy» de la portada (Reto, Lupa, Repaso) y Lupa del día: estado de cada botón, plegado cuando
// lo de hoy está hecho y a dónde lleva cada uno. Sin navegador: el módulo construye HTML y se comprueba
// el texto (la navegación real, en el humo).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildIndex } from '../app/js/engine/catalog.js';
import { emptyProgress } from '../app/js/engine/progress.js';
import { planDetail, DETAIL_FAME } from '../app/js/engine/goals.js';
import { icons } from '../app/js/ui/icons.js';
import { detailCard, DETAIL_NAME } from '../app/js/ui/screens/home-detail.js';
import { todayStrip } from '../app/js/ui/screens/home-today.js';

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
  return { index: real, store: { get: () => ({ progress }) }, dailyDay: () => TODAY, today: () => TODAY };
}

const button = (html, id) => html.match(new RegExp(`<button[^>]*(?:data-action="${id}"|data-zoom="${id}")[^>]*>`))?.[0] || '';

test('lupa del día: pendiente, recorte grande con la pregunta, el nombre nuevo y el icono de lupa', () => {
  const p = learnedProgress();
  const html = detailCard(ctxWith(p));
  assert.ok(html.includes(DETAIL_NAME) && DETAIL_NAME === 'Lupa del día');
  assert.ok(html.includes('class="detail-crop"'), 'sin recorte grande');
  assert.ok(html.includes('¿De quién es?'), 'sin pregunta');
  assert.equal((html.match(/data-action="detail"/g) || []).length, 4, 'cuatro opciones');
  assert.ok(html.includes(icons.loupe(14)), 'sin el icono de lupa');
  assert.ok(!html.includes('data-zoom'), 'sin responder no se puede ampliar (desvelaría el cuadro)');
});

test('franja «Hoy»: reto y lupa pendientes, dos botones con su acción, sin plegar y sin textos de ayuda', () => {
  const html = todayStrip(ctxWith(learnedProgress()));
  assert.ok(html.includes('class="today-strip"') && !html.includes('today-fold') && !html.includes(' hidden'));
  assert.ok(button(html, 'daily').includes('aria-label="Reto diario, pendiente"'));
  assert.ok(button(html, 'lupa').includes('aria-label="Lupa del día, pendiente"'));
  assert.ok(html.includes('>Reto<') && html.includes('>Lupa<'));
  assert.ok(!html.includes('today-tick'), 'un pendiente no lleva tic');
  assert.ok(!html.includes('data-action="review5"') && !html.includes('data-action="quick"'), 'repaso sin cuadros que repasar');
});

test('franja «Hoy»: sin cuadros aprendidos no hay lupa; el reto siempre está', () => {
  const html = todayStrip(ctxWith(emptyProgress()));
  assert.ok(button(html, 'daily') && !button(html, 'lupa'));
});

test('franja «Hoy»: con cuadros vencidos sale el botón de repaso', () => {
  const p = learnedProgress();
  p.srs[`art:${real.artworks[0].id}`] = { box: 1, due: '2026-11-01' };
  const html = todayStrip(ctxWith(p));
  assert.ok(/data-action="(review5|quick)"/.test(html) && html.includes('>Repaso<'));
});

test('franja «Hoy»: reto hecho con tic y «8/10»; con la lupa pendiente no se pliega', () => {
  const p = learnedProgress();
  p.daily[TODAY] = { score: 8, total: 10 };
  const html = todayStrip(ctxWith(p));
  assert.ok(button(html, 'daily').includes('aria-label="Reto diario, hecho: 8 de 10"'));
  assert.ok(html.includes('class="today-btn is-done"') && html.includes('today-tick') && html.includes('8/10'));
  assert.ok(!html.includes('today-fold'));
});

test('franja «Hoy»: con reto y lupa hechos se pliega a «Hoy, hecho» y se despliega al tocarla', () => {
  const p = learnedProgress();
  const plan = planDetail(p, real, TODAY);
  const w = real.artwork(plan.artworkId);
  p.daily[TODAY] = { score: 9, total: 10 };
  p.detail[TODAY] = { artworkId: plan.artworkId, correct: true };
  const html = todayStrip(ctxWith(p));
  assert.ok(html.includes('data-action="today-toggle" aria-expanded="false"') && html.includes('Hoy, hecho'));
  assert.ok(html.includes('class="today-buttons" hidden'), 'los botones no se pliegan');
  assert.ok(html.includes(`data-zoom="${w.id}"`) && !button(html, 'lupa'), 'la lupa hecha abre el cuadro en el visor');
  assert.ok(detailCard(ctxWith(p)) === '', 'la lupa resuelta no vuelve a preguntar');
});

test('lupa del día: resuelta, enseña la obra guardada aunque lo aprendido después cambie el plan', () => {
  const p = learnedProgress();
  const other = real.artworks.find((w) => (w.fame || 0) >= DETAIL_FAME && w.id !== planDetail(p, real, TODAY).artworkId && real.pathIndex(w.artistId) >= 0);
  p.detail[TODAY] = { artworkId: other.id, correct: false };
  const html = todayStrip(ctxWith(p));
  assert.ok(html.includes(`data-zoom="${other.id}"`) && html.includes(other.title.replace(/&/g, '&amp;').slice(0, 10)));
});

test('portada: ya no hay tarjetas de reto, lupa ni repaso arriba del camino', () => {
  const home = readFileSync(join(app, 'js', 'ui', 'screens', 'home.js'), 'utf8');
  assert.ok(!/card-daily|card-review|card-continue|class="overall"|today-block|detailRow/.test(home));
  assert.ok(home.includes('todayStrip'));
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
