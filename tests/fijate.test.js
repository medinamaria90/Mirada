// «Fíjate en…» que encaja con la obra (feedback de María, 27/11: «Los tormentos de San Antonio» le enseñaba los
// cuerpos musculosos de Miguel Ángel). Una obra puede traer su propio «fíjate» y excluir rasgos del pintor que en
// ella no se ven (contenido/fijate.json → skipTraits). Y cada rasgo declara dónde se ve (contenido/rasgos.json →
// traitScope: estilo, géneros o etiquetas), así que «el llanto» de Van der Weyden no sale en un retrato (27/11).
// Si no queda ninguno que encaje, no hay línea.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { realIndex, realTextJson } from './helpers-real.js';
import { feedbackFor, artistLines, teachingLines, skipsTrait, scopeFits, tagsOf } from '../app/js/engine/feedback.js';
import { traitDetails } from '../app/js/engine/ficha.js';
import { buildIndex, mergeCatalogText, GENRES } from '../app/js/engine/catalog.js';

const TORMENTOS = 'w2327759';
const WEYDEN_MUJER_JOVEN = 'w3399411';
const ROUNDS = 6;

const whoQ = (work) => ({
  type: 'who', prompt: '', artistId: work.artistId, artworkId: work.id,
  options: [{ id: work.artistId, label: '' }], answerId: work.artistId, isNew: false,
});
// Líneas que enseña la misma pregunta acertada varias veces en una ronda (la pista rota).
const linesOver = (index, work, n = ROUNDS) => {
  const memo = new Map();
  return Array.from({ length: n }, () => feedbackFor(index, whoQ(work), true, memo).lines[0] || '');
};

function miniIndex() {
  const catalog = {
    version: 1,
    movements: [{ id: 'm', name: 'M', order: 1 }],
    artists: [{ id: 'p', name: 'Pintor', short: 'Pintor', movementId: 'm', order: 1, hint: 'Fíjate en la pista general.', stages: [] }],
    artworks: ['a', 'b', 'c', 'd'].map((id) => ({ id, artistId: 'p', title: id, year: '1500', yearSort: 1500, img: `img/${id}.jpg`, w: 1, h: 1, fame: 2 })),
  };
  const index = buildIndex(catalog);
  mergeCatalogText(index, {
    traits: { p: ['rasgo uno', 'rasgo dos'] },
    traitTags: { p: ['', 'oscuro', ''] },
    looks: { a: [{ text: 'Fíjate en lo propio de esta obra', source: 'Museo' }] },
    tags: { d: 'claro' },
    skipTraits: { a: 'todos', b: [0, 2], c: 'cualquiera', nope: 'todos' },
  });
  return index;
}

test('fíjate por obra: se usa el suyo y, con «todos» excluidos, ningún rasgo del pintor después', () => {
  const index = miniIndex();
  const a = index.artwork('a');
  assert.equal(a.skipTraits, true);
  const lines = linesOver(index, a, 3);
  assert.equal(lines[0], 'Fíjate en lo propio de esta obra.');
  assert.deepEqual(lines.slice(1), ['', ''], 'agotado el suyo, mejor sin línea que un rasgo que no encaja');
});

test('rasgo excluido para una obra: nunca se muestra en ella (sí en las demás)', () => {
  const index = miniIndex();
  const b = index.artwork('b');
  assert.deepEqual(b.skipTraits, [0, 2]);
  assert.ok(skipsTrait(b, 0) && !skipsTrait(b, 1) && skipsTrait(b, 2));
  assert.deepEqual([...new Set(linesOver(index, b))], ['Rasgo uno.'], 'solo el rasgo que sí se ve');
  // Un valor que no encaja se ignora: la obra enseña todos los rasgos.
  const c = index.artwork('c');
  assert.equal(c.skipTraits, undefined);
  assert.equal(new Set(linesOver(index, c)).size, 3);
});

test('obra etiquetada: no se enseña un rasgo etiquetado que el cuadro no tiene', () => {
  const index = miniIndex();
  const p = index.artist('p');
  const d = index.artwork('d');
  assert.deepEqual(teachingLines(artistLines(p), p, d), ['Fíjate en la pista general.', 'Rasgo dos.'], '«oscuro» no está en un cuadro «claro»');
});

test('ficha del pintor: un rasgo no se ilustra con una obra que lo excluye', () => {
  const index = miniIndex();
  const p = index.artist('p');
  const rows = traitDetails(p, [index.artwork('b'), index.artwork('c')]);
  assert.notEqual(rows[1].work?.id, 'b', '«rasgo dos» (posición 2) está excluido en b');
});

