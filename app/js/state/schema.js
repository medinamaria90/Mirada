// Esquema versionado del estado persistente y migraciones. Puro.

import { emptyProgress, DEFAULT_GOAL } from '../engine/progress.js';
import { addDays, isDayKey } from '../engine/dates.js';
import { LEGACY_IDS } from './legacy-ids.js';
import { emptyRoster } from '../engine/roster.js';

export const SCHEMA_VERSION = 11;

// Pintores que pasan a ser una sola parada (8 → 9): id antiguo → id de la parada conjunta.
export const MERGED_ARTISTS = { 'pietro-lorenzetti': 'lorenzetti', 'ambrogio-lorenzetti': 'lorenzetti' };

// Tema de la interfaz (settings.theme): claro, oscuro o como el móvil (el sistema).
export const THEMES = ['light', 'dark', 'system'];
export const DEFAULT_THEME = 'system';

export function normalizeTheme(value) {
  return THEMES.includes(value) ? value : DEFAULT_THEME;
}

// Nombre del perfil (settings.name): opcional, solo en este navegador. Texto corto sin saltos ni
// caracteres de control; si no hay nombre, cadena vacía.
export const NAME_MAX = 24;

// Caracteres tal como los ve quien escribe (grafemas): un emoji compuesto o con tono de piel cuenta uno.
// Sin Intl.Segmenter (navegadores muy viejos) se cuenta por puntos de código.
export function graphemes(text) {
  const str = String(text ?? '');
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    return [...new Intl.Segmenter('es', { granularity: 'grapheme' }).segment(str)].map((x) => x.segment);
  }
  return [...str];
}

export function normalizeName(value) {
  if (typeof value !== 'string') return '';
  const clean = value.replace(/[\p{Cc}\u200B\u200C\u200E\u200F\u2060\uFEFF\u202A-\u202E\u2066-\u2069]/gu, ' ').replace(/\s+/g, ' ').trim();
  return graphemes(clean).slice(0, NAME_MAX).join('').trim();
}

// Avatar del perfil (settings.avatar): id de un cuadro de la colección o ''.
export function normalizeArtworkId(value) {
  return typeof value === 'string' && /^w\d+$/.test(value) ? value : '';
}

export function defaultState() {
  return {
    version: SCHEMA_VERSION,
    onboarded: false,
    // roster: pintores conocidos del camino y ramas (engine/roster.js); en una partida nueva, todos.
    progress: { ...emptyProgress(), roster: emptyRoster('new') },
    settings: { music: true, sfx: true, volume: 0.6, reducedMotion: false, dailyGoal: DEFAULT_GOAL, theme: DEFAULT_THEME, name: '', avatar: '' },
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
  // 7 → 8 (perfil nuevo): nombre opcional, portada y avatar elegidos, vacíos por defecto. Lo demás se conserva.
  7: (old) => ({
    ...old,
    settings: { ...(isPlain(old.settings) ? old.settings : {}), name: '', cover: '', avatar: '' },
  }),
  // 8 → 9: los hermanos Lorenzetti pasan a ser una sola parada (MERGED_ARTISTS). Su progreso se une: lo mejor de los dos
  // (dominado si lo estaba cualquiera, el último día más reciente, las obras vistas de ambos). La ronda en curso con uno de
  // ellos se descarta. Lo demás se conserva.
  8: (old) => {
    const progress = isPlain(old.progress) ? old.progress : {};
    const text = JSON.stringify(old.session ?? null);
    const touched = Object.keys(MERGED_ARTISTS).some((id) => text.includes(id));
    return {
      ...old,
      session: touched ? {} : old.session,
      progress: {
        ...progress,
        artists: mergeKeys(progress.artists, (k) => MERGED_ARTISTS[k], mergeArtistState),
        seen: mergeKeys(progress.seen, (k) => MERGED_ARTISTS[k], laterDay),
        medals: mergeKeys(progress.medals, (k) => (k.startsWith('artist-') && MERGED_ARTISTS[k.slice(7)] ? `artist-${MERGED_ARTISTS[k.slice(7)]}` : null), laterDay),
        srs: mergeKeys(progress.srs, (k) => (k.startsWith('artist:') && MERGED_ARTISTS[k.slice(7)] ? `artist:${MERGED_ARTISTS[k.slice(7)]}` : null), higherBox),
      },
    };
  },
  // 9 → 10 (aviso de pintores nuevos): lista de pintores conocidos del camino y ramas. Se rellena al cargar el catálogo
  // (engine/roster.js, semilla 'legacy': todo lo de hoy menos lo añadido en la última actualización). Lo demás se conserva.
  9: (old) => ({
    ...old,
    progress: { ...(isPlain(old.progress) ? old.progress : {}), roster: emptyRoster('legacy') },
  }),
  // 10 → 11 (Cuadro del día): sus partidas y el último día que la guía lo propuso. El reto diario de antes (progress.daily)
  // se conserva tal cual; una ronda suya a medias se descarta. Lo demás se conserva.
  10: (old) => ({
    ...old,
    session: isPlain(old.session) && old.session.kind === 'daily' ? {} : old.session,
    progress: { ...(isPlain(old.progress) ? old.progress : {}), cuadros: {}, cuadroNudge: '' },
  }),
};

// Une las claves de `dict` que `rename` cambia (las demás quedan igual); si dos caen en la misma, `pick` decide.
function mergeKeys(dict, rename, pick) {
  if (!isPlain(dict)) return dict;
  const out = {};
  for (const [k, v] of Object.entries(dict)) {
    const key = rename(k) || k;
    out[key] = key in out ? pick(out[key], v) : v;
  }
  return out;
}

const laterDay = (a, b) => (typeof a === 'string' && typeof b === 'string' ? (a > b ? a : b) : a ?? b);
const higherBox = (a, b) => ((Number(b?.box) || 0) > (Number(a?.box) || 0) ? b : a);

function mergeArtistState(a, b) {
  if (!isPlain(a) || !isPlain(b)) return isPlain(a) ? a : b;
  const out = { ...a, ...b };
  out.plays = (Number(a.plays) || 0) + (Number(b.plays) || 0);
  out.best = Math.max(Number(a.best) || 0, Number(b.best) || 0);
  out.mastered = Boolean(a.mastered || b.mastered);
  out.last = laterDay(a.last, b.last);
  if (Array.isArray(a.works) || Array.isArray(b.works)) out.works = [...new Set([...(a.works || []), ...(b.works || [])])];
  return out;
}

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
  const out = mergeDefaults(defaults, data);
  // Lo que llegue sin pasar por la interfaz (estado importado o editado a mano) también se limpia.
  if (isPlain(out.settings)) {
    out.settings.name = normalizeName(out.settings.name);
    // La portada del perfil ya no existe (27/11): su elección guardada se descarta sin tocar nada más. Va aquí y no
    // en una migración con versión nueva para que un móvil con la app en caché no rechace un estado «del futuro».
    delete out.settings.cover;
    out.settings.avatar = normalizeArtworkId(out.settings.avatar);
  }
  return out;
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
