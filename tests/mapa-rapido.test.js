// Desplazamiento rápido del mapa (ui/map-scrubber.js): la burbuja dice la época que pasa por el centro de la pantalla,
// al soltar el asa el mapa se queda donde está (sin recolocarse), un toque en una marca va a la puerta de su época y en
// pantallas sin mapa no se monta nada. Sin navegador: un DOM mínimo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { itemAt, fracOf, scrollOf, gateScroll, markFrac, maxScroll, worthIt, GATE_AT, mountScrubber } from '../app/js/ui/map-scrubber.js';
import { mountHomeScrubber, mountBranchScrubber } from '../app/js/ui/screens/map-scrubber-items.js';

const app = join(import.meta.dirname, '..', 'app');
// Tres épocas de 3000 px; el camino sube: la primera (A) abajo del todo.
const VIEW_H = 800;
const DOC_H = 9000;
const ERAS = [
  { id: 'a', label: 'A', sub: 's. XV', thumb: '<i>a</i>', top: 6000, bottom: 9000 },
  { id: 'b', label: 'B', sub: 's. XVII', thumb: '', top: 3000, bottom: 6000 },
  { id: 'c', label: 'C', sub: '', thumb: '', top: 0, bottom: 3000 },
];
const MAX = maxScroll(DOC_H, VIEW_H);

test('desplazamiento rápido: la época de la burbuja es la que pasa por el centro de la pantalla', () => {
  assert.equal(itemAt(ERAS, 0, VIEW_H).id, 'c', 'arriba del todo, la última época');
  assert.equal(itemAt(ERAS, MAX, VIEW_H).id, 'a', 'abajo del todo, la primera');
  assert.equal(itemAt(ERAS, 3000 - VIEW_H / 2, VIEW_H).id, 'b', 'en la frontera manda la época de arriba (su puerta queda abajo)');
  assert.equal(itemAt(ERAS, 3000 - VIEW_H / 2 - 1, VIEW_H).id, 'c');
  assert.equal(itemAt([...ERAS.slice(1)], MAX, VIEW_H).id, 'b', 'fuera de todas (la salida), la más cercana');
  assert.equal(itemAt([], 0, VIEW_H), null);
  // La marca de cada época está donde el asa cambia la burbuja a ella.
  for (const era of ERAS.slice(0, 2)) {
    const at = scrollOf(markFrac(era, VIEW_H, MAX), MAX);
    assert.equal(itemAt(ERAS, at - 1, VIEW_H).id, era.id, `justo encima de la marca de ${era.id} no es ${era.id}`);
  }
  assert.equal(fracOf(MAX / 2, MAX), 0.5);
  assert.equal(scrollOf(2, MAX), MAX, 'el asa no saca la vista del mapa');
  assert.equal(gateScroll(ERAS[1], VIEW_H, MAX), 6000 - VIEW_H * GATE_AT, 'la puerta de la época no queda a la altura acordada');
  assert.equal(gateScroll(ERAS[0], VIEW_H, MAX), MAX);
  assert.ok(worthIt(DOC_H, VIEW_H) && !worthIt(VIEW_H * 2, VIEW_H), 'se monta en mapas cortos');
});

