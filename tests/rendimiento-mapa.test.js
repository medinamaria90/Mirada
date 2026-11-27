// Rendimiento del mapa vivo (docs/eval/rendimiento.md): nada se anima con la pestaña oculta ni fuera de la portada, al
// salir no queda ningún temporizador, lo que se mueve solo se anima únicamente en el tramo que se ve y en capas sueltas
// (no dentro del SVG grande del paisaje), y la luz se pone solo en los tramos a la vista. Sin navegador: un DOM mínimo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const app = join(import.meta.dirname, '..', 'app');

// DOM mínimo: elementos con clases, estilo y dataset; documento con visibilidad; temporizadores contados.
function fakeEl(cls = '') {
  const classes = new Set(cls.split(' ').filter(Boolean));
  const props = new Map();
  return {
    dataset: {},
    isConnected: true,
    classList: {
      add: (...c) => c.forEach((x) => classes.add(x)),
      remove: (...c) => c.forEach((x) => classes.delete(x)),
      contains: (c) => classes.has(c),
      toggle: (c, on = !classes.has(c)) => { if (on) classes.add(c); else classes.delete(c); return on; },
    },
    style: { getPropertyValue: (k) => props.get(k) || '', setProperty: (k, v) => props.set(k, v) },
    matches: (sel) => sel.split(',').some((s) => classes.has(s.trim().replace(/^\./, ''))),
    querySelector: () => null,
    querySelectorAll: () => [],
  };
}

function setup() {
  const listeners = new Map();
  const timers = new Map();
  let nextId = 1;
  const observers = [];
  globalThis.document = {
    hidden: false,
    documentElement: { classList: { contains: () => false }, getAttribute: () => null },
    addEventListener: (t, fn) => listeners.set(t, fn),
    removeEventListener: (t) => listeners.delete(t),
  };
  const winListeners = new Map();
  globalThis.window = {
    matchMedia: () => ({ matches: false }),
    addEventListener: (t, fn) => winListeners.set(t, fn),
    removeEventListener: (t) => winListeners.delete(t),
  };
  globalThis.setTimeout = (fn, ms) => { const id = nextId++; timers.set(id, { fn, ms }); return id; };
  globalThis.clearTimeout = (id) => timers.delete(id);
  globalThis.setInterval = (fn, ms) => { const id = nextId++; timers.set(id, { fn, ms, every: true }); return id; };
  globalThis.clearInterval = (id) => timers.delete(id);
  globalThis.IntersectionObserver = class {
    constructor(cb) { this.cb = cb; this.targets = new Set(); observers.push(this); }
    observe(el) { this.targets.add(el); }
    disconnect() { this.targets.clear(); }
  };
  const eras = [fakeEl('path-era'), fakeEl('path-era'), fakeEl('path-start')];
  const map = fakeEl('path path-map');
  map.querySelectorAll = (sel) => (sel.includes('path-era') ? eras.filter((e) => !(sel.includes(':not([data-life])') && e.dataset.life)) : []);
  return { map, eras, timers, listeners, observers, winListeners };
}

test('mapa vivo: con la pestaña oculta se para y al salir de la portada no deja temporizadores ni capas animadas', async () => {
  const env = setup();
  const { startMapLife } = await import('../app/js/ui/map-life.js');
  const life = startMapLife(env.map, { clock: () => 6 });
  assert.ok(env.map.classList.contains('is-alive'), 'el mapa no arranca vivo');
  document.hidden = true;
  env.listeners.get('visibilitychange')();
  assert.ok(!env.map.classList.contains('is-alive'), 'una animación del mapa sigue corriendo con la pestaña oculta');
  // Con la pestaña oculta, los temporizadores que vencen no ponen nada en marcha.
  for (const [id, { fn, every }] of [...env.timers]) { if (!every) env.timers.delete(id); fn(); }
  assert.ok(!env.map.classList.contains('is-gust'), 'el viento sopla con la pestaña oculta');
  document.hidden = false;
  env.listeners.get('visibilitychange')();
  assert.ok(env.map.classList.contains('is-alive'));
  life.stop();
  assert.equal(env.timers.size, 0, 'al salir de la portada quedan temporizadores corriendo');
  assert.ok(!env.listeners.has('visibilitychange'), 'al salir de la portada queda el aviso de visibilidad');
  assert.equal(env.winListeners.size, 0, 'al salir de la portada quedan escuchas en la ventana');
  assert.ok(!env.map.classList.contains('is-alive'));
});

