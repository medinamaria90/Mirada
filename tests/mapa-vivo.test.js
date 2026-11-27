// Mapa vivo: luz según el reloj del juego (engine/daylight.js, state/game-clock.js), sendero recorrido de otro color, puerta de salida con luces
// y árboles que se mecen, paisajes preparados para animarse (clases k-*, data-sway, data-lamp, data-flow) y un
// CSS que solo anima transform y opacity, y solo con el mapa vivo (.is-alive). Sin navegador.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { gameLight, gameHour, isNight, minuteAtHour, resumeMinute, GAME_DAY_MIN, GAME_PHASES_MIN, SESSION_GAP_MS } from '../app/js/engine/daylight.js';
import { buildIndex } from '../app/js/engine/catalog.js';
import { emptyProgress } from '../app/js/engine/progress.js';
import { renderPathMap, pathLayout } from '../app/js/ui/screens/path-map.js';
import { START_H, walkedD } from '../app/js/ui/screens/path-layout.js';

const here = dirname(fileURLToPath(import.meta.url));
const app = join(here, '..', 'app');
const real = buildIndex(JSON.parse(readFileSync(join(app, 'data', 'catalog.json'), 'utf8')));
globalThis.document = globalThis.document || { documentElement: {} };
globalThis.getComputedStyle = globalThis.getComputedStyle || (() => ({ getPropertyValue: () => '#000000' }));

test('reloj del juego: un día cada 24 minutos, con día largo, noche más corta y transiciones suaves', () => {
  assert.equal(GAME_DAY_MIN, 24);
  assert.equal(Object.values(GAME_PHASES_MIN).reduce((a, b) => a + b, 0), GAME_DAY_MIN, 'las fases no suman un día');
  assert.ok(GAME_PHASES_MIN.day > GAME_PHASES_MIN.night && GAME_PHASES_MIN.night > GAME_PHASES_MIN.dusk, 'reparto día/noche raro');
  const { dawn, day, dusk } = GAME_PHASES_MIN;
  assert.deepEqual(gameLight(dawn + day / 2), { night: 0, dusk: 0 }, 'a mediodía no es de día');
  assert.deepEqual(gameLight(GAME_DAY_MIN - 1), { night: 1, dusk: 0 }, 'en plena noche no es de noche');
  const sunset = dawn + day + dusk / 2;
  const mid = gameLight(sunset);
  assert.ok(mid.night > 0.3 && mid.night < 0.7 && mid.dusk > 0.9, `en mitad del atardecer, media luz y arrebol: ${JSON.stringify(mid)}`);
  assert.ok(gameLight(dawn / 2).dusk > 0.9, 'sin arrebol al amanecer');
  let prev = 0;
  for (let m = dawn + day; m <= dawn + day + dusk; m += 0.1) {
    const n = gameLight(m).night;
    assert.ok(n >= prev && n - prev < 0.12, `la noche salta o retrocede en el minuto ${m.toFixed(1)}`);
    prev = n;
  }
  assert.deepEqual(gameLight(GAME_DAY_MIN + 3), gameLight(3), 'el día no da la vuelta');
  assert.ok(isNight(GAME_DAY_MIN - 1) && !isNight(dawn + day / 2));
});

test('reloj del juego: una sesión nueva arranca en la hora del móvil; si se vuelve enseguida, sigue donde iba', () => {
  const night = new Date(2026, 10, 26, 23, 10);
  const morning = new Date(2026, 10, 26, 10, 0);
  assert.ok(isNight(resumeMinute(null, night)), 'entrando de noche, no es de noche');
  assert.ok(!isNight(resumeMinute(null, morning)) && Math.abs(gameHour(resumeMinute(null, morning)) - 10) < 0.01, 'entrando por la mañana, no es de mañana');
  for (const h of [0, 5.5, 6.5, 7, 12, 18.5, 19, 21, 23.9]) assert.ok(Math.abs(((gameHour(minuteAtHour(h)) - h + 36) % 24) - 12) < 1e-9, `hora ${h} de ida y vuelta`);
  const saved = { min: 3.2, at: morning.getTime() - (SESSION_GAP_MS - 60 * 1000) };
  assert.equal(resumeMinute(saved, morning), 3.2, 'volviendo enseguida no sigue donde iba');
  assert.equal(resumeMinute({ ...saved, at: morning.getTime() - SESSION_GAP_MS - 1 }, morning), minuteAtHour(10), 'tras un rato largo fuera no vuelve a la hora real');
  assert.equal(resumeMinute({ min: 'x' }, morning), minuteAtHour(10), 'lo guardado roto no se ignora');
  const clock = readFileSync(join(app, 'js', 'state', 'game-clock.js'), 'utf8');
  assert.ok(clock.includes("'sfumato.clock'") && /document\.hidden/.test(clock) && /catch \(err\)/.test(clock), 'el reloj no se guarda o corre con la app oculta');
  const life = readFileSync(join(app, 'js', 'ui', 'map-life.js'), 'utf8');
  assert.ok(/clock = clockMinute/.test(life) && !/new Date\(\)/.test(life), 'el mapa vivo sigue la hora del móvil');
});

