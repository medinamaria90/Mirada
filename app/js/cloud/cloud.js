// La cuenta en la app: une la configuración, el acceso (auth.js), la nube (remote.js) y la sincronización (sync.js).
// Sin configuración (config.js vacío) no hace nada. Sin sesión, todo sigue como siempre: solo localStorage.

import { SUPABASE_URL, SUPABASE_ANON_KEY, cloudReady } from './config.js';
import { createAuth, VERIFIER_KEY } from './auth.js';
import { createRemote } from './remote.js';
import { createSync, finishSignIn as finish, STATUS } from './sync.js';

export { STATUS };
export const enabled = () => cloudReady();
// Adónde vuelve Google: la misma app, sin fragmento (Supabase añade «?code=…»).
const returnUrl = () => `${location.origin}${location.pathname}`;

let parts = null;
function get(storage) {
  if (!parts) {
    const auth = createAuth({ url: SUPABASE_URL, key: SUPABASE_ANON_KEY, storage });
    parts = { auth, remote: createRemote({ url: SUPABASE_URL, key: SUPABASE_ANON_KEY }), sync: null, refresh: null };
  }
  return parts;
}

// null si no es una vuelta de Google (sin cuenta configurada o sin secreto PKCE pendiente en este navegador).
export async function finishSignIn(storage, stateKey) {
  let pending = null;
  try { pending = storage?.getItem(VERIFIER_KEY); } catch { pending = null; }
  if (!enabled() || !pending) return null;
  const { auth, remote } = get(storage);
  return finish({ storage, stateKey, auth, remote, search: location.search });
}

// Se llama tras pintar (main.js) y al abrir Ajustes; la primera vez arranca la sincronización si hay sesión.
// `refresh`: vuelve a pintar si ha llegado progreso de otro dispositivo (lo da main.js).
export function startCloud({ store, storage, stateKey, refresh = null }) {
  if (!enabled() || !storage) return null;
  const p = get(storage);
  if (refresh) p.refresh = refresh;
  if (p.sync) return p.sync;
  p.sync = createSync({ store, storage, stateKey, auth: p.auth, remote: p.remote, onRemote: () => p.refresh?.() });
  document.addEventListener('visibilitychange', () => {
    if (!p.auth.hasSession()) return;
    (document.visibilityState === 'hidden' ? p.sync.hidden() : p.sync.visible()).catch(() => {});
  });
  window.addEventListener('pagehide', () => { p.sync.hidden().catch(() => {}); });
  if (p.auth.hasSession()) p.sync.start().catch(() => {});
  return p.sync;
}

export const account = {
  signedIn: () => Boolean(parts?.auth.hasSession()),
  email: () => parts?.auth.email() || '',
  status: () => parts?.sync?.status() || STATUS.OFF,
  onStatus: (fn) => parts?.sync?.onStatus(fn) || (() => {}),
  async signIn() {
    location.assign(await parts.auth.signInUrl(returnUrl()));
  },
  async signOut() {
    await parts.sync?.save().catch(() => {});
    parts.sync?.stop();
    await parts.auth.signOut();
  },
  // Borra la cuenta y su fila en la nube. El progreso de este dispositivo se queda.
  async deleteAccount() {
    const s = await parts.auth.session();
    if (!s) throw new Error('sin sesión');
    await parts.remote.deleteAccount(s);
    parts.sync?.stop();
    parts.auth.forget();
  },
};
