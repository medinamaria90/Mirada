// Colección agrupada por pintor y buscador con sugerencias: franjas, orden, invitados juntos, umbral del
// buscador, coincidencia sin tildes por principio de palabra con una errata y marcas en negrita.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildIndex } from '../app/js/engine/catalog.js';
import { emptyProgress } from '../app/js/engine/progress.js';
import { collectionStrips, unlockedPainterCount, unlockedMovements, suggestPool, STRIP_THUMBS, SEARCH_MIN_PAINTERS } from '../app/js/engine/collection.js';
import { suggest, foldText, withinOne, matchToken, splitByMarks, SUGGEST_MAX } from '../app/js/engine/suggest.js';

const here = dirname(fileURLToPath(import.meta.url));
const real = buildIndex(JSON.parse(readFileSync(join(here, '..', 'app', 'data', 'catalog.json'), 'utf8')));

function unlock(p, artistId, n, day = '2026-11-20') {
  real.worksOf(artistId).slice(0, n).forEach((w, i) => { p.collection[w.id] = `${day}T${String(i).padStart(2, '0')}`; });
}
const first = real.path[0];

test('colección: una franja por pintor con «n de m» y solo las 3 últimas a la vista', () => {
  const p = emptyProgress();
  unlock(p, first.id, 5);
  const [s] = collectionStrips(p, real);
  assert.equal(s.id, first.id);
  assert.equal(s.count, 5);
  assert.equal(s.total, real.worksOf(first.id).length);
  assert.equal(s.shown.length, STRIP_THUMBS);
  const days = s.works.map((w) => p.collection[w.id]);
  assert.deepEqual(days, [...days].sort().reverse(), 'las más recientes primero');
  assert.deepEqual(s.shown, s.works.slice(0, STRIP_THUMBS));
});

test('colección: por movimiento en orden cronológico y, con «recientes», por lo último desbloqueado', () => {
  const p = emptyProgress();
  const early = real.path[0];
  const late = real.path[real.path.length - 1];
  unlock(p, early.id, 2, '2026-11-24');
  unlock(p, late.id, 2, '2026-11-01');
  assert.deepEqual(collectionStrips(p, real).map((s) => s.id), [early.id, late.id]);
  assert.deepEqual(collectionStrips(p, real, { recent: true }).map((s) => s.id), [early.id, late.id]);
  unlock(p, late.id, 2, '2026-11-25');
  assert.deepEqual(collectionStrips(p, real, { recent: true }).map((s) => s.id), [late.id, early.id]);
  const mov = collectionStrips(p, real, { movementId: late.movementId });
  assert.ok(mov.length && mov.every((s) => s.movement.id === late.movementId));
});

test('colección: los invitados van juntos en una sola franja por movimiento, al final de él', () => {
  const p = emptyProgress();
  const guests = real.artists.filter((a) => a.category === 'invitado' && a.movementId === 'barroco');
  assert.ok(guests.length >= 2);
  for (const g of guests.slice(0, 3)) unlock(p, g.id, 1);
  unlock(p, real.stageArtists('barroco')[0].id, 1);
  const strips = collectionStrips(p, real).filter((s) => s.movement.id === 'barroco');
  assert.equal(strips.filter((s) => s.kind === 'guests').length, 1);
  assert.equal(strips[strips.length - 1].kind, 'guests');
  assert.equal(strips[strips.length - 1].name, 'Invitados');
  assert.equal(strips[strips.length - 1].count, Math.min(3, guests.length));
});

test('colección: el buscador sale con 15 pintores o más con alguna obra desbloqueada', () => {
  const p = emptyProgress();
  const artists = real.artists.slice(0, SEARCH_MIN_PAINTERS);
  artists.slice(0, SEARCH_MIN_PAINTERS - 1).forEach((a) => unlock(p, a.id, 1));
  assert.equal(unlockedPainterCount(p, real), SEARCH_MIN_PAINTERS - 1);
  unlock(p, artists[SEARCH_MIN_PAINTERS - 1].id, 1);
  assert.equal(unlockedPainterCount(p, real), SEARCH_MIN_PAINTERS);
  assert.ok(unlockedMovements(p, real).length >= 1);
});

const pool = {
  artists: [{ id: 'velazquez', name: 'Diego Velázquez', thumbId: 'w1' }, { id: 'van-gogh', name: 'Vincent van Gogh', thumbId: 'w2' }, { id: 'vermeer', name: 'Johannes Vermeer', thumbId: 'w3' }],
  works: [{ id: 'w1', title: 'Las meninas', artistId: 'velazquez' }, { id: 'w2', title: 'La noche estrellada', artistId: 'van-gogh' }, { id: 'w4', title: 'Vista de Delft', artistId: 'vermeer' }],
};

test('sugerencias: sin tildes ni mayúsculas, por el principio de cualquier palabra', () => {
  assert.equal(foldText('Velázquez'), 'velazquez');
  assert.equal(foldText('Ñandú'), 'nandu');
  assert.deepEqual(suggest(pool, 'vel').map((s) => s.id), ['velazquez']);
  assert.equal(suggest(pool, 'VEL')[0].id, 'velazquez');
  assert.equal(suggest(pool, 'gogh')[0].id, 'van-gogh');
  assert.equal(suggest(pool, 'estre')[0].id, 'w2');
  assert.deepEqual(suggest(pool, 'zzz'), []);
  assert.deepEqual(suggest(pool, '  '), []);
});

test('sugerencias: tolera una errata pequeña («velazques»)', () => {
  assert.equal(suggest(pool, 'velazques')[0].id, 'velazquez');
  assert.equal(suggest(pool, 'vermer')[0].id, 'vermeer');
  assert.ok(withinOne('abc', 'acb') && withinOne('abc', 'ab') && withinOne('abc', 'abcd') && !withinOne('abc', 'xyz'));
  assert.equal(matchToken('ve', 'vermeer').exact, true);
  assert.equal(matchToken('vx', 'vermeer').len, 0, 'las palabras cortas no admiten errata');
});

test('sugerencias: pintores primero, luego títulos; como mucho 6; con las marcas de lo que casa', () => {
  const many = { artists: [{ id: 'a', name: 'Ana Pérez', thumbId: 'w9' }], works: Array.from({ length: 9 }, (_, i) => ({ id: `w${i}`, title: `Perez obra ${i}`, artistId: 'a' })) };
  const out = suggest(many, 'pe');
  assert.equal(out.length, SUGGEST_MAX);
  assert.equal(out[0].kind, 'artist');
  assert.ok(out.slice(1).every((s) => s.kind === 'work'));
  const vel = suggest(pool, 'vel')[0];
  assert.deepEqual(splitByMarks(vel.label, vel.marks), [{ text: 'Diego ', hit: false }, { text: 'Vel', hit: true }, { text: 'ázquez', hit: false }]);
  const two = suggest(pool, 'van go')[0];
  assert.deepEqual(splitByMarks(two.label, two.marks).filter((p) => p.hit).map((p) => p.text), ['van', 'Go']);
});

test('sugerencias: el conjunto sale solo de lo desbloqueado', () => {
  const p = emptyProgress();
  unlock(p, 'goya', 2);
  const pl = suggestPool(p, real);
  assert.deepEqual(pl.artists.map((a) => a.id), ['goya']);
  assert.equal(pl.works.length, 2);
  assert.deepEqual(suggest(pl, 'velaz'), [], 'Velázquez no está desbloqueado');
  assert.equal(suggest(pl, 'goy')[0].id, 'goya');
});
