// Qué pieza suena en cada sitio (función pura, sin Web Audio). Cada lista (época o rama) tiene un
// tema principal y como mucho dos secundarios (playlists.js):
//  - al entrar suena el principal; de noche, el secundario del día;
//  - al acabar el principal dos veces seguidas (un rato largo en el mismo sitio), entra un secundario;
//    de noche basta una vez; tras un secundario vuelve el principal;
//  - el secundario «del día» cambia cada día (variación suave) y, si suenan varios en la misma visita,
//    se van alternando.
// El modo secreto recorre todas las piezas de la lista, estén o no en ella (piece-info.js, allPieces).
import { pieceKey, getPiece } from './variants.js';
import { PLAYLISTS, MAX_ALT } from './playlists.js';

/** Veces seguidas que acaba el principal antes de dar paso a un secundario (de día). */
export const MAIN_RUNS_BEFORE_ALT = 2;
/** Noche a efectos de música: de NIGHT_FROM a NIGHT_TO (hora local, como el mapa vivo). */
// TODO: usar la salida y la puesta del sol de engine/daylight.js cuando esté en el repo.
export const NIGHT_FROM_HOUR = 21;
export const NIGHT_TO_HOUR = 7;
const DAY_MS = 864e5;
const MIN_PER_HOUR = 60;

/** ¿Es de noche a esa hora local? */
export const isNight = (date) => date.getHours() >= NIGHT_FROM_HOUR || date.getHours() < NIGHT_TO_HOUR;

/** Número de día local (cambia a medianoche en la hora del móvil). */
export const dayIndex = (date) => Math.floor((date.getTime() - date.getTimezoneOffset() * MIN_PER_HOUR * 1000) / DAY_MS);

const resolve = (list, id) => (String(id).includes('/') ? id : pieceKey(list, id));

/** { main, alt: [...] } en claves de pieza, solo con piezas que existen; null si la lista no tiene. */
export function playlistOf(list) {
  const cfg = Object.hasOwn(PLAYLISTS, list) ? PLAYLISTS[list] : null;
  if (!cfg) return null;
  const main = resolve(list, cfg.main);
  if (!getPiece(main)) return null;
  const alt = (cfg.alt || []).map((id) => resolve(list, id)).filter((k) => k !== main && getPiece(k)).slice(0, MAX_ALT);
  return { main, alt };
}

/** ¿Hay lista con esa clave (época o rama)? */
export const hasList = (list) => playlistOf(list) !== null;

/**
 * Siguiente pieza de la lista.
 * @param s.last      pieza que acaba de terminar (null al entrar en el sitio)
 * @param s.mainRuns  veces seguidas que ha terminado el principal en esta visita (contando `last`)
 * @param s.altsPlayed secundarios que ya han sonado en esta visita (para alternarlos)
 * @param s.date      hora local
 */
export function nextPiece(list, { last = null, mainRuns = 0, altsPlayed = 0, date = new Date() } = {}) {
  const pl = playlistOf(list);
  if (!pl) return null;
  if (!pl.alt.length) return pl.main;
  const night = isNight(date);
  const alt = pl.alt[(dayIndex(date) + altsPlayed) % pl.alt.length];
  if (last === null) return night ? alt : pl.main;
  if (last !== pl.main) return pl.main;
  return mainRuns >= (night ? 1 : MAIN_RUNS_BEFORE_ALT) ? alt : pl.main;
}
