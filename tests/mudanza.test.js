// Mudanza de dirección: el progreso viaja en «#mudanza=…» y la casa nueva lo valida, lo migra y se queda con el más avanzado.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  OLD_HOST, NEW_HOST, NEW_ORIGIN, MOVE_PREFIX, MAX_URL_CHARS, isMovableKey, hasProgress, cleanRoute, newHomeUrl,
  encodeMove, decodeMove, moveTarget, validatePayload, applyMove, receiveMove,
} from '../app/js/state/mudanza.js';
import { moveToNewHome, newHomeAnswers } from '../app/js/ui/move-redirect.js';
import { SCHEMA_VERSION } from '../app/js/state/schema.js';

const KEY = 'mirada.state';

// localStorage en memoria con length/key, como el del navegador.
function storage(init = {}) {
  const data = { ...init };
  return {
    get length() { return Object.keys(data).length; },
    key: (i) => Object.keys(data)[i] ?? null,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: (k) => { delete data[k]; },
    data,
  };
}

const state = (xp, artists = {}) => ({ version: SCHEMA_VERSION, onboarded: true, progress: { xp, artists }, settings: { name: 'Ana', theme: 'dark' } });
const saved = (s) => JSON.stringify(s);
const loc = (hash = '', pathname = '/', search = '') => ({ hostname: OLD_HOST, pathname, search, hash });
// Dirección con el progreso (o null si se fue sin él).
async function buildMoveUrl(st, key, opts, where = loc()) {
  const t = await moveTarget(st, key, where, opts);
  return t.carried ? t.url : null;
}

test('dominios con nombre y fragmento propio', () => {
  assert.equal(OLD_HOST, 'sfumato-arte.onrender.com');
  assert.equal(NEW_HOST, 'sfumato.dibulios.com');
  assert.equal(NEW_ORIGIN, 'https://sfumato.dibulios.com');
  for (const file of ['../app/js/main.js', '../app/js/test/main.js']) {
    const src = readFileSync(new URL(file, import.meta.url), 'utf8');
    assert.match(src, new RegExp(`const MOVE_HASH = '${MOVE_PREFIX}'`), `${file} mira el mismo fragmento`);
    assert.match(src, new RegExp(`const OLD_HOSTNAME = '${OLD_HOST.replace(/\./g, '\\.')}'`), `${file}: misma dirección antigua`);
    assert.match(src, /receiveMove[\s\S]*history\.replaceState/, `${file} limpia el fragmento después`);
  }
});

test('claves sueltas: sfumato.* y el test de cultura; nada más', () => {
  for (const k of ['sfumato.coach', 'sfumato.clock', 'sfumato.su', 'sfumato.dj', 'sfumato.stories', 'mirada.test.last', 'mirada.test.recent']) {
    assert.ok(isMovableKey(k), k);
  }
  for (const k of ['sfumato.recarga', 'sfumato.', 'mirada.state', 'mirada.stats', 'mirada.toast', 'otra', 42]) assert.ok(!isMovableKey(k), String(k));
});

for (const compress of [true, false]) {
  test(`ida y vuelta del estado y las claves (${compress ? 'comprimido' : 'sin comprimir'})`, async () => {
    const from = storage({
      [KEY]: saved(state(320, { velazquez: { plays: 2 } })),
      'sfumato.coach': '1', 'sfumato.su': 'on', 'sfumato.stories': '["goya:1"]', 'mirada.test.last': '{"correct":7}',
      'mirada.stats': '{"days":[]}', 'sfumato.recarga': 'x',
    });
    const url = await buildMoveUrl(from, KEY, { compress });
    assert.ok(url.startsWith(`${NEW_ORIGIN}/${MOVE_PREFIX}${compress ? 'z.' : 'j.'}`));
    assert.ok(!url.includes('?'), 'nada en la query: el fragmento no llega al servidor');
    const hash = url.slice(NEW_ORIGIN.length + 1);
    assert.match(hash.slice(MOVE_PREFIX.length), /^[zj]\.[A-Za-z0-9_-]+$/);
    const got = await decodeMove(hash);
    assert.equal(got.state.version, SCHEMA_VERSION, 'llega migrado');
    assert.equal(got.state.progress.xp, 320);
    assert.equal(got.state.settings.name, 'Ana');
    assert.deepEqual(Object.keys(got.keys).sort(), ['mirada.test.last', 'sfumato.coach', 'sfumato.stories', 'sfumato.su']);

    const to = storage();
    assert.equal((await receiveMove(to, KEY, hash)).result, 'traido');
    assert.equal(JSON.parse(to.data[KEY]).progress.xp, 320);
    assert.equal(to.data['sfumato.su'], 'on');
    assert.equal(to.data['mirada.stats'], undefined);
  });
}

