// Sello de categoría del pintor y «por qué importa» (catalog-text.json): todos los pintores tienen las dos cosas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { realIndex } from './helpers-real.js';
import { tierOf, isMasterTier } from '../app/js/engine/painters.js';

test('sello: oro, plata o bronce según la categoría; momento solo para oro y plata; frase con fuente en todos', () => {
  const index = realIndex();
  assert.deepEqual(tierOf(index.artist('velazquez')), { tier: 'gold', label: 'Gran maestro' });
  assert.equal(tierOf(index.artist('artemisia')).label, 'Maestra');
  assert.equal(tierOf(index.artist('cimabue')).tier, 'silver', 'los de rama, plata');
  const guest = index.artists.find((a) => a.category === 'invitado');
  assert.equal(tierOf(guest).tier, 'bronze');
  assert.ok(isMasterTier(index.artist('velazquez')) && !isMasterTier(guest));
  for (const a of index.artists) {
    assert.ok(tierOf(a), `${a.id} sin sello`);
    assert.ok(a.why?.text && a.why.text.length <= 140 && /^https:\/\//.test(a.why.source), `${a.id} sin «por qué importa» con fuente`);
  }
});
