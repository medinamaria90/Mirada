// El aviso breve se cierra al cambiar de pantalla, salvo el que explica una redirección (aguanta ese cambio y nada más).
import { test } from 'node:test';
import assert from 'node:assert/strict';

const classes = new Set();
const el = { textContent: '', offsetWidth: 0, classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c), contains: (c) => classes.has(c) } };
globalThis.document = { getElementById: (id) => (id === 'toast' ? el : null) };
const { toast, routeChanged } = await import('../app/js/ui/toast.js');

test('aviso: se cierra al cambiar de ruta', () => {
  toast('Copiado');
  assert.ok(classes.has('is-on'));
  routeChanged();
  assert.ok(!classes.has('is-on'));
});

test('aviso de redirección: sobrevive a la redirección y se cierra en el siguiente cambio', () => {
  toast('Aún no está abierta', { carry: true });
  routeChanged();
  assert.ok(classes.has('is-on'), 'se ve en la pantalla a la que redirige');
  routeChanged();
  assert.ok(!classes.has('is-on'));
});
