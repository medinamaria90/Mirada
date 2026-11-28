// «Borrar progreso» (Perfil → Ajustes): deja el navegador como si fuera la primera vez, conservando solo las
// preferencias (tema, música, sonidos, volumen, menos animaciones) y lo que no es progreso (el modo superusuario,
// el reloj del mapa y la sesión de la cuenta). Puro salvo el `storage` que se le da.

import { defaultState } from './schema.js';
import { STORAGE_KEY } from './store.js';

// Ajustes que se conservan; la meta del día, el nombre y el avatar se van con el progreso.
export const KEEP_SETTINGS = ['theme', 'music', 'sfx', 'volume', 'reducedMotion'];
const PROGRESS_PREFIX = 'sfumato.';
// Claves sfumato.* que no son progreso: modo superusuario, barra de música, reloj del mapa y recarga de la sesión.
const KEEP_KEYS = new Set(['sfumato.su', 'sfumato.dj', 'sfumato.clock', 'sfumato.recarga']);
// Progreso con otro prefijo: test de cultura y partida a medias del Cuadro del día.
const EXTRA_PROGRESS_KEYS = ['mirada.test.last', 'mirada.test.recent', 'mirada.cuadro'];

export const isProgressKey = (key) => EXTRA_PROGRESS_KEYS.includes(key)
  || (typeof key === 'string' && key.startsWith(PROGRESS_PREFIX) && !KEEP_KEYS.has(key));

/** Estado de una primera vez con las preferencias de `settings`. */
export function freshState(settings = {}) {
  const base = defaultState();
  const kept = Object.fromEntries(KEEP_SETTINGS.filter((k) => k in settings).map((k) => [k, settings[k]]));
  return { ...base, settings: { ...base.settings, ...kept } };
}

/** Borra el progreso guardado en `storage`. Devuelve el estado nuevo. */
export function wipeProgress(storage, settings = {}) {
  const keys = [];
  for (let i = 0; i < storage.length; i += 1) keys.push(storage.key(i));
  for (const key of keys) if (isProgressKey(key)) storage.removeItem(key);
  const next = freshState(settings);
  storage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