// ---------- DOM mínimo ----------
function fakeEl(cls = '') {
  const classes = new Set(cls.split(' ').filter(Boolean));
  const listeners = {};
  const attrs = new Map();
  const props = new Map();
  const el = {
    children: [], dataset: {}, hidden: false, textContent: '', rect: { top: 0, height: 0 },
    style: { setProperty: (k, v) => props.set(k, v), getPropertyValue: (k) => props.get(k) || '' },
    classList: {
      add: (...c) => c.forEach((x) => classes.add(x)), remove: (...c) => c.forEach((x) => classes.delete(x)),
      contains: (c) => classes.has(c), toggle: (c, on = !classes.has(c)) => { if (on) classes.add(c); else classes.delete(c); return on; },
    },
    set className(v) { v.split(' ').forEach((c) => classes.add(c)); },
    setAttribute: (k, v) => attrs.set(k, v), getAttribute: (k) => attrs.get(k) ?? null,
    toggleAttribute: (k, on) => { if (on) attrs.set(k, ''); else attrs.delete(k); },
    hasAttribute: (k) => attrs.has(k),
    addEventListener: (t, fn) => { listeners[t] = fn; },
    fire: (t, ev = {}) => listeners[t]?.({ button: 0, pointerId: 1, preventDefault() {}, target: el, ...ev }),
    getBoundingClientRect: () => ({ top: el.rect.top, height: el.rect.height, bottom: el.rect.top + el.rect.height }),
    closest: (sel) => (classes.has(sel.slice(1)) ? el : null),
    contains: () => false, before: () => {}, remove: () => { el.removed = true; }, focus() {}, setPointerCapture() {},
    querySelector: (sel) => el.children.find((c) => c.classList.contains(sel.slice(1))) || null,
    querySelectorAll: (sel) => el.children.flatMap((c) => [c, ...c.children]).filter((c) => c.classList.contains(sel.slice(1))),
  };
  return el;
}
// La pantalla del mapa: innerHTML del carril crea sus piezas, y el de la lista de marcas, un botón por época.
function setup() {
  const calls = [];
  const frames = [];
  const timers = new Map();
  let id = 0;
  const KEYS = ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'window', 'document'];
  const saved = Object.fromEntries(KEYS.map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
  globalThis.setTimeout = (fn) => { timers.set(++id, fn); return id; };
  globalThis.clearTimeout = (t) => timers.delete(t);
  globalThis.requestAnimationFrame = (fn) => { frames.push(fn); return frames.length; };
  globalThis.cancelAnimationFrame = () => {};
  const nav = fakeEl();
  Object.defineProperty(nav, 'innerHTML', { set() {
    nav.children = ['scrub-marks', 'scrub-here', 'scrub-thumb', 'scrub-bubble', 'scrub-pic', 'scrub-name', 'scrub-sub'].map((c) => fakeEl(c));
    const marks = nav.children[0];
    Object.defineProperty(marks, 'innerHTML', { set(html) {
      marks.children = [...html.matchAll(/data-i="(\d+)"/g)].map((m) => { const li = fakeEl('scrub-mark-row'); const b = fakeEl('scrub-mark'); b.dataset.i = m[1]; li.children = [b]; return li; });
    } });
    Object.defineProperty(nav.children[4], 'innerHTML', { set(v) { nav.children[4].html = v; } });
  } });
  nav.rect = { top: 100, height: 548 };   // recorrido del asa: 500 px
  globalThis.document = {
    createElement: (tag) => (tag === 'nav' ? nav : fakeEl()),
    head: { appendChild() {} },
    documentElement: { scrollHeight: DOC_H, classList: { contains: () => false } },
    activeElement: null,
  };
  const win = { listeners: {} };
  globalThis.window = Object.assign(win, {
    innerHeight: VIEW_H, scrollY: MAX, matchMedia: () => ({ matches: false }),
    addEventListener: (t, fn) => { win.listeners[t] = fn; }, removeEventListener: (t) => { delete win.listeners[t]; },
    scrollTo: ({ top, behavior }) => { calls.push({ top, behavior }); win.scrollY = top; },
  });
  const flush = () => { while (frames.length) frames.shift()(); };
  // Las pruebas corren todas en el mismo proceso (tests/run-all.js): se deja el global como estaba.
  const restore = () => KEYS.forEach((k) => { if (saved[k]) Object.defineProperty(globalThis, k, saved[k]); else delete globalThis[k]; });
  return { nav, calls, flush, timers, win, restore, part: (c) => nav.querySelector(`.${c}`) };
}

