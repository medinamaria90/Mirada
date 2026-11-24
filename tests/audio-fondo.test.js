// La música se calla en segundo plano (pestaña oculta, página escondida o ventana sin foco) y vuelve
// al regresar, sin olvidar que estaba pedida. Documento y ventana falsos: sin navegador.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { audio, bindBackgroundPause, isPausedInBackground } from '../app/js/ui/audio-bridge.js';

const GRACE = 20; // ms de gracia al perder el foco (en la app, 800)

function fakeTarget() {
  const listeners = {};
  return {
    hidden: false,
    focused: true,
    hasFocus() { return this.focused; },
    addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
    fire(type) { for (const fn of listeners[type] || []) fn(); },
  };
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

test('la música se para al ocultar la pestaña y vuelve al mostrarla', () => {
  const doc = fakeTarget();
  const win = fakeTarget();
  bindBackgroundPause(doc, win, GRACE);
  audio.unlock();
  audio.startMusic();
  assert.equal(isPausedInBackground(), false);

  doc.hidden = true;
  doc.fire('visibilitychange');
  assert.equal(isPausedInBackground(), true, 'oculta: la música debe pararse');

  doc.hidden = false;
  doc.fire('visibilitychange');
  assert.equal(isPausedInBackground(), false, 'visible: la música vuelve');
});

test('pagehide y freeze también paran; pageshow y focus reanudan', () => {
  const doc = fakeTarget();
  const win = fakeTarget();
  bindBackgroundPause(doc, win, GRACE);
  audio.startMusic();

  win.fire('pagehide');
  assert.equal(isPausedInBackground(), true);
  win.fire('pageshow');
  assert.equal(isPausedInBackground(), false);

  doc.fire('freeze');
  assert.equal(isPausedInBackground(), true);
  win.fire('focus');
  assert.equal(isPausedInBackground(), false);
});

test('perder el foco un instante no para; perderlo de verdad sí', async () => {
  const doc = fakeTarget();
  const win = fakeTarget();
  bindBackgroundPause(doc, win, GRACE);
  audio.startMusic();

  doc.focused = false;
  win.fire('blur');
  doc.focused = true; // el foco vuelve antes de la gracia (teclado, barra de direcciones)
  await wait(GRACE * 2);
  assert.equal(isPausedInBackground(), false, 'un parpadeo de foco no para la música');

  doc.focused = false;
  win.fire('blur');
  await wait(GRACE * 2);
  assert.equal(isPausedInBackground(), true, 'sin foco de verdad: se para');
  win.fire('focus');
  assert.equal(isPausedInBackground(), false);
});

test('sin música pedida no hay nada que parar ni reanudar', () => {
  const doc = fakeTarget();
  const win = fakeTarget();
  bindBackgroundPause(doc, win, GRACE);
  audio.stopMusic();
  doc.hidden = true;
  doc.fire('visibilitychange');
  assert.equal(isPausedInBackground(), false);
});
