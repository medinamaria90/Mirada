// Modo prueba del superusuario: todo abierto sobre una copia; al volver, el estado es idéntico.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore, STORAGE_KEY } from '../app/js/state/store.js';
import { trialState } from '../app/js/engine/trial.js';
import { isStepUnlocked, stepStatus } from '../app/js/engine/progress.js';
import { memoryStorage } from './helpers.js';
import { realIndex } from './helpers-real.js';

const seeded = (storage) => {
  const store = createStore({ storage });
  store.update((s) => ({ ...s, onboarded: true, progress: { ...s.progress, xp: 120,
    streak: { ...s.progress.streak, current: 4, best: 6, last: '2026-11-25' }, medals: { 'streak-3': '2026-11-20' } } }));
  return store;
};

test('modo prueba: abre todo, no toca el almacenamiento y vuelve idéntico', async () => {
  const index = realIndex();
  const storage = memoryStorage();
  const store = seeded(storage);
  const before = structuredClone(store.get());
  const rawBefore = storage.getItem(STORAGE_KEY);
  const last = index.steps.at(-1);
  assert.equal(isStepUnlocked(before.progress, index, last), false, 'de partida, lo último está cerrado');

  store.enterTrial((st) => trialState(st, index));
  assert.equal(store.inTrial(), true);
  const p = store.get().progress;
  for (const step of index.steps) assert.notEqual(stepStatus(p, index, step), 'locked', `${step.type}:${step.id}`);
  // Jugar en la prueba (XP, racha) no llega al almacenamiento.
  store.update((s) => ({ ...s, progress: { ...s.progress, xp: 9999, streak: { ...s.progress.streak, current: 99 } } }));
  assert.equal(storage.getItem(STORAGE_KEY), rawBefore, 'nada se escribe mientras dura');

  store.exitTrial();
  assert.equal(store.inTrial(), false);
  assert.deepEqual(store.get(), before, 'el estado vuelve idéntico');
  assert.equal(storage.getItem(STORAGE_KEY), rawBefore);
  assert.deepEqual(createStore({ storage }).get(), before, 'y al recargar en plena prueba también habría vuelto');
});

test('modo prueba: entrar dos veces no pierde la copia y trialState no muta el original', async () => {
  const index = realIndex();
  const store = seeded(memoryStorage());
  const before = structuredClone(store.get());
  const copy = trialState(store.get(), index);
  assert.deepEqual(store.get(), before, 'el original no cambia');
  assert.notEqual(copy.progress.artists, store.get().progress.artists);
  store.enterTrial((st) => trialState(st, index));
  store.enterTrial((st) => trialState(st, index));
  store.exitTrial();
  assert.deepEqual(store.get(), before);
});
