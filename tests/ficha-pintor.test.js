// Ficha de pintor y pestaña «Pintores»: lista por épocas visibles, búsqueda sin tildes, estado, obras ya
// vistas (sin spoilers), líneas de vida con fuente, historias servidas desde app/data y museo diferido.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildIndex, mergeCatalogFicha } from '../app/js/engine/catalog.js';
import { emptyProgress, artistStatus } from '../app/js/engine/progress.js';
import { pendingWorks } from '../app/js/engine/levels.js';
import { painterGroups, painterState, seenOf, playTargets, stageList, fold, isMastered, wikidataUrl } from '../app/js/engine/painters.js';
import { traitDetails, lookAlikes } from '../app/js/engine/ficha.js';
import { realIndex } from './helpers-real.js';
import { periodStart } from '../app/js/engine/movements.js';
import { museumLine } from '../app/js/ui/ficha-data.js';
import { initials } from '../app/js/ui/artist-profile.js';
import { sourceLabel } from '../app/js/engine/stories.js';

const here = dirname(fileURLToPath(import.meta.url));
const app = join(here, '..', 'app');
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const real = buildIndex(readJson(join(app, 'data', 'catalog.json')));
const first = real.path[0];

test('pintores: sin nada visto no sale ningún pintor ni movimiento (no se revela quién viene)', () => {
  assert.deepEqual(painterGroups(emptyProgress(), real), []);
});

test('pintores: cada movimiento con «n de m» y solo los conocidos; los demás, solo contados como «por descubrir»', () => {
  const p = emptyProgress();
  const w = real.worksOf(first.id)[0];
  p.collection[w.id] = '2026-11-20';
  const groups = painterGroups(p, real);
  assert.equal(groups.length, 1, 'solo el movimiento con algún pintor conocido');
  const g = groups[0];
  assert.equal(g.movement.id, first.movementId);
  assert.deepEqual(g.artists.map((r) => r.artist.id), [first.id]);
  assert.equal(g.known, 1);
  assert.equal(g.total, real.artistsOf(g.movement.id).filter((a) => real.worksOf(a.id).length).length);
  assert.equal(g.hidden, g.total - 1);
  const names = JSON.stringify(g.artists);
  for (const a of real.artistsOf(g.movement.id)) if (a.id !== first.id) assert.ok(!names.includes(a.name), `${a.name} aparece sin conocerlo`);
});

test('pintores: igual en todos los movimientos (también en el Renacimiento) y orden cronológico', () => {
  const p = emptyProgress();
  for (const a of real.artists) p.artists[a.id] = { plays: 1, works: [real.worksOf(a.id)[0]?.id].filter(Boolean) };
  const groups = painterGroups(p, real);
  assert.ok(groups.length >= 9);
  assert.ok(groups.every((g) => g.known === g.total && g.hidden === 0));
  const starts = groups.map((g) => periodStart(g.movement.period) ?? 9999);
  assert.deepEqual(starts, [...starts].sort((a, b) => a - b), 'movimientos por su fecha de inicio');
  for (const g of groups) {
    const born = g.artists.map((r) => r.artist.born || 0);
    assert.deepEqual(born, [...born].sort((a, b) => a - b), g.movement.id);
  }
});

test('pintores: «dominado» es la definición del motor y coincide con el perfil (artistStatus) y con n/m', () => {
  const p = emptyProgress();
  const [a, b, c] = real.path;
  p.artists[a.id] = { plays: 2, best: 0.9, mastered: true, works: real.levelWorks(a.id, 1).map((w) => w.id) };
  p.artists[b.id] = { plays: 1, best: 0.5, works: real.worksOf(b.id).map((w) => w.id) }; // todo visto pero sin dominar
  p.collection[real.worksOf(c.id)[0].id] = '2026-11-20';
  const rows = painterGroups(p, real).flatMap((g) => g.artists);
  const row = (id) => rows.find((r) => r.artist.id === id);
  for (const artist of real.path) {
    const listed = row(artist.id);
    const profileMastered = artistStatus(p, real, artist.id) === 'mastered';
    assert.equal(isMastered(p, artist.id), profileMastered, artist.id);
    if (listed) assert.equal(listed.state === 'mastered', profileMastered, `${artist.id}: el check no coincide con el perfil`);
  }
  assert.equal(row(a.id).state, 'mastered');
  assert.equal(row(b.id).state, 'started', 'todo visto (12/12) pero sin superar la ronda: sin check');
  assert.equal(row(b.id).seen, row(b.id).total);
  assert.equal(row(c.id).state, 'started');
  assert.ok(!row(real.path[3].id), 'un pintor sin nada visto no sale');
  // Un dominado nuevo ha visto todas sus obras de nivel 1 (regla del motor).
  assert.equal(pendingWorks(p, real, a.id, 1).length, 0);
});

