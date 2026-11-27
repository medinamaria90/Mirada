// El título del cuadro no se ve antes de responder (delataría autor, época o movimiento):
// ni en el DOM visible ni en ningún aria-label. Se escribe en su hueco reservado tras responder.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildIndex } from '../app/js/engine/catalog.js';
import { questionHtml } from '../app/js/test/pantallas.js';
import { viewOf } from '../app/js/test/preguntas.js';
import { titleSlotHtml, revealTitle } from '../app/js/ui/title-slot.js';

const TITLE = 'Madonna con el Niño';
const catalog = {
  version: 2,
  movements: [{ id: 'renacimiento', name: 'Renacimiento', period: 's. XV', order: 1, era: 'renaissance', blurb: '', accent: '#666666' }],
  artists: [
    { id: 'a', name: 'Pintor A', short: 'A', movementId: 'renacimiento', order: 1, hint: '', traits: [], similarTo: [] },
    { id: 'b', name: 'Pintor B', short: 'B', movementId: 'renacimiento', order: 2, hint: '', traits: [], similarTo: [] },
  ],
  artworks: [{ id: 'w1', artistId: 'a', title: TITLE, year: '1450', yearSort: 1450, img: 'img/w1.jpg', w: 100, h: 100, role: 'learn', fame: 1, confidence: 'high' }],
};
const index = buildIndex(catalog);

for (const kind of ['who', 'movement']) {
  test(`«${kind}»: antes de responder el título no está en el HTML ni en un aria-label`, () => {
    const q = { id: 'q', tier: 'a', kind, artwork: 'w1', answer: kind === 'who' ? 'a' : 'renacimiento', options: kind === 'who' ? ['a', 'b'] : ['renacimiento'], hint: 'Pista' };
    const view = viewOf(index, q);
    const html = questionHtml(view, 1);
    assert.equal(html.includes(TITLE), false);
    assert.match(html, /data-title-slot/);
    assert.doesNotMatch(html, /aria-label="[^"]*Madonna/);
  });
}

test('el hueco va vacío y oculto a lectores de pantalla hasta responder', () => {
  assert.match(titleSlotHtml(), /aria-hidden="true"><\/p>/);
});

test('revealTitle rellena el hueco y lo hace accesible', () => {
  const attrs = new Map([['aria-hidden', 'true']]);
  const classes = new Set();
  const slot = { textContent: '', removeAttribute: (n) => attrs.delete(n), classList: { add: (c) => classes.add(c) } };
  const root = { querySelector: (s) => (s === '[data-title-slot]' ? slot : null) };
  globalThis.requestAnimationFrame = (f) => f();
  revealTitle(root, TITLE);
  assert.equal(slot.textContent, TITLE);
  assert.equal(attrs.has('aria-hidden'), false);
  assert.ok(classes.has('is-on'));
  delete globalThis.requestAnimationFrame;
});
