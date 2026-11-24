// Ampliar dentro del visor (pellizco, doble toque, rueda, teclado): la aritmética pura de
// ui/viewer-zoom.js, sin navegador. Los gestos reales (CDP) se prueban en tools/e2e.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  REST, ZOOM_MAX, ZOOM_MIN, ZOOM_TAP, ZOOM_STEP, clampZoom, clampPan, panLimits, zoomAbout, panBy, toggleZoom,
  pinchStep, settleZoom, stepZoom, swipeTarget, isDoubleTap, transformOf, formatZoom, isRest,
} from '../app/js/ui/viewer-zoom.js';

// Cuadro apaisado de 390 × 260 en un escenario de 390 × 700 (móvil en vertical).
const BOX = { w: 390, h: 260, vw: 390, vh: 700 };
const close = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-6, `${msg || ''} ${a} ≠ ${b}`);

test('zoom: la escala se queda entre 1× y 4× (y lo raro vuelve a 1×)', () => {
  assert.equal(ZOOM_MIN, 1);
  assert.equal(ZOOM_MAX, 4);
  assert.equal(clampZoom(0.4), 1);
  assert.equal(clampZoom(2.5), 2.5);
  assert.equal(clampZoom(9), 4);
  assert.equal(clampZoom(NaN), 1);
  assert.equal(clampZoom(Infinity), 1);
});

test('zoom: límites de desplazamiento: si el cuadro ampliado cabe, no se mueve; si no, hasta el borde', () => {
  assert.deepEqual(panLimits(1, 390, 260, 390, 700), { x: 0, y: 0 });
  // A 2×: 780 de ancho en 390 → 195 a cada lado; 520 de alto en 700 → cabe, no se mueve en vertical.
  assert.deepEqual(panLimits(2, 390, 260, 390, 700), { x: 195, y: 0 });
  // A 4×: 1040 de alto en 700 → 170.
  assert.deepEqual(panLimits(4, 390, 260, 390, 700), { x: 585, y: 170 });
  // Sin ventana, la ventana es el propio marco.
  assert.deepEqual(panLimits(3, 100, 100), { x: 100, y: 100 });
  const p = clampPan({ scale: 2, x: 900, y: -50 }, BOX);
  assert.deepEqual(p, { scale: 2, x: 195, y: 0 });
});

test('zoom: ampliar en torno a un punto deja ese punto quieto bajo el dedo', () => {
  // Punto a 100 px a la derecha y 50 arriba del centro; de 1× a 2× (escenario igual que el marco).
  const z = zoomAbout(REST, 2, 100, -50, { w: 390, h: 260, vw: 390, vh: 260 });
  assert.equal(z.scale, 2);
  // Lo que estaba en (100, −50) del cuadro (q = 100, −50 a 1×) tiene que seguir ahí: x + 2q = 100.
  close(z.x + 2 * 100, 100, 'x');
  close(z.y + 2 * -50, -50, 'y');
  // En el escenario alto del móvil el cuadro a 2× cabe en vertical: queda centrado, sin hueco.
  const c = zoomAbout(REST, 2, 100, -50, BOX);
  assert.ok(Math.abs(c.x) <= 195 && c.y === 0, JSON.stringify(c));
  // Volver a 1× siempre es el reposo exacto.
  assert.deepEqual(zoomAbout({ scale: 2, x: 80, y: 0 }, 1, 30, 30, BOX), REST);
  assert.deepEqual(zoomAbout({ scale: 2, x: 80, y: 0 }, 0.3, 30, 30, BOX), REST);
});

test('zoom: desplazar ampliado respeta los bordes y a 1× no hace nada', () => {
  const s = { scale: 2, x: 0, y: 0 };
  assert.deepEqual(panBy(s, -500, 40, BOX), { scale: 2, x: -195, y: 0 });
  assert.deepEqual(panBy(s, 20, 0, BOX), { scale: 2, x: 20, y: 0 });
  assert.deepEqual(panBy(REST, 50, 50, BOX), REST);
});