test('pintores: la búsqueda ignora tildes y mayúsculas', () => {
  const p = emptyProgress();
  for (const a of real.artists) p.artists[a.id] = { plays: 1, works: [real.worksOf(a.id)[0]?.id].filter(Boolean) };
  const names = (q) => painterGroups(p, real, q).flatMap((g) => g.artists.map((r) => r.artist.id));
  assert.ok(names('DURERO').includes('durero'));
  assert.ok(names('el greco').includes('el-greco'));
  assert.deepEqual(names('zzzz'), []);
  assert.equal(fold('Velázquez'), 'velazquez');
});

test('pintores: estado dominado / en marcha / sin ver', () => {
  const p = emptyProgress();
  assert.equal(painterState(p, real, first.id), 'new');
  p.collection[real.worksOf(first.id)[0].id] = '2026-11-20';
  assert.equal(painterState(p, real, first.id), 'started');
  p.artists[first.id] = { plays: 2, mastered: true };
  assert.equal(painterState(p, real, first.id), 'mastered');
});

test('ficha: solo las obras ya vistas (colección o rondas), nunca las demás', () => {
  const works = real.worksOf(first.id);
  assert.ok(works.length > 3);
  const p = emptyProgress();
  assert.deepEqual(seenOf(p, real, first.id), []);
  p.collection[works[0].id] = '2026-11-24';
  p.artists[first.id] = { works: [works[1].id] };
  const ids = seenOf(p, real, first.id).map((w) => w.id).sort();
  assert.deepEqual(ids, [works[0].id, works[1].id].sort());
});

test('ficha: la fuente de fechas y país es su ficha de Wikidata', () => {
  assert.match(wikidataUrl(real.artist('goya')), /^https:\/\/www\.wikidata\.org\/wiki\/Q\d+$/);
  assert.equal(wikidataUrl({}), '');
});

test('cómo reconocerlo: cada rasgo con el cuadro visto que lo enseña (sus etiquetas) y, si no hay, la portada en otro punto', () => {
  const real = realIndex();
  const velazquez = real.artist('velazquez');
  const works = real.worksOf('velazquez');
  const meninas = works.find((w) => w.id === 'w208758');
  const level1 = works.filter((w) => (w.level || 1) === 1);
  // Sin Las Meninas vista, ningún cuadro visto lleva las etiquetas: la portada, recortada en puntos distintos.
  const plain = traitDetails(velazquez, level1);
  assert.equal(plain.length, velazquez.traits.length);
  assert.ok(plain.every((r) => r.work && level1.includes(r.work)), 'solo obras vistas');
  assert.equal(new Set(plain.map((r) => `${r.x},${r.y}`)).size, plain.length, 'tres rasgos, tres recortes distintos');
  assert.ok(plain.every((r) => r.x >= 15 && r.x <= 85 && r.y >= 15 && r.y <= 85), 'el recorte no se pega al marco');
  // Con Las Meninas (gris, suelta) vista, el rasgo de los grises sale de ella, recortada en su punto de interés.
  const tagged = traitDetails(velazquez, [...level1, meninas]);
  const grey = tagged.findIndex((r) => /gris/i.test(r.text));
  assert.equal(tagged[grey].work, meninas);
  assert.deepEqual([tagged[grey].x, tagged[grey].y], [45, 62], 'el detalle va a su punto de interés revisado');
  assert.deepEqual(traitDetails(velazquez, []).map((r) => r.work), velazquez.traits.map(() => null), 'sin obras vistas, sin detalle');
});