test('sin progreso no hay nada que llevar', async () => {
  assert.equal(await buildMoveUrl(storage(), KEY), null);
  assert.equal(await buildMoveUrl(storage({ [KEY]: saved({ version: 4, onboarded: true, progress: { xp: 0 } }) }), KEY), null);
  assert.ok(!hasProgress(null));
  assert.ok(hasProgress(state(0, { goya: {} })));
});

test('cabe en una dirección de Chrome para Android aunque se haya jugado con todo el catálogo', async () => {
  const srs = {}; const collection = {}; const seen = {}; const artists = {}; const xpByDay = {};
  for (let i = 1; i <= 1400; i += 1) {
    srs[`art:w${i}`] = { box: (i % 5) + 1, due: '2026-12-01' };
    collection[`w${i}`] = '2026-11-20';
  }
  for (let i = 0; i < 160; i += 1) { artists[`pintor-${i}`] = { plays: 9, best: 1, mastered: true, last: '2026-11-20', works: ['w1', 'w2', 'w3'] }; seen[`pintor-${i}`] = '2026-11-20'; }
  for (let d = 1; d <= 365; d += 1) xpByDay[`2026-${String((d % 12) + 1).padStart(2, '0')}-${String((d % 28) + 1).padStart(2, '0')}-${d}`] = 120;
  const big = { ...state(99999, artists), progress: { xp: 99999, artists, srs, collection, seen, xpByDay } };
  const from = storage({ [KEY]: saved(big), 'sfumato.stories': JSON.stringify(Array.from({ length: 500 }, (_, i) => `p${i}:1`)) });
  for (const compress of [true, false]) {
    const url = await buildMoveUrl(from, KEY, { compress });
    assert.ok(url, `sale la dirección (${compress})`);
    assert.ok(url.length < MAX_URL_CHARS / 4, `${url.length} caracteres, muy lejos de ${MAX_URL_CHARS}`);
    const got = await decodeMove(url.slice(NEW_ORIGIN.length + 1));
    assert.equal(Object.keys(got.state.progress.srs).length, 1400);
  }
  assert.equal(await encodeMove({ v: 1, s: { relleno: 'x'.repeat(MAX_URL_CHARS) }, k: {} }, { compress: false }), null, 'si no cabe, no se inventa');
});

test('fusión: sin progreso local entra; con progreso, gana el más avanzado y a igualdad el de aquí', () => {
  const incoming = validatePayload({ v: 1, s: state(500, { goya: {} }), k: { 'sfumato.coach': '1', 'sfumato.su': 'on' } });

  const fresh = storage({ [KEY]: saved({ version: 4, onboarded: true, progress: { xp: 0 } }) });
  assert.equal(applyMove(fresh, KEY, incoming), 'traido');
  assert.equal(JSON.parse(fresh.data[KEY]).progress.xp, 500);

  const behind = storage({ [KEY]: saved(state(100)), 'sfumato.su': 'off' });
  assert.equal(applyMove(behind, KEY, incoming), 'traido');
  assert.equal(behind.data['sfumato.su'], 'on', 'las claves siguen al estado que gana');

  const ahead = storage({ [KEY]: saved(state(900)), 'sfumato.su': 'off' });
  assert.equal(applyMove(ahead, KEY, incoming), 'conservado');
  assert.equal(JSON.parse(ahead.data[KEY]).progress.xp, 900);
  assert.equal(ahead.data['sfumato.su'], 'off', 'no pisa las de aquí');
  assert.equal(ahead.data['sfumato.coach'], '1', 'pero añade las que faltan');

  const tie = storage({ [KEY]: saved(state(500, { goya: {} })) });
  assert.equal(applyMove(tie, KEY, incoming), 'conservado');
  const tieMore = storage({ [KEY]: saved(state(500)) });
  assert.equal(applyMove(tieMore, KEY, incoming), 'traido', 'a igual XP, más pintores empezados');

  const empty = validatePayload({ v: 1, s: { version: 4, progress: { xp: 0 } }, k: {} });
  const mine = storage({ [KEY]: saved(state(50)) });
  assert.equal(applyMove(mine, KEY, empty), 'nada');
  assert.equal(JSON.parse(mine.data[KEY]).progress.xp, 50);
  assert.equal(applyMove(null, KEY, incoming), 'nada');
});

