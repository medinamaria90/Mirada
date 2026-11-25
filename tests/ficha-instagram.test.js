// Ficha de pintor al estilo Instagram y galería del pintor: rutas, portada sin spoilers, galería embebida con huecos,
// avatar, duración de las tarjetas de la historia y HTML del perfil (anillo de historia, «Ver sus n cuadros»).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildIndex } from '../app/js/engine/catalog.js';
import { emptyProgress } from '../app/js/engine/progress.js';
import { parseRoute } from '../app/js/ui/router.js';
import { coverWork, previewCells, avatarCrop, avatarWork, seenOf, PREVIEW_CELLS, missingNote, stageTitle } from '../app/js/engine/painters.js';
import { periodStart, movementsChrono } from '../app/js/engine/movements.js';
import { cardDuration, CARD_BASE_MS } from '../app/js/engine/stories.js';
import { worksSpec } from '../app/js/ui/screens/artist-works.js';

const here = dirname(fileURLToPath(import.meta.url));
const real = buildIndex(JSON.parse(readFileSync(join(here, '..', 'app', 'data', 'catalog.json'), 'utf8')));
const DAY = '2026-11-25';

test('rutas: ficha (con y sin etapas), galería del pintor y de los invitados; ids con guiones', () => {
  assert.deepEqual(parseRoute('#pintor-el-greco'), { name: 'artist', artistId: 'el-greco', focus: '' });
  assert.deepEqual(parseRoute('#pintor-van-gogh-etapas'), { name: 'artist', artistId: 'van-gogh', focus: 'stages' });
  assert.deepEqual(parseRoute('#obras-goya'), { name: 'works', spec: { kind: 'artist', artistId: 'goya' } });
  assert.deepEqual(parseRoute('#obras-invitados-barroco'), { name: 'works', spec: { kind: 'guests', movementId: 'barroco' } });
  assert.equal(parseRoute('#obras-').name, 'invalid');
  assert.equal(parseRoute('#etapa-goya').name, 'stage');
  assert.equal(parseRoute('#galeria-barroco').name, 'gallery', 'la galería de la sala no se confunde con la del pintor');
});

test('portada: la obra más famosa de las vistas, nunca una no vista; sin vistas, ninguna; nada de trípticos muy apaisados', () => {
  const p = emptyProgress();
  assert.equal(coverWork(seenOf(p, real, 'goya')), null);
  const W = (id, w, h, fame) => ({ id, w, h, fame, title: id, yearSort: 1600 });
  assert.equal(coverWork([W('friso', 400, 100, 3), W('cuadro', 100, 120, 1)]).id, 'cuadro', 'el friso muy apaisado no hace de portada');
  assert.equal(coverWork([W('friso', 400, 100, 3)]), null);
  assert.equal(coverWork([W('apaisado', 150, 100, 3), W('cuadro', 100, 120, 1)]).id, 'cuadro', 'más apaisado que 1,3 pierde frente a uno normal');
});

test('avatar: autorretrato visto; si no, retrato con focus; si no, nada (iniciales). Nunca un paisaje o un barco', () => {
  const W = (id, title, extra = {}) => ({ id, title, fame: 1, yearSort: 1600, w: 100, h: 120, ...extra });
  assert.equal(avatarWork([]), null);
  assert.equal(avatarWork([W('a', 'Tormenta en el mar de Galilea', { focus: [0.5, 0.5] }), W('b', 'Vista de Delft')]), null, 'sin retratos, iniciales');
  assert.equal(avatarWork([W('a', 'Retrato de un hombre')]), null, 'un retrato sin encuadre revisado no vale');
  assert.equal(avatarWork([W('a', 'Retrato de un hombre', { focus: [0.4, 0.3] })]).work.id, 'a');
  const self = avatarWork([W('a', 'Retrato de un hombre', { focus: [0.4, 0.3], fame: 3 }), W('b', 'Autorretrato')]);
  assert.equal(self.work.id, 'b', 'el autorretrato gana');
  assert.equal(avatarWork([W('c', 'Self-Portrait')]).work.id, 'c');
  // Autorretratos con más gente: el recorte por defecto enseñaría una falda (Rubens e Isabel Brant); solo valen con `focus`.
  assert.equal(avatarWork([W('r', 'Autorretrato con Isabel Brant')]), null);
  assert.equal(avatarWork([W('r', 'Autorretrato con un amigo')]), null);
  assert.equal(avatarWork([W('r', 'Autorretrato pintando a María Antonieta')]), null);
  assert.equal(avatarWork([W('r', 'Autorretrato con Isabel Brant', { focus: [0.3, 0.3] })]).work.id, 'r');
  assert.equal(avatarWork([W('o', 'Autorretrato con la oreja vendada')]).work.id, 'o', 'un autorretrato solo con complementos sí vale');
  assert.equal(avatarWork([W('t', 'Autorretrato', { w: 300, h: 100 })]), null, 'un tríptico o friso no hace de avatar');
  assert.deepEqual([self.x, self.y], [50, 35]);
});

