// Contador de visitas (app/js/stats.js) sin navegador: sin código no carga nada, respeta «no
// rastrear», calcula vuelve/dia-n con estados de ejemplo y envía como mucho una vez al día.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { canCount, activityDays, returnEvent, streakBucket, createStats, STATS_KEY, SCRIPT_URL } from '../app/js/stats.js';
import { GOATCOUNTER_CODE } from '../app/js/stats-config.js';

// Entorno falso: documento que apunta los scripts añadidos y goatcounter que apunta los eventos.
function fakeEnv({ code = 'mirada', dnt, gpc, hostname = 'mirada.onrender.com', day = '2026-11-24', saved } = {}) {
  const scripts = [];
  const counted = [];
  const store = new Map(saved ? [[STATS_KEY, JSON.stringify(saved)]] : []);
  const win = {
    navigator: { doNotTrack: dnt, globalPrivacyControl: gpc },
    location: { hostname },
    document: {
      head: { appendChild: (s) => { scripts.push(s); } },
      createElement: () => {
        const attrs = {};
        const handlers = {};
        return { attrs, handlers, setAttribute: (k, v) => { attrs[k] = v; }, addEventListener: (ev, fn) => { handlers[ev] = fn; } };
      },
    },
  };
  const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => { store.set(k, v); } };
  const stats = createStats({ code, win, storage, today: () => day });
  // Simula la carga del script oficial.
  const arrive = () => {
    win.goatcounter = { count: (o) => counted.push(o) };
    scripts[0].handlers.load();
  };
  return { stats, scripts, counted, arrive, win, store, saved: () => JSON.parse(store.get(STATS_KEY) || 'null') };
}

const state = (days = {}, streakDays = []) => ({ progress: { xpByDay: days, streak: { days: streakDays } } });

test('el código por defecto está vacío', () => {
  assert.equal(GOATCOUNTER_CODE, '');
  const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'app', 'js', 'stats-config.js'), 'utf8');
  assert.match(src, /GOATCOUNTER_CODE = ''/);
});

test('sin código no se carga nada, no se cuenta y no se escribe nada', () => {
  const env = fakeEnv({ code: '' });
  assert.equal(env.stats.enabled, false);
  env.stats.load();
  assert.equal(env.stats.countEvent('test/empieza'), false);
  assert.equal(env.stats.countReturn(state()), false);
  assert.equal(env.scripts.length, 0);
  assert.equal(env.store.size, 0);
});

test('con código se carga el script oficial, async, con su endpoint', () => {
  const env = fakeEnv({ code: 'mirada' });
  env.stats.load();
  env.stats.load();
  assert.equal(env.scripts.length, 1);
  assert.equal(env.scripts[0].src, SCRIPT_URL);
  assert.equal(SCRIPT_URL, 'https://gc.zgo.at/count.js');
  assert.equal(env.scripts[0].async, true);
  assert.equal(env.scripts[0].attrs['data-goatcounter'], 'https://mirada.goatcounter.com/count');
});

test('los eventos se encolan hasta que llega el script y luego se envían como evento', () => {
  const env = fakeEnv();
  env.stats.load();
  env.stats.countEvent('test/empieza');
  assert.deepEqual(env.counted, []);
  env.arrive();
  assert.deepEqual(env.counted, [{ path: 'test/empieza', event: true }]);
  env.stats.countEvent('test/termina');
  assert.deepEqual(env.counted.at(-1), { path: 'test/termina', event: true });
});

test('«no rastrear», control global de privacidad y localhost: no se cuenta ni se carga', () => {
  for (const opts of [{ dnt: '1' }, { gpc: true }, { hostname: 'localhost' }, { hostname: '127.0.0.1' }, { hostname: '[::1]' }]) {
    const env = fakeEnv(opts);
    assert.equal(env.stats.enabled, false, JSON.stringify(opts));
    env.stats.load();
    assert.equal(env.stats.countEvent('x/y'), false);
    assert.equal(env.scripts.length, 0);
  }
  assert.equal(canCount({ code: 'mirada', doNotTrack: '0', hostname: 'mirada.onrender.com' }), true);
  assert.equal(canCount({ code: 'no válido!', hostname: 'a.com' }), false);
});

