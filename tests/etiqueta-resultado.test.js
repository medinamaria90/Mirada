import { test } from 'node:test';
import assert from 'node:assert/strict';

const { levelLabel, missingLine } = await import('../app/js/engine/result-labels.js');
const { roundChips } = await import('../app/js/ui/screens/result-chips.js');

const botticelli = { id: 'botticelli', name: 'Sandro Botticelli', short: 'Botticelli' };

test('la etiqueta del resultado dice pintor y número de nivel, no el nombre interno de la etapa', () => {
  assert.equal(levelLabel(botticelli, 2), 'Botticelli · Nivel 2');
  assert.equal(levelLabel(botticelli, 2, true), 'Botticelli · Nivel 2 superado');
  assert.equal(levelLabel({ name: 'Goya' }, 3), 'Goya · Nivel 3');
});

test('la ficha del nivel superado no enseña «Savonarola» suelto', () => {
  const index = { artist: () => botticelli, movement: () => null, deepLevels: () => [{ id: 2, short: 'Savonarola' }] };
  const [chip] = roundChips(index, { events: [{ type: 'deep-mastered', artistId: 'botticelli', level: 2 }] });
  assert.deepEqual([chip.title, chip.sub], ['Botticelli', 'Nivel 2 superado']);
});

test('«una ronda más» solo si el botón principal lleva a esa ronda', () => {
  assert.equal(missingLine(1, true), 'Te falta 1 cuadro suyo por ver: una ronda más');
  assert.equal(missingLine(1, false), 'Te falta 1 cuadro suyo por ver');
  assert.equal(missingLine(3, false), 'Te faltan 3 cuadros suyos por ver');
});

test('el medallón y el nombre abren la ficha del pintor, con su etiqueta accesible', async () => {
  const { fichaRoute, fichaLabel } = await import('../app/js/engine/result-labels.js');
  const berruguete = { id: 'berruguete', name: 'Pedro Berruguete', short: 'Berruguete' };
  assert.equal(fichaRoute(berruguete), 'pintor-berruguete');
  assert.equal(fichaLabel(berruguete), 'Ver la ficha de Berruguete');
});
