// Historias de inicio de nivel ya vistas (clave propia en localStorage: lista de «pintor:nivel»). Sin almacenamiento
// vale la de la sesión. Cada historia sale sola la primera vez; después se vuelve a ver desde la ficha del pintor.

import { migrateStoryKeys } from './level-order.js';

export const STORIES_KEY = 'sfumato.stories';

const session = new Set();

// Las claves guardadas con la numeración antigua de niveles se traducen una vez (state/level-order.js).
function read() {
  try {
    const { keys, changed } = migrateStoryKeys(JSON.parse(window.localStorage.getItem(STORIES_KEY) || '[]'));
    if (changed) window.localStorage.setItem(STORIES_KEY, JSON.stringify(keys));
    return new Set(keys);
  } catch { return new Set(); }
}

export function storySeen(key) {
  return session.has(key) || read().has(key);
}

export function markStorySeen(key) {
  session.add(key);
  try {
    const all = read();
    all.add(key);
    window.localStorage.setItem(STORIES_KEY, JSON.stringify([...all]));
  } catch { /* sin almacenamiento: vale la marca de la sesión */ }
}