test('vuelve/dia-n según los días distintos con actividad', () => {
  const today = '2026-11-24';
  assert.equal(returnEvent(activityDays(state(), null, today).length), 'vuelve/dia-1');
  assert.equal(returnEvent(activityDays(state({ '2026-11-23': 40 }), null, today).length), 'vuelve/dia-2');
  assert.equal(returnEvent(activityDays(state({ '2026-11-22': 10, '2026-11-24': 5 }), { days: ['2026-11-23'] }, today).length), 'vuelve/dia-3');
  assert.equal(returnEvent(5), 'vuelve/dia-4-a-6');
  const seis = ['2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22'];
  assert.equal(returnEvent(activityDays(state({}, seis), null, today).length), 'vuelve/dia-7-o-mas');
  // Sin duplicados, sin días de XP en 0, sin fechas futuras ni basura.
  const d = activityDays(state({ '2026-11-23': 0, '2026-11-25': 9, malo: 4 }, ['2026-11-24', 'x']), { days: ['2026-11-24'] }, today);
  assert.deepEqual(d, ['2026-11-24']);
  assert.deepEqual(activityDays(null, undefined, today), [today]);
});

test('countReturn: guarda el día y envía como mucho un vuelve/dia-n por día', () => {
  const env = fakeEnv({ day: '2026-11-24', saved: { days: ['2026-11-22', '2026-11-23'], sent: { vuelve: '2026-11-23' } } });
  env.stats.load();
  env.arrive();
  assert.equal(env.stats.countReturn(state()), true);
  assert.deepEqual(env.counted, [{ path: 'vuelve/dia-3', event: true }]);
  assert.equal(env.stats.countReturn(state()), false);
  assert.equal(env.counted.length, 1);
  assert.deepEqual(env.saved().days, ['2026-11-22', '2026-11-23', '2026-11-24']);
  assert.equal(env.saved().sent.vuelve, '2026-11-24');
});

test('countDaily: una vez por día y clave, y vuelve a enviar al día siguiente', () => {
  const env = fakeEnv({ day: '2026-11-24' });
  env.stats.load();
  env.arrive();
  assert.equal(env.stats.countDaily('racha', 'racha/1'), true);
  assert.equal(env.stats.countDaily('racha', 'racha/2-3'), false);
  assert.equal(env.counted.length, 1);
  const next = fakeEnv({ day: '2026-11-25', saved: env.saved() });
  next.stats.load();
  next.arrive();
  assert.equal(next.stats.countDaily('racha', 'racha/2-3'), true);
});

test('racha agrupada en 1, 2-3, 4-7 y 8+', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 7, 8, 40].map(streakBucket), ['1', '1', '2-3', '2-3', '4-7', '4-7', '8+', '8+']);
});

test('watchStore: ronda/termina al subir el contador de rondas y racha una vez al día', () => {
  const env = fakeEnv({ day: '2026-11-24' });
  env.stats.load();
  env.arrive();
  let s = { progress: { stats: { rounds: 4 }, streak: { last: null, current: 0 } } };
  const listeners = new Set();
  const store = { get: () => s, subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn); } };
  const set = (next) => { s = next; for (const fn of listeners) fn(s); };
  env.stats.watchStore(store);
  set({ ...s, settings: { music: true } });
  assert.deepEqual(env.counted, []);
  set({ progress: { stats: { rounds: 5 }, streak: { last: '2026-11-24', current: 3 } } });
  assert.deepEqual(env.counted.map((e) => e.path), ['ronda/termina', 'racha/2-3']);
  set({ progress: { stats: { rounds: 6 }, streak: { last: '2026-11-24', current: 3 } } });
  assert.deepEqual(env.counted.map((e) => e.path), ['ronda/termina', 'racha/2-3', 'ronda/termina']);
});

test('no se envía nada que identifique: solo nombres de evento fijos', () => {
  const env = fakeEnv({ day: '2026-11-24' });
  env.stats.load();
  env.arrive();
  env.stats.countReturn(state({ '2026-11-23': 50 }));
  for (const e of env.counted) assert.match(e.path, /^[a-z0-9/-]+$/);
  assert.deepEqual(Object.keys(env.counted[0]).sort(), ['event', 'path']);
});
