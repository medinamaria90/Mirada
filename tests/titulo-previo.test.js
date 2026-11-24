// El título bajo el cuadro antes de responder: solo en «¿Quién?» y «¿Movimiento?», y solo si no delata.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildIndex } from '../app/js/engine/catalog.js';
import { titleGivesAway, revealedTitle, TITLE_GIVES_AWAY } from '../app/js/engine/title-reveal.js';
import { questionHtml } from '../app/js/test/pantallas.js';

const catalog = {
  version: 2,
  movements: [
    { id: 'impresionismo', name: 'Impresionismo', period: 's. XIX', order: 8, era: 'modern', blurb: '', accent: '#666666' },
    { id: 'barroco', name: 'Barroco', period: 's. XVII', order: 4, era: 'baroque', blurb: '', accent: '#666666' },
  ],
  artists: [
    { id: 'rembrandt', name: 'Rembrandt van Rijn', short: 'Rembrandt', movementId: 'barroco', order: 1, hint: '', traits: [], similarTo: [] },
    { id: 'velazquez', name: 'Diego Velázquez', short: 'Velázquez', movementId: 'barroco', order: 2, hint: '', traits: [], similarTo: [] },
    { id: 'monet', name: 'Claude Monet', short: 'Monet', movementId: 'impresionismo', order: 3, hint: '', traits: [], similarTo: [] },
  ],
  artworks: [
    ['w1', 'rembrandt', 'La ronda de noche'],
    ['w2', 'rembrandt', 'Autorretrato con gorro'],
    ['w3', 'velazquez', 'Retrato de Velázquez joven'],
    ['w4', 'velazquez', 'Las meninas'],
    ['w5', 'monet', 'Impresión, sol naciente'],
    ['w6', 'monet', 'Un jardín impresionista'],
    ['w7', 'monet', 'Mujer con sombrilla'],
    ['w8', 'monet', 'Los nenúfares de Monet'],
  ].map(([id, artistId, title]) => ({ id, artistId, title, year: '1900', yearSort: 1900, img: `img/${id}.jpg`, w: 100, h: 100, role: 'learn', fame: 1, confidence: 'high' })),
};
const index = buildIndex(catalog);
const work = (id) => index.artwork(id);

test('título neutro: no delata', () => {
  assert.equal(titleGivesAway(index, work('w1'), 'who'), false);
  assert.equal(titleGivesAway(index, work('w4'), 'movement'), false);
  assert.equal(titleGivesAway(index, work('w7'), 'movement'), false);
});

test('el nombre o el apellido del pintor delatan (sin tildes ni mayúsculas)', () => {
  assert.equal(titleGivesAway(index, work('w3'), 'who'), true);
  assert.equal(titleGivesAway(index, work('w8'), 'who'), true);
});

test('«Autorretrato» delata', () => {
  assert.equal(titleGivesAway(index, work('w2'), 'who'), true);
});

test('el movimiento o su palabra clave delatan solo en «¿Movimiento?»', () => {
  assert.equal(titleGivesAway(index, work('w5'), 'movement'), true, 'Impresión → Impresionismo');
  assert.equal(titleGivesAway(index, work('w5'), 'who'), false);
  assert.equal(titleGivesAway(index, work('w6'), 'movement'), true);
  assert.equal(titleGivesAway(index, work('w6'), 'who'), false);
});

test('«¿Cuál es de X?» nunca enseña el título', () => {
  assert.equal(titleGivesAway(index, work('w1'), 'which'), true);
  assert.equal(revealedTitle(index, work('w1'), 'which'), '');
});

test('la lista manual delata aunque la regla no lo vea', () => {
  TITLE_GIVES_AWAY.push('w4');
  try {
    assert.equal(titleGivesAway(index, work('w4'), 'who'), true);
  } finally {
    TITLE_GIVES_AWAY.pop();
  }
  assert.equal(titleGivesAway(index, work('w4'), 'who'), false);
});

test('el HTML de la pregunta lleva el título solo si no delata', () => {
  const view = (id, kind) => ({ kind, prompt: 'P', artwork: work(id), title: revealedTitle(index, work(id), kind), options: [{ id: 'a', label: 'A', detail: '' }] });
  assert.match(questionHtml(view('w1', 'who'), 1), /<p class="q-title">La ronda de noche<\/p>/);
  assert.doesNotMatch(questionHtml(view('w3', 'who'), 1), /q-title/);
  assert.doesNotMatch(questionHtml(view('w5', 'movement'), 1), /q-title/);
  const which = { kind: 'which', prompt: 'P', artwork: null, options: [{ id: 'w1', artwork: work('w1') }] };
  assert.doesNotMatch(questionHtml(which, 1), /La ronda de noche/);
});
