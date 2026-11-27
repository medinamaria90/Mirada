// Cuenta con Google y progreso en la nube (app/js/cloud): acceso PKCE, renovación, sincronización con «gana el más
// avanzado» (lógica de state/mudanza.js), reinicio forzado, modo prueba y configuración vacía.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash, webcrypto } from 'node:crypto';
import { join } from 'node:path';
import { cloudReady, SUPABASE_URL, SUPABASE_ANON_KEY } from '../app/js/cloud/config.js';
import { challengeOf, makeVerifier } from '../app/js/cloud/pkce.js';
import { createAuth, SESSION_KEY, VERIFIER_KEY, toSession } from '../app/js/cloud/auth.js';
import { createRemote } from '../app/js/cloud/remote.js';
import { createSync, finishSignIn, STATUS } from '../app/js/cloud/sync.js';
import { isMovableKey } from '../app/js/state/mudanza.js';
import { createStore } from '../app/js/state/store.js';
import { SCHEMA_VERSION } from '../app/js/state/schema.js';

const URL_ = 'https://abc.supabase.co';
const KEY = 'mirada.state';

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
const state = (xp, artists = {}) => ({ version: SCHEMA_VERSION, onboarded: true, progress: { xp, artists }, settings: { theme: 'dark' } });
const pack = (st, k = {}) => ({ v: 1, s: st, k, h: '' });
const json = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });
const future = () => Math.floor(Date.now() / 1000) + 3600;
const session = (over = {}) => ({ access: 'A', refresh: 'R', expiresAt: future(), user: { id: 'u1', email: 'ana@example.com' }, ...over });

test('configuración: vacía en el repo hasta que haya proyecto, y solo direcciones de supabase.co', () => {
  assert.equal(typeof SUPABASE_URL, 'string');
  assert.equal(typeof SUPABASE_ANON_KEY, 'string');
  assert.equal(cloudReady('', ''), false);
  assert.equal(cloudReady('https://abc.supabase.co', ''), false);
  assert.equal(cloudReady('http://abc.supabase.co', 'k'), false);
  assert.equal(cloudReady('https://evil.com', 'k'), false);
  assert.equal(cloudReady('https://abc.supabase.co', 'k'), true);
});

test('ninguna clave de servicio en la app', () => {
  const walk = (dir) => readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
  for (const file of walk(new URL('../app/js', import.meta.url).pathname)) {
    const src = readFileSync(file, 'utf8');
    assert.doesNotMatch(src, /service_role|sb_secret_/, file);
  }
});

test('la sesión no viaja en la mudanza', () => {
  assert.equal(isMovableKey(SESSION_KEY), false);
  assert.equal(isMovableKey(VERIFIER_KEY), false);
});

