// Dirección antigua → nueva (ver state/mudanza.js). Solo en la antigua y solo si la nueva ya responde: se pasa sola, con
// location.replace (sin dejar la antigua en el historial), a la misma ruta y fragmento, llevándose lo guardado. En la
// nueva, en local y en las pruebas no hace nada, así que no puede haber bucle. Si la comprobación tarda, se queda aquí:
// no se saca a nadie de la app a media partida.

import { OLD_HOST, NEW_PROBE_URL, moveTarget } from '../state/mudanza.js';

export const PROBE_TIMEOUT_MS = 4000;

// ¿Responde ya la casa nueva? Petición opaca (no-cors): basta con que no falle la red a tiempo.
export async function newHomeAnswers(fetchFn = globalThis.fetch, timeoutMs = PROBE_TIMEOUT_MS) {
  const abort = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = setTimeout(() => abort?.abort(), timeoutMs);
  try {
    await fetchFn(NEW_PROBE_URL, { mode: 'no-cors', cache: 'no-store', credentials: 'omit', signal: abort?.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

// Devuelve { url, carried } si se ha ido, o null si se queda.
export async function moveToNewHome({ storage, stateKey, loc = globalThis.location, fetchFn, compress } = {}) {
  if (loc?.hostname !== OLD_HOST) return null;
  if (!(await newHomeAnswers(fetchFn))) return null;
  const target = await moveTarget(storage, stateKey, loc, compress === undefined ? undefined : { compress });
  if (!target.carried && storage) console.info('Mudanza sin el progreso (no había o no cabía en la dirección).');
  loc.replace(target.url);
  return target;
}
