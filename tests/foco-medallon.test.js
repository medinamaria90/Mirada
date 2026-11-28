// Dónde se posa la recomendación del itinerario y qué parada se destaca: en una partida nueva (o tras «Borrar progreso») es el
// medallón de la primera época; tras ver su presentación, el primer pintor (el primer tramo de cada época ya no sale en el
// camino); el cartel de un tramo posterior, antes de su primer pintor. Solo hay una burbuja (map-cue.js) y la parada actual
// no lleva marca propia; si lo recomendado queda atrás, el mapa lo dice (is-rec-back) y la frontera lleva un anillo fino.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildIndex } from '../app/js/engine/catalog.js';
import { emptyProgress, nextStep, hasTramoSign } from '../app/js/engine/progress.js';
import { defaultState } from '../app/js/state/schema.js';
import { loreHere, loreBefore } from '../app/js/ui/screens/path-lore.js';
import { renderPathMap } from '../app/js/ui/screens/path-map.js';
import { cueFor, CUE_VERB } from '../app/js/ui/screens/map-cue.js';

const here = dirname(fileURLToPath(import.meta.url));
const index = buildIndex(JSON.parse(readFileSync(join(here, '..', 'app', 'data', 'catalog.json'), 'utf8')));
const first = index.path[0];
const fresh = () => defaultState().progress;
const focus = (p) => loreHere(p, index, nextStep(p, index));
const master = (p, ids) => ({ ...p, artists: { ...p.artists, ...Object.fromEntries(ids.map((id) => [id, { plays: 1, best: 1, mastered: true }])) } });

test('partida nueva: lo primero es el medallón de la primera época, también tras «Borrar progreso»', () => {
  assert.equal(focus(emptyProgress()), `era:${first.movementId}`);
  assert.equal(focus(fresh()), `era:${first.movementId}`);
});

test('visto el medallón, lo siguiente es el primer pintor: el primer tramo de la época no tiene rombo', () => {
  const seenEra = { ...fresh(), intros: { [first.movementId]: '2026-11-28' } };
  assert.equal(hasTramoSign(index, first.id), false);
  assert.equal(focus(seenEra), '');
  assert.equal(nextStep(seenEra, index).id, first.id);
  for (const m of index.visibleMovements) {
    const head = index.stageArtists(m.id)[0];
    if (head) assert.equal(hasTramoSign(index, head.id), false, `${m.id}: su primer pintor no abre tramo`);
  }
});

test('un tramo posterior sí tiene su cartel antes de su primer pintor', () => {
  const genios = index.path.find((a) => a.section === 'Los tres genios');
  assert.equal(hasTramoSign(index, genios.id), true);
  const before = index.path.slice(0, index.path.indexOf(genios)).map((a) => a.id);
  const p = { ...master(fresh(), before), intros: { [first.movementId]: '2026-11-28' } };
  assert.equal(focus(p), 'tramo:Los tres genios');
  assert.equal(focus({ ...p, signs: { 'Los tres genios': '2026-11-28' } }), '');
});

test('al tocar un pintor, el aviso dice qué va antes: la época y, si no, el tramo que quede; luego nada', () => {
  const m = index.movement(first.movementId);
  assert.match(loreBefore(fresh(), index, first.id), new RegExp(m.name.split(' ')[0]));
  assert.equal(loreBefore({ ...fresh(), intros: { [first.movementId]: 'x' } }, index, first.id), '');
  const genios = index.path.find((a) => a.section === 'Los tres genios');
  assert.equal(loreBefore({ ...fresh(), intros: { [genios.movementId]: 'x' } }, index, genios.id), 'Los tres genios');
});

// El mapa solo pide a la ventana los colores de acento (ui/dom.js); en el motor de pruebas no hay.
globalThis.getComputedStyle ??= () => ({ getPropertyValue: () => '#888888' });
globalThis.document ??= { documentElement: {} };
const mapOf = (progress) => renderPathMap({ index, store: { get: () => ({ progress }) } });
const count = (html, re) => (html.match(re) || []).length;

