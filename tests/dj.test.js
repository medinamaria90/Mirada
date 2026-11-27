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
  assert.deepEqual(pieceInfo('renaissance/vacas', 'renaissance'),
    { id: 'renaissance/vacas', title: 'Guárdame las vacas', author: 'Narváez', key: 'renaissance', role: 'fuera de lista' });
  assert.equal(pieceInfo('renaissance', 'renaissance').role, 'principal');
  assert.equal(pieceInfo('menu', 'menu').author, '');
});

test('portada: la original abre cada visita (de día)', () => {
  assert.equal(nextPiece('menu', { date: new Date(2026, 10, 26, 12, 0) }), 'menu');
  assert.equal(pieceInfo('menu/paseo', 'menu').role, 'secundaria');
  assert.equal(pieceInfo('renaissance/villancico', 'renaissance').role, 'fuera de lista');
  assert.ok(allPieces('renaissance').includes('renaissance/villancico'), '«Siguiente» recorre también las de fuera');
  assert.deepEqual(['renaissance/sombra', 'renaissance/gallarda'].map((k) => pieceInfo(k, 'renaissance').title), ['Pavana en sombra', 'Gallarda del alba']);
  assert.equal(pieceInfo('renaissance/gallarda', 'renaissance').role, 'secundaria');
  assert.equal(pieceInfo('renaissance/greensleeves', 'renaissance').role, 'fuera de lista', 'sigue en el catálogo para el modo secreto');
});

test('afinar música: nombres humanos de las listas, de cada época y rama de la música', async () => {
  const { listName } = await import('../app/js/audio/list-names.js');
  const { PLAYLISTS } = await import('../app/js/audio/playlists.js');
  assert.equal(listName('menu'), 'Portada');
  assert.equal(listName('renaissance'), 'Renacimiento');
  assert.equal(listName('maestros-espanoles'), 'Maestros españoles');
  for (const list of Object.keys(PLAYLISTS)) assert.notEqual(listName(list), list, list);
});

test('afinar música: orden lógico de listas y el salto pasa a la siguiente (da la vuelta)', async () => {
  const { listOrder, followingList } = await import('../app/js/audio/list-names.js');
  const { PLAYLISTS } = await import('../app/js/audio/playlists.js');
  const { hasList } = await import('../app/js/audio/rotation.js');
  const order = listOrder(Object.keys(PLAYLISTS), hasList);
  assert.equal(order[0], 'menu');
  assert.ok(order.indexOf('renaissance') < order.indexOf('baroque'));
  assert.ok(order.indexOf('modern') < order.indexOf('escuela-rusa'), 'las ramas van después de las épocas');
  assert.equal(new Set(order).size, Object.keys(PLAYLISTS).length);
  assert.equal(followingList(order, 'menu'), order[1]);
  assert.equal(followingList(order, order.at(-1)), 'menu');
  assert.equal(followingList(listOrder(['x', 'menu', 'baroque']), 'menu'), 'baroque');
});

test('superusuario: se recuerda, sale y migra de la barra ya encendida; el registro de opciones es válido', async () => {
  const store = new Map();
  globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  const { isSuperOn, setSuper, SU_KEY } = await import('../app/js/ui/su-mode.js');
  const { SU_OPTIONS } = await import('../app/js/ui/su-options.js');
  assert.equal(isSuperOn(), false);
  store.set('sfumato.dj', '1');
  assert.equal(isSuperOn(), true, 'quien ya tenía la barra entra sin código');
  setSuper(false);
  assert.equal(isSuperOn(), false, 'salir se impone a la migración');
  setSuper(true);
  assert.equal(store.get(SU_KEY), '1');
  assert.equal(new Set(SU_OPTIONS.map((o) => o.id)).size, SU_OPTIONS.length);
  for (const o of SU_OPTIONS) assert.ok(o.label && typeof o.get === 'function' && typeof o.set === 'function', o.id);
  delete globalThis.localStorage;
});
