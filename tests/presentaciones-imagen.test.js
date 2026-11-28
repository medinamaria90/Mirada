// Ninguna presentación sin cuadro: cada tarjeta de los carteles de tramo y de rama, de las épocas y de las historias de
// pintor (sobre todo la primera) enseña una obra del catálogo con imagen, sin repetirla dentro del mismo cartel; y cada
// época abre con su pared de tres cuadros. María vio carteles que empezaban en blanco y solo tenían cuadros después.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { realIndex } from './helpers-real.js';

const data = join(dirname(fileURLToPath(import.meta.url)), '..', 'app', 'data');
const json = (...parts) => JSON.parse(readFileSync(join(data, ...parts), 'utf8'));
const INTRO_WALL = 3;

const index = realIndex();
const shown = (id) => {
  const w = index.artwork(id);
  return Boolean(w && w.img && w.w && w.h);
};

test('carteles de tramo y de rama: cada tarjeta con su cuadro, distinto en cada cartel', () => {
  const blanks = [];
  for (const file of ['tramos', 'ramas']) {
    for (const [key, sign] of Object.entries(json('carteles', `${file}.json`))) {
      const ids = sign.cards.map((c) => c.artwork);
      sign.cards.forEach((c, i) => { if (!shown(c.artwork)) blanks.push(`${file} ${key} tarjeta ${i + 1}`); });
      assert.equal(new Set(ids).size, ids.length, `${file} ${key}: repite cuadro`);
    }
  }
  assert.deepEqual(blanks, [], 'tarjetas de cartel sin cuadro');
});

test('tarjetas de época: todas con cuadro', () => {
  const blanks = readdirSync(join(data, 'epocas')).filter((f) => f !== 'index.json').flatMap((f) =>
    json('epocas', f).cards.map((c, i) => (shown(c.artwork) ? null : `${f} tarjeta ${i + 1}`)).filter(Boolean));
  assert.deepEqual(blanks, []);
});

test('historias de pintor: todas las tarjetas, y la primera de cada nivel, con cuadro', () => {
  const blanks = [];
  for (const [artist, levels] of Object.entries(json('historias', 'index.json'))) {
    const story = json('historias', `${artist}.json`);
    assert.deepEqual(story.levels.map((l) => l.level), levels, `${artist}: índice desfasado`);
    for (const lv of story.levels) {
      assert.ok(lv.cards.length && shown(lv.cards[0].artwork), `${artist} nivel ${lv.level}: la primera tarjeta no tiene cuadro`);
      lv.cards.forEach((c, i) => { if (!shown(c.artwork)) blanks.push(`${artist} nivel ${lv.level} tarjeta ${i + 1}`); });
    }
  }
  assert.deepEqual(blanks, []);
});

test('presentación de época: su pared de tres cuadros sale entera', () => {
  for (const m of index.visibleMovements) {
    if (index.isSala(m.id)) continue;
    const works = index.stageArtists(m.id).flatMap((a) => index.learnWorks(a.id)).filter((w) => shown(w.id));
    assert.ok(works.length >= INTRO_WALL, `${m.id}: menos de ${INTRO_WALL} cuadros para su presentación`);
  }
});

test('portada de cartel: pared de tres cuadros del grupo, sin repetir los de sus tarjetas si hay otros', async () => {
  globalThis.document = globalThis.document || { documentElement: {} };
  const { signWall, signGroup, WALL_SIZE } = await import('../app/js/ui/sign-wall.js');
  const { signSlides } = await import('../app/js/ui/sign-cards.js');
  for (const [kind, file] of [['tramo', 'tramos'], ['rama', 'ramas']]) {
    for (const [key, sign] of Object.entries(json('carteles', `${file}.json`))) {
      const group = new Set(signGroup(index, kind, key));
      const wall = signWall(index, kind, key, sign);
      assert.equal(wall.length, WALL_SIZE, `${file} ${key}: pared incompleta`);
      assert.equal(new Set(wall).size, WALL_SIZE, `${file} ${key}: cuadro repetido en la pared`);
      assert.ok(wall.every((w) => group.has(w.artistId) && shown(w.id)), `${file} ${key}: cuadro de fuera del grupo o sin imagen`);
      const used = new Set(sign.cards.map((c) => c.artwork));
      const spare = [...group].flatMap((a) => index.worksOf(a)).filter((w) => !used.has(w.id)).length;
      const repeated = wall.filter((w) => used.has(w.id)).length;
      assert.ok(repeated <= Math.max(0, WALL_SIZE - spare), `${file} ${key}: la pared repite cuadros de sus tarjetas`);
      const { html } = signSlides(index, kind, sign, key, key);
      const cover = html.slice(0, html.indexOf('</section>'));
      assert.equal((cover.match(/class="wall-item/g) || []).length, WALL_SIZE, `${file} ${key}: portada sin pared`);
    }
  }
  // Sin saber el grupo (o sin datos), la portada sigue siendo solo el nombre.
  assert.ok(!signSlides(index, 'tramo', undefined, 'X').html.includes('wall'));
});
