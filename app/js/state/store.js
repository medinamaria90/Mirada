// Almacén con persistencia en localStorage (si existe) y degradación a memoria.

import { migrate, defaultState } from './schema.js';

export const STORAGE_KEY = 'mirada.state';

// Marca de «la guía de bienvenida ya se ha visto» (clave propia; sin almacenamiento vale la de la sesión).
export const COACH_KEY = 'sfumato.coach';
let coachShown = false;

export function coachSeen() {
  if (coachShown) return true;
  try { return window.localStorage.getItem(COACH_KEY) === '1'; } catch { return false; }
}

export function markCoachSeen() {
  coachShown = true;
  try { window.localStorage.setItem(COACH_KEY, '1'); } catch { /* sin almacenamiento: vale la marca de la sesión */ }
}

export function safeStorage(getStorage) {
  try {
    const s = getStorage();
    if (!s) return null;
    const probe = '__mirada_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

export function createStore({ storage = null, key = STORAGE_KEY } = {}) {
  let state = load();
  const listeners = new Set();

  function load() {
    if (!storage) return defaultState();
    try {
      const raw = storage.getItem(key);
      return migrate(raw ? JSON.parse(raw) : null);
    } catch {
      return defaultState();
    }
  }

  function persist() {
    if (!storage) return false;
    try {
      storage.setItem(key, JSON.stringify(state));
      return true;
    } catch {
      return false;
    }
  }

  function emit() {
    for (const fn of listeners) {
      try {
        fn(state);
      } catch (err) {
        console.error(err);
      }
    }
  }

  return {
    get: () => state,
    update(updater) {
      const next = updater(state);
      if (!next || next === state) return state;
      state = next;
      persist();
      emit();
      return state;
    },
    reset() {
      state = defaultState();
      persist();
      emit();
      return state;
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    persistent: () => Boolean(storage),
  };
}
