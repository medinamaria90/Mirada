// Test de cultura pictórica: salir a medias pide confirmación (app/js/test/salida.js). «Atrás» (gesto de Android o
// botón del navegador) a mitad de partida abre la hoja propia y no sale; con el resultado, vuelve a la portada.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLeaveGuard } from '../app/js/test/salida.js';

function fakeWorld() {
  const listeners = {};
  const stack = [null];
  const win = {
    addEventListener: (type, fn) => { (listeners[type] ||= []).push(fn); },
    history: {
      pushState: (st) => { stack.push(st); },
      back: () => { stack.pop(); for (const fn of listeners.popstate || []) fn({ state: stack[stack.length - 1] }); },
    },
  };
  const el = () => ({ hidden: true, querySelector: () => ({ focus() {} }) });
  const nodes = { 'test-leave': el(), 'test-leave-backdrop': el() };
  const doc = { getElementById: (id) => nodes[id] };
  return { win, doc, stack, sheet: nodes['test-leave'] };
}

test('«atrás» a mitad de test abre «¿Dejar el test?» y no sale; «Seguir jugando» la cierra', () => {
  const w = fakeWorld();
  let phase = 'playing';
  let left = 0;
  const guard = createLeaveGuard(w.doc, w.win, { phase: () => phase, onLeave: () => { left++; }, onBackFromResult: () => {} });
  guard.arm();
  assert.equal(w.stack.length, 2, 'entrada de guarda en el historial');
  w.win.history.back();
  assert.equal(w.sheet.hidden, false, 'la hoja se abre');
  assert.equal(left, 0, 'no sale');
  assert.equal(w.stack.length, 2, 'la guarda vuelve a ponerse: otro «atrás» vuelve a preguntar');
  guard.stay();
  assert.equal(w.sheet.hidden, true);
  // Esc abre y cierra.
  assert.equal(guard.onEscape(), true);
  assert.equal(w.sheet.hidden, false);
  guard.onEscape();
  assert.equal(w.sheet.hidden, true);
  // «Salir» sale y quita la guarda.
  guard.ask();
  guard.leave();
  assert.equal(left, 1);
  assert.equal(w.stack.length, 1);
  phase = null;
  assert.equal(guard.ask(), false, 'en la portada no hay nada que confirmar');
});

test('cerrar el visor (vuelve a la guarda) no cuenta como salir; con el resultado, «atrás» va a la portada', () => {
  const w = fakeWorld();
  let phase = 'playing';
  let home = 0;
  const guard = createLeaveGuard(w.doc, w.win, { phase: () => phase, onLeave: () => {}, onBackFromResult: () => { home++; } });
  guard.arm();
  w.win.history.pushState({ viewer: true }, '');
  w.win.history.back();
  assert.equal(w.sheet.hidden, true, 'cerrar el visor no abre la hoja');
  phase = 'done';
  w.win.history.back();
  assert.equal(home, 1);
  assert.equal(w.sheet.hidden, true);
});
