// Mapa del camino: de abajo arriba, hito de salida, nodo actual con «Empezar»/«Seguir», carteles al borde
// del sendero, ramas como desvíos, «Tu museo» arriba y los paisajes SVG de app/img/mapa a juego con el
// trazado y con los colores de brand.css. Sin navegador: el módulo construye HTML y se comprueba el texto.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildIndex } from '../app/js/engine/catalog.js';
import { emptyProgress, hasMovementReview, nextStep } from '../app/js/engine/progress.js';
import { icons } from '../app/js/ui/icons.js';
import { renderPathMap, pathLayout, eraLayout, MAP_W, STEP } from '../app/js/ui/screens/path-map.js';
import { roadX, ROAD_HALF, branchSlots } from '../app/js/ui/screens/path-layout.js';
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
  assert.ok(html.trimStart().startsWith('<li class="path-start"') && html.includes('Empieza aquí'), 'sin hito de salida al principio');
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
  assert.equal((html.match(/<svg class="path-trail"/g) || []).length, real.visibleMovements.length + 2, 'un sendero por tramo, el de la salida y el del museo');
  assert.ok(html.includes(`${real.movement(real.steps[0].movementId).period} · 2/${real.stepsOf(real.steps[0].movementId).length}`), 'la cartela no dice cuántas van');
  assert.ok(html.includes('class="sign-plate" data-action="intro"'), 'el cartel abierto no lleva a la presentación');
  const locked = real.visibleMovements[2];
  assert.ok(html.includes(`data-action="era-lock" data-id="${locked.id}"`) && !html.includes(`data-action="intro" data-id="${locked.id}"`), 'el cartel cerrado no abre su hoja');
  assert.ok(html.includes(`Cerrada: se abre al terminar ${real.visibleMovements[1].name}`), 'una época cerrada no dice cómo se abre');
  assert.ok(!html.includes('Termina ') && !html.includes('movement-head'), 'queda la cartela antigua');
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
  assert.ok(/class="stage [^"]*is-mastered"/.test(html) && html.includes('class="stage-badge"'), 'lo dominado no lleva sello');
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
  assert.ok(all.includes('class="path-era movement movement-mastered is-sealed"') && all.includes(`<span class="sign-seal" aria-hidden="true">${icons.laurel(16)}</span>`));
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
  assert.equal(STEP, 124);
});

