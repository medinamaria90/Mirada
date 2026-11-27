// Acceso con Google mediante Supabase Auth, con fetch y sin librerías (flujo PKCE).
// 1. signInUrl: guarda el secreto PKCE y da la dirección de Google. 2. Google vuelve a la app con «?code=…».
// 3. exchangeCode: cambia el código por la sesión. La sesión se guarda en `mirada.cuenta` (fuera de sfumato.*:
// no viaja en la mudanza) y se renueva sola antes de caducar.

import { makeVerifier, challengeOf } from './pkce.js';

export const SESSION_KEY = 'mirada.cuenta';
export const VERIFIER_KEY = 'mirada.cuenta.pkce';
// Se renueva si le queda menos de esto (segundos).
const REFRESH_MARGIN_S = 60;

const nowS = () => Math.floor(Date.now() / 1000);

function readJson(storage, key) {
  try {
    const raw = storage?.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function forget(storage, key) {
  try { storage?.removeItem(key); } catch { /* sin almacenamiento: nada que borrar */ }
}

// Lo que se guarda de la respuesta de Auth: tokens, caducidad y quién es (id y email).
export function toSession(data, now = nowS()) {
  if (!data?.access_token || !data?.refresh_token || !data?.user?.id) return null;
  const expiresAt = Number(data.expires_at) || now + (Number(data.expires_in) || 0);
  return { access: data.access_token, refresh: data.refresh_token, expiresAt, user: { id: data.user.id, email: data.user.email || '' } };
}

export function createAuth({ url, key, storage, fetchFn = (...a) => fetch(...a), cryptoApi = globalThis.crypto }) {
  const headers = { apikey: key, 'Content-Type': 'application/json' };

  async function token(grant, body) {
    const res = await fetchFn(`${url}/auth/v1/token?grant_type=${grant}`, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`auth ${res.status}`);
    const session = toSession(await res.json());
    if (!session) throw new Error('auth: respuesta sin sesión');
    storage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  return {
    async signInUrl(redirectTo) {
      const verifier = makeVerifier(cryptoApi);
      storage.setItem(VERIFIER_KEY, verifier);
      const q = new URLSearchParams({ provider: 'google', redirect_to: redirectTo, code_challenge: await challengeOf(verifier, cryptoApi), code_challenge_method: 's256' });
      return `${url}/auth/v1/authorize?${q}`;
    },
    async exchangeCode(code) {
      const verifier = storage.getItem(VERIFIER_KEY);
      forget(storage, VERIFIER_KEY);
      if (!verifier || !code) throw new Error('auth: falta el código o el secreto');
      return token('pkce', { auth_code: code, code_verifier: verifier });
    },
    // Sesión vigente (renovada si hace falta) o null. Si la renovación la rechaza el servidor, se olvida.
    async session() {
      const s = readJson(storage, SESSION_KEY);
      if (!s?.access || !s?.refresh || !s?.user?.id) return null;
      if (s.expiresAt - nowS() > REFRESH_MARGIN_S) return s;
      try {
        return await token('refresh_token', { refresh_token: s.refresh });
      } catch (err) {
        if (/auth 4\d\d/.test(err.message)) forget(storage, SESSION_KEY);
        return null;
      }
    },
    // Sin red también se cierra aquí: el servidor caduca el token solo.
    async signOut() {
      const s = readJson(storage, SESSION_KEY);
      forget(storage, SESSION_KEY);
      if (!s?.access) return;
      await fetchFn(`${url}/auth/v1/logout`, { method: 'POST', headers: { ...headers, Authorization: `Bearer ${s.access}` } }).catch(() => null);
    },
    forget: () => forget(storage, SESSION_KEY),
    hasSession: () => Boolean(readJson(storage, SESSION_KEY)?.refresh),
    email: () => readJson(storage, SESSION_KEY)?.user?.email || '',
  };
}
