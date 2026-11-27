// Mapa y tema (feedback de María, 27/11): con el móvil en oscuro y «Como el móvil» en Ajustes, el paisaje sigue la luz del
// reloj del juego (de mañana, de día) y no el tema; forzar «Oscuro» lo deja de noche y «Claro», de día. Sin navegador.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { gameLight, mapLight, resumeMinute, isNight } from '../app/js/engine/daylight.js';

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, '..', 'app', 'css', 'brand.css'), 'utf8');
const decls = (sel) => {
  const i = css.indexOf(sel);
  assert.ok(i >= 0, `falta el bloque ${sel}`);
  return Object.fromEntries([...css.slice(i, css.indexOf('}', i)).matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2]]));
};

test('mapa y tema: sin tema forzado la luz es la del reloj; «Oscuro» deja el mapa de noche y «Claro», de día', () => {
  const morning = resumeMinute(null, new Date(2026, 10, 27, 8, 11));
  assert.ok(!isNight(morning) && mapLight(morning).night === 0, 'a las 8:11 el reloj da noche');
  for (const min of [0, 3, 9, 15, 17, 22]) assert.deepEqual(mapLight(min, null), gameLight(min), `minuto ${min}: no sigue al reloj`);
  for (const min of [3, 22]) {
    assert.deepEqual(mapLight(min, 'dark'), { night: 1, dusk: 0 }, 'forzar «Oscuro» no deja el mapa de noche');
    assert.deepEqual(mapLight(min, 'light'), { night: 0, dusk: 0 }, 'forzar «Claro» no deja el mapa de día');
  }
});

test('mapa y tema: con el móvil en oscuro, el mapa recupera los colores claros de todo lo que el oscuro cambia', () => {
  const light = decls(':root {');
  const dark = decls(':root:not([data-theme="light"]) {');
  const map = decls(':root:not([data-theme]) .path-map {');
  // Lo que cambia el oscuro y lo que en :root se calcula con ello (se resuelve donde se declara: --map-label con --map-tag).
  const want = new Set(Object.keys(dark));
  for (let grew = true; grew;) {
    grew = false;
    for (const [k, v] of Object.entries(light)) if (!want.has(k) && [...want].some((d) => v.includes(`var(${d})`))) { want.add(k); grew = true; }
  }
  assert.ok(want.has('--map-label'), 'la placa de los nombres no se recalcula en el mapa');
  assert.deepEqual(Object.keys(map).sort(), [...want].sort(), 'el mapa no restaura justo lo que cambia el oscuro');
  for (const [k, v] of Object.entries(map)) assert.equal(v, light[k], `${k} no es el del tema claro`);
  const media = css.lastIndexOf('@media (prefers-color-scheme: dark)', css.indexOf(':root:not([data-theme]) .path-map'));
  assert.ok(media > css.indexOf(':root:not([data-theme="light"]) {'), 'el bloque del mapa no va en su @media, tras el oscuro');
  const life = readFileSync(join(here, '..', 'app', 'js', 'ui', 'map-life.js'), 'utf8');
  assert.ok(/mapLight\(minute, forcedTheme\(\)\)/.test(life) && !/gameLight\(/.test(life), 'el mapa vivo no mira el tema forzado');
});
