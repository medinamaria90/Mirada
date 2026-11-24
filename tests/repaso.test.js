// Repaso «más machacón sin deprimir» (v12): días de gracia, cuadros fallados que vuelven, cuadro de
// repaso escondido en cada etapa, pintores dormidos, repaso de 5 y cierre del día. Sin navegador: el
// motor se prueba directamente y las pantallas, por el HTML que construyen.
import { test } from 'node:test';
import assert from 'node:assert/strict';

// accentStyle y compañía leen variables CSS del documento: lo mínimo para que no haga falta navegador.
globalThis.document = { documentElement: {} };
globalThis.getComputedStyle = () => ({ getPropertyValue: () => '#000000' });
const { graceSavedText } = await import('../app/js/ui/screens/result.js');
const { graceLine } = await import('../app/js/ui/screens/profile.js');

test('racha a salvo: textos del resultado y del perfil coherentes con los días de gracia', () => {
  assert.equal(graceSavedText(0), '');
  assert.equal(graceSavedText(1), 'Racha a salvo: te quedaba un día de gracia');
  assert.equal(graceSavedText(2), 'Racha a salvo: te quedaban dos días de gracia');
  assert.equal(graceLine(2), 'Te quedan 2 días de gracia esta semana');
  assert.equal(graceLine(1), 'Te queda 1 día de gracia esta semana');
  assert.equal(graceLine(0), 'Sin días de gracia hasta el lunes');
  for (const t of [graceSavedText(1), graceSavedText(2), graceLine(0), graceLine(1), graceLine(2)]) {
    assert.doesNotMatch(t, /ayer|mañana/i);
  }
});
