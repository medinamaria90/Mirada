import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrate, defaultState, SCHEMA_VERSION, mergeDefaults, MIGRATIONS } from '../app/js/state/schema.js';
import { createStore, safeStorage, STORAGE_KEY } from '../app/js/state/store.js';
import { memoryStorage } from './helpers.js';
import { DEFAULT_THEME } from '../app/js/state/schema.js';

test('migración: vacío o corrupto da el estado por defecto', () => {
  assert.deepEqual(migrate(null), defaultState());
  assert.deepEqual(migrate('texto'), defaultState());
  assert.deepEqual(migrate([1, 2]), defaultState());
});

test('migración: datos sin versión se conservan y se completan', () => {
  const legacy = { onboarded: true, progress: { xp: 40, artists: { leonardo: { plays: 1 } } }, settings: { music: false } };
  const out = migrate(legacy);
  assert.equal(out.version, SCHEMA_VERSION);
  assert.equal(out.onboarded, true);
  assert.equal(out.progress.xp, 40);
  assert.deepEqual(out.progress.artists, { leonardo: { plays: 1 } });
  assert.equal(out.settings.music, false);
  assert.equal(out.settings.sfx, true, 'se rellena lo que falta');
  assert.deepEqual(out.progress.streak, defaultState().progress.streak);
});

test('migración 5 → 6: cola de fallados, último día visto y días de gracia; conserva el resto', () => {
  assert.ok(SCHEMA_VERSION >= 6);
  const v5 = {
    version: 5, onboarded: true,
    progress: {
      xp: 800, artists: { velazquez: { plays: 2, best: 0.9, mastered: true, last: '2026-11-10' } },
      srs: { 'art:w1': { box: 3, due: '2026-11-30' } }, collection: { w1: '2026-11-10' },
      streak: { current: 6, best: 9, last: '2026-11-23', graceOn: '2026-11-19', days: ['2026-11-23'] },
    },
    settings: { music: true, sfx: false, volume: 0.5, reducedMotion: false, dailyGoal: 50, theme: 'dark' },
    session: {},
  };
  const out = migrate(v5, MIGRATIONS, 6);
  assert.equal(out.version, 6);
  assert.deepEqual(out.progress.fallados, []);
  assert.deepEqual(out.progress.seen, {});
  // El día que perdonó la gracia antigua (la víspera de graceOn) cuenta como gastado en su semana.
  assert.deepEqual(out.progress.streak.graceDays, ['2026-11-18']);
  assert.equal(out.progress.streak.current, 6);
  assert.equal(out.progress.streak.graceOn, '2026-11-19');
  assert.deepEqual(out.progress.artists, v5.progress.artists);
  assert.deepEqual(out.progress.srs, v5.progress.srs);
  assert.deepEqual(out.settings, { ...v5.settings, name: '', cover: '', avatar: '' });
  // Sin gracia antigua, la lista empieza vacía; datos sin progreso llegan con los valores por defecto.
  assert.deepEqual(migrate({ ...v5, progress: { ...v5.progress, streak: { current: 1, last: '2026-11-23', graceOn: null } } }, MIGRATIONS, 6).progress.streak.graceDays, []);
  assert.deepEqual(migrate({ version: 5, onboarded: true }, MIGRATIONS, 6).progress.fallados, []);
  assert.deepEqual(defaultState().progress.streak.graceDays, []);
});