test('lo que falta: una frase («Te faltan 24 · se desbloquean en sus etapas»), no casillas vacías', () => {
  const p = emptyProgress();
  assert.equal(missingNote(p, real, 'goya', 33, 33), null);
  assert.equal(missingNote(p, real, 'goya', 9, 33).text, 'Te faltan 24 · se desbloquean al jugar sus rondas');
  p.artists.goya = { mastered: true };
  assert.deepEqual(missingNote(p, real, 'goya', 9, 33), { text: 'Te faltan 24 · se desbloquean en sus etapas', toStages: true });
  assert.equal(missingNote(p, real, 'goya', 32, 33).text.startsWith('Te falta 1 '), true);
});

test('etapas: un nombre con sentido; «Más obras» pasa a «<Pintor> a fondo · n»', () => {
  const a = real.artist('hals');
  assert.equal(stageTitle(a, { id: 2, name: 'Más obras' }), 'Hals a fondo · 1');
  assert.equal(stageTitle(a, { id: 3, name: 'Más obras' }), 'Hals a fondo · 2');
  assert.equal(stageTitle(real.artist('goya'), { id: 2, name: 'Formación y cartones' }), 'Formación y cartones');
});

test('movimientos: por su fecha de inicio, no por el orden del camino (la estampa japonesa en su sitio)', () => {
  assert.equal(periodStart('1860–1890'), 1860);
  assert.equal(periodStart('s. XIII–XIV'), 1200);
  assert.equal(periodStart('finales s. XVIII–mediados s. XIX'), 1770);
  assert.equal(periodStart('mediados–finales s. XIX'), 1840);
  assert.equal(periodStart(''), null);
  const ids = movementsChrono(real).map((m) => m.id);
  assert.ok(ids.indexOf('ukiyo-e') < ids.indexOf('impresionismo'), 'la estampa japonesa va antes del Impresionismo');
  assert.ok(ids.indexOf('gotico') < ids.indexOf('renacimiento'));
});

test('avatar: detalle del cuadro según su focus, o la parte alta del centro', () => {
  assert.deepEqual(avatarCrop({ focus: [0.2, 0.8] }), { x: 20, y: 80 });
  assert.deepEqual(avatarCrop({}), { x: 50, y: 35 });
  assert.deepEqual(avatarCrop(null), { x: 50, y: 35 });
});

test('historia: cada tarjeta dura lo que se tarda en leerla', () => {
  assert.equal(cardDuration({ text: '' }), CARD_BASE_MS);
  assert.ok(cardDuration({ text: 'x'.repeat(180) }) > cardDuration({ text: 'x'.repeat(20) }));
  assert.ok(cardDuration({ text: 'x'.repeat(180) }) < 15000, 'ni eterna');
});

test('galería del pintor: todas las vistas por orden cronológico y el total; invitados juntos', () => {
  const p = emptyProgress();
  const works = real.worksOf('goya');
  for (const w of works.slice(0, 4)) p.collection[w.id] = DAY;
  const ctx = { index: real, store: { get: () => ({ progress: p }) } };
  const spec = worksSpec(ctx, { kind: 'artist', artistId: 'goya' });
  assert.equal(spec.works.length, 4);
  assert.equal(spec.total, works.length);
  const years = spec.works.map((w) => w.yearSort || 0);
  assert.deepEqual(years, [...years].sort((a, b) => a - b));
  assert.equal(worksSpec(ctx, { kind: 'artist', artistId: 'nadie' }), null);
  const guest = real.artists.find((a) => a.category === 'invitado');
  p.collection[real.worksOf(guest.id)[0].id] = DAY;
  const g = worksSpec(ctx, { kind: 'guests', movementId: guest.movementId });
  assert.ok(g.title.startsWith('Invitados'));
  assert.ok(g.works.length >= 1 && g.total >= g.works.length);
  assert.equal(worksSpec(ctx, { kind: 'guests', movementId: 'gotico-sin-invitados' }), null);
});
