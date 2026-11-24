// Esquema versionado del estado persistente y migraciones. Puro.

import { emptyProgress, DEFAULT_GOAL } from '../engine/progress.js';
import { addDays, isDayKey } from '../engine/dates.js';
import { LEGACY_IDS } from './legacy-ids.js';

export const SCHEMA_VERSION = 8;

// Tema de la interfaz (settings.theme): claro, oscuro o como el móvil (el sistema).
export const THEMES = ['light', 'dark', 'system'];
export const DEFAULT_THEME = 'system';

export function normalizeTheme(value) {
  return THEMES.includes(value) ? value : DEFAULT_THEME;
}

// Nombre del perfil (settings.name): opcional, solo en este navegador. Texto corto sin saltos ni
// caracteres de control; si no hay nombre, cadena vacía.
export const NAME_MAX = 24;

export function normalizeName(value) {
  if (typeof value !== 'string') return '';
  const clean = value.replace(/[\p{Cc}\p{Cf}]/gu, ' ').replace(/\s+/g, ' ').trim();
  return [...clean].slice(0, NAME_MAX).join('').trim();
}

export function defaultState() {
  return {
    version: SCHEMA_VERSION,
    onboarded: false,
    progress: emptyProgress(),
    settings: { music: true, sfx: true, volume: 0.6, reducedMotion: false, dailyGoal: DEFAULT_GOAL, theme: DEFAULT_THEME, name: '' },
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
  // 3 → 4 (oleada 6): reto semanal. Lo demás se conserva; las medallas «Ojo de…»
  // y los cuadros que reconoces se calculan del repaso espaciado que ya había.
  3: (old) => ({
    ...old,
    progress: { ...(isPlain(old.progress) ? old.progress : {}), weekly: {} },
  }),
  // 4 → 5: tema de la interfaz en Ajustes (claro, oscuro o como el móvil). Lo demás se conserva.
  4: (old) => ({
    ...old,
    settings: { ...(isPlain(old.settings) ? old.settings : {}), theme: DEFAULT_THEME },
  }),
  // 5 → 6 (repaso «sin deprimir»): cola de cuadros fallados, último día visto de cada pintor y días
  // de gracia por semana. El día que perdonó la gracia antigua (graceOn, un día por semana) pasa a la
  // lista de días perdonados para que esa semana no regale uno de más. Lo demás se conserva.
  5: (old) => {
    const progress = isPlain(old.progress) ? old.progress : {};
    const streak = isPlain(progress.streak) ? progress.streak : {};
    const graceDays = isDayKey(streak.graceOn) ? [addDays(streak.graceOn, -1)] : [];
    return {
      ...old,
      progress: { ...progress, fallados: [], seen: {}, streak: { ...streak, graceDays } },
    };
  },
  // 6 → 7 (catálogo grande): las obras pasan de a<N>/b<N> a w<QID> (state/legacy-ids.js); lo que no
  // tiene equivalente se pierde sin romper nada. Los pintores conservan su id (los nuevos empiezan sin
  // progreso). Nuevos: niveles «a fondo» (deep) y rango más alto alcanzado (rank). La ronda en curso
  // se descarta (lleva obras con ids antiguos).
  6: (old) => {
    // La lupa del día (`detail`) ya no existe: su registro no se conserva.
    const { detail: _lupa, ...progress } = isPlain(old.progress) ? old.progress : {};
    // a<N>/b<N> → w<QID>; un id que ya es del catálogo grande (w<QID>) se conserva; el resto se pierde.
    const tr = (id) => (typeof id !== 'string' ? null : Object.hasOwn(LEGACY_IDS, id) ? LEGACY_IDS[id] : /^w\d+$/.test(id) ? id : null);
    const byWork = (dict, wrap = (id) => id) => {
      const out = {};
      if (isPlain(dict)) for (const [k, v] of Object.entries(dict)) { const n = tr(k); if (n) out[wrap(n)] = v; }
      return out;
    };
    const srs = {};
    if (isPlain(progress.srs)) {
      for (const [k, v] of Object.entries(progress.srs)) {
        if (!k.startsWith('art:')) srs[k] = v;
        else { const n = tr(k.slice(4)); if (n) srs[`art:${n}`] = v; }
      }
    }
    return {
      ...old,
      session: {},
      progress: {
        ...progress,
        collection: byWork(progress.collection),
        srs,
        fallados: (Array.isArray(progress.fallados) ? progress.fallados : [])
          .filter((f) => f && tr(f.id)).map((f) => ({ ...f, id: tr(f.id) })),
        deep: {},
        rank: 0,
      },
    };
  },
  // 7 → 8 (perfil nuevo): nombre opcional del perfil, vacío por defecto. Lo demás se conserva.
  7: (old) => ({
    ...old,
    settings: { ...(isPlain(old.settings) ? old.settings : {}), name: '' },
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
