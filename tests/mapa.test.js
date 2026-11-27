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
import { firstTramo } from '../app/js/engine/branches.js';
import { icons } from '../app/js/ui/icons.js';
import { renderPathMap, pathLayout, eraLayout, MAP_W, STEP } from '../app/js/ui/screens/path-map.js';
import { roadX, ROAD_HALF, branchSlots, branchLayout, branchLand } from '../app/js/ui/screens/path-layout.js';
import { parseRoute } from '../app/js/ui/router.js';
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

// Paradas del primer tramo del camino (dominarlas abre las ramas de la primera época).
const tramo1Of = (index) => firstTramo(index, index.steps[0].movementId).length;

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

const spots = (html) => [...html.matchAll(/<li class="stage-spot[^"]*" data-step="([^"]+)" style="left:([\d.]+)%;top:([\d.]+)%[^"]*"/g)].map((m) => ({ key: m[1], x: Number(m[2]), y: Number(m[3]) }));
const eras = (html) => [...html.matchAll(/<li class="path-era[^"]*" data-era="([^"]+)"/g)].map((m) => m[1]);

test('mapa: el DOM va en orden cronológico y, dentro de cada tramo, las paradas suben (la primera es la más baja)', () => {
  const html = renderPathMap(ctxWith(real));
  assert.deepEqual(eras(html), real.visibleMovements.map((m) => m.id));
  assert.deepEqual(spots(html).map((s) => s.key).filter((k) => !k.startsWith('review:')), real.steps.map((s) => `${s.type}:${s.id}`), 'las paradas no siguen index.steps');
  for (const era of pathLayout(real).eras) {
    const ys = era.points.map((p) => p.y);
    assert.ok(ys.every((y, i) => i === 0 || y < ys[i - 1]), `${era.id}: las paradas no suben`);
    assert.ok(ys[0] < era.h && ys[ys.length - 1] > 0);
    assert.ok(era.points.length < 4 || new Set(era.points.map((p) => p.x < MAP_W / 2)).size === 2, `${era.id}: el sendero no cambia de lado`);
  }
  // El museo cierra el camino (último en el DOM = arriba del todo) y el CSS invierte con column-reverse.
  assert.ok(html.trimEnd().endsWith('</li>') && html.lastIndexOf('path-museum') > html.lastIndexOf('path-era'));
  // Delante, solo el suelo que rellena el hueco de la barra de abajo (path-foot).
  assert.ok(html.trimStart().replace(/^<li class="path-foot"[^>]*><\/li>/, '').startsWith('<li class="path-start"') && html.includes('aria-label="Información: cómo se juega"'), 'sin hito de salida al principio');
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
  assert.ok(html.includes(`${real.movement(real.steps[0].movementId).period.replace(/s\. /g, 's.\u00a0')} · 2/${real.stepsOf(real.steps[0].movementId).length}`), 'la cartela no dice cuántas van');
  assert.ok(html.includes('finales s.\u00a0XVIII–mediados s.\u00a0XIX'), 'los siglos sin espacio duro');
  assert.ok(html.includes('class="arch-band" data-action="intro"'), 'el arco abierto no lleva a la presentación');
  // El arco de la primera época va sobre la puerta de la muralla de salida; los demás, en su tramo.
  const first = real.visibleMovements[0].id;
  assert.ok(html.indexOf(`data-action="intro" data-id="${first}"`) < html.indexOf('class="path-era'), 'el arco de la primera época no va en la salida');
  assert.equal((html.match(/<h2 class="era-arch"/g) || []).length, real.visibleMovements.length, 'un arco por época');
  assert.ok(!html.includes('class="road-sign is-left"><button type="button" class="sign-plate" data-action="intro"'), 'queda la placa de época antigua');
  const locked = real.visibleMovements[2];
  assert.ok(html.includes(`data-action="era-lock" data-id="${locked.id}"`) && !html.includes(`data-action="intro" data-id="${locked.id}"`), 'el cartel cerrado no abre su hoja');
  assert.ok(html.includes('Cerrada: se abre al terminar el Manierismo y el Renacimiento del Norte'), 'una época cerrada no dice cómo se abre (con su artículo)');
  assert.ok(!html.includes('Termina ') && !html.includes('movement-head'), 'queda la cartela antigua');
});

test('mapa: sin personaje ni cofres (vuelven en la v2 con premios de verdad)', () => {
  const html = renderPathMap(ctxWith(real));
  assert.ok(!/path-chest|path-character/.test(html), 'quedan cofres o personaje en el mapa');
  assert.ok(!('chest' in eraLayout(5)) && !('chest' in eraLayout(2)));
  assert.ok(!existsSync(join(app, 'js', 'ui', 'path-character.js')), 'sigue el módulo del personaje');
  assert.ok(!/path-chest|path-character|\.pc-/.test(readFileSync(join(app, 'css', 'main.css'), 'utf8')), 'quedan estilos del personaje o los cofres');
});

test('mapa: el nodo actual se distingue por el nodo y la marca «Tú», sin botón aparte; los demás, solo el nombre', () => {
  let html = renderPathMap(ctxWith(real));
  const first = real.steps[0];
  assert.equal((html.match(/stage-spot is-(left|right) is-current/g) || []).length, 1);
  assert.ok(html.includes(`is-current" data-step="${first.type}:${first.id}"`), 'el nodo actual no es la primera parada');
  assert.ok(html.includes('<span class="stage-you" aria-hidden="true">Tú</span>') && (html.match(/class="stage-you"/g) || []).length === 1, 'sin la marca «Tú» en la parada actual');
  assert.ok(!html.includes('Empezar') && !html.includes('>Seguir<'), 'queda el botón «Empezar» junto al nodo');
  assert.ok(!html.includes('1483–1520') && !html.includes('Dominado'), 'los nodos sin jugar o dominados no llevan texto de más');
  const p = masterFirst(real, 1);
  p.artists[real.steps[1].id] = { plays: 1, best: 0.5, mastered: false, last: TODAY };
  html = renderPathMap(ctxWith(real, p));
  assert.ok(html.includes(`is-current" data-step="artist:${real.steps[2].id}"`));
  assert.ok(html.includes('Repite · 50 %'), 'lo jugado a medias no invita a repetir con su mejor resultado (con espacio duro)');
  assert.ok(/class="stage [^"]*is-mastered"/.test(html) && html.includes('class="stage-badge"'), 'lo dominado no lleva sello');
  // Camino jugado entero pero no dominado: el actual es el primero por repasar e invita a repetir, como los demás.
  const q = emptyProgress();
  real.steps.forEach((s) => { q.artists[s.id] = { plays: 1, best: 0.5, mastered: false, last: TODAY }; });
  html = renderPathMap(ctxWith(real, q));
  assert.equal(nextStep(q, real).id, real.steps[0].id);
  assert.ok(html.includes(`is-current" data-step="artist:${real.steps[0].id}"`) && !html.includes('>Seguir<'));
});

test('mapa: repaso al final de cada época con ≥ 3 pintores, sala junto a la última parada al dominarla, y las salas como parada', () => {
  const html = renderPathMap(ctxWith(real));
  const reviews = real.visibleMovements.filter((m) => hasMovementReview(real, m.id));
  assert.equal((html.match(/class="stage stage-review is-/g) || []).length, reviews.length);
  assert.ok(html.includes(`aria-label="Repaso del ${reviews[0].name}, bloqueado`));
  for (const era of pathLayout(real).eras) assert.equal(era.points.length, real.stepsOf(era.id).length + (hasMovementReview(real, era.id) ? 1 : 0));
  const all = renderPathMap(ctxWith(real, masterFirst(real, real.steps.length)));
  assert.equal((all.match(/class="stage stage-gallery is-mastered"/g) || []).length, real.visibleMovements.length, 'sin salas con todo dominado');
  assert.ok(all.includes('class="path-era movement movement-mastered is-sealed') && all.includes('class="arch-band is-done"') && all.includes(icons.laurel(14)), 'una época completa no lo dice en su arco');
  const sala = buildIndex(salaCatalog());
  const sh = renderPathMap(ctxWith(sala));
  assert.ok(sala.visibleMovements.some((m) => sala.isSala(m.id)));
  assert.ok(sh.includes('class="stage stage-sala is-') && sh.includes('Conoce el movimiento'));
  assert.doesNotThrow(() => renderPathMap(ctxWith(bigIndex())));
});

test('paisajes: un SVG por época, ≤ 64 KB, con el trazado de la app y solo colores de brand.css', () => {
  const dir = join(app, 'img', 'mapa');
  const files = readdirSync(dir).filter((f) => f.endsWith('.svg'));
  assert.deepEqual(files.sort(), [...real.visibleMovements.map((m) => `${m.id}.svg`), ...real.branches.map((b) => `rama-${b.id}.svg`)].sort());
  const brand = readFileSync(join(app, 'css', 'brand.css'), 'utf8');
  const vars = (sel) => Object.fromEntries([...brand.slice(brand.indexOf(sel)).split('}')[0].matchAll(/--map-([a-z0-9-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2]]));
  const light = vars(':root {');
  const dark = vars(':root[data-theme="dark"] {');
  // Épocas y pantallas de rama (rama-<id>, con el paisaje y el tinte de su época o el suyo; las largas, por alto).
  const tramos = [...pathLayout(real).eras.map((e) => ({ ...e, tint: e.id })), ...real.branches.map((b) => ({ ...branchLayout(real, b), id: `rama-${b.id}`, tint: branchLand(b) }))];
  for (const era of tramos) {
    const svg = readFileSync(join(dir, `${era.id}.svg`), 'utf8');
    assert.ok(statSync(join(dir, `${era.id}.svg`)).size <= Math.max(64, 64 * era.h / 1000) * 1024, `${era.id}.svg pesa demasiado`);
    assert.ok(svg.includes(`viewBox="0 0 ${MAP_W} ${era.h}"`), `${era.id}: alto distinto del trazado (${era.h})`);
    assert.equal(svg.match(/data-points="([^"]*)"/)[1], era.points.map((p) => `${p.x},${p.y}`).join(' '), `${era.id}: nodos distintos del trazado`);
    assert.ok(!/\b(fill|stroke)="(#|rgb)/.test(svg), `${era.id}: colores sueltos en las piezas`);
    const [lightCss, darkCss] = svg.match(/<style>(.*?)<\/style>/)[1].split('@media(prefers-color-scheme:dark)');
    for (const [pal, css] of [[light, lightCss], [dark, darkCss]]) {
      const colors = new Set(css.match(/(#[0-9a-f]{6}|rgba?\([^)]*\))/gi));
      assert.ok(colors.size > 10 && [...colors].every((c) => Object.values(pal).includes(c)), `${era.id}: color que no está en brand.css`);
      assert.ok(css.includes(pal[`tint-${era.tint}`]), `${era.id}: sin el tinte de su época`);
    }
  }
  assert.equal(STEP, 172);
});

test('mapa: el repaso cerrado dice en claro cuánto falta; los nombres, en la nota y para el lector', () => {
  const real = bigIndex();
  const m = real.visibleMovements.find((x) => hasMovementReview(real, x.id));
  const artists = real.stepsOf(m.id).filter((s) => s.type === 'artist');
  const progress = emptyProgress();
  for (const s of artists.slice(0, -1)) progress.artists[s.id] = { plays: 1, best: 0.9, mastered: true, last: '2026-11-20' };
  const last = real.artist(artists[artists.length - 1].id);
  const html = renderPathMap(ctxWith(real, progress));
  const who = last.short || last.name;
  assert.ok(html.includes('<span class="stage-name">Repaso</span><span class="stage-meta">Domina 1 pintor más</span>'), 'el repaso cerrado no dice cuánto falta');
  assert.ok(html.includes(`data-lock="Domina a ${who} para abrirlo"`), 'la nota al pulsar no nombra al pintor');
  assert.ok(html.includes(`bloqueado. Para abrirlo, domina a ${who}"`), 'el lector no oye a quién falta dominar');
  const none = renderPathMap(ctxWith(real, emptyProgress()));
  assert.ok(none.includes(`<span class="stage-meta">Domina ${artists.length} pintores más</span>`));
  assert.ok(/data-lock="Domina a [^",]+, [^",]+ y \d+ más para abrirlo"/.test(none), 'la nota resume («X, Y y n más»)');
  assert.ok(!/<b>Repaso:<\/b>/.test(none) && !/ y [^"<]+ y \d+ más para/.test(none), 'queda el formato antiguo o una doble «y»');
});

// Ningún cartel pisa el sendero: su borde junto al camino queda fuera de la franja del sendero (con aire) en
// toda su altura, y le queda sitio. Cada tramo lleva su cartel, antes de su primera parada.
test('mapa: arco de la época centrado en el sendero y tablillas de tramo a su borde; el tramo, antes de su primera parada', () => {
  const layout = pathLayout(real);
  const GAP = 8;
  const clear = (segs, y1, y2, box) => {
    const xs = Array.from({ length: 12 }, (_, i) => roadX(segs, y1 + ((y2 - y1) * i) / 11));
    return box.side === 'left' ? box.edge <= Math.min(...xs) - ROAD_HALF - GAP : box.edge >= Math.max(...xs) + ROAD_HALF + GAP;
  };
  for (const [i, era] of layout.eras.entries()) {
    // Arco: sobre la puerta de la época (o, la primera, sobre la de la muralla), centrado en el sendero y dentro del mapa.
    const arch = i ? era.arch : layout.start.arch;
    assert.ok(arch && arch.x0 >= 0 && arch.x1 <= MAP_W && Math.abs((arch.x0 + arch.x1) / 2 - arch.x) < 0.5, `${era.id}: sin arco o fuera del mapa`);
    if (i) assert.ok(Math.abs(arch.x - roadX(era.segs, era.gate.y)) < 1 && arch.y < era.gate.y, `${era.id}: el arco no está sobre su puerta`);
    for (const s of era.sections) assert.ok(clear(era.segs, s.sign.top, s.sign.y, s.sign) && s.sign.room >= 110, `${era.id}/${s.name}: la tablilla del tramo pisa el sendero o no cabe`);
  }
  assert.ok(clear(layout.museum.segs, layout.museum.sign.top, layout.museum.sign.y, layout.museum.sign), 'la placa del museo pisa el sendero');
  const html = renderPathMap(ctxWith(real, masterFirst(real, 1)));
  assert.equal((html.match(/class="road-sign is-(left|right)"/g) || []).length, 1, 'solo la placa del museo (las épocas llevan arco)');
  // Primer tramo: tablilla propia sin cuenta (va en el arco); para el lector, «dominados de paradas» (todas, también las
  // extra), justo antes de su parada en el DOM.
  const first = real.artist(real.steps[0].id);
  const n = real.stageArtists(first.movementId).filter((a) => a.section === first.section).length;
  const at = html.indexOf(`aria-label="Tramo ${first.section}: 1 de ${n} dominados. Ver cartel"`);
  assert.ok(at >= 0 && at < html.indexOf(`data-step="artist:${first.id}"`), 'el cartel del tramo no va antes de su primera parada');
  assert.ok(html.includes(`data-action="cartel" data-kind="tramo" data-id="${first.section}"`), 'el cartel del tramo no abre sus tarjetas');
  assert.ok(!html.includes('stage-kicker') && !html.includes('class="lock-note"'), 'quedan rótulos de tramo sobre el nombre o párrafos vacíos');
});

test('mapa: cada rama, su desvío y su cartel de dos postes; al tocarlo se entra en ella (sin hoja de ramas)', () => {
  const html = renderPathMap(ctxWith(real));
  const layout = pathLayout(real);
  for (const b of real.branches) {
    const era = layout.eras.find((e) => e.id === b.opensAt);
    const spot = era.branches.find((x) => x.id === b.id && !x.extra);
    assert.ok(spot, `${b.id}: sin cartel en su época`);
    assert.ok(spot.at < era.points.length - 1, `${b.id}: en la última parada (ahí va la sala)`);
    assert.ok(spot.x < 60 || spot.x > MAP_W - 60, `${b.id}: el desvío no acaba en el margen`);
  }
  for (const era of layout.eras) {
    const ats = era.branches.map((b) => b.at);
    assert.equal(new Set(ats).size, ats.length, `${era.id}: dos ramas en la misma parada`);
    for (const b of era.branches) assert.ok(b.sign.room >= 60, `${era.id}/${b.id}: el cartel de la rama no cabe`);
  }
  assert.ok(!html.includes('data-action="branches"') && !html.includes('Ramas ('), 'queda el cartel agrupado «Ramas (n)»');
  const found = [...html.matchAll(/class="sign-plate branch (is-\w+)[^"]*" data-action="branch"/g)];
  assert.equal(found.length, layout.eras.reduce((n, e) => n + e.branches.length, 0), 'una rama sin cartel');
  assert.ok(found.every(([, cls]) => cls === 'is-locked'), 'una rama abierta el primer día');
  assert.ok(html.includes('class="spur-edge is-locked"') && html.includes('class="spur-tail"'), 'sin desvío o sin su vereda hacia el borde');
  assert.ok(/data-action="branch" data-id="gotico" data-status="locked" data-lock="Se abre al dominar a [^"]+"/.test(html), 'la rama cerrada no dice qué falta al tocarla');
  // Escuelas: una señal en cada época en la que abren un tramo con pintores propios.
  const rusa = real.branch('escuela-rusa');
  const rusaEras = [...new Set(rusa.artists.filter((id) => real.pathIndex(id) < 0).map((id) => rusa.tramos.find((t) => t.artists.includes(id)).opensAt))];
  for (const id of rusaEras.filter((x) => x !== rusa.opensAt)) {
    assert.ok(layout.eras.find((e) => e.id === id).branches.some((b) => b.id === 'escuela-rusa' && b.extra), `Escuela rusa sin señal en ${id}`);
  }
  assert.ok(html.includes('data-action="branch" data-id="descubre-manierismo-y-norte"') && html.includes('faltan 2</span>'));
  assert.ok(html.includes('Más del Manierismo') && !html.includes('­'), 'la rama de época no se llama «Más del …» o lleva palabras partidas');
  // Orden de lectura: el cartel de la rama va justo después de su parada.
  const era = layout.eras[0];
  const g = era.branches[0];
  const host = real.steps.filter((x) => x.movementId === era.id)[g.at];
  const iHost = html.indexOf(`data-step="${host.type}:${host.id}"`);
  const iNext = html.indexOf('data-step=', iHost + 10);
  const iBranch = html.indexOf(`data-action="branch" data-id="${g.id}"`);
  assert.ok(iHost < iBranch && iBranch < iNext, 'la rama no va tras su parada en el orden de tabulación');
  const open = renderPathMap(ctxWith(real, masterFirst(real, tramo1Of(real))));
  assert.ok(/class="sign-plate branch is-open" data-action="branch" data-id="gotico" data-status="open"/.test(open), 'la rama abierta no entra en su pantalla');
});

test('mapa: textos según el estado (hito, escuelas dominadas, parada actual)', () => {
  const none = renderPathMap(ctxWith(real));
  assert.ok(!none.includes('Empieza aquí'), 'la salida no repite cartel: el de la primera época basta');
  assert.equal((none.match(/aria-current="step"/g) || []).length, 1, 'la parada actual sin aria-current');
  assert.ok(none.includes(`data-id="${real.steps[0].id}" data-status="available" data-lock="" aria-current="step"`));
  // Escuela con su tramo dominado: «n/n», no «n nuevos».
  const p = masterFirst(real, real.steps.length);
  const rusa = real.branch('escuela-rusa');
  rusa.artists.filter((id) => real.pathIndex(id) < 0).forEach((id) => { p.artists[id] = { plays: 1, best: 1, mastered: true, last: TODAY }; });
  const html = renderPathMap(ctxWith(real, p));
  assert.ok(!/Escuela rusa: \d+ pintores nuevos/.test(html));
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
  const signs = readFileSync(join(app, 'css', 'mapa-carteles.css'), 'utf8');
  const brand = readFileSync(join(app, 'css', 'brand.css'), 'utf8');
  assert.ok(/\.stage-spot\.is-current \.stage \{ --dot: var\(--map-current-dot\); \}/.test(signs) && Number(brand.match(/--map-current-dot: (\d+)px/)[1]) > base, 'el actual no es el mayor');
  assert.ok(/prefers-reduced-motion: reduce\) \{ \.stage-you/.test(signs), 'la marca «Tú» se mece aunque se pidan menos animaciones');
  assert.ok(!/\.(stage-name|branch-name)[^{]*\{[^}]*overflow-wrap: anywhere/.test(css), 'nombres partidos por cualquier letra');
  // Camino en línea por encima del 150 % y, por debajo, letra sin tope (crece con la del navegador) y trazado
  // estirado en vertical con --k.
  assert.ok(/\.path-map\.is-linear \.stages/.test(css) && /\.path-map \{ --map-fs: 1rem;/.test(css), 'sin camino en línea o con la letra del mapa limitada');
  assert.ok(!/--map-fs-max/.test(css) && /aspect-ratio:\$\{MAP_W\}\/calc\(\$\{era\.h\} \* var\(--k, 1\)\)/.test(readFileSync(join(app, 'js', 'ui', 'screens', 'path-map.js'), 'utf8')));
  // Letra mínima de 12 px en lo que hay que leer del mapa (0,75 × 16 px), y crece con la del navegador.
  const small = [/\.sign-meta \{[^}]*font: \d+ calc\(([\d.]+) \* var\(--map-fs\)\)/, /\.sign-plate\.branch \.sign-name \{ font: \d+ calc\(([\d.]+) \* var\(--map-fs\)\)/,
    /\.sign-plate\.branch \.sign-meta \{ font-size: calc\(([\d.]+) \* var\(--map-fs\)\)/, /\.arch-meta \{[^}]*font: \d+ calc\(([\d.]+) \* var\(--map-fs\)\)/];
  for (const re of small) {
    const m = (css + signs).match(re);
    assert.ok(m && Number(m[1]) >= 0.75, `${re} por debajo de 12 px`);
  }
});

test('textos: «y» → «e» ante /i/ y artículos en las épocas', async () => {
  const { joinNames } = await import('../app/js/ui/dom.js');
  const { withArticle, afterEra, toEra } = await import('../app/js/ui/screens/path-signs.js');
  assert.equal(joinNames(['David', 'Ingres']), 'David e Ingres');
  assert.equal(joinNames(['Watteau', 'Fragonard', 'Meléndez', 'David', 'Ingres']), 'Watteau, Fragonard, Meléndez, David e Ingres');
  assert.equal(joinNames(['Goya', 'Hilliard']), 'Goya e Hilliard');
  assert.equal(joinNames(['Goya', 'Hierro']), 'Goya y Hierro', 'diptongo: «y»');
  assert.equal(joinNames(['Botticelli', 'Berruguete']), 'Botticelli y Berruguete');
  assert.equal(joinNames(['Botticelli']), 'Botticelli');
  assert.equal(joinNames([]), '');
  assert.equal(afterEra('terminar', 'Barroco'), 'al terminar el Barroco');
  assert.equal(withArticle('Manierismo y Renacimiento del Norte'), 'el Manierismo y el Renacimiento del Norte');
  assert.equal(withArticle('Simbolismo y vanguardias'), 'el Simbolismo y las vanguardias');
  assert.equal(toEra('Realismo'), 'al Realismo');
  // En el mapa: el repaso y la hoja de época usan la misma regla.
  const p = masterFirst(real, real.steps.findIndex((x) => x.movementId === 'rococo-neoclasicismo') + 3);
  const html = renderPathMap(ctxWith(real, p));
  assert.ok(html.includes('Domina a David e Ingres para abrirlo'), 'el repaso dice «David y Ingres»');
});

test('mapa: «Tu museo» celebra el camino completo y lleva a la Colección', () => {
  const all = renderPathMap(ctxWith(real, masterFirst(real, real.steps.length)));
  assert.ok(all.includes('class="path-museum is-done"') && all.includes('data-action="collection"') && all.includes('Museo completo'));
  const none = renderPathMap(ctxWith(real));
  assert.ok(!none.includes('Museo completo') && none.includes('Tu museo'));
  assert.equal(pathLayout(real).museum.sign.top >= 120, true, 'la placa del museo tapa el edificio');
});

test('mapa: pintado por partes (épocas lejanas como hueco) y mismo resultado al rellenarlas', () => {
  const p = masterFirst(real, 2);
  const lazy = renderPathMap(ctxWith(real, p), { lazy: true });
  const full = renderPathMap(ctxWith(real, p));
  const pending = (lazy.match(/class="path-era is-pending"/g) || []).length;
  assert.ok(pending >= real.visibleMovements.length - 2, 'el primer pintado no deja las épocas lejanas para después');
  assert.ok(lazy.includes('stage-spot is-left is-current') || lazy.includes('stage-spot is-right is-current'), 'la parada actual no está en el primer pintado');
  assert.ok(lazy.length < full.length / 2, 'el primer pintado no es más ligero');
});

test('resultado de rama: avance y siguiente pintor abierto', async () => {
  const { branchAfterRound } = await import('../app/js/engine/branches.js');
  const p = masterFirst(real, tramo1Of(real));
  const own = real.branch('gotico').artists.filter((id) => real.pathIndex(id) < 0);
  p.artists[own[0]] = { plays: 1, best: 1, mastered: false, last: TODAY };
  const r = branchAfterRound(p, real, own[0]);
  assert.equal(r.branch.id, 'gotico');
  assert.equal(r.next, own[1]);
  assert.equal(r.total, own.length);
  assert.equal(branchAfterRound(p, real, real.steps[0].id), null, 'un pintor del camino común no es de rama');
});

test('pantalla de rama: ruta propia, sus pintores como paradas, cada época rotulada una vez y su música', async () => {
  const { branchMusic } = await import('../app/js/ui/screens/branch.js');
  assert.deepEqual(parseRoute('#rama-maestros-espanoles'), { name: 'branch', branchId: 'maestros-espanoles' });
  for (const b of real.branches) {
    const l = branchLayout(real, b);
    assert.equal(l.points.length, b.artists.length, `${b.id}: una parada por pintor`);
    const eras = l.sections.map((x) => x.movementId);
    assert.equal(new Set(eras).size, eras.length, `${b.id}: una época rotulada dos veces`);
    assert.ok(!l.sections.some((x) => x.name.includes(' y ')), `${b.id}: rótulo de tramo largo`);
  }
  assert.equal(branchLand(real.branch('descubre-barroco')), 'barroco');
  assert.equal(branchLand(real.branch('escuela-rusa')), 'escuela-rusa');
  const { PLAYLISTS } = await import('../app/js/audio/playlists.js');
  for (const b of real.branches) {
    const want = PLAYLISTS[b.id] ? b.id : real.movement(b.movementId || b.opensAt).era;
    assert.equal(branchMusic(real, b), want, `${b.id}: su lista o, sin lista propia, la de su época`);
  }
});
