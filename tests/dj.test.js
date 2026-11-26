// Modo «afinar música»: nombre legible de cada pieza, su papel en la lista y la portada con su original.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pieceInfo, allPieces } from '../app/js/audio/piece-info.js';
import { allPieceKeys, splitKey } from '../app/js/audio/variants.js';
import { nextPiece } from '../app/js/audio/rotation.js';

test('afinar música: todas las piezas tienen nombre, y los clásicos autor', () => {
  for (const key of allPieceKeys()) {
    const info = pieceInfo(key, splitKey(key).era);
    assert.ok(info?.title, key);
    assert.ok(allPieces(info.key).includes(key), key);
  }
  assert.deepEqual(pieceInfo('renaissance/vacas', 'maestros-espanoles'),
    { id: 'renaissance/vacas', title: 'Guárdame las vacas', author: 'Narváez', key: 'maestros-espanoles', role: 'principal' });
  assert.equal(pieceInfo('renaissance/vacas', 'renaissance').role, 'principal');
  assert.equal(pieceInfo('menu', 'menu').author, '');
});

test('portada: la original abre cada visita (de día)', () => {
  assert.equal(nextPiece('menu', { date: new Date(2026, 10, 26, 12, 0) }), 'menu');
  assert.equal(pieceInfo('menu/paseo', 'menu').role, 'secundaria');
  assert.equal(pieceInfo('renaissance/villancico', 'renaissance').role, 'fuera de lista');
  assert.ok(allPieces('renaissance').includes('renaissance/villancico'), '«Siguiente» recorre también las de fuera');
});