test('mapa vivo: solo el tramo a la vista se anima y recibe la luz; de día no titilan estrellas ni luces', async () => {
  const env = setup();
  const { startMapLife } = await import('../app/js/ui/map-life.js');
  let minute = 6;  // de día
  const life = startMapLife(env.map, { clock: () => minute });
  const [a, b] = env.eras;
  assert.ok(a.style.getPropertyValue('--day-night') !== '', 'los tramos recién pintados no reciben la luz');
  env.observers[0].cb([{ target: a, isIntersecting: true }, { target: b, isIntersecting: false }]);
  assert.ok(a.classList.contains('is-seen') && !b.classList.contains('is-seen'), 'se animan tramos que no se ven');
  assert.ok(!env.map.classList.contains('is-night') && !env.map.classList.contains('is-lit'), 'de día titilan estrellas o luces');
  minute = 20;     // de noche: solo cambia la luz del tramo que se ve
  life.refresh();
  assert.equal(a.style.getPropertyValue('--day-night'), '1.00');
  assert.equal(b.style.getPropertyValue('--day-night'), '0.00', 'la luz se recalcula en tramos que no se ven');
  assert.ok(env.map.classList.contains('is-night') && env.map.classList.contains('is-lit'));
  env.observers[0].cb([{ target: b, isIntersecting: true }]);
  assert.equal(b.style.getPropertyValue('--day-night'), '1.00', 'el tramo que entra en pantalla no recibe la luz');
  // Mientras se toca el mapa, la luz espera (no retrasa el toque); después, llega.
  minute = 6;
  env.winListeners.get('pointerdown')();
  life.refresh();
  assert.equal(a.style.getPropertyValue('--day-night'), '1.00', 'la luz cambia en mitad de un toque');
  life.stop();
});

test('mapa vivo: lo que se anima sin parar va solo en el tramo a la vista y en capas sueltas, no en el SVG del paisaje', () => {
  for (const file of ['mapa-vivo.css', 'mapa-vida.css']) {
    const css = readFileSync(join(app, 'css', file), 'utf8');
    for (const rule of css.match(/[^{}]+\{[^{}]*\banimation:[^{}]*infinite[^{}]*\}/g) || []) {
      const sel = rule.slice(0, rule.indexOf('{')).trim();
      if (/\.map-(walkers|boat|rowboat|swimmer|bird|butterfly)\b/.test(sel)) continue; // figuras de paso: viven unos segundos
      assert.ok(sel.includes('.is-seen'), `${file}: animación sin parar fuera del tramo a la vista: ${sel.slice(0, 70)}`);
    }
  }
  const land = readFileSync(join(app, 'js', 'ui', 'map-land.js'), 'utf8');
  assert.match(land, /liftMovers\(svg\)/, 'el agua, las aspas y el humo se animan dentro del SVG del paisaje');
  const sky = readFileSync(join(app, 'js', 'ui', 'map-sky.js'), 'utf8');
  assert.match(sky, /stars-tw tw-/, 'las estrellas titilan una a una dentro del SVG');
  const badges = readFileSync(join(app, 'js', 'ui', 'deep-badges.js'), 'utf8');
  assert.match(badges, /ring-halo" viewBox/, 'el halo del aro respira dentro del SVG del aro');
});

test('hojas: un toque que empezó antes de abrirse no las cierra (doble toque); uno posterior, sí', async () => {
  const { tapAfterOpen, TAP_GRACE_MS } = await import('../app/js/ui/modal-slot.js');
  assert.equal(tapAfterOpen(990, 1000), false, 'el segundo toque de un doble toque cierra la hoja recién abierta');
  assert.equal(tapAfterOpen(1000 + TAP_GRACE_MS - 1, 1000), false);
  assert.equal(tapAfterOpen(1000 + TAP_GRACE_MS + 1, 1000), true, 'tocar fuera ya no cierra la hoja');
  assert.equal(tapAfterOpen(-Infinity, 1000), false);
});
