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

test('velo de firmas: cajas válidas, HTML con la miniatura y sin velo si no hay firma', async () => {
  const { signsOf, veilsHtml, touchesSign } = await import('../app/js/ui/signature-veil.js');
  const work = { id: 'w220859', signs: [[0.4, 0.18, 0.58, 0.245], [0.9, 0.1, 0.2, 0.3], 'x'] };
  assert.deepEqual(signsOf(work), [[0.4, 0.18, 0.58, 0.245]], 'ignora las cajas mal formadas');
  assert.deepEqual(signsOf({ id: 'w1' }), []);
  assert.deepEqual(signsOf(null), []);
  assert.equal(veilsHtml({ id: 'w1' }), '');
  const html = veilsHtml(work);
  assert.match(html, /class="cdd-veil"/);
  assert.match(html, /img\/t\/w220859\.jpg/);
  assert.ok(touchesSign(work, [0.5, 0.2, 0.7, 0.3]));
  assert.ok(!touchesSign(work, [0.0, 0.5, 0.2, 0.9]));
});

test('el HTML de una pregunta de autor lleva el velo de la firma del cuadro', () => {
  const w = { ...index.artwork('w1'), signs: [[0, 0.9, 0.2, 1]] };
  const view = { kind: 'who', prompt: 'P', artwork: w, options: [{ id: 'a', label: 'A', detail: '' }] };
  assert.match(questionHtml(view, 1), /cdd-veil/);
  assert.doesNotMatch(questionHtml({ ...view, artwork: index.artwork('w1') }, 1), /cdd-veil/);
});
