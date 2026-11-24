// Mapa del camino (v10): de abajo arriba, nodo actual con «Empezar»/«Seguir», «Tu museo» arriba y
// los paisajes SVG de app/img/mapa a juego con el trazado y con los colores de brand.css. Sin navegador:
// el módulo construye HTML y se comprueba el texto.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildIndex } from '../app/js/engine/catalog.js';
import { emptyProgress, hasMovementReview, nextStep } from '../app/js/engine/progress.js';
import { icons } from '../app/js/ui/icons.js';
import { renderPathMap, pathLayout, eraLayout, MAP_W, STEP } from '../app/js/ui/screens/path-map.js';
import { bigIndex, salaCatalog } from './helpers.js';

const here = dirname(fileURLToPath(import.meta.url));
const app = join(here, '..', 'app');
const real = buildIndex(JSON.parse(readFileSync(join(app, 'data', 'catalog.json'), 'utf8')));
const TODAY = '2026-11-20';
// accentStyle (acento por época) lee variables CSS del documento: lo mínimo para que no haga falta navegador.
globalThis.document = { documentElement: {} };
globalThis.getComputedStyle = () => ({ getPropertyValue: () => '#000000' });

function ctxWith(index, progress = emptyProgress()) {
  return { index, store: { get: () => ({ progress }) } };
}

function masterFirst(index, n) {
  const p = emptyProgress();
  index.steps.slice(0, n).forEach((s) => {
    const rec = { plays: 1, best: 0.9, mastered: true, last: TODAY };
    if (s.type === 'sala') p.salas[s.id] = rec; else p.artists[s.id] = rec;
  });
  // Sello de época (como lo pone finishRound): todas sus paradas dominadas.
  for (const m of index.visibleMovements) {
    const steps = index.stepsOf(m.id);
    if (steps.length && steps.every((s) => index.steps.indexOf(s) < n)) p.medals[`movement-${m.id}`] = TODAY;
  }
  return p;
}