test('no lo confundas con: solo los parecidos ya conocidos (sin spoilers)', () => {
  const velazquez = real.artist('velazquez');
  const p = emptyProgress();
  assert.deepEqual(lookAlikes(p, real, velazquez), []);
  p.collection[real.worksOf('rembrandt')[0].id] = '2026-11-20';
  assert.deepEqual(lookAlikes(p, real, velazquez), ['rembrandt']);
  p.artists.murillo = { plays: 1, best: 1, mastered: true };
  assert.deepEqual(lookAlikes(p, real, velazquez), velazquez.similarTo.filter((id) => ['rembrandt', 'murillo'].includes(id)));
});

test('ficha: jugar solo si es parada abierta del camino; etapas solo con niveles «a fondo»', () => {
  const p = emptyProgress();
  assert.equal(playTargets(p, real, first.id).stage, 'available');
  assert.equal(playTargets(p, real, real.path[5].id).stage, null);
  assert.equal(playTargets(p, real, 'giotto').stage, null);
  // Dominado con etapas «a fondo» abiertas: el botón principal es seguir la primera.
  const withDeep = real.path.find((a) => real.deepLevels(a.id).length);
  const q = emptyProgress();
  for (const a of real.path.slice(0, real.pathIndex(withDeep.id) + 1)) q.artists[a.id] = { plays: 1, best: 1, mastered: true };
  const t = playTargets(q, real, withDeep.id);
  assert.equal(t.stage, 'mastered');
  assert.equal(t.next.id, real.deepLevels(withDeep.id)[0].id);
  q.deep[`${withDeep.id}:${t.next.id}`] = { plays: 1, best: 1, mastered: true };
  assert.notEqual(playTargets(q, real, withDeep.id).next?.id, t.next.id, 'hecha la etapa, pasa a la siguiente (o a nada)');
  const goya = stageList(p, real, 'goya');
  assert.ok(goya.length >= 3 && goya.every((s) => s.status === 'locked'));
});

test('ficha: iniciales y etiqueta de fuente', () => {
  assert.equal(initials('Francisco de Goya'), 'FG');
  assert.equal(initials('El Greco'), 'EG');
  assert.equal(sourceLabel('https://es.wikipedia.org/wiki/Goya#x'), 'Wikipedia');
  assert.equal(sourceLabel('no es url'), '');
});

test('museo: se une desde catalog-ficha.json y se escribe «museo, ciudad»', () => {
  const idx = buildIndex(readJson(join(app, 'data', 'catalog.json')));
  const w = idx.artworks[0];
  assert.equal(museumLine(w), '');
  mergeCatalogFicha(idx, readJson(join(app, 'data', 'catalog-ficha.json')));
  assert.ok(museumLine(w).length > 3 || !w.museum, museumLine(w));
  assert.equal(museumLine({ museum: 'Galería Uffizi', city: 'Florencia' }), 'Galería Uffizi, Florencia');
  assert.equal(museumLine({ museum: 'Prado' }), 'Prado');
});

test('historias: app/data/historias es copia exacta de contenido/historias (python tools/sync_historias.py)', () => {
  const src = join(here, '..', 'contenido', 'historias');
  const dst = join(app, 'data', 'historias');
  const names = readdirSync(src).filter((f) => f.endsWith('.json'));
  const index = readJson(join(dst, 'index.json'));
  assert.deepEqual(Object.keys(index).sort(), names.map((n) => n.slice(0, -5)).sort(), 'índice desfasado: ejecuta tools/sync_historias.py');
  for (const n of names) assert.deepEqual(readJson(join(dst, n)), readJson(join(src, n)), `${n} desfasado: ejecuta tools/sync_historias.py`);
});

test('historias: como mucho 3 tarjetas, texto de hasta 180 caracteres y fuente', () => {
  const dst = join(app, 'data', 'historias');
  for (const n of readdirSync(dst).filter((f) => f !== 'index.json')) {
    for (const lv of readJson(join(dst, n)).levels) {
      assert.ok(lv.cards.length >= 1 && lv.cards.length <= 3, `${n} nivel ${lv.level}`);
      for (const c of lv.cards) assert.ok(c.text.length <= 180 && /^https?:/.test(c.source), `${n} nivel ${lv.level}`);
    }
  }
});

test('catálogo: cada pintor lleva su QID de Wikidata (fuente de la ficha sin historia); una parada conjunta, el de cada miembro', () => {
  const qid = (q) => /^Q\d+$/.test(q || '');
  assert.ok(real.artists.every((a) => qid(a.qid) || (a.members?.length >= 2 && a.members.every((m) => qid(m.qid)))));
});
