// Colección en estanterías y buscador con sugerencias: «Lo último», una fila por época con los que esperan bloqueados
// (sin obras), dónde se conoce a cada uno, coincidencia sin tildes por principio de palabra con una errata y marcas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildIndex } from '../app/js/engine/catalog.js';
import { emptyProgress } from '../app/js/engine/progress.js';
import { isGuest, guestWorks } from '../app/js/engine/collection.js';
import { seenWorksByRecent, recentWorks, eraShelves, searchPool, whereToMeet } from '../app/js/engine/collection-shelves.js';
import { periodStart } from '../app/js/engine/movements.js';
import { seenOf } from '../app/js/engine/painters.js';
import { suggest, foldText, withinOne, matchToken, splitByMarks, SUGGEST_MAX } from '../app/js/engine/suggest.js';

const here = dirname(fileURLToPath(import.meta.url));
const real = buildIndex(JSON.parse(readFileSync(join(here, '..', 'app', 'data', 'catalog.json'), 'utf8')));

function unlock(p, artistId, n, day = '2026-11-20') {
  real.worksOf(artistId).slice(0, n).forEach((w, i) => { p.collection[w.id] = `${day}T${String(i).padStart(2, '0')}`; });
}
const first = real.path[0];

test('colección: «Lo último» son las obras vistas más recientes primero (también las vistas en una ronda)', () => {
  const p = emptyProgress();
  unlock(p, first.id, 3, '2026-11-01');
  unlock(p, real.path[1].id, 2, '2026-11-25');
  const ronda = real.worksOf(real.path[2].id)[0];
  p.artists[real.path[2].id] = { works: [ronda.id] };
  const all = seenWorksByRecent(p, real);
  assert.equal(all.length, 6);
  assert.deepEqual(all.slice(0, 2).map((w) => w.artistId), [real.path[1].id, real.path[1].id], 'lo último, delante');
  assert.equal(all[all.length - 1].id, ronda.id, 'lo visto en una ronda sin día, al final');
  assert.equal(recentWorks(p, real, 4).length, 4);
});

test('colección: una fila por época en orden cronológico; conocidos primero y después los que esperan, en orden del camino', () => {
  const p = emptyProgress();
  unlock(p, real.path[3].id, 2);
  const shelves = eraShelves(p, real);
  const starts = shelves.map((s) => periodStart(s.movement.period) ?? 9999);
  assert.deepEqual(starts, [...starts].sort((a, b) => a - b));
  const ren = shelves.find((s) => s.movement.id === real.path[3].movementId);
  assert.equal(ren.known, 1);
  assert.equal(ren.painters[0].artist.id, real.path[3].id);
  assert.equal(ren.painters[0].seen, 2);
  const locked = ren.painters.slice(1);
  assert.ok(locked.length && locked.every((r) => r.state === 'locked' && r.seen === 0 && r.cover === null), 'los bloqueados no llevan obra');
  const onPath = locked.map((r) => real.pathIndex(r.artist.id)).filter((i) => i >= 0);
  assert.deepEqual(onPath, [...onPath].sort((a, b) => a - b));
  assert.equal(locked[0].artist.id, real.path[0].id, 'el primero que espera es el siguiente del camino');
  assert.ok(shelves.every((s) => s.total === s.painters.length));
});

test('colección: sin nada visto todas las épocas salen enteras por descubrir', () => {
  const shelves = eraShelves(emptyProgress(), real);
  assert.ok(shelves.length >= 9);
  assert.ok(shelves.every((s) => s.known === 0 && s.painters.every((r) => r.state === 'locked')));
});

test('colección: dominado / en marcha según el motor', () => {
  const p = emptyProgress();
  const [a, b] = real.path;
  p.artists[a.id] = { plays: 2, best: 0.9, mastered: true, works: real.levelWorks(a.id, 1).map((w) => w.id) };
  unlock(p, b.id, 1);
  const rows = eraShelves(p, real).flatMap((s) => s.painters);
  assert.equal(rows.find((r) => r.artist.id === a.id).state, 'mastered');
  assert.equal(rows.find((r) => r.artist.id === b.id).state, 'started');
  assert.ok(rows.find((r) => r.artist.id === a.id).cover, 'un conocido lleva portada de lo visto');
});