test('mapa: sin «Tú»; una sola parada actual y, delante, una sola próxima parada didáctica', () => {
  const html = mapOf(fresh());
  assert.ok(!html.includes('stage-you'));
  assert.equal(count(html, /stage-spot is-(left|right) is-current/g), 1);
  assert.equal(count(html, /lore-spot is-(left|right) is-here/g), 1);
  assert.ok(html.includes(`lore-spot is-right is-here" data-lore="era:${first.movementId}"`) || html.includes(`is-left is-here" data-lore="era:${first.movementId}"`));
  const seen = mapOf({ ...fresh(), intros: { [first.movementId]: 'x' } });
  assert.equal(count(seen, /is-here/g), 0, 'sin rombo tras la puerta, no queda nada didáctico delante del primer pintor');
  assert.ok(!/data-lore="tramo:Nace el Renacimiento"/.test(seen), 'queda el rombo del primer tramo');
});

test('burbuja: «Abrir» en el medallón, «Empezar» en el pintor nuevo y «Repasar»/«Profundizar» atrás, con la frontera marcada', () => {
  const frontier = { lore: `era:${first.movementId}`, step: `artist:${first.id}` };
  const stop = { kind: 'stop', artistId: first.id, to: `etapa-${first.id}` };
  assert.deepEqual(cueFor(stop, frontier), { host: `.lore-spot[data-lore="era:${first.movementId}"] .lore-dot`, verb: CUE_VERB.era, back: false });
  assert.equal(cueFor(stop, { ...frontier, lore: 'tramo:Los tres genios' }).verb, CUE_VERB.tramo);
  const plain = cueFor(stop, { lore: '', step: frontier.step });
  assert.deepEqual([plain.verb, plain.back], [CUE_VERB.start, false]);
  assert.equal(cueFor(stop, { lore: '', step: frontier.step }, true).verb, CUE_VERB.resume);
  const old = cueFor({ kind: 'recall', artistId: 'giotto', to: 'repasar-giotto' }, frontier);
  assert.deepEqual([old.verb, old.back], [CUE_VERB.review, true]);
  assert.equal(cueFor({ kind: 'deepen', artistId: 'giotto', to: 'a-fondo-giotto-2' }, frontier).verb, CUE_VERB.deepen);
  assert.equal(cueFor({ kind: 'debt', movementId: 'renacimiento', to: 'repaso-renacimiento' }, frontier).host, '.stage[data-action="review"][data-id="renacimiento"] .stage-dot');
  assert.equal(cueFor({ kind: 'closure', to: 'cierre-renacimiento' }, frontier), null);
  assert.equal(cueFor(null, frontier), null);
});

test('css: la burbuja es lo único que se anima en los nodos; atrás, la frontera lleva un anillo fino', () => {
  const css = readFileSync(join(here, '..', 'app', 'css', 'mapa-carteles.css'), 'utf8');
  const main = readFileSync(join(here, '..', 'app', 'css', 'main.css'), 'utf8');
  assert.match(css, /\.map-cue \{[^}]*animation: cue-pulse/);
  assert.match(css, /\.path-map\.is-rec-back \.stage-spot\.is-current \.stage \.stage-dot/);
  assert.ok(!/@keyframes (halo|lore-breathe|ring-breathe|you-bob)/.test(css + main), 'quedan animaciones de nodo');
  assert.ok(!/is-after-lore/.test(css), 'queda el ajuste del pintor tras el medallón');
});

test('tocar un pintor sin ver su época: tarjeta con aviso, no un salto; el globo de candado no lleva cruz', () => {
  const actions = readFileSync(join(here, '..', 'app', 'js', 'ui', 'screens', 'path-actions.js'), 'utf8');
  assert.match(actions, /loreFirstCard\(ctx, b\) \|\| guarded\('etapa'\)/);
  const card = readFileSync(join(here, '..', 'app', 'js', 'ui', 'lore-first-card.js'), 'utf8');
  assert.match(card, /Empezar <small>· antes, \$\{esc\(before\)\}<\/small>/);
  assert.ok(!actions.includes('lock-note-close'), 'el globo de candado ya no lleva cruz');
});
