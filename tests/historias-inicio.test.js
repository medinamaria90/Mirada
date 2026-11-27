// Historias al empezar un nivel: formato, encuadre del detalle, avance entre tarjetas y marca de vistas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildIndex } from '../app/js/engine/catalog.js';
import { levelStory, cropOf, step, storyKey, MAX_CARDS, MAX_TEXT, sourceLabel, lookLine, openingCandidates, regionOf, regionRatio, frameFor, storySrc } from '../app/js/engine/stories.js';
import { coverLoss, LOSS_FOCUSED, STORY_RATIO } from '../app/js/engine/framing.js';

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, '..', 'app', 'data', 'historias');
const real = buildIndex(JSON.parse(readFileSync(join(here, '..', 'app', 'data', 'catalog.json'), 'utf8')));
const story = (n) => JSON.parse(readFileSync(join(dataDir, `${n}.json`), 'utf8'));

test('historias: nivel 1 con 1 a 5 tarjetas de hasta 180 caracteres; sin nivel o sin pintor, nada', () => {
  const lv = levelStory(story('goya'), 1);
  assert.ok(lv.cards.length >= 1 && lv.cards.length <= MAX_CARDS);
  assert.ok(lv.cards.every((c) => c.text.length <= MAX_TEXT));
  assert.equal(levelStory(story('goya'), 99), null);
  assert.equal(levelStory(null, 1), null);
  assert.equal(levelStory({ levels: [{ level: 1, cards: [{ text: 'x'.repeat(MAX_TEXT + 1), artwork: 'w1' }] }] }, 1), null, 'texto demasiado largo');
  const six = { levels: [{ level: 1, title: 't', cards: [1, 2, 3, 4, 5, 6].map((n) => ({ text: `t${n}`, artwork: 'w1' })) }] };
  assert.equal(levelStory(six, 1).cards.length, MAX_CARDS);
});

test('historias: las etapas «a fondo» (nivel 2 en adelante) llevan el título corto de su etapa (el mismo del catálogo)', () => {
  const lv = levelStory(story('goya'), 2);
  assert.ok(lv && lv.stage, 'sin nombre de etapa');
  assert.equal(lv.stage, real.deepLevels('goya').find((l) => l.id === 2).short);
});

test('historias: cada tarjeta enseña una obra del catálogo y del mismo pintor o de su nivel básico', () => {
  for (const f of readdirSync(dataDir).filter((n) => n !== 'index.json')) {
    const st = story(f.slice(0, -5));
    for (const lv of st.levels) {
      for (const c of lv.cards) {
        const w = real.artwork(c.artwork);
        assert.ok(w, `${f}: obra ${c.artwork} fuera del catálogo`);
        assert.equal(w.artistId, st.artistId, `${f}: obra de otro pintor`);
        assert.ok(w.level === lv.level || w.level === 1, `${f} nivel ${lv.level}: obra de nivel ${w.level}`);
        if (lv.level === 1) assert.equal(w.level, 1);
      }
    }
  }
});

test('historias: la obra que abre la primera tarjeta no repite ninguna de las tarjetas siguientes (Tiziano)', () => {
  const cards = [{ artwork: 'w2046100' }, { artwork: 'w1899740' }, { artwork: 'w1123378' }];
  const seen = [{ id: 'w1123378' }, { id: 'w2046100' }, { id: 'w727875' }];
  assert.deepEqual(openingCandidates(seen, cards).map((w) => w.id), ['w2046100', 'w727875']);
  assert.deepEqual(openingCandidates([], cards), []);
});

test('historias: encuadre [x, y, zoom] acotado; sin focus, la obra entera', () => {
  assert.deepEqual(cropOf(undefined), { whole: true, x: 50, y: 50, zoom: 1 });
  assert.deepEqual(cropOf([0.5, 0.45, 1.5]), { whole: false, x: 50, y: 45, zoom: 1.5 });
  const wild = cropOf([-2, 9, 50]);
  assert.deepEqual([wild.x, wild.y, wild.zoom], [0, 100, 3]);
  assert.equal(cropOf([0.2, 0.3]).zoom, 1.5);
});

test('historias: pasar de tarjeta avanza, termina tras la última y atrás no baja de la primera', () => {
  assert.deepEqual(step(0, 3, 1), { pos: 1 });
  assert.deepEqual(step(2, 3, 1), { end: true, pos: 2 });
  assert.deepEqual(step(0, 3, -1), { pos: 0 });
  assert.deepEqual(step(2, 3, -1), { pos: 1 });
  assert.equal(storyKey('goya', 2), 'goya:2');
  assert.equal(sourceLabel('https://es.wikipedia.org/wiki/Goya'), 'Wikipedia');
});

test('historias: la marca de vistas se guarda por pintor y nivel (y vale en la sesión sin almacenamiento)', async () => {
  const store = {};
  globalThis.window = { localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } } };
  const { storySeen, markStorySeen, STORIES_KEY } = await import('../app/js/state/stories-seen.js');
  assert.equal(storySeen('x:1'), false);
  markStorySeen('x:1');
  assert.equal(storySeen('x:1'), true);
  assert.equal(storySeen('x:2'), false);
  assert.deepEqual(JSON.parse(store[STORIES_KEY]), ['x:1']);
  globalThis.window = { get localStorage() { throw new Error('bloqueado'); } };
  markStorySeen('y:1');
  assert.equal(storySeen('y:1'), true);
  delete globalThis.window;
});