test('Los tormentos de San Antonio: su propio «fíjate», nunca los cuerpos musculosos', () => {
  const real = realIndex();
  const work = real.artwork(TORMENTOS);
  const lines = linesOver(real, work);
  assert.match(lines[0], /demonios/);
  assert.ok(lines.every((l) => !/musculos/i.test(l)), lines.join(' | '));
});

test('catálogo real: ninguna obra enseña un rasgo excluido para ella', () => {
  const real = realIndex();
  const skips = realTextJson().skipTraits;
  assert.ok(Object.keys(skips).length > 100, 'la auditoría de obras atípicas está en los datos');
  for (const id of Object.keys(skips)) {
    const work = real.artwork(id);
    assert.ok(work, `obra desconocida: ${id}`);
    const all = artistLines(real.artist(work.artistId));
    const banned = all.filter((_, i) => skipsTrait(work, i));
    assert.ok(banned.length, `${id}: excluye rasgos que el pintor no tiene`);
    for (const line of linesOver(real, work)) assert.ok(!banned.includes(line), `${id} (${work.title}): «${line}»`);
  }
});

function scopedIndex() {
  const index = miniIndex();
  mergeCatalogText(index, {
    traitScope: { p: ['estilo', ['figuras'], 'etiquetas'] },
    traitTags: { p: ['', '', 'oscuro'] },
    genre: { a: 'retrato', b: 'figuras', c: 'retrato', d: 'figuras' },
    tags: { c: 'oscuro' },
  });
  return index;
}

test('alcance de cada rasgo: estilo en todas, género solo en su género, motivo solo si las etiquetas lo confirman', () => {
  const index = scopedIndex();
  const p = index.artist('p');
  const lines = artistLines(p);
  const fits = (id) => teachingLines(lines, p, { ...index.artwork(id), skipTraits: undefined });
  assert.deepEqual(fits('d'), ['Fíjate en la pista general.', 'Rasgo uno.'], 'figuras sin etiqueta «oscuro»: estilo y género');
  assert.deepEqual(fits('c'), ['Rasgo dos.', 'Fíjate en la pista general.'], 'retrato «oscuro»: el motivo verificado y el estilo, no el de figuras');
  assert.ok(!scopeFits(p, { genre: 'retrato' }, 1) && scopeFits(p, { genre: 'figuras' }, 1));
  assert.ok(!scopeFits(p, {}, 1), 'obra sin género: un rasgo de género no sale');
  assert.ok(!scopeFits({ traitScope: [null] }, { genre: 'retrato' }, 0), 'alcance que no encaja: no sale');
});

test('Van der Weyden, «Retrato de una mujer joven»: nunca el llanto', () => {
  const real = realIndex();
  const work = real.artwork(WEYDEN_MUJER_JOVEN);
  assert.equal(work.genre, 'retrato');
  const lines = linesOver(real, work);
  assert.ok(lines.every((l) => !/llanto|lágrimas|dolor/i.test(l)), lines.join(' | '));
});

test('catálogo real: toda obra tiene género y todo pintor con frases declara dónde se ve cada una', () => {
  const real = realIndex();
  for (const w of real.artworks) assert.ok(GENRES.includes(w.genre), `${w.id} (${w.title}) sin género`);
  for (const a of real.artists) {
    const n = artistLines(a).length;
    if (!n) continue;
    assert.equal(a.traitScope?.length, n, `${a.id}: alcance alineado con [pista, *rasgos]`);
    assert.ok(a.traitScope.every(Boolean), `${a.id}: alcance desconocido`);
  }
});

test('catálogo real: ningún rasgo de un género sale en una obra de otro, ni un motivo sin etiquetas que lo confirmen', () => {
  const real = realIndex();
  for (const w of real.artworks) {
    const a = real.artist(w.artistId);
    const all = artistLines(a);
    if (!all.length) continue;
    const tags = tagsOf(w);
    for (const line of new Set(linesOver(real, w, all.length + 2))) {
      if (!line || !all.includes(line) || (w.looks || []).some((l) => line.startsWith(l.text))) continue;
      const i = all.indexOf(line);
      const scope = a.traitScope[i];
      if (Array.isArray(scope)) assert.ok(scope.includes(w.genre), `${w.id} (${w.title}, ${w.genre}): «${line}» es de ${scope.join('/')}`);
      if (scope === 'etiquetas') assert.ok(a.traitTags[i]?.length && a.traitTags[i].every((t) => tags.has(t)), `${w.id}: «${line}» sin etiquetas que lo confirmen`);
    }
  }
});
