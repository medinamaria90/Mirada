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
import { painterGroups, painterState, seenOf, lifeLines, playTargets, stageList, fold, isMastered } from '../app/js/engine/painters.js';
import { museumLine } from '../app/js/ui/ficha-data.js';
import { initials } from '../app/js/ui/artist-sheet.js';
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
  const orders = groups.map((g) => g.movement.order);
  assert.deepEqual(orders, [...orders].sort((a, b) => a - b));
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

test('ficha: líneas de vida de la historia de nivel 1 con su fuente; sin historia, un dato seco con Wikidata', () => {
  const story = readJson(join(app, 'data', 'historias', 'goya.json'));
  const goya = real.artist('goya');
  const lines = lifeLines(goya, story, 'Romanticismo');
  assert.ok(lines.length >= 1 && lines.length <= 4);
  assert.ok(lines.every((l) => l.text && /^https?:/.test(l.source)));
  const giotto = real.artist('giotto');
  const dry = lifeLines(giotto, null, 'Renacimiento');
  assert.equal(dry.length, 1);
  assert.ok(dry[0].text.includes('Giotto') && /wikidata\.org/.test(dry[0].source), JSON.stringify(dry));
});

test('ficha: jugar solo si es parada abierta del camino; etapas solo con niveles «a fondo»', () => {
  const p = emptyProgress();
  assert.equal(playTargets(p, real, first.id).stage, 'available');
  assert.equal(playTargets(p, real, real.path[5].id).stage, null);
  assert.equal(playTargets(p, real, 'giotto').stage, null);
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

test('catálogo: cada pintor lleva su QID de Wikidata (fuente de la ficha sin historia)', () => {
  assert.ok(real.artists.every((a) => /^Q\d+$/.test(a.qid || '')));
});