test('mapa: el sendero recorrido va de otro color hasta la parada actual (entero en lo ya pasado, nada en lo que viene)', () => {
  const p = emptyProgress();
  const first = real.visibleMovements[0].id;
  real.stepsOf(first).forEach((s) => { if (s.type === 'artist') p.artists[s.id] = { plays: 1, best: 0.9, mastered: true, last: '2026-11-20' }; });
  p.medals[`movement-${first}`] = '2026-11-20';
  const html = renderPathMap({ index: real, store: { get: () => ({ progress: p }) } });
  const layout = pathLayout(real);
  const block = (id) => html.slice(html.indexOf(`data-era="${id}"`), html.indexOf('</li>\n  </li>', html.indexOf(`data-era="${id}"`)) + 1 || undefined);
  assert.ok(html.includes(`<path class="trail-fill is-done" d="${layout.eras[0].trail}"/>`), 'la época terminada no lleva el sendero recorrido entero');
  assert.ok(html.includes(`<path class="trail-fill is-done" d="${walkedD(layout.eras[1], 0)}"/>`), 'la época actual no lleva el sendero hasta su primera parada');
  assert.ok(!block(layout.eras[2].id).includes('is-done'), 'una época por venir lleva sendero recorrido');
  assert.equal(walkedD(layout.eras[1]), layout.eras[1].trail);
  assert.ok(walkedD(layout.eras[1], 1).length > walkedD(layout.eras[1], 0).length);
});

test('mapa: la salida es corta y con encanto (muralla con puerta, plaza con fuente) y el primer tramo arranca enseguida', () => {
  const layout = pathLayout(real);
  assert.ok(START_H <= 150, 'el hito de salida vuelve a ser largo');
  const [a, b] = layout.eras;
  const entry = (e) => e.h - e.points[0].y;
  assert.ok(entry(a) < entry(b) - 50, 'el primer tramo no arranca antes que los demás');
  const html = renderPathMap({ index: real, store: { get: () => ({ progress: emptyProgress() }) } });
  const start = html.slice(html.indexOf('<li class="path-start"'), html.indexOf('</li>', html.indexOf('<li class="path-start"')));
  assert.ok((start.match(/data-lamp/g) || []).length >= 4, 'la puerta de salida no tiene ventanas que se enciendan');
  assert.ok((start.match(/data-sway/g) || []).length >= 3, 'la salida no tiene árboles que se mezan');
  assert.ok(start.includes('class="land-water"') && start.includes('data-jet'), 'la plaza no tiene fuente');
});

