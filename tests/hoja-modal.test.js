// Hueco modal (ui/modal-slot.js): con dos aperturas seguidas solo gana la última, y cerrar un diálogo que ya no es
// el actual no estorba al que sí lo es (antes el primero de un doble toque quedaba huérfano, sin cerrarse).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { modalSlot } from '../app/js/ui/modal-slot.js';

test('modal-slot: el último toque gana y los anteriores se abandonan', () => {
  const slot = modalSlot();
  const t1 = slot.begin();
  const t2 = slot.begin();
  assert.equal(slot.stale(t1), true, 'la primera apertura debería abandonarse');
  assert.equal(slot.stale(t2), false);
});

test('modal-slot: abrir cierra lo anterior y soltar solo afecta al actual', () => {
  const slot = modalSlot();
  const closed = [];
  const a = { close: () => closed.push('a') };
  const b = { close: () => closed.push('b') };
  slot.take(a);
  slot.take(b);
  assert.deepEqual(closed, ['a']);
  slot.release(a); // un diálogo viejo que se cierra tarde no vacía el hueco del actual
  slot.close();
  assert.deepEqual(closed, ['a', 'b']);
  slot.release(b);
  slot.close(); // ya no hay nada: no revienta
  assert.deepEqual(closed, ['a', 'b']);
});