test('colección: un pintor de rama sin ver se conoce en su rama; uno del camino, en el camino', () => {
  const cimabue = real.artist('cimabue');
  assert.deepEqual(whereToMeet(real, cimabue), { kind: 'branch', id: 'gotico', name: real.branch('gotico').name });
  assert.deepEqual(whereToMeet(real, real.path[0]), { kind: 'path' });
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

test('buscador: conocidos y sus obras vistas; los demás pintores salen como «por descubrir», sin obras', () => {
  const p = emptyProgress();
  unlock(p, 'goya', 2);
  const pl = searchPool(p, real);
  assert.deepEqual(pl.artists.map((a) => a.id), ['goya']);
  assert.equal(pl.works.length, 2);
  assert.ok(pl.works.every((w) => w.artistId === 'goya'));
  assert.ok(pl.locked.some((a) => a.id === 'velazquez'));
  const vel = suggest(pl, 'velaz');
  assert.equal(vel[0].kind, 'locked');
  assert.equal(vel[0].thumbId, null, 'sin miniatura: no se enseña ninguna obra suya');
  assert.equal(suggest(pl, 'goy')[0].kind, 'artist');
});

test('colección: «desbloqueada» es lo visto (colección o rondas), igual que la ficha', () => {
  const p = emptyProgress();
  const works = real.worksOf(first.id);
  p.collection[works[0].id] = '2026-11-20';
  p.artists[first.id] = { works: [works[1].id, works[2].id] };
  const row = eraShelves(p, real).flatMap((s) => s.painters).find((r) => r.artist.id === first.id);
  assert.equal(row.seen, 3);
  assert.equal(row.seen, seenOf(p, real, first.id).length, 'la tarjeta y la ficha cuentan lo mismo');
});

test('colección: los invitados de un movimiento, juntos y en orden cronológico', () => {
  const p = emptyProgress();
  const guests = real.artists.filter((a) => isGuest(a) && a.movementId === 'barroco');
  for (const g of guests.slice(0, 3)) unlock(p, g.id, 1);
  const out = guestWorks(p, real, 'barroco');
  assert.equal(out.works.length, Math.min(3, guests.length));
  const years = out.works.map((w) => w.yearSort || 0);
  assert.deepEqual(years, [...years].sort((a, b) => a - b));
  assert.equal(out.total, guests.reduce((n, g) => n + real.worksOf(g.id).length, 0));
});

test('colección: rutas; «Pintores» de antes abre la misma página y «Ver los n» todos tus cuadros', async () => {
  const { parseRoute } = await import('../app/js/ui/router.js');
  assert.deepEqual(parseRoute('#coleccion'), { name: 'collection' });
  assert.deepEqual(parseRoute('#coleccion-pintores'), { name: 'collection' });
  assert.deepEqual(parseRoute('#coleccion-cuadros'), { name: 'works', spec: { kind: 'all' } });
});

test('visor: «Ver más» solo donde se pide, con el dato curioso de la obra', async () => {
  const { artFrame } = await import('../app/js/ui/art.js');
  const { moreHtml } = await import('../app/js/ui/viewer-more.js');
  const w = real.worksOf(first.id)[0];
  assert.match(artFrame(w, { zoom: { group: 'g', more: true } }), /data-zoom-more="1"/);
  assert.doesNotMatch(artFrame(w, { zoom: { group: 'g' } }), /data-zoom-more/, 'en una ronda, sin «Ver más»');
  assert.match(moreHtml({ ...w, curio: { text: 'Un secreto <b>' } }), /Un secreto &lt;b&gt;/);
  assert.doesNotMatch(moreHtml({ ...w, curio: undefined }), /viewer-curio/);
  assert.match(moreHtml(w), /data-v="more"/);
});