test('desplazamiento rápido: al arrastrar el asa el mapa va detrás y la burbuja dice la época; al soltar se queda ahí', () => {
  const env = setup();
  try {
    const map = fakeEl('path-map');
    const stop = mountScrubber(fakeEl(), { map, items: () => ERAS.map((e) => ({ ...e })) });
    const thumb = env.part('scrub-thumb');
    assert.equal(env.part('scrub-marks').children.length, ERAS.length, 'no hay una marca por época');
    // Asa abajo del todo (vista en la salida): su centro, a 100 + 500 + 24.
    thumb.rect = { top: 600, height: 48 };
    thumb.fire('pointerdown', { clientY: 624 });
    assert.ok(env.nav.classList.contains('is-active') && env.nav.classList.contains('is-shown'), 'el carril no se ensancha al arrastrar');
    // A media altura del carril: la mitad del mapa, que es la época B.
    env.nav.fire('pointermove', { clientY: 100 + 24 + 250 });
    assert.equal(env.part('scrub-name').textContent, 'B', 'la burbuja no dice la época del centro de la pantalla');
    env.flush();
    assert.equal(env.win.scrollY, MAX / 2, 'el mapa no sigue al asa');
    // Arriba: la época C, sin miniatura; abajo, la A, con la suya.
    env.nav.fire('pointermove', { clientY: 100 });
    assert.equal(env.part('scrub-name').textContent, 'C');
    env.nav.fire('pointermove', { clientY: 640 });
    assert.equal(env.part('scrub-name').textContent, 'A');
    assert.ok(!env.part('scrub-pic').hidden && env.part('scrub-pic').html.includes('<i>a</i>'), 'sin la miniatura de la época');
    env.nav.fire('pointermove', { clientY: 374 });
    env.nav.fire('pointerup');
    assert.ok(!env.nav.classList.contains('is-active'));
    const after = env.calls.length;
    env.flush();
    env.timers.forEach((fn) => fn());
    env.flush();
    assert.equal(env.win.scrollY, MAX / 2, 'al soltar, la vista no se queda donde estaba el asa');
    assert.ok(env.calls.slice(after).every((c) => c.top === MAX / 2), 'al soltar, el mapa se recoloca');
    assert.ok(env.calls.every((c) => c.behavior === 'instant'), 'el arrastre anima el desplazamiento');
    stop();
    assert.ok(env.nav.removed && !env.win.listeners.scroll, 'al salir queda el carril o su escucha');
  } finally { env.restore(); }
});

test('desplazamiento rápido: un toque en una marca va a la puerta de su época; oculto no se recalcula al desplazar', () => {
  const env = setup();
  try {
    let measured = 0;
    const stop = mountScrubber(fakeEl(), { map: fakeEl('path-map'), items: () => { measured++; return ERAS.map((e) => ({ ...e })); } });
    const before = measured;
    env.win.listeners.scroll();
    assert.equal(measured, before, 'un desplazamiento hecho por la app (al abrir el mapa) enciende el carril');
    const marks = env.part('scrub-marks').querySelectorAll('.scrub-mark');
    env.nav.fire('click', { target: marks[1], detail: 1 });
    assert.deepEqual(env.calls.at(-1), { top: gateScroll(ERAS[1], VIEW_H, MAX), behavior: 'smooth' });
    env.nav.fire('click', { target: marks[2], detail: 1 });
    assert.equal(env.calls.at(-1).top, 3000 - VIEW_H * GATE_AT);
    // Teclado: las flechas pasan de una marca a otra (arriba, la época siguiente) con una sola parada de tabulador.
    env.nav.fire('keydown', { target: marks[0], key: 'ArrowUp' });
    assert.deepEqual(marks.map((b) => b.tabIndex), [-1, 0, -1]);
    stop();
  } finally { env.restore(); }
});

test('desplazamiento rápido: en pantallas sin mapa no se monta nada', () => {
  const noMap = { querySelector: () => null };
  const ctx = { index: {}, store: { get: () => ({ progress: {} }) } };
  // Sin documento: si algo intentara crear el carril, fallaría.
  const doc = Object.getOwnPropertyDescriptor(globalThis, 'document');
  delete globalThis.document;
  try {
    assert.equal(typeof mountScrubber(noMap, { map: null, items: () => [] }), 'function');
    assert.equal(typeof mountHomeScrubber(ctx, noMap), 'function', 'la portada sin mapa intenta montar el carril');
    assert.equal(typeof mountBranchScrubber(ctx, noMap, { id: 'x' }), 'function');
  } finally { if (doc) Object.defineProperty(globalThis, 'document', doc); }
  const home = readFileSync(join(app, 'js', 'ui', 'screens', 'home.js'), 'utf8');
  const branch = readFileSync(join(app, 'js', 'ui', 'screens', 'branch.js'), 'utf8');
  assert.ok(home.includes('mountHomeScrubber') && branch.includes('mountBranchScrubber'), 'el carril no se monta en la portada o en las ramas');
  const css = readFileSync(join(app, 'css', 'mapa-rapido.css'), 'utf8');
  assert.ok(!/#[0-9a-f]{3,8}\b|rgba?\(/i.test(css), 'colores escritos a mano en mapa-rapido.css');
  assert.ok(/prefers-reduced-motion/.test(css) && /reduce-motion/.test(css), 'el carril no respeta «reducir animaciones»');
  assert.ok(/touch-action: none/.test(css) && /var\(--hit\)/.test(css), 'el asa sin zona táctil de 48 px o con el desplazamiento del navegador');
});
