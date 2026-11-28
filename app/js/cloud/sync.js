// Sincronización del progreso con la nube, sin bloquear el juego. Usa la lógica de state/mudanza.js: el paquete es
// el mismo (estado + claves sfumato.*) y, al juntar dos, gana el más avanzado.
// - pull: trae lo de la nube; si va por delante, sustituye lo de aquí (conserva la ronda en curso) y avisa.
// - Cada cambio del almacén se sube con espera (SAVE_DELAY_MS) y, al ocultar la página, al momento.
// - La base solo guarda si no tiene algo más avanzado; si lo tiene, se trae. «Borrar progreso» (el XP baja)
//   se sube forzado. En el modo prueba no se sube ni se trae nada.

import { collectPayload, validatePayload, applyMove, hasProgress, isAhead } from '../state/mudanza.js';

export const SAVE_DELAY_MS = 4000;
// Al volver a la app se mira la nube, como mucho una vez en este tiempo.
export const PULL_EVERY_MS = 30 * 1000;
export const STATUS = { OFF: 'off', SAVING: 'saving', OK: 'ok', OFFLINE: 'offline' };

const xpOf = (state) => Number(state?.progress?.xp) || 0;

export function createSync({ store, storage, stateKey, auth, remote, onRemote = () => {}, delayMs = SAVE_DELAY_MS, timers = globalThis, now = Date.now }) {
  let status = STATUS.OFF;
  let syncedXp = null;
  let timer = null;
  let applying = false;
  let lastPull = -Infinity;
  let unsubscribe = null;
  const listeners = new Set();

  const setStatus = (next) => {
    if (next === status) return;
    status = next;
    for (const fn of listeners) fn(status);
  };

  async function withSession(fn) {
    const s = await auth.session();
    if (!s) { setStatus(STATUS.OFF); return null; }
    try {
      return await fn(s);
    } catch (err) {
      console.info('Nube no disponible:', err.message);
      setStatus(STATUS.OFFLINE);
      return null;
    }
  }

  // Lo de la nube por delante entra en el almacén. Devuelve true si se ha traído.
  function take(incoming) {
    if (store.inTrial() || !incoming || !hasProgress(incoming.state)) return false;
    const local = store.get();
    if (hasProgress(local) && !isAhead(incoming.state, local)) return false;
    applyMove(storage, stateKey, incoming);
    applying = true;
    try {
      store.update(() => ({ ...incoming.state, session: local.session }));
    } finally {
      applying = false;
    }
    onRemote();
    return true;
  }

  async function save({ keepalive = false, force = false } = {}) {
    timers.clearTimeout(timer);
    timer = null;
    if (store.inTrial()) return;
    await withSession(async (s) => {
      const payload = collectPayload(storage, stateKey);
      const xp = xpOf(payload.s);
      setStatus(STATUS.SAVING);
      const saved = await remote.save(s, payload, { force: force || (syncedXp !== null && xp < syncedXp), keepalive });
      if (saved) syncedXp = xp;
      else await pullWith(s);
      setStatus(STATUS.OK);
    });
  }

  async function pullWith(s) {
    lastPull = now();
    const data = await remote.load(s);
    const incoming = data ? validatePayload(data) : null;
    const took = take(incoming);
    syncedXp = incoming ? xpOf(incoming.state) : null;
    const local = store.get();
    // Lo de aquí va por delante (o la nube está vacía): hay que subirlo.
    const behind = !took && hasProgress(local) && (!incoming || !hasProgress(incoming.state) || isAhead(local, incoming.state));
    return { took, behind };
  }

  // Trae y, si lo de aquí va por delante (o la nube está vacía), lo sube. Devuelve true si se ha traído algo.
  async function pull() {
    const result = await withSession(async (s) => {
      setStatus(STATUS.SAVING);
      const r = await pullWith(s);
      setStatus(STATUS.OK);
      return r;
    });
    if (result?.behind) await save();
    return Boolean(result?.took);
  }

  const schedule = () => {
    if (applying || store.inTrial() || !auth.hasSession()) return;
    timers.clearTimeout(timer);
    timer = timers.setTimeout(() => { save(); }, delayMs);
  };

  return {
    pull,
    save,
    start() {
      if (!unsubscribe) unsubscribe = store.subscribe(schedule);
      return pull();
    },
    stop() {
      unsubscribe?.();
      unsubscribe = null;
      timers.clearTimeout(timer);
      timer = null;
      syncedXp = null;
      setStatus(STATUS.OFF);
    },
    // Al ocultar la página: lo pendiente, ya. Al volver: mirar la nube (con calma).
    hidden: () => (timer ? save({ keepalive: true }) : Promise.resolve()),
    visible: () => (now() - lastPull >= PULL_EVERY_MS ? pull() : Promise.resolve(false)),
    status: () => status,
    onStatus(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

// Vuelta de Google: cambia el código por la sesión y junta la nube con lo de aquí antes de crear el almacén.
// Devuelve 'traido' | 'conservado' | 'nada' (como la mudanza) o 'error'.
export async function finishSignIn({ storage, stateKey, auth, remote, search }) {
  const q = new URLSearchParams(search);
  try {
    // Sin código (Google cancelado) exchangeCode falla y olvida el secreto igualmente.
    const s = await auth.exchangeCode(q.get('code'));
    const data = await remote.load(s);
    return data ? applyMove(storage, stateKey, validatePayload(data)) : 'nada';
  } catch (err) {
    console.info('Acceso no completado:', err.message);
    return 'error';
  }
}