const spots = (html) => [...html.matchAll(/<li class="stage-spot[^"]*" data-step="([^"]+)" style="left:([\d.]+)%;top:([\d.]+)%"/g)].map((m) => ({ key: m[1], x: Number(m[2]), y: Number(m[3]) }));
const eras = (html) => [...html.matchAll(/<li class="path-era[^"]*" data-era="([^"]+)"/g)].map((m) => m[1]);

test('mapa: el DOM va en orden cronológico y, dentro de cada tramo, las paradas suben (la primera es la más baja)', () => {
  const html = renderPathMap(ctxWith(real));
  assert.deepEqual(eras(html), real.visibleMovements.map((m) => m.id));
  assert.deepEqual(spots(html).map((s) => s.key).filter((k) => !k.startsWith('review:')), real.steps.map((s) => `${s.type}:${s.id}`), 'las paradas no siguen index.steps');
  for (const era of pathLayout(real).eras) {
    const ys = era.points.map((p) => p.y);
    assert.ok(ys.every((y, i) => i === 0 || y < ys[i - 1]), `${era.id}: las paradas no suben`);
    assert.ok(ys[0] < era.h && ys[ys.length - 1] > 0);
    assert.ok(era.points.every((p, i) => i === 0 || (p.x < MAP_W / 2) !== (era.points[i - 1].x < MAP_W / 2)), `${era.id}: el sendero no hace zigzag`);
  }
  // El museo cierra el camino (último en el DOM = arriba del todo) y el CSS invierte con column-reverse.
  assert.ok(html.trimEnd().endsWith('</li>') && html.lastIndexOf('path-museum') > html.lastIndexOf('path-era'));
  assert.ok(html.includes('Tu museo') && html.includes(`${real.visibleMovements.length} épocas`));
  const css = readFileSync(join(app, 'css', 'main.css'), 'utf8');
  assert.ok(/\.path-map \{[^}]*flex-direction: column-reverse/.test(css), 'el CSS no invierte el camino');
});

test('mapa: cada tramo tiene su paisaje aparte (sin src hasta acercarse), el sendero y la cartela con «n/m»', () => {
  const html = renderPathMap(ctxWith(real, masterFirst(real, 2)));
  for (const m of real.visibleMovements) {
    assert.ok(html.includes(`data-src="img/mapa/${m.id}.svg"`), `${m.id}: sin paisaje`);
    assert.ok(html.includes(`--era-tint:var(--map-tint-${m.id})`), `${m.id}: sin tinte de terreno`);
  }
  assert.ok(!/<img class="path-land"[^>]* src=/.test(html), 'un paisaje se pide antes de tiempo');
  assert.equal((html.match(/<svg class="path-trail"/g) || []).length, real.visibleMovements.length + 1, 'un sendero por tramo y el del museo');
  assert.ok(html.includes(`${real.movement(real.steps[0].movementId).period} · 2/${real.stepsOf(real.steps[0].movementId).length}`), 'la cartela no dice cuántas van');
  assert.ok(html.includes('class="movement-head is-button" data-action="intro"'), 'la cartela abierta no lleva a la presentación');
  const locked = real.visibleMovements[2];
  assert.ok(html.includes(`Termina ${real.visibleMovements[1].name} para abrirlo`) && !html.includes(`data-action="intro" data-id="${locked.id}"`), 'una época cerrada no dice cómo se abre');
});

test('mapa: sin personaje ni cofres (vuelven en la v2 con premios de verdad)', () => {
  const html = renderPathMap(ctxWith(real));
  assert.ok(!/path-chest|path-character/.test(html), 'quedan cofres o personaje en el mapa');
  assert.ok(!('chest' in eraLayout(5)) && !('chest' in eraLayout(2)));
  assert.ok(!existsSync(join(app, 'js', 'ui', 'path-character.js')), 'sigue el módulo del personaje');
  assert.ok(!/path-chest|path-character|\.pc-/.test(readFileSync(join(app, 'css', 'main.css'), 'utf8')), 'quedan estilos del personaje o los cofres');
});

test('mapa: el nodo actual lleva «Empezar» (o «Seguir» a medias) y el anillo; los demás, solo el nombre', () => {
  let html = renderPathMap(ctxWith(real));
  const first = real.steps[0];
  assert.equal((html.match(/stage-spot is-(left|right) is-current/g) || []).length, 1);
  assert.ok(html.includes(`is-current" data-step="${first.type}:${first.id}"`), 'el nodo actual no es la primera parada');
  assert.ok(html.includes('<span class="stage-meta">Empezar</span>'));
  assert.ok(!html.includes('1483–1520') && !html.includes('Dominado'), 'los nodos sin jugar o dominados no llevan texto de más');
  const p = masterFirst(real, 1);
  p.artists[real.steps[1].id] = { plays: 1, best: 0.5, mastered: false, last: TODAY };
  html = renderPathMap(ctxWith(real, p));
  assert.ok(html.includes(`is-current" data-step="artist:${real.steps[2].id}"`) && html.includes('<span class="stage-meta">Empezar</span>'));
  assert.ok(html.includes('Repite · 50%'), 'lo jugado a medias no invita a repetir con su mejor resultado');
  assert.ok(html.includes('class="stage  is-mastered"') && html.includes('class="stage-badge"'), 'lo dominado no lleva sello');
  // Camino jugado entero pero no dominado: el actual es el primero por repasar y dice «Seguir».
  const q = emptyProgress();
  real.steps.forEach((s) => { q.artists[s.id] = { plays: 1, best: 0.5, mastered: false, last: TODAY }; });
  html = renderPathMap(ctxWith(real, q));
  assert.equal(nextStep(q, real).id, real.steps[0].id);
  assert.ok(html.includes('<span class="stage-meta">Seguir</span>'));
});

test('mapa: repaso al final de cada época con ≥ 3 pintores, sala junto a la última parada al dominarla, y las salas como parada', () => {
  const html = renderPathMap(ctxWith(real));
  const reviews = real.visibleMovements.filter((m) => hasMovementReview(real, m.id));
  assert.equal((html.match(/class="stage stage-review is-/g) || []).length, reviews.length);
  assert.ok(html.includes(`aria-label="Repaso de ${reviews[0].name}, bloqueado`));
  for (const era of pathLayout(real).eras) assert.equal(era.points.length, real.stepsOf(era.id).length + (hasMovementReview(real, era.id) ? 1 : 0));
  const all = renderPathMap(ctxWith(real, masterFirst(real, real.steps.length)));
  assert.equal((all.match(/class="stage stage-gallery is-mastered"/g) || []).length, real.visibleMovements.length, 'sin salas con todo dominado');
  assert.ok(all.includes('class="path-era movement movement-mastered is-sealed"') && all.includes(icons.laurel(18)));
  const sala = buildIndex(salaCatalog());
  const sh = renderPathMap(ctxWith(sala));
  assert.ok(sala.visibleMovements.some((m) => sala.isSala(m.id)));
  assert.ok(sh.includes('class="stage stage-sala is-') && sh.includes('Conoce el movimiento'));
  assert.doesNotThrow(() => renderPathMap(ctxWith(bigIndex())));
});

test('paisajes: un SVG por época, ≤ 40 KB, con el trazado de la app y solo colores de brand.css', () => {
  const dir = join(app, 'img', 'mapa');
  const files = readdirSync(dir).filter((f) => f.endsWith('.svg'));
  assert.deepEqual(files.sort(), real.visibleMovements.map((m) => `${m.id}.svg`).sort());
  const brand = readFileSync(join(app, 'css', 'brand.css'), 'utf8');
  const vars = (sel) => Object.fromEntries([...brand.slice(brand.indexOf(sel)).split('}')[0].matchAll(/--map-([a-z0-9-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2]]));
  const light = vars(':root {');
  const dark = vars(':root[data-theme="dark"] {');
  for (const era of pathLayout(real).eras) {
    const svg = readFileSync(join(dir, `${era.id}.svg`), 'utf8');
    assert.ok(statSync(join(dir, `${era.id}.svg`)).size <= 40 * 1024, `${era.id}.svg pasa de 40 KB`);
    assert.ok(svg.includes(`viewBox="0 0 ${MAP_W} ${era.h}"`), `${era.id}: alto distinto del trazado (${era.h})`);
    assert.equal(svg.match(/data-points="([^"]*)"/)[1], era.points.map((p) => `${p.x},${p.y}`).join(' '), `${era.id}: nodos distintos del trazado`);
    assert.ok(!/\b(fill|stroke)="(#|rgb)/.test(svg), `${era.id}: colores sueltos en las piezas`);
    const [lightCss, darkCss] = svg.match(/<style>(.*?)<\/style>/)[1].split('@media(prefers-color-scheme:dark)');
    for (const [pal, css] of [[light, lightCss], [dark, darkCss]]) {
      const colors = new Set(css.match(/(#[0-9a-f]{6}|rgba?\([^)]*\))/gi));
      assert.ok(colors.size > 10 && [...colors].every((c) => Object.values(pal).includes(c)), `${era.id}: color que no está en brand.css`);
      assert.ok(css.includes(pal[`tint-${era.id}`]), `${era.id}: sin el tinte de su época`);
    }
  }
  assert.equal(STEP, 112);
});

test('mapa: el repaso cerrado dice qué pintores faltan por dominar', () => {
  const real = bigIndex();
  const m = real.visibleMovements.find((x) => hasMovementReview(real, x.id));
  const artists = real.stepsOf(m.id).filter((s) => s.type === 'artist');
  const progress = emptyProgress();
  for (const s of artists.slice(0, -1)) progress.artists[s.id] = { plays: 1, best: 0.9, mastered: true, last: '2026-11-20' };
  const last = real.artist(artists[artists.length - 1].id);
  const html = renderPathMap(ctxWith(real, progress));
  assert.ok(html.includes(`Falta dominar a ${last.short || last.name}`), 'el repaso no nombra al pintor que falta');
  assert.ok(html.includes(`data-lock="Falta dominar a ${last.short || last.name}"`), 'la nota al pulsar no nombra al pintor');
  const none = renderPathMap(ctxWith(real, emptyProgress()));
  assert.ok(/Faltan .+ y \d+ más|Faltan .+ y .+/.test(none), 'con todos pendientes debe resumir («Faltan X y n más»)');
});
