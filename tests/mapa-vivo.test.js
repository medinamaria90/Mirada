// Mapa vivo: luz según la hora (engine/daylight.js), sendero recorrido de otro color, puerta de salida con luces
// y árboles que se mecen, paisajes preparados para animarse (clases k-*, data-sway, data-lamp, data-flow) y un
// CSS que solo anima transform y opacity, y solo con el mapa vivo (.is-alive). Sin navegador.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { daylight, sunTimes, SUN_TIMES, TWILIGHT_MIN } from '../app/js/engine/daylight.js';
import { buildIndex } from '../app/js/engine/catalog.js';
import { emptyProgress } from '../app/js/engine/progress.js';
import { renderPathMap, pathLayout } from '../app/js/ui/screens/path-map.js';
import { START_H, walkedD } from '../app/js/ui/screens/path-layout.js';

const here = dirname(fileURLToPath(import.meta.url));
const app = join(here, '..', 'app');
const real = buildIndex(JSON.parse(readFileSync(join(app, 'data', 'catalog.json'), 'utf8')));
globalThis.document = globalThis.document || { documentElement: {} };
globalThis.getComputedStyle = globalThis.getComputedStyle || (() => ({ getPropertyValue: () => '#000000' }));
const at = (day, hm) => new Date(`${day}T${hm}:00`);
const hm = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(Math.round(min % 60)).padStart(2, '0')}`;

test('luz: de día 0, de noche 1, y el cambio dura unos 30 minutos centrado en la puesta y la salida del sol', () => {
  const day = '2026-11-26';
  assert.deepEqual(daylight(at(day, '12:00')), { night: 0, dusk: 0 });
  assert.deepEqual(daylight(at(day, '23:30')), { night: 1, dusk: 0 });
  assert.equal(daylight(at(day, '03:00')).night, 1);
  const { rise, set } = sunTimes(at(day, '12:00'));
  const half = TWILIGHT_MIN / 2;
  assert.equal(daylight(at(day, hm(set - half - 1))).night, 0, 'anochece antes de tiempo');
  assert.equal(daylight(at(day, hm(set + half + 1))).night, 1, 'el anochecer dura de más');
  const mid = daylight(at(day, hm(set)));
  assert.ok(mid.night > 0.3 && mid.night < 0.7 && mid.dusk > 0.9, `a la puesta del sol, media luz y arrebol: ${JSON.stringify(mid)}`);
  assert.ok(daylight(at(day, hm(rise))).dusk > 0.9, 'sin arrebol al amanecer');
  // Al anochecer la noche solo crece (sin saltos ni vueltas atrás).
  let prev = 0;
  for (let m = set - half; m <= set + half; m += 3) {
    const n = daylight(at(day, hm(m))).night;
    assert.ok(n >= prev, `la noche retrocede a las ${hm(m)}`);
    prev = n;
  }
});

test('luz: horas del sol por mes, en verano días más largos, y sin saltos al cambiar de mes o de año', () => {
  assert.equal(SUN_TIMES.length, 12);
  const june = sunTimes(at('2026-06-21', '12:00'));
  const dec = sunTimes(at('2026-12-21', '12:00'));
  assert.ok(june.set - june.rise > dec.set - dec.rise + 5 * 60, 'el día de junio no es mucho más largo que el de diciembre');
  for (const [a, b] of [['2026-01-31', '2026-02-01'], ['2025-12-31', '2026-01-01'], ['2026-03-14', '2026-03-15']]) {
    const x = sunTimes(at(a, '12:00'));
    const y = sunTimes(at(b, '12:00'));
    assert.ok(Math.abs(x.rise - y.rise) <= 3 && Math.abs(x.set - y.set) <= 3, `salto entre ${a} y ${b}`);
  }
  assert.deepEqual(sunTimes(at('2026-07-15', '00:00')), { rise: SUN_TIMES[6][0], set: SUN_TIMES[6][1] });
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
