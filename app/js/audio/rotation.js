// Rotación de piezas por lista (función pura, sin Web Audio). Una lista tiene clave: una época
// (original + variantes compuestas + clásicos) o una rama temática (piezas propias de la rama y
// prestadas de otras listas, BORROWED). Al empezar una lista o al terminar una pieza se elige otra al azar con pesos,
// sin repetir las últimas, para que la música cambie sin que suene siempre la misma.
import { variantsOf, piecesOf, pieceKey, getPiece, BRANCHES } from './variants.js';

/** Cuántas piezas recientes se recuerdan por lista (las que no pueden volver a sonar enseguida). */
export const RECENT_MAX = 2;
/** Piezas favoritas de María: suenan las primeras la primera vez y salen más a menudo. */
const FAVORITES = { menu: 'menu', renaissance: 'renaissance/vacas' };
/** Listas cuya favorita abre cada visita (no solo la primera): el tema original de la portada. */
const OPENS_EACH_VISIT = new Set(['menu']);
const FAVORITE_WEIGHT = 3;
/** Las piezas compuestas del Barroco no le convencieron («no me encanta»): salen menos. */
const DISLIKED_ERAS = new Set(['baroque']);
const DISLIKED_WEIGHT = 0.4;
const DEFAULT_WEIGHT = 1;
/**
 * Piezas que una rama toma de otras listas (claves de pieza); se suman a las suyas propias
 * (BRANCH_CLASSICS). La española se irá llenando con Sanz, Soler, Albéniz, Granados y Falla.
 */
const BORROWED = { 'maestros-espanoles': ['renaissance/vacas'] };
const BRANCH_KEYS = [...new Set([...Object.keys(BORROWED), ...BRANCHES])];

/** ¿Hay lista con esa clave (época o rama)? */
export const hasList = (key) => variantsOf(key).length > 0 || BRANCH_KEYS.includes(key);

/** Lista con sus pesos: [{ key, weight }] (clave de pieza). Vacía si no existe. */
export function rotationPool(list) {
  const weightOf = (key, composed) => {
    if (FAVORITES[list] === key) return FAVORITE_WEIGHT;
    return DISLIKED_ERAS.has(list) && composed ? DISLIKED_WEIGHT : DEFAULT_WEIGHT;
  };
  if (BRANCH_KEYS.includes(list)) {
    const own = piecesOf(list).map((v) => pieceKey(list, v.id));
    return [...(BORROWED[list] || []), ...own].filter((key) => getPiece(key)).map((key) => ({ key, weight: weightOf(key, false) }));
  }
  return variantsOf(list).map(({ id, source }) => {
    const key = pieceKey(list, id);
    return { key, weight: weightOf(key, !source) };
  });
}

/** Pieza que suena la primera vez en una lista (la favorita si la hay), o null. */
export const firstPiece = (list) => FAVORITES[list] ?? null;

/**
 * Siguiente pieza de la lista. `recent` = claves que acaban de sonar (la más reciente primero).
 * Excluye las últimas (sin dejar menos de dos candidatas) y nunca repite la inmediatamente anterior
 * si hay otra; sortea por peso. Devuelve null si la lista no existe.
 */
export function pickNext(list, recent = [], rng = Math.random) {
  const pool = rotationPool(list);
  if (!pool.length) return null;
  const seen = Array.isArray(recent) ? recent.filter((k) => typeof k === 'string') : [];
  const first = firstPiece(list);
  if (!seen.length && first && pool.some((p) => p.key === first)) return first;
  const avoid = new Set(seen.slice(0, Math.max(0, Math.min(RECENT_MAX, pool.length - 2))));
  if (pool.length > 1 && seen.length) avoid.add(seen[0]);
  const options = pool.filter((p) => !avoid.has(p.key));
  const total = options.reduce((s, p) => s + p.weight, 0);
  let r = rng() * total;
  for (const p of options) {
    r -= p.weight;
    if (r < 0) return p.key;
  }
  return options[options.length - 1].key;
}

/** Historial actualizado tras sonar `key` (la más reciente primero, sin duplicados). */
export const pushRecent = (recent, key) =>
  [key, ...(Array.isArray(recent) ? recent : []).filter((x) => x !== key)].slice(0, RECENT_MAX);

/**
 * Historial guardado y saneado: solo listas que existen y piezas que pertenecen a ellas. Las de
 * OPENS_EACH_VISIT se olvidan, para que su favorita vuelva a sonar la primera en cada visita.
 */
export function cleanRecent(saved) {
  const out = {};
  if (!saved || typeof saved !== 'object') return out;
  for (const [list, keys] of Object.entries(saved)) {
    if (!hasList(list) || !Array.isArray(keys) || OPENS_EACH_VISIT.has(list)) continue;
    const known = new Set(rotationPool(list).map((p) => p.key));
    const clean = keys.filter((k, i) => known.has(k) && keys.indexOf(k) === i).slice(0, RECENT_MAX);
    if (clean.length) out[list] = clean;
  }
  return out;
}