test('paisajes: listos para vivir — clases del tema (k-*), árboles, luces, agua y detalles esparcidos', () => {
  const css = readFileSync(join(app, 'css', 'mapa-vivo.css'), 'utf8');
  const dir = join(app, 'img', 'mapa');
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.svg'))) {
    const svg = readFileSync(join(dir, file), 'utf8');
    assert.ok(!/class="c\d/.test(svg), `${file}: clases antiguas`);
    for (const cls of new Set(svg.match(/\bk-[a-z0-9-]+/g))) {
      assert.ok(css.includes(`.path-land .${cls} {`) || css.includes(`.path-land .s-${cls} {`), `${file}: la clase ${cls} no tiene color en mapa-vivo.css`);
    }
    assert.ok((svg.match(/data-sway=/g) || []).length >= 8, `${file}: pocos árboles que se mezan`);
    assert.ok((svg.match(/data-lamp=/g) || []).length >= 1, `${file}: pocas ventanas que se enciendan`);
    assert.ok((svg.match(/<g data-sway="[^"]*"><g data-sway/g) || []).length === 0, `${file}: árboles con dos grupos`);
  }
  for (const id of ['renacimiento', 'impresionismo']) {
    assert.ok(readFileSync(join(dir, `${id}.svg`), 'utf8').includes('data-flow'), `${id}: el río no fluye`);
  }
});

test('mapa vivo: la luz tiñe los colores del paisaje; el CSS solo anima transform y opacity y solo con el mapa vivo', () => {
  const css = readFileSync(join(app, 'css', 'mapa-vivo.css'), 'utf8');
  const frames = [...css.matchAll(/@keyframes [\w-]+ \{(.*?)\}\s*\}/gs)];
  assert.ok(frames.length >= 4);
  for (const [, body] of frames) {
    for (const [, prop] of body.matchAll(/([a-z-]+)\s*:/g)) assert.ok(['transform', 'opacity'].includes(prop), `anima ${prop}`);
  }
  for (const rule of css.match(/[^{}]+\{[^{}]*\banimation:[^{}]*\}/g) || []) {
    assert.ok(rule.trim().startsWith('.path-map.is-alive'), `animación sin .is-alive: ${rule.trim().slice(0, 60)}`);
  }
  assert.ok(/\.path-map\.is-linear \.path-lamps, \.path-map\.is-linear \.map-cart \{ display: none; \}/.test(css), 'en línea quedan las luces o el carruaje');
  assert.ok(/--night-pct: calc\(var\(--day-night\)/.test(css) && /\.path-land \.k-leaf \{ fill: var\(--lit-leaf\); \}/.test(css), 'la luz del día no tiñe el paisaje');
  assert.ok(!/mix-blend-mode/.test(css), 'velos con mezcla encima del mapa (rayas en las costuras, tapan carteles)');
  const js = readFileSync(join(app, 'js', 'ui', 'map-life.js'), 'utf8');
  assert.ok(!/requestAnimationFrame|setInterval\([^,]+,\s*\d{1,3}\)/.test(js), 'bucle por fotograma en map-life.js');
  assert.ok(/prefersReducedMotion\(\)/.test(js) && /document\.hidden/.test(js), 'no respeta «Reducir animaciones» ni la pestaña oculta');
});

// ---- Vida de paso: puentes, ríos, pájaros, estrellas y demás (map-scene.js, map-critters.js, map-sky.js) ----------

test('vida de paso: los paisajes marcan ríos, lagos, puentes, molinos, humo y huecos libres, estén donde estén', () => {
  const dir = join(app, 'img', 'mapa');
  const read = (id) => readFileSync(join(dir, `${id}.svg`), 'utf8');
  for (const id of ['renacimiento', 'manierismo-y-norte', 'impresionismo']) {
    const svg = read(id);
    assert.ok(/<g data-river="[\d.-]+ [\d.-]+ [\d.-]+ [\d.-]+ [\d.-]+">/.test(svg), `${id}: el río no está marcado`);
    assert.ok(/<g data-bridge="[\d.-]+ [\d.-]+ [\d.-]+">/.test(svg), `${id}: el puente no está marcado`);
    assert.ok(/data-glints="\d/.test(svg), `${id}: sin brillos en el agua`);
  }
  assert.ok(/<g data-spin=""><path/.test(read('manierismo-y-norte')), 'el molino del Norte no gira');
  assert.equal((read('realismo').match(/data-puff="[012]"/g) || []).length % 3, 0, 'chimeneas con humo a medias');
  assert.ok(read('realismo').includes('data-puff="2"'), 'las chimeneas no echan humo');
  assert.ok(/<g data-lake="/.test(read('romanticismo')), 'el lago no está marcado');
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.svg'))) {
    const free = (readFileSync(join(dir, file), 'utf8').match(/data-free="([^"]*)"/) || [])[1] || '';
    assert.ok(free.split(' ').filter(Boolean).length >= 10, `${file}: pocos huecos libres para estrellas y mariposas`);
  }
});

test('vida de paso: el centro del río serpentea con sus orillas y el paso del puente sigue al sendero', async () => {
  const { riverCenter, trailCrossing, RIVER_WAVE } = await import('../app/js/ui/map-scene.js');
  const river = { x0: 0, x1: 390, y: 100, h: 26, wave: 10 };
  assert.equal(riverCenter(river, 0), 100);
  assert.equal(riverCenter(river, RIVER_WAVE / 2), 105, 'en mitad de la primera onda baja media onda');
  assert.equal(riverCenter(river, RIVER_WAVE * 1.5), 95, 'y en la segunda sube');
  assert.equal(riverCenter(river, 1000), riverCenter(river, 390), 'fuera del mapa, el borde');
  const trail = Array.from({ length: 60 }, (_, i) => ({ x: 195 + i, y: 200 - i * 3, l: i * 3 }));
  const run = trailCrossing(trail, 220, 90, 110);
  assert.ok(run && run.every((s) => s.y >= 90 && s.y <= 110) && run.length >= 6, 'el paso del puente no es el trozo del sendero sobre el río');
  assert.equal(trailCrossing(trail, 220, 500, 520), null);
});

test('vida de paso: estrellas fijas (el mismo cielo cada vez), unas de cuatro puntas, y reflejos en el agua', async () => {
  const { starPoints } = await import('../app/js/ui/map-sky.js');
  const free = Array.from({ length: 40 }, (_, i) => [10 + i * 9, 20 + (i % 7) * 30]);
  const a = starPoints(free, [[50, 300], [120, 302]]);
  assert.deepEqual(a, starPoints(free, [[50, 300], [120, 302]]), 'las estrellas cambian de sitio');
  assert.ok(a.filter((s) => !s.glint).length >= free.length * 0.6 && a.filter((s) => !s.glint).length < free.length, 'demasiadas o muy pocas estrellas');
  assert.ok(a.some((s) => s.sparkle) && a.filter((s) => s.glint).length === 2);
  assert.ok(new Set(a.map((s) => s.group)).size === 4, 'titilan todas a la vez');
});

test('vida de paso: CSS solo de transform y opacity con el mapa vivo, colores de variables y nada en el camino en línea', () => {
  const css = readFileSync(join(app, 'css', 'mapa-vida.css'), 'utf8');
  const frames = [...css.matchAll(/@keyframes [\w-]+ \{(.*?)\}\s*\}/gs)];
  assert.ok(frames.length >= 8);
  for (const [, body] of frames) {
    for (const [, prop] of body.matchAll(/([a-z-]+)\s*:/g)) assert.ok(['transform', 'opacity'].includes(prop), `anima ${prop}`);
  }
  for (const rule of css.match(/[^{}]+\{[^{}]*\banimation:[^{}]*\}/g) || []) {
    assert.ok(rule.trim().startsWith('.path-map.is-alive'), `animación sin .is-alive: ${rule.trim().slice(0, 60)}`);
  }
  assert.ok(!/#[0-9a-f]{3,8}\b|rgba?\(/i.test(css), 'colores escritos a mano en mapa-vida.css');
  assert.ok(/\.path-map\.is-linear \.path-stars, \.path-map\.is-linear \.map-critter \{ display: none; \}/.test(css), 'en línea quedan estrellas o figuras');
  const brand = readFileSync(join(app, 'css', 'brand.css'), 'utf8');
  assert.equal((brand.match(/--map-star:/g) || []).length, 4, '--map-star sin tema claro, oscuro y mapa claro con el móvil en oscuro');
  assert.equal((brand.match(/--map-cloud:/g) || []).length, 4, '--map-cloud sin tema claro, oscuro y mapa claro con el móvil en oscuro');
  assert.ok(readFileSync(join(app, 'index.html'), 'utf8').includes('href="css/mapa-vida.css"'));
});

test('vida de paso: sin bucles por fotograma, pocas cosas a la vez y nada con «Reducir animaciones»', () => {
  for (const f of ['map-life.js', 'map-critters.js', 'map-sky.js', 'map-actor.js', 'map-scene.js']) {
    const js = readFileSync(join(app, 'js', 'ui', f), 'utf8');
    assert.ok(!/requestAnimationFrame|setInterval\([^,]+,\s*\d{1,3}\)/.test(js), `bucle por fotograma en ${f}`);
    assert.ok(!/#[0-9a-f]{6}\b|rgba?\(/i.test(js), `colores en ${f}`);
  }
  const life = readFileSync(join(app, 'js', 'ui', 'map-life.js'), 'utf8');
  assert.ok(Number(life.match(/const MAX_SCENES = (\d+)/)[1]) <= 2, 'demasiadas cosas a la vez');
  const gap = life.match(/const SCENE_GAP_MS = \[(\d+), (\d+)\]/);
  assert.ok(Number(gap[1]) >= 8000, 'escenas demasiado seguidas');
  assert.ok(/if \(alive\(\) && playing < MAX_SCENES\)/.test(life) && /const alive = \(\) => !document\.hidden && !prefersReducedMotion\(\)/.test(life), 'la vida de paso no se para con la pestaña oculta o «Reducir animaciones»');
  assert.ok(/night >= DEEP_NIGHT/.test(life) && /day && seen\.trees\.length > 1/.test(life), 'estrellas fugaces de día o pájaros de noche');
});
