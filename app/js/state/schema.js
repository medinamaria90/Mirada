// Esquema versionado del estado persistente y migraciones. Puro.

import { emptyProgress, DEFAULT_GOAL } from '../engine/progress.js';

export const SCHEMA_VERSION = 4;

export function defaultState() {
  return {
    version: SCHEMA_VERSION,
    onboarded: false,
    progress: emptyProgress(),
    settings: { music: true, sfx: true, volume: 0.6, reducedMotion: false, dailyGoal: DEFAULT_GOAL },
    // Ronda en curso para retomarla al volver ({} = ninguna). Ver state/session.js.
    session: {},
  };
}

// Cada migración convierte la versión N en N+1.
export const MIGRATIONS = {
  // 0: datos sin versión (o de una prueba anterior) → se conservan los campos reconocibles.
  0: (old) => ({ ...old, version: 1 }),
  // 1 → 2 (oleada 3): ronda en curso, salas e intros de movimiento. El progreso se conserva.
  1: (old) => ({
    ...old,
    session: {},
    progress: { ...(isPlain(old.progress) ? old.progress : {}), salas: {}, intros: {} },
  }),
  // 2 → 3 (oleada 4): meta diaria (ajuste) y XP por día. Lo demás se conserva.
  2: (old) => ({
    ...old,
    settings: { ...(isPlain(old.settings) ? old.settings : {}), dailyGoal: DEFAULT_GOAL },
    progress: { ...(isPlain(old.progress) ? old.progress : {}), xpByDay: {} },
  }),
  // 3 → 4 (oleada 6): reto semanal y detalle del día. Lo demás se conserva; las medallas «Ojo de…»
  // y los cuadros que reconoces se calculan del repaso espaciado que ya había.
  3: (old) => ({
    ...old,
    progress: { ...(isPlain(old.progress) ? old.progress : {}), weekly: {}, detail: {} },
  }),
};

export function migrate(raw, migrations = MIGRATIONS, target = SCHEMA_VERSION, defaults = defaultState()) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return defaults;
  let data = raw;
  let v = Number.isInteger(data.version) ? data.version : 0;
  if (v > target) return defaults; // datos de una versión futura: no se interpretan
  while (v < target) {
    const step = migrations[v];
    if (!step) return defaults;
    data = step(data);
    v += 1;
    data.version = v;
  }
  return mergeDefaults(defaults, data);
}

// Completa con valores por defecto sin perder datos guardados; respeta tipos.
export function mergeDefaults(defaults, data) {
  if (!isPlain(defaults)) return sameType(defaults, data) ? data : defaults;
  const out = {};
  const src = isPlain(data) ? data : {};
  for (const key of Object.keys(defaults)) {
    out[key] = key in src ? mergeDefaults(defaults[key], src[key]) : defaults[key];
  }
  // Diccionarios libres (p. ej. progress.artists) se conservan tal cual.
  for (const key of Object.keys(src)) if (!(key in out)) out[key] = src[key];
  return out;
}

function isPlain(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function sameType(a, b) {
  if (a === null) return b === null || typeof b === 'string';
  if (Array.isArray(a)) return Array.isArray(b);
  if (isPlain(a)) return isPlain(b);
  return typeof a === typeof b;
}