test('datos corruptos o manipulados: se rechazan sin tocar nada', async () => {
  const mine = storage({ [KEY]: saved(state(50)) });
  const before = { ...mine.data };
  const b64 = (obj) => Buffer.from(typeof obj === 'string' ? obj : JSON.stringify(obj)).toString('base64url');
  const bad = [
    '#inicio', MOVE_PREFIX, `${MOVE_PREFIX}z.%%%`, `${MOVE_PREFIX}j.!!`, `${MOVE_PREFIX}x.${b64(state(1))}`, `${MOVE_PREFIX}${b64(state(1))}`,
    `${MOVE_PREFIX}z.${b64('no es deflate')}`, `${MOVE_PREFIX}j.${b64('{roto')}`, `${MOVE_PREFIX}j.${b64([1, 2])}`,
    `${MOVE_PREFIX}j.${b64({ v: 2, s: state(9000), k: {} })}`, `${MOVE_PREFIX}j.${b64({ v: 1, s: 'texto', k: {} })}`,
    `${MOVE_PREFIX}j.${b64({ v: 1, k: {} })}`, `${MOVE_PREFIX}j.${Buffer.from([0xff, 0xfe, 0x7b]).toString('base64url')}`,
  ];
  for (const hash of bad) {
    assert.equal(await decodeMove(hash), null, hash);
    assert.equal((await receiveMove(mine, KEY, hash)).result, 'nada', hash);
  }
  assert.equal(await decodeMove(null), null);
  assert.deepEqual(mine.data, before);

  // Versión futura: migrate no la interpreta (estado por defecto, sin progreso) y no pisa lo de aquí.
  const future = await decodeMove(`${MOVE_PREFIX}j.${b64({ v: 1, s: { ...state(9000), version: SCHEMA_VERSION + 5 }, k: {} })}`);
  assert.equal(future.state.progress.xp, 0);
  assert.equal(applyMove(mine, KEY, future), 'nada');

  // Claves ajenas, valores que no son texto o enormes y nombres sucios: fuera.
  const got = validatePayload({ v: 1, s: { ...state(10), settings: { name: 'A\u0000‮b'.padEnd(80, 'x') } }, k: {
    'mirada.state': '{}', 'sfumato.su': 1, 'sfumato.dj': 'x'.repeat(70 * 1024), __proto__: 'x', 'sfumato.coach': '1',
  } });
  assert.deepEqual(Object.keys(got.keys), ['sfumato.coach']);
  assert.ok(got.state.settings.name.length <= 24 && !/\u0000|‮/.test(got.state.settings.name), 'el nombre se limpia al migrar');
});

test('fragmento original: viaja dentro del paquete y se recupera al llegar', async () => {
  const from = storage({ [KEY]: saved(state(40)) });
  const t = await moveTarget(from, KEY, loc('#pintor/goya', '/test/', '?a=1'));
  assert.ok(t.carried);
  assert.ok(t.url.startsWith(`${NEW_ORIGIN}/test/?a=1${MOVE_PREFIX}`), 'misma ruta y query; el paquete en el fragmento');
  const got = await receiveMove(storage(), KEY, t.url.slice(t.url.indexOf('#')));
  assert.deepEqual(got.route, '#pintor/goya');
  assert.equal(got.result, 'traido');
  assert.equal(cleanRoute(`${MOVE_PREFIX}z.abc`), '', 'nunca otro traslado dentro');
  assert.equal(cleanRoute('#importar=x'), '');
  assert.equal(cleanRoute('sin-almohadilla'), '');
  assert.equal(cleanRoute(`#${'x'.repeat(5000)}`), '');
  assert.equal(validatePayload({ v: 1, s: null, k: {}, h: 42 }).route, '');
});

