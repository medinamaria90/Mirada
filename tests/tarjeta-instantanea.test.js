// La tarjeta del pintor en el mapa se ve al instante (docs/eval/rendimiento.md): cada historia se pide una sola vez aunque
// la pidan dos a la vez, lo ya llegado se lee sin esperar (peekStory) y el mapa precarga la de la parada actual y las de
// los pintores con niveles que se van a ver. Sin navegador: fetch, IntersectionObserver y DOM mínimos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as later } from 'node:timers';
import { setTimeout as sleep } from 'node:timers/promises';

// La suite corre en un solo proceso (tests/run-all.js): se devuelven los globales tal como estaban.
const GLOBALS = ['fetch', 'window', 'IntersectionObserver'];
const isolated = (fn) => async () => {
  const saved = Object.fromEntries(GLOBALS.map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
  try {
    await fn();
  } finally {
    for (const k of GLOBALS) {
      if (saved[k]) Object.defineProperty(globalThis, k, saved[k]);
      else delete globalThis[k];
    }
  }
};

// Espera a que algo ocurra (sondeo corto con tope), en vez de un tiempo fijo que falla si la máquina va lenta.
async function until(cond, msg, limit = 3000) {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > limit) assert.fail(msg);
    await sleep(5);
  }
}
// Margen tras lo esperado para comprobar que algo NO ocurre (los tiempos del precargador son de 0 ms).
const settle = () => sleep(80);

const STORY = { artistId: 'botticelli', levels: [{ level: 1, cards: [{ artwork: 'w1', text: 'Hola' }] }] };

function fakeFetch(index) {
  const calls = [];
  globalThis.fetch = async (url) => {
    const name = String(url).split('/').pop();
    calls.push(name);
    await sleep(5);
    if (name === 'index.json') return { ok: true, json: async () => index };
    if (name === 'botticelli.json') return { ok: true, json: async () => STORY };
    return { ok: false, status: 404 };
  };
  return calls;
}

test('historias: una sola petición aunque se pidan a la vez; peekStory sin esperar', isolated(async () => {
  const calls = fakeFetch({ botticelli: [1] });
  const { loadStory, peekStory } = await import(`../app/js/ui/story-data.js?t=${Date.now()}`);
  assert.equal(peekStory('botticelli'), undefined, 'antes de llegar no se sabe');
  const [a, b] = await Promise.all([loadStory('botticelli'), loadStory('botticelli')]);
  assert.deepEqual(a, STORY);
  assert.equal(a, b);
  assert.equal(calls.filter((c) => c === 'botticelli.json').length, 1, 'la historia se pide dos veces');
  assert.equal(peekStory('botticelli'), STORY, 'lo ya llegado no se lee al instante');
  await loadStory('botticelli');
  assert.equal(calls.filter((c) => c === 'botticelli.json').length, 1, 'se vuelve a pedir lo ya llegado');
  assert.equal(await loadStory('giotto'), null);
  assert.equal(peekStory('giotto'), null, 'un pintor sin historia se recuerda como «sin historia»');
}));

test('historias: si el índice no llega, no se da a nadie por «sin historia»', isolated(async () => {
  globalThis.fetch = async () => { throw new Error('sin red'); };
  const { loadStory, peekStory } = await import(`../app/js/ui/story-data.js?t=${Date.now()}-offline`);
  const info = console.info;
  console.info = () => {};
  try {
    assert.equal(await loadStory('botticelli'), null);
  } finally {
    console.info = info;
  }
  assert.equal(peekStory('botticelli'), undefined);
}));

// Mapa mínimo: la parada actual y dos pintores con niveles (uno a la vista y otro lejos).
function fakeMap() {
  const node = (id, card) => ({ dataset: card ? { id, card: '1' } : { id } });
  const current = node('masaccio', false);
  const near = node('botticelli', true);
  const far = node('goya', true);
  return {
    nodes: { current, near, far },
    querySelector: (sel) => (sel.includes('is-current') ? current : null),
    querySelectorAll: (sel) => (sel.includes('data-card') ? [near, far] : []),
  };
}

test('mapa: precarga la historia de la parada actual y de los pintores con niveles al acercarse', isolated(async () => {
  const calls = fakeFetch({ botticelli: [1], masaccio: [1], goya: [1] });
  const observed = [];
  let fire = null;
  globalThis.window = { requestIdleCallback: (fn) => later(fn, 0) };
  globalThis.IntersectionObserver = class {
    constructor(cb) { fire = (els) => cb(els.map((target) => ({ target, isIntersecting: true }))); }
    observe(el) { observed.push(el); }
    unobserve() {}
    disconnect() { observed.length = 0; }
  };
  const { watchStoryPrefetch } = await import('../app/js/ui/story-prefetch.js');
  const map = fakeMap();
  const watch = watchStoryPrefetch(map);
  assert.deepEqual(observed.map((n) => n.dataset.id), ['botticelli', 'goya'], 'no vigila a los pintores con niveles');
  await until(() => calls.includes('masaccio.json'), 'no precarga la parada actual');
  await settle();
  assert.ok(!calls.includes('botticelli.json'), 'precarga lo que aún no se ve');
  fire([map.nodes.near]);
  await until(() => calls.includes('botticelli.json'), 'no precarga el pintor que se acerca');
  await settle();
  assert.ok(!calls.includes('goya.json'));
  watch.stop();
  fire([map.nodes.far]);
  await settle();
  assert.ok(!calls.includes('goya.json'), 'sigue precargando tras salir del mapa');
}));
