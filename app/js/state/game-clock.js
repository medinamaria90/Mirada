// Reloj del juego (engine/daylight.js): avanza solo mientras la app está abierta y a la vista, y se guarda en el
// navegador (sfumato.clock) para seguir donde iba si se vuelve enseguida; una sesión nueva arranca en la hora real
// del móvil. Lo usan el mapa vivo (luz, estrellas, ventanas) y la música (de noche, otro tema).

import { dayMinute, isNight, resumeMinute } from '../engine/daylight.js';

const KEY = 'sfumato.clock';
const SAVE_EVERY_MS = 20 * 1000;   // se guarda de vez en cuando, al ocultarse la pestaña y al salir
const MS_PER_MIN = 60 * 1000;

let base = null;                   // minuto del día de juego cuando empezó a correr (o se paró)
let since = null;                  // performance.now() desde que corre; null si la app no se ve

function load() {
  try {
    return resumeMinute(JSON.parse(localStorage.getItem(KEY) || 'null'), new Date());
  } catch (err) {
    console.warn('reloj del juego sin guardar:', err);
    return resumeMinute(null, new Date());
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify({ min: Math.round(clockMinute() * 1000) / 1000, at: Date.now() }));
  } catch (err) {
    console.warn('no se pudo guardar el reloj del juego:', err);
  }
}

const running = () => (since === null ? 0 : (performance.now() - since) / MS_PER_MIN);

let hiddenAt = null;               // Date.now() al ocultarse: tras un rato largo fuera, vuelve a la hora real

function onVisibility() {
  if (document.hidden) {
    base = dayMinute(base + running());
    since = null;
    hiddenAt = Date.now();
    save();
  } else if (since === null) {
    if (hiddenAt !== null) base = resumeMinute({ min: base, at: hiddenAt }, new Date());
    since = performance.now();
  }
}

function start() {
  if (base !== null) return;
  base = load();
  since = document.hidden ? null : performance.now();
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', save);
  setInterval(() => { if (!document.hidden) save(); }, SAVE_EVERY_MS);
}

// Minuto del día de juego ahora (de 0 a GAME_DAY_MIN de engine/daylight.js).
export function clockMinute() {
  start();
  return dayMinute(base + running());
}

export const isGameNight = () => isNight(clockMinute());