test('sin nada guardado, o si no cabe, se va igual a la misma página sin paquete', async () => {
  assert.deepEqual(await moveTarget(storage(), KEY, loc('#coleccion', '/')), { url: `${NEW_ORIGIN}/#coleccion`, carried: false });
  assert.deepEqual(await moveTarget(null, KEY, loc()), { url: `${NEW_ORIGIN}/`, carried: false });
  // Solo el test de cultura (sin XP): también se lleva.
  const onlyTest = await moveTarget(storage({ 'mirada.test.last': '{"correct":5}' }), KEY, loc('', '/test/'));
  assert.ok(onlyTest.carried);
  const got = await decodeMove(onlyTest.url.slice(onlyTest.url.indexOf('#')));
  assert.equal(got.keys['mirada.test.last'], '{"correct":5}');
  // Demasiado grande: sin paquete, misma página.
  const huge = storage({ [KEY]: saved({ ...state(10), relleno: 'x'.repeat(MAX_URL_CHARS) }) });
  assert.deepEqual(await moveTarget(huge, KEY, loc('#perfil'), { compress: false }), { url: `${NEW_ORIGIN}/#perfil`, carried: false });
  assert.equal(newHomeUrl({ pathname: '/', hash: `${MOVE_PREFIX}j.x` }), `${NEW_ORIGIN}/`);
});

test('redirección: solo desde la antigua, solo si la nueva responde (no-cors), con replace', async () => {
  const ok = async () => ({});
  const fail = async () => { throw new TypeError('Failed to fetch'); };
  const fakeLoc = (hostname, hash = '#galeria') => { const l = { hostname, pathname: '/', search: '', hash, went: null }; l.replace = (u) => { l.went = u; }; return l; };
  const st = storage({ [KEY]: saved(state(70)) });

  const old = fakeLoc(OLD_HOST);
  const t = await moveToNewHome({ storage: st, stateKey: KEY, loc: old, fetchFn: ok });
  assert.ok(t.carried);
  assert.equal(old.went, t.url);
  assert.ok(old.went.startsWith(`${NEW_ORIGIN}/${MOVE_PREFIX}`));

  for (const hostname of [NEW_HOST, 'localhost', '127.0.0.1', 'mirada.onrender.com']) {
    const l = fakeLoc(hostname);
    assert.equal(await moveToNewHome({ storage: st, stateKey: KEY, loc: l, fetchFn: ok }), null, hostname);
    assert.equal(l.went, null, `sin bucle ni salto en ${hostname}`);
  }
  const down = fakeLoc(OLD_HOST);
  assert.equal(await moveToNewHome({ storage: st, stateKey: KEY, loc: down, fetchFn: fail }), null);
  assert.equal(down.went, null, 'si la nueva no responde, se queda');

  let asked = null;
  assert.equal(await newHomeAnswers(async (url, opts) => { asked = { url, opts }; return {}; }), true);
  assert.equal(asked.url, `${NEW_ORIGIN}/manifest.webmanifest`);
  assert.equal(asked.opts.mode, 'no-cors');
  assert.equal(await newHomeAnswers(fail), false);
  const slow = (url, { signal }) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('abort'))));
  assert.equal(await newHomeAnswers(slow, 20), false, 'si tarda, se queda');
});

test('manifest relativo y sin la dirección escrita', () => {
  const manifest = JSON.parse(readFileSync(new URL('../app/manifest.webmanifest', import.meta.url), 'utf8'));
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');
  assert.doesNotMatch(JSON.stringify(manifest), /https?:/);
});