test('mapa: el repaso cerrado dice cuántos faltan; los nombres, en la nota y para el lector', () => {
  const real = bigIndex();
  const m = real.visibleMovements.find((x) => hasMovementReview(real, x.id));
  const artists = real.stepsOf(m.id).filter((s) => s.type === 'artist');
  const progress = emptyProgress();
  for (const s of artists.slice(0, -1)) progress.artists[s.id] = { plays: 1, best: 0.9, mastered: true, last: '2026-11-20' };
  const last = real.artist(artists[artists.length - 1].id);
  const html = renderPathMap(ctxWith(real, progress));
  const who = last.short || last.name;
  assert.ok(html.includes('<span class="stage-name">Repaso · falta 1</span>'), 'el repaso cerrado no dice cuántos faltan');
  assert.ok(html.includes(`data-lock="Domina a ${who} para abrirlo"`), 'la nota al pulsar no nombra al pintor');
  assert.ok(html.includes(`bloqueado. Para abrirlo, domina a ${who}"`), 'el lector no oye a quién falta dominar');
  const none = renderPathMap(ctxWith(real, emptyProgress()));
  assert.ok(new RegExp(`Repaso · faltan ${artists.length}</span>`).test(none));
  assert.ok(/data-lock="Domina a [^",]+, [^",]+ y \d+ más para abrirlo"/.test(none), 'la nota resume («X, Y y n más»)');
  assert.ok(!/<b>Repaso:<\/b>/.test(none) && !/ y [^"<]+ y \d+ más para/.test(none), 'queda el formato antiguo o una doble «y»');
});

// Ningún cartel pisa el sendero: su borde junto al camino queda fuera de la franja del sendero (con aire) en
// toda su altura, y le queda sitio. Los rótulos de tramo van con el nombre de su primera parada.
test('mapa: carteles de época al borde del sendero, nunca encima; tramos sobre el nombre de su primera parada', () => {
  const layout = pathLayout(real);
  const GAP = 8;
  const clear = (segs, y1, y2, box) => {
    const xs = Array.from({ length: 12 }, (_, i) => roadX(segs, y1 + ((y2 - y1) * i) / 11));
    return box.side === 'left' ? box.edge <= Math.min(...xs) - ROAD_HALF - GAP : box.edge >= Math.max(...xs) + ROAD_HALF + GAP;
  };
  for (const era of layout.eras) assert.ok(clear(era.segs, era.sign.top, era.sign.y, era.sign) && era.sign.room >= 150, `${era.id}: el cartel pisa el sendero o no cabe`);
  for (const b of [layout.start, layout.museum]) assert.ok(clear(b.segs, b.sign.top, b.sign.y, b.sign), 'la placa de salida o del museo pisa el sendero');
  const html = renderPathMap(ctxWith(real, masterFirst(real, 1)));
  assert.equal((html.match(/class="road-sign is-(left|right)"/g) || []).length, real.visibleMovements.length + 2);
  // Florencia y Castilla: rótulo dentro del texto de Botticelli (oculto al lector) y un elemento propio, legible,
  // justo antes de su parada en el DOM («Tramo …: 1 de 2 dominados»).
  const first = real.artist(real.steps[0].id);
  const kicker = `<span class="stage-kicker" aria-hidden="true">${first.section} <span class="stage-kicker-count">1/2</span></span>`;
  assert.ok(html.includes(kicker), 'el rótulo del tramo no va con su primera parada');
  const sr = html.indexOf(`<li class="sr-only">Tramo ${first.section}: 1 de 2 dominados</li>`);
  assert.ok(sr >= 0 && sr < html.indexOf(`data-step="artist:${first.id}"`), 'el lector no oye el tramo antes de sus paradas');
  assert.ok(!html.includes('stage-section') && !html.includes('class="lock-note"'), 'quedan rótulos sobre el sendero o párrafos vacíos');
});

test('mapa: cada rama es un desvío en su época, cerrada el primer día (dice qué la abre) y en su sitio del DOM', () => {
  const html = renderPathMap(ctxWith(real));
  const layout = pathLayout(real);
  for (const b of real.branches) {
    assert.equal(html.split(`data-action="branch" data-id="${b.id}"`).length - 1, 1, `${b.id}: no sale una vez`);
    const era = layout.eras.find((e) => e.branches.some((x) => x.id === b.id));
    assert.equal(era?.id, b.opensAt, `${b.id}: fuera de su época`);
    const spot = era.branches.find((x) => x.id === b.id);
    assert.ok(spot.at < era.points.length - 1, `${b.id}: en la última parada (ahí va la sala)`);
    assert.ok(spot.x < 60 || spot.x > MAP_W - 60, `${b.id}: no está en el margen`);
  }
  const found = [...html.matchAll(/class="branch (is-\w+)" data-action="branch" data-id="([^"]+)"/g)];
  assert.equal(found.length, real.branches.length);
  assert.ok(found.every(([, cls]) => cls === 'is-locked'), 'una rama abierta el primer día');
  assert.ok(html.includes('class="spur-edge is-locked"'));
  const a = real.artist(real.steps[0].id).short || real.artist(real.steps[0].id).name;
  const b = real.artist(real.steps[1].id).short || real.artist(real.steps[1].id).name;
  assert.ok(html.includes(`Gótico: rama cerrada, se abre al dominar a ${a} y ${b}`), 'la rama cerrada no dice qué la abre');
  assert.ok(html.includes('<span>faltan 2</span>'), 'la placa cerrada no dice cuánto falta');
  assert.ok(html.includes('>Más del Renacimiento<') && html.includes('Más del Post­impresionismo'), 'la rama de época no se llama «Más del …»');
  // Orden de lectura: la rama va justo después de su parada.
  const era = layout.eras[0];
  const g = era.branches.find((x) => x.id === 'gotico');
  const host = real.steps.filter((x) => x.movementId === era.id)[g.at];
  const iHost = html.indexOf(`data-step="${host.type}:${host.id}"`);
  const iNext = html.indexOf('data-step=', iHost + 10);
  const iBranch = html.indexOf('data-id="gotico"');
  assert.ok(iHost < iBranch && iBranch < iNext, 'la rama no va tras su parada en el orden de tabulación');
  // Abierta (primer tramo dominado): cuenta solo sus pintores propios.
  const open = renderPathMap(ctxWith(real, masterFirst(real, 2)));
  const own = real.branch('gotico').artists.filter((id) => real.pathIndex(id) < 0).length;
  assert.ok(/class="branch is-open" data-action="branch" data-id="gotico"/.test(open));
  assert.ok(open.includes(`<span class="branch-count">0/${own}</span>`), 'cuenta pintores del camino común en la rama');
});

test('mapa: reparto de ramas por el tramo, nunca en la última parada', () => {
  assert.deepEqual(branchSlots(6, 0), []);
  for (const [n, k] of [[8, 3], [6, 3], [12, 1], [6, 2]]) {
    const slots = branchSlots(n, k);
    assert.equal(slots.length, k);
    assert.ok(slots.every((i) => i >= 0 && i < n - 1), `${n}/${k}: fuera de rango`);
    assert.ok(k > n - 2 || !slots.includes(0), `${n}/${k}: en la primera parada habiendo sitio`);
  }
});

test('mapa: jerarquía de nodos (actual, siguiente cerrado y el resto cerrado más pequeño)', () => {
  const html = renderPathMap(ctxWith(real, masterFirst(real, 2)));
  assert.equal((html.match(/stage-spot is-(left|right) is-next/g) || []).length, 1, 'una sola parada «siguiente»');
  assert.ok(html.includes(`is-next" data-step="artist:${real.steps[3].id}"`), 'la siguiente no es la de después de la actual');
  assert.ok(!/is-locked"[^>]*>\s*<span class="stage-dot">[^<]*<span class="art/.test(html), 'un nodo cerrado enseña el cuadro');
  // Cerrado y lejos: nombre corto; el lector oye por qué está cerrado.
  const far = real.artist(real.steps[6].id);
  assert.ok(html.includes(`aria-label="${far.name}, bloqueado. Se abre con la mitad de aciertos en `), 'el cerrado no explica su candado al lector');
  if (far.short && far.short !== far.name) assert.ok(html.includes(`<span class="stage-name">${far.short}</span>`), 'el cerrado lejano no usa el nombre corto');
  const css = readFileSync(join(app, 'css', 'main.css'), 'utf8');
  const px = (re) => Number((css.match(re) || [])[1]);
  const base = px(/\.stage \{\s*--dot: (\d+)px/);
  assert.ok(px(/\.stage\.is-locked \{ --dot: (\d+)px/) < base, 'el cerrado no es más pequeño');
  assert.ok(px(/\.stage-spot\.is-current \.stage \{ --dot: (\d+)px/) > base, 'el actual no es el mayor');
  assert.ok(!/\.(stage-name|branch-name)[^{]*\{[^}]*overflow-wrap: anywhere/.test(css), 'nombres partidos por cualquier letra');
  assert.ok(/@container mapa \(max-width: 20em\)/.test(css), 'sin camino en línea para letra grande');
});
