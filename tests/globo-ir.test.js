// «Ir» del globo de lo cerrado: el camino baja hasta la parada y solo la toca cuando ha dejado de moverse. Antes se tocaba a
// los 450 ms con el desplazamiento aún en curso y la tarjeta que se abría se cerraba sola (se cierra si el mapa se mueve).
import test from 'node:test';
import assert from 'node:assert/strict';

test('Ir: toca la parada cuando el camino ya está quieto, no mientras se desplaza', async () => {
  const frames = [];
  let top = 900;
  let clicks = 0;
  let clickedAtTop = null;
  const target = {
    isConnected: true,
    scrollIntoView() { /* el desplazamiento lo simula el reloj de cuadros */ },
    focus() {},
    click() { clicks += 1; clickedAtTop = top; },
    getBoundingClientRect: () => ({ top }),
  };
  globalThis.CSS = { escape: (s) => s };
  globalThis.document = { querySelector: () => target, documentElement: { classList: { contains: () => false } } };
  globalThis.window = { matchMedia: () => ({ matches: false }) };
  globalThis.requestAnimationFrame = (fn) => frames.push(fn);
  const { goToStep } = await import('../app/js/ui/screens/path-actions.js');
  const done = goToStep('artist:veronese');
  const step = (n) => { for (let i = 0; i < n; i += 1) { const fn = frames.shift(); if (fn) fn(); } };
  for (let i = 0; i < 20; i += 1) { top -= 40; step(1); assert.equal(clicks, 0, 'tocó con el camino aún en movimiento'); }
  let over = false;
  done.then(() => { over = true; });
  while (!over) { await new Promise((r) => setTimeout(r, 20)); step(1); }
  assert.equal(clicks, 1, 'no tocó la parada al quedarse quieto');
  assert.equal(clickedAtTop, top);
});