test('zoom: el doble toque alterna 1× ↔ 2,5× centrado en el punto tocado', () => {
  assert.equal(ZOOM_TAP, 2.5);
  const on = toggleZoom(REST, 60, 0, BOX);
  assert.equal(on.scale, 2.5);
  close(on.x + 2.5 * 60, 60, 'el punto tocado sigue bajo el dedo');
  assert.deepEqual(toggleZoom(on, -100, 20, BOX), REST);
  assert.ok(isRest(REST) && !isRest(on));
});

test('zoom: el pellizco escala en torno al punto medio y sigue a los dedos; al soltar casi a 1× vuelve', () => {
  const start = REST;
  // Dedos separados al doble en el centro: 2×.
  let s = pinchStep(start, start, 2, { x: 0, y: 0 }, { x: 0, y: 0 }, BOX);
  assert.deepEqual(s, { scale: 2, x: 0, y: 0 });
  // El punto medio se mueve 30 px a la izquierda: el cuadro lo sigue.
  s = pinchStep(s, start, 2, { x: -30, y: 0 }, { x: 0, y: 0 }, BOX);
  assert.deepEqual(s, { scale: 2, x: -30, y: 0 });
  // Pellizcar de más no pasa de 4×.
  s = pinchStep(s, start, 40, { x: -30, y: 0 }, { x: -30, y: 0 }, BOX);
  assert.equal(s.scale, 4);
  assert.ok(Math.abs(s.x) <= 585 && Math.abs(s.y) <= 170, 'fuera de los bordes');
  // Cerrar los dedos por debajo de 1× no encoge el cuadro.
  s = pinchStep(s, start, 0.5, { x: 0, y: 0 }, { x: -30, y: 0 }, BOX);
  assert.deepEqual(s, REST);
  assert.deepEqual(settleZoom({ scale: 1.01, x: 0, y: 0 }), REST);
  const kept = { scale: 1.3, x: 10, y: 0 };
  assert.equal(settleZoom(kept), kept);
});

test('zoom: teclado + / − por pasos sobre el centro, con tope', () => {
  const up = stepZoom(REST, 1, BOX);
  assert.deepEqual(up, { scale: ZOOM_STEP, x: 0, y: 0 });
  let s = REST;
  for (let i = 0; i < 10; i++) s = stepZoom(s, 1, BOX);
  assert.equal(s.scale, 4);
  assert.deepEqual(stepZoom(up, -1, BOX), REST);
});

test('zoom: deslizar a 1× cambia de cuadro con bastante recorrido o velocidad, y no sale de la lista', () => {
  assert.equal(swipeTarget(1, 4, -120, 390), 2, 'hacia la izquierda, siguiente');
  assert.equal(swipeTarget(1, 4, 120, 390), 0, 'hacia la derecha, anterior');
  assert.equal(swipeTarget(1, 4, -30, 390), 1, 'poco recorrido: se queda');
  assert.equal(swipeTarget(1, 4, -30, 390, -1.2), 2, 'poco recorrido pero rápido: pasa');
  assert.equal(swipeTarget(3, 4, -300, 390), 3, 'no hay siguiente');
  assert.equal(swipeTarget(0, 4, 300, 390), 0, 'no hay anterior');
});

test('zoom: dos toques seguidos y cerca son un doble toque', () => {
  const a = { x: 100, y: 200, t: 1000 };
  assert.ok(isDoubleTap(a, { x: 110, y: 205, t: 1250 }));
  assert.ok(!isDoubleTap(a, { x: 110, y: 205, t: 1400 }), 'tarde');
  assert.ok(!isDoubleTap(a, { x: 180, y: 205, t: 1100 }), 'lejos');
  assert.ok(!isDoubleTap(null, a));
});

test('zoom: la transformación CSS y el indicador «2,5×»', () => {
  assert.equal(transformOf(REST), '');
  assert.equal(transformOf({ scale: 2.5, x: -12.5, y: 3 }), 'translate(-12.50px, 3.00px) scale(2.5000)');
  assert.equal(formatZoom(2.5), '2,5×');
  assert.equal(formatZoom(1), '1×');
  assert.equal(formatZoom(2.25), '2,3×');
  assert.equal(formatZoom(4), '4×');
});
