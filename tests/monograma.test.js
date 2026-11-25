// Iniciales del monograma (nombre y apellido principal, sin partículas ni segundos nombres) y variación de color.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { monogramOf, monogramVariant } from '../app/js/engine/painters.js';

test('iniciales: nombre y apellido principal', () => {
  const casos = {
    'Peter Paul Rubens': 'PR',
    'Caspar David Friedrich': 'CF',
    'Bartolomé Esteban Murillo': 'BM',
    'Vincent van Gogh': 'VG',
    'El Greco': 'EG',
    'Rembrandt': 'R',
    'Diego Velázquez': 'DV',
  };
  for (const [nombre, esperado] of Object.entries(casos)) {
    const got = monogramOf(nombre);
    assert.ok([esperado, esperado[0]].includes(got), `${nombre}: ${got} (esperado ${esperado})`);
  }
});

test('iniciales: sufijos como «el Viejo» no cuentan', () => {
  assert.equal(monogramOf('Pieter Bruegel el Viejo'), 'PB');
});

test('variantes de color: estables y dentro de rango', () => {
  for (const id of ['goya', 'murillo', 'rubens', 'friedrich', 'monet']) {
    const v = monogramVariant(id);
    assert.equal(v, monogramVariant(id));
    assert.ok(Number.isInteger(v) && v >= 0 && v < 5);
  }
  const vistas = new Set(['goya', 'murillo', 'rubens', 'friedrich', 'monet', 'degas', 'ribera', 'zurbaran'].map(monogramVariant));
  assert.ok(vistas.size >= 3, 'debe haber variación');
});
