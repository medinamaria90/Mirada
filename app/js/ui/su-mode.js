// Modo superusuario (solo para María): una vez metido el código, Ajustes enseña una sección propia.
// Se recuerda en este dispositivo (no es progreso). Quien ya tenía la barra de música encendida
// antes de existir esta sección entra como superusuario sin volver a meter el código.

import { isDjOn } from './dj-mode.js';

export const SU_KEY = 'sfumato.su';
export const SU_EVENT = 'sfumato:su-change';
const ON = '1';
const OFF = '0';

export function isSuperOn() {
  try {
    const v = globalThis.localStorage?.getItem(SU_KEY);
    return v === null || v === undefined ? isDjOn() : v === ON;
  } catch { return false; }
}

export function setSuper(on) {
  try { localStorage.setItem(SU_KEY, on ? ON : OFF); } catch { /* sin almacenamiento: dura hasta recargar */ }
  globalThis.dispatchEvent?.(new Event(SU_EVENT));
}