test('migración 4 → 5: añade settings.theme «como el móvil» y conserva el resto', () => {
  const v4 = {
    version: 4, onboarded: true,
    progress: { xp: 510, artists: { velazquez: { plays: 3, best: 1, mastered: true } }, weekly: { '2026-W47': { done: true } }, detail: { '2026-11-23': { artworkId: 'w1', correct: true } } },
    settings: { music: false, sfx: true, volume: 0.3, reducedMotion: true, dailyGoal: 100 },
    session: { route: 'etapa-velazquez' },
  };
  const out = migrate(v4, MIGRATIONS, 5);
  assert.equal(out.version, 5);
  assert.equal(out.settings.theme, DEFAULT_THEME);
  assert.equal(out.settings.theme, 'system');
  assert.deepEqual(out.settings, { music: false, sfx: true, volume: 0.3, reducedMotion: true, dailyGoal: 100, theme: 'system', name: '', cover: '', avatar: '' });
  assert.equal(out.progress.xp, 510);
  assert.deepEqual(out.progress.artists, v4.progress.artists);
  assert.deepEqual(out.progress.weekly, v4.progress.weekly);
  assert.deepEqual(out.progress.detail, v4.progress.detail);
  assert.deepEqual(out.session, v4.session);
  assert.equal(defaultState().settings.theme, 'system');
  // Un tema ya guardado se respeta; uno con tipo raro vuelve al defecto.
  assert.equal(migrate({ ...v4, version: 5, settings: { ...v4.settings, theme: 'dark' } }, MIGRATIONS, 5).settings.theme, 'dark');
  assert.equal(migrate({ ...v4, version: 5, settings: { ...v4.settings, theme: 7 } }, MIGRATIONS, 5).settings.theme, 'system');
  // Desde muy atrás (sin versión) también llega con tema.
  assert.equal(migrate({ onboarded: true }).settings.theme, 'system');
});

test('migración encadenada con migraciones propias y tipos incorrectos', () => {
  const defaults = { version: 3, a: 0, b: 'x', nested: { c: true } };
  const migrations = {
    1: (d) => ({ ...d, a: d.oldA * 2 }),
    2: (d) => ({ ...d, b: String(d.a) }),
  };
  const out = migrate({ version: 1, oldA: 5, nested: { c: 'no' } }, migrations, 3, defaults);
  assert.equal(out.version, 3);
  assert.equal(out.a, 10);
  assert.equal(out.b, '10');
  assert.equal(out.nested.c, true, 'tipo incorrecto vuelve al defecto');
  assert.deepEqual(migrate({ version: 9 }, migrations, 3, defaults), defaults, 'versión futura no se interpreta');
  assert.deepEqual(migrate({ version: 0 }, migrations, 3, defaults), defaults, 'migración inexistente');
  assert.deepEqual(mergeDefaults({ x: null }, { x: '2026-01-01' }), { x: '2026-01-01' });
});

test('store: persiste, notifica, recarga y reinicia', () => {
  const storage = memoryStorage();
  const store = createStore({ storage });
  const seen = [];
  const off = store.subscribe((s) => seen.push(s.progress.xp));
  store.update((s) => ({ ...s, progress: { ...s.progress, xp: 30 } }));
  assert.deepEqual(seen, [30]);
  assert.ok(JSON.parse(storage.data[STORAGE_KEY]).progress.xp === 30);
  const reloaded = createStore({ storage });
  assert.equal(reloaded.get().progress.xp, 30);
  store.reset();
  assert.equal(store.get().progress.xp, 0);
  off();
  store.update((s) => ({ ...s, onboarded: true }));
  assert.equal(seen.length, 2);
});

test('store: sin almacenamiento o si lanza, funciona en memoria', () => {
  const throwing = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); }, removeItem() {} };
  assert.equal(safeStorage(() => throwing), null);
  assert.equal(safeStorage(() => { throw new Error('bloqueado'); }), null);
  const s1 = createStore({ storage: null });
  s1.update((s) => ({ ...s, onboarded: true }));
  assert.equal(s1.get().onboarded, true);
  const s2 = createStore({ storage: throwing });
  s2.update((s) => ({ ...s, onboarded: true }));
  assert.equal(s2.get().onboarded, true);
  const corrupt = memoryStorage({ [STORAGE_KEY]: '{no es json' });
  assert.deepEqual(createStore({ storage: corrupt }).get(), defaultState());
});