test('historias: pie de la obra con su título y «· autorretrato» si lo es', async () => {
  const { captionOf } = await import('../app/js/engine/stories.js');
  assert.equal(captionOf(real.artwork('w546977')), 'Retrato de Baltasar Castiglione', 'el retrato de otro lleva su título');
  assert.equal(captionOf({ title: 'Autorretrato con gorra' }), 'Autorretrato con gorra');
  assert.equal(captionOf({ title: 'Self-portrait' }), 'Self-portrait · autorretrato');
  assert.equal(captionOf(null), '');
});

test('historias: el avatar es un autorretrato o nada (nunca el retrato de otro)', async () => {
  const { avatarWork } = await import('../app/js/engine/painters.js');
  const other = { id: 'o', title: 'Retrato de Baltasar Castiglione', w: 4, h: 5, focus: [0.5, 0.3] };
  const self = { id: 's', title: 'Autorretrato', w: 4, h: 5 };
  assert.equal(avatarWork([other], { selfOnly: true }), null);
  assert.equal(avatarWork([other, self], { selfOnly: true }).work.id, 's');
  assert.equal(avatarWork([other]).work.id, 'o', 'la ficha sigue admitiendo un retrato con encuadre revisado');
});

test('historias: la última tarjeta lleva el «Fíjate en…» del pintor salvo que alguna tarjeta ya invite a fijarse', () => {
  const hint = 'Fíjate en los bordes difuminados.';
  assert.equal(lookLine([{ text: 'Nació en Vinci.' }], hint), hint);
  assert.equal(lookLine([{ text: 'Nació en Vinci.' }, { text: 'Fíjate en los contornos: no hay líneas.' }], hint), '');
  assert.equal(lookLine([{ text: 'Nació en Vinci.' }], ''), '');
  assert.equal(lookLine([{ text: 'Nació en Vinci.' }], undefined), '');
});

test('historias: un detalle intencionado (`region`) enseña esa parte de la obra a sangre, como si fuera la obra', () => {
  assert.equal(regionOf([0, 0, 1]), null);
  assert.equal(regionOf([0.2, 0, 0.21, 1]), null, 'demasiado estrecha');
  assert.equal(regionOf([-0.1, 0, 0.5, 1]), null, 'fuera de la obra');
  const triptych = { w: 1600, h: 903 };
  const left = [0, 0, 0.25, 1];
  // Un panel de un tríptico apaisado, que entero saldría pequeño sobre el fondo: con su región, a sangre.
  assert.equal(frameFor(triptych, null, STORY_RATIO).mode, 'fit');
  const f = frameFor(triptych, null, STORY_RATIO, left);
  assert.equal(f.mode, 'crop');
  // La imagen entera mide 4 veces la región de ancho y empieza en el borde izquierdo: no asoma nada del panel de al lado.
  assert.ok(f.box.left <= 0 && f.box.left + f.box.width * 0.25 >= 100, 'la región cubre el marco');
  assert.ok(f.box.width / f.box.height > 1.5, 'sin deformar: la imagen conserva su proporción en el marco');
  const right = frameFor(triptych, null, STORY_RATIO, [0.75, 0, 1, 1]);
  assert.ok(right.box.left + right.box.width * 0.75 <= 0.1, 'el panel derecho empieza en el borde del marco');
});

test('historias: cada región de las historias cabe a sangre sin perder más de lo permitido, en el móvil y en 9:16', () => {
  for (const f of readdirSync(dataDir).filter((n) => n !== 'index.json')) {
    for (const lv of JSON.parse(readFileSync(join(dataDir, f), 'utf8')).levels) {
      for (const c of lv.cards.filter((card) => 'region' in card)) {
        const part = regionOf(c.region);
        assert.ok(part, `${f}: región mal formada`);
        const r = regionRatio(real.artwork(c.artwork), part);
        for (const frame of [STORY_RATIO, 9 / 16]) assert.ok(coverLoss(r, frame) <= LOSS_FOCUSED, `${f} nivel ${lv.level}: la región pierde demasiado`);
      }
    }
  }
});

test('historias: un detalle (`region` o zoom grande) usa la imagen HD de la obra si la hay; el resto, la normal', () => {
  const work = { img: 'img/w1.jpg', w: 1600, h: 900, hd: { img: 'img/hd/w1.jpg', w: 3700, h: 2081 } };
  assert.equal(storySrc(work, null, [0, 0, 0.25, 1]), 'img/hd/w1.jpg', 'región');
  assert.equal(storySrc(work, [0.5, 0.3, 2], null), 'img/hd/w1.jpg', 'zoom grande');
  assert.equal(storySrc(work, [0.5, 0.3], null), 'img/hd/w1.jpg', 'zoom por defecto (1,5)');
  assert.equal(storySrc(work, [0.5, 0.3, 1.2], null), 'img/w1.jpg', 'zoom pequeño');
  assert.equal(storySrc(work, null, null), 'img/w1.jpg', 'la obra entera');
  assert.equal(storySrc({ img: 'img/w2.jpg' }, null, [0, 0, 0.25, 1]), 'img/w2.jpg', 'sin HD');
});
