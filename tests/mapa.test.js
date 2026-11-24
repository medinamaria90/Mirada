// Mapa del camino (v10): de abajo arriba, nodo actual con «Empezar»/«Seguir», un cofre cerrado por
// época, «Tu museo» arriba, el personaje junto al nodo actual (sin paseo con movimiento reducido) y
// los paisajes SVG de app/img/mapa a juego con el trazado y con los colores de brand.css. Sin navegador:
// el módulo construye HTML y se comprueba el texto; el personaje, con un DOM mínimo simulado.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildIndex } from '../app/js/engine/catalog.js';
import { emptyProgress, hasMovementReview, nextStep } from '../app/js/engine/progress.js';
import { icons } from '../app/js/ui/icons.js';
import { renderPathMap, pathLayout, eraLayout, trailPoint, MAP_W, STEP } from '../app/js/ui/screens/path-map.js';
import { characterHtml, walkFrames, settleCharacter, resetCharacter, WALK_MS } from '../app/js/ui/path-character.js';
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

test('mapa: un cofre cerrado por época en el sendero entre la segunda y la tercera parada, solo visual', () => {
  const html = renderPathMap(ctxWith(real));
  assert.equal((html.match(/class="path-chest" aria-hidden="true"/g) || []).length, real.visibleMovements.length);
  assert.ok(!/path-chest[^>]*data-action/.test(html), 'el cofre no debe ser pulsable todavía');
  assert.ok(html.includes(icons.chest(24)));
  const era = eraLayout(5);
  const [a, b] = [era.points[1], era.points[2]];
  assert.ok(era.chest.y < a.y && era.chest.y > (a.y + b.y) / 2, 'el cofre no está entre la 2.ª parada y la mitad del tramo');
  assert.ok((era.chest.x > a.x) === (b.x > a.x) && Math.abs(era.chest.x - a.x) < Math.abs(b.x - a.x), 'el cofre se sale del sendero');
  assert.deepEqual(trailPoint(a, b, 0), a);
  assert.deepEqual(trailPoint(a, b, 1), b);
  assert.deepEqual(trailPoint(a, b, 0.5), { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const two = eraLayout(2);
  assert.ok(two.chest.y < two.points[0].y && two.chest.y > two.points[1].y);
  assert.equal(eraLayout(1).chest, null);
});

test('mapa: el nodo actual lleva «Empezar» (o «Seguir» a medias), el personaje y el anillo; los demás, solo el nombre', () => {
  let html = renderPathMap(ctxWith(real));
  const first = real.steps[0];
  assert.equal((html.match(/stage-spot is-(left|right) is-current/g) || []).length, 1);
  assert.ok(html.includes(`is-current" data-step="${first.type}:${first.id}"`), 'el nodo actual no es la primera parada');
  assert.equal((html.match(/class="path-character"/g) || []).length, 1, 'el personaje va solo en el nodo actual');
  assert.ok(html.includes(`${characterHtml()}`));
  assert.ok(html.includes('<span class="stage-meta">Empezar</span>'));
  assert.ok(!html.includes('1483–1520') && !html.includes('Dominado'), 'los nodos sin jugar o dominados no llevan texto de más');
  const p = masterFirst(real, 1);
  p.artists[real.steps[1].id] = { plays: 1, best: 0.5, mastered: false, last: TODAY };
  html = renderPathMap(ctxWith(real, p));
  assert.ok(html.includes(`is-current" data-step="artist:${real.steps[2].id}"`) && html.includes('<span class="stage-meta">Empezar</span>'));
  assert.ok(html.includes('Por repasar · 50%'), 'lo jugado a medias no dice su mejor resultado');
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

test('personaje: el paseo sigue el sendero (curva en S con tangentes verticales) y acaba en el sitio', () => {
  const frames = walkFrames(150, 224);
  assert.equal(frames[0].transform, 'translate(150.0px, 224.0px)');
  assert.equal(frames[frames.length - 1].transform, 'translate(0.0px, 0.0px)');
  const mid = frames[Math.floor(frames.length / 2)].transform;
  assert.ok(/translate\(75\.0px, 112\.0px\)/.test(mid), `a mitad de camino: ${mid}`);
  // Desde otro tramo: primero sube en vertical hasta la línea del tramo y luego la curva.
  const far = walkFrames(150, 400, 180);
  assert.ok(far.slice(0, 5).every((f) => f.transform.startsWith('translate(150.0px,')), 'no sube recto por el tramo anterior');
  assert.equal(far[far.length - 1].transform, 'translate(0.0px, 0.0px)');
  assert.equal(WALK_MS, 1000);
});

// DOM mínimo: dos paradas (la anterior y la actual) con el personaje en la actual.
function fakeMap({ sameEra = true } = {}) {
  const calls = [];
  const rect = (left, top) => ({ left, top, width: 36, height: 36 });
  const era = (top) => ({ getBoundingClientRect: () => rect(0, top) });
  // La parada anterior (900) está en el tramo de abajo, que empieza en 800; la actual (700), en el de arriba.
  const eraA = era(800);
  const eraB = sameEra ? eraA : era(0);
  const character = {
    classes: new Set(),
    classList: { add: (c) => character.classes.add(c), remove: (c) => character.classes.delete(c), contains: (c) => character.classes.has(c) },
    animate: (frames, opts) => { calls.push({ frames, opts }); return {}; },
    closest: () => current,
  };
  const prev = { dataset: { step: 'artist:a' }, getBoundingClientRect: () => rect(100, 900), closest: () => eraA };
  const current = { dataset: { step: 'artist:b' }, getBoundingClientRect: () => rect(250, 700), closest: () => eraB };
  const root = {
    querySelector: (sel) => (sel === '.path-character' ? character : sel.includes('artist:a') ? prev : sel.includes('artist:b') ? current : null),
  };
  return { root, calls, character };
}

test('personaje: la primera vez aparece en su sitio; al cambiar la parada actual camina (≈1 s); con movimiento reducido, no', () => {
  resetCharacter();
  const a = fakeMap();
  assert.equal(settleCharacter(a.root), false, 'la primera vez no hay de dónde venir');
  assert.equal(a.calls.length, 0);
  // Misma parada otra vez (p. ej. al volver sin dominar nada): quieto.
  assert.equal(settleCharacter(a.root), false);
  resetCharacter();
  // Antes estaba en «a»; ahora la actual es «b».
  const first = { root: { querySelector: (sel) => (sel === '.path-character' ? { closest: () => ({ dataset: { step: 'artist:a' } }), classList: { add() {}, remove() {} }, animate() {} } : null) } };
  settleCharacter(first.root);
  const b = fakeMap();
  assert.equal(settleCharacter(b.root), true);
  assert.equal(b.calls.length, 1);
  assert.equal(b.calls[0].opts.duration, WALK_MS);
  assert.equal(b.calls[0].frames[0].transform, 'translate(-150.0px, 200.0px)', 'sale de donde estaba la parada anterior');
  assert.equal(b.calls[0].frames.at(-1).transform, 'translate(0.0px, 0.0px)');
  assert.ok(b.character.classList.contains('is-walking'));
  // Con movimiento reducido: ni animación ni clase, pero recuerda la parada.
  resetCharacter();
  settleCharacter(first.root);
  const c = fakeMap();
  assert.equal(settleCharacter(c.root, { reduced: true }), false);
  assert.equal(c.calls.length, 0);
  assert.ok(!c.character.classList.contains('is-walking'));
  // Desde otro tramo: la línea del tramo anterior entra en los fotogramas (sube recto primero).
  resetCharacter();
  settleCharacter(first.root);
  const d = fakeMap({ sameEra: false });
  settleCharacter(d.root);
  assert.ok(d.calls[0].frames.slice(0, 3).every((f) => f.transform.startsWith('translate(-150.0px,')));
  resetCharacter();
});

test('paisajes: un SVG por época, ≤ 30 KB, con el trazado de la app y solo colores de brand.css', () => {
  const dir = join(app, 'img', 'mapa');
  const files = readdirSync(dir).filter((f) => f.endsWith('.svg'));
  assert.deepEqual(files.sort(), real.visibleMovements.map((m) => `${m.id}.svg`).sort());
  const brand = readFileSync(join(app, 'css', 'brand.css'), 'utf8');
  const vars = (sel) => Object.fromEntries([...brand.slice(brand.indexOf(sel)).split('}')[0].matchAll(/--map-([a-z0-9-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2]]));
  const light = vars(':root {');
  const dark = vars(':root[data-theme="dark"] {');
  for (const era of pathLayout(real).eras) {
    const svg = readFileSync(join(dir, `${era.id}.svg`), 'utf8');
    assert.ok(statSync(join(dir, `${era.id}.svg`)).size <= 30 * 1024, `${era.id}.svg pasa de 30 KB`);
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
