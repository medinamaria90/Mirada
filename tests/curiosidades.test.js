// Dato curioso de cada obra (hoja de feedback) y explicación larga (página de la obra): llegan del catálogo y se validan.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { realIndex } from './helpers-real.js';
import { mergeCatalogText, mergeCatalogFicha } from '../app/js/engine/catalog.js';

test('el dato curioso llega a la obra; sin dato o demasiado largo, nada', () => {
  const idx = realIndex();
  const [a, b, c] = idx.artworks;
  delete a.curio; delete b.curio; delete c.curio;
  mergeCatalogText(idx, { curio: { [a.id]: { text: 'Un perro escondido.', source: 'https://es.wikipedia.org/wiki/X' }, [b.id]: { text: 'x'.repeat(241) }, nope: { text: 'y' } } });
  assert.deepEqual(a.curio, { text: 'Un perro escondido.', source: 'https://es.wikipedia.org/wiki/X' });
  assert.equal(b.curio, undefined);
  assert.equal(c.curio, undefined);
});

test('la explicación larga llega con la ficha de museo, en párrafos', () => {
  const idx = realIndex();
  const [a, b] = idx.artworks;
  mergeCatalogFicha(idx, { ficha: { [a.id]: { museum: 'Prado', about: { text: ['Uno.', 2, 'Dos.'], source: '' } }, [b.id]: { about: { text: [] } } } });
  assert.deepEqual(a.about, { text: ['Uno.', 'Dos.'], source: '' });
  assert.equal(b.about, undefined);
});