test('PKCE: huella SHA-256 en base64url (RFC 7636)', async () => {
  const v = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
  assert.equal(await challengeOf(v, webcrypto), 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  const mine = makeVerifier(webcrypto);
  assert.match(mine, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(await challengeOf(mine, webcrypto), createHash('sha256').update(mine).digest('base64url'));
});

test('acceso: dirección de Google con PKCE y cambio del código por la sesión', async () => {
  const st = storage();
  const calls = [];
  const fetchFn = async (url, opts) => {
    calls.push({ url, opts });
    return json({ access_token: 'A', refresh_token: 'R', expires_in: 3600, user: { id: 'u1', email: 'ana@example.com' } });
  };
  const auth = createAuth({ url: URL_, key: 'anon', storage: st, fetchFn, cryptoApi: webcrypto });
  const link = new URL(await auth.signInUrl('https://sfumato.dibulios.com/'));
  assert.equal(link.origin + link.pathname, `${URL_}/auth/v1/authorize`);
  assert.equal(link.searchParams.get('provider'), 'google');
  assert.equal(link.searchParams.get('redirect_to'), 'https://sfumato.dibulios.com/');
  assert.equal(link.searchParams.get('code_challenge_method'), 's256');
  const verifier = st.getItem(VERIFIER_KEY);
  assert.equal(link.searchParams.get('code_challenge'), await challengeOf(verifier, webcrypto));

  const s = await auth.exchangeCode('c0de');
  assert.equal(calls[0].url, `${URL_}/auth/v1/token?grant_type=pkce`);
  assert.deepEqual(JSON.parse(calls[0].opts.body), { auth_code: 'c0de', code_verifier: verifier });
  assert.equal(calls[0].opts.headers.apikey, 'anon');
  assert.equal(s.user.email, 'ana@example.com');
  assert.equal(st.getItem(VERIFIER_KEY), null, 'el secreto es de un solo uso');
  assert.equal(auth.hasSession(), true);
  assert.equal(auth.email(), 'ana@example.com');
  await assert.rejects(auth.exchangeCode('otra'), 'sin secreto no hay sesión');
});

test('acceso: renueva antes de caducar y olvida la sesión si el servidor la rechaza', async () => {
  const st = storage({ [SESSION_KEY]: JSON.stringify(session({ expiresAt: 10 })) });
  let answer = json({ access_token: 'A2', refresh_token: 'R2', expires_in: 3600, user: { id: 'u1' } });
  const auth = createAuth({ url: URL_, key: 'anon', storage: st, fetchFn: async (url, o) => { assert.match(url, /grant_type=refresh_token/); assert.equal(JSON.parse(o.body).refresh_token, 'R'); return answer; } });
  assert.equal((await auth.session()).access, 'A2');
  st.setItem(SESSION_KEY, JSON.stringify(session({ expiresAt: 10 })));
  answer = json({ error: 'invalid' }, 400);
  assert.equal(await auth.session(), null);
  assert.equal(st.getItem(SESSION_KEY), null);
  // Sin red: no se olvida (se reintentará).
  st.setItem(SESSION_KEY, JSON.stringify(session({ expiresAt: 10 })));
  const offline = createAuth({ url: URL_, key: 'anon', storage: st, fetchFn: async () => { throw new Error('red'); } });
  assert.equal(await offline.session(), null);
  assert.notEqual(st.getItem(SESSION_KEY), null);
  assert.equal(toSession({ access_token: 'x' }), null);
});

test('cerrar sesión: se olvida aquí aunque no haya red', async () => {
  const st = storage({ [SESSION_KEY]: JSON.stringify(session()) });
  const auth = createAuth({ url: URL_, key: 'anon', storage: st, fetchFn: async () => { throw new Error('red'); } });
  await auth.signOut();
  assert.equal(auth.hasSession(), false);
});

test('nube: lee la fila propia y guarda con save_progress', async () => {
  const calls = [];
  const remote = createRemote({ url: URL_, key: 'anon', fetchFn: async (url, opts = {}) => { calls.push({ url, opts }); return json(url.includes('rpc') ? true : [{ state: pack(state(5)) }]); } });
  assert.deepEqual(await remote.load(session()), pack(state(5)));
  assert.equal(calls[0].url, `${URL_}/rest/v1/progress?select=state&user_id=eq.u1`);
  assert.equal(calls[0].opts.headers.Authorization, 'Bearer A');
  assert.equal(await remote.save(session(), pack(state(9)), { force: true, keepalive: true }), true);
  assert.equal(calls[1].url, `${URL_}/rest/v1/rpc/save_progress`);
  assert.deepEqual(JSON.parse(calls[1].opts.body), { p_state: pack(state(9)), p_force: true });
  assert.equal(calls[1].opts.keepalive, true);
  const big = pack(state(1, Object.fromEntries(Array.from({ length: 4000 }, (_, i) => [`p${i}`, { plays: 1 }]))));
  await remote.save(session(), big, { keepalive: true });
  assert.equal(calls[2].opts.keepalive, false, 'más de 60 KB no cabe en keepalive');
});

// Nube en memoria con la regla de save_progress (no pisa algo con más XP salvo force).
function fakeCloud(initial = null) {
  const cloud = { row: initial, saves: [] };
  cloud.remote = {
    load: async () => cloud.row,
    save: async (s, payload, opts) => {
      cloud.saves.push({ payload, opts });
      const xp = (p) => Number(p?.s?.progress?.xp) || 0;
      if (cloud.row && !opts.force && xp(cloud.row) > xp(payload)) return false;
      cloud.row = structuredClone(payload);
      return true;
    },
  };
  return cloud;
}
const signedAuth = () => ({ session: async () => session(), hasSession: () => true });
const manualTimers = () => { const t = { fns: [], setTimeout: (fn) => { t.fns.push(fn); return t.fns.length; }, clearTimeout: () => { t.fns = []; } }; return t; };

function setup(localState, cloudRow, extra = {}) {
  const st = storage(localState ? { [KEY]: JSON.stringify(localState), 'sfumato.coach': '1' } : {});
  const store = createStore({ storage: st });
  const cloud = fakeCloud(cloudRow);
  const timers = manualTimers();
  let refreshed = 0;
  const sync = createSync({ store, storage: st, stateKey: KEY, auth: signedAuth(), remote: cloud.remote, onRemote: () => { refreshed += 1; }, timers, ...extra });
  return { st, store, cloud, timers, sync, refreshed: () => refreshed };
}

test('sincronización: la nube va por delante → entra aquí (sin perder la ronda en curso) y se repinta', async () => {
  const local = { ...state(10), session: { route: 'paso/goya' } };
  const { store, sync, cloud, refreshed, st } = setup(local, pack(state(300, { goya: { plays: 3 } }), { 'sfumato.su': 'on' }));
  assert.equal(await sync.start(), true);
  assert.equal(store.get().progress.xp, 300);
  assert.deepEqual(store.get().session, { route: 'paso/goya' });
  assert.equal(st.getItem('sfumato.su'), 'on');
  assert.equal(JSON.parse(st.getItem(KEY)).progress.xp, 300);
  assert.equal(refreshed(), 1);
  assert.equal(cloud.saves.length, 0, 'no hace falta subir');
  assert.equal(sync.status(), STATUS.OK);
});

test('sincronización: lo de aquí va por delante (o la nube está vacía) → se sube', async () => {
  for (const row of [null, pack(state(20))]) {
    const { store, sync, cloud } = setup(state(150), row);
    assert.equal(await sync.start(), false);
    assert.equal(store.get().progress.xp, 150);
    assert.equal(cloud.row.s.progress.xp, 150);
    assert.equal(cloud.row.k['sfumato.coach'], '1', 'con las claves sfumato.*');
  }
});

test('sincronización: sin progreso en ningún lado no sube nada', async () => {
  const { sync, cloud } = setup(null, null);
  await sync.start();
  assert.equal(cloud.saves.length, 0);
});

test('sincronización: cada cambio se sube con espera; si la nube tenía más, se trae', async () => {
  const { store, sync, cloud, timers } = setup(state(100), pack(state(100)));
  await sync.start();
  store.update((s) => ({ ...s, progress: { ...s.progress, xp: 120 } }));
  store.update((s) => ({ ...s, progress: { ...s.progress, xp: 130 } }));
  assert.equal(timers.fns.length, 1, 'una sola subida pendiente');
  await timers.fns[0]();
  assert.equal(cloud.row.s.progress.xp, 130);
  // Otro dispositivo sube 500 mientras tanto: la subida de aquí no lo pisa y se trae.
  cloud.row = pack(state(500));
  store.update((s) => ({ ...s, progress: { ...s.progress, xp: 140 } }));
  await sync.save();
  assert.equal(cloud.row.s.progress.xp, 500);
  assert.equal(store.get().progress.xp, 500);
});

test('sincronización: «Empezar de cero» (el XP baja) se sube forzado', async () => {
  const { store, sync, cloud } = setup(state(400), pack(state(400)));
  await sync.start();
  store.reset();
  await sync.save();
  assert.equal(cloud.saves.at(-1).opts.force, true);
  assert.equal(cloud.row.s.progress.xp, 0);
});

test('sincronización: en el modo prueba ni se sube ni se trae', async () => {
  const { store, sync, cloud, timers } = setup(state(100), pack(state(100)));
  await sync.start();
  store.enterTrial((s) => ({ ...s, progress: { ...s.progress, xp: 9999 } }));
  assert.equal(timers.fns.length, 0);
  await sync.save();
  cloud.row = pack(state(800));
  await sync.pull();
  assert.equal(store.get().progress.xp, 9999);
  assert.equal(cloud.row.s.progress.xp, 800);
});

test('sincronización: sin red no rompe nada y avisa «sin conexión»', async () => {
  const st = storage({ [KEY]: JSON.stringify(state(50)) });
  const store = createStore({ storage: st });
  const remote = { load: async () => { throw new Error('red'); }, save: async () => { throw new Error('red'); } };
  const sync = createSync({ store, storage: st, stateKey: KEY, auth: signedAuth(), remote, timers: manualTimers() });
  const seen = [];
  sync.onStatus((s) => seen.push(s));
  assert.equal(await sync.start(), false);
  assert.equal(sync.status(), STATUS.OFFLINE);
  assert.equal(store.get().progress.xp, 50);
  assert.ok(seen.includes(STATUS.OFFLINE));
});

test('sincronización: al volver a la app mira la nube como mucho cada 30 s', async () => {
  let t = 0;
  const { sync, cloud, store } = setup(state(10), pack(state(10)), { now: () => t });
  await sync.start();
  cloud.row = pack(state(90));
  t = 1000;
  assert.equal(await sync.visible(), false);
  t = 31000;
  assert.equal(await sync.visible(), true);
  assert.equal(store.get().progress.xp, 90);
});

test('vuelta de Google: junta la nube con lo de aquí antes de crear el almacén', async () => {
  const st = storage({ [KEY]: JSON.stringify(state(5)) });
  const auth = { exchangeCode: async (code) => { assert.equal(code, 'c0de'); return session(); } };
  const cloud = fakeCloud(pack(state(70)));
  assert.equal(await finishSignIn({ storage: st, stateKey: KEY, auth, remote: cloud.remote, search: '?code=c0de' }), 'traido');
  assert.equal(JSON.parse(st.getItem(KEY)).progress.xp, 70);
  const keep = fakeCloud(pack(state(1)));
  assert.equal(await finishSignIn({ storage: st, stateKey: KEY, auth, remote: keep.remote, search: '?code=c0de' }), 'conservado');
  assert.equal(await finishSignIn({ storage: st, stateKey: KEY, auth, remote: fakeCloud(null).remote, search: '?code=c0de' }), 'nada');
  const failing = { exchangeCode: async () => { throw new Error('auth 400'); } };
  assert.equal(await finishSignIn({ storage: st, stateKey: KEY, auth: failing, remote: cloud.remote, search: '?error=access_denied' }), 'error');
});

test('la app arranca la cuenta solo con proyecto y la sección empieza oculta', () => {
  const main = readFileSync(new URL('../app/js/main.js', import.meta.url), 'utf8');
  assert.match(main, /cloudReady\(\) \? import\('\.\/cloud\/cloud\.js'\)/);
  const section = readFileSync(new URL('../app/js/ui/account-section.js', import.meta.url), 'utf8');
  assert.match(section, /class="acc"[^>]* hidden/);
  assert.match(section, /Continuar con Google/);
  assert.match(section, /Borrar mi cuenta y datos/);
  const settings = readFileSync(new URL('../app/js/ui/screens/profile-settings.js', import.meta.url), 'utf8');
  assert.match(settings, /accountHtml\(\)/);
  const privacy = readFileSync(new URL('../app/privacidad.html', import.meta.url), 'utf8');
  assert.match(privacy, /Borrar mi cuenta y datos/);
  const flow = readFileSync(new URL('../.github/workflows/supabase-despierta.yml', import.meta.url), 'utf8');
  assert.match(flow, /rpc\/ping/);
  assert.match(flow, /app\/js\/cloud\/config\.js/);
});
