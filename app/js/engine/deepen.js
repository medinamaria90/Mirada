// «Profundiza en Rafael: nivel 3»: el itinerario intercala los niveles «a fondo» pendientes (decisión de María, 28/11).
//   · Cada DEEPEN_EVERY pintores nuevos del camino se propone uno, de cualquier época ya recorrida (no solo la actual).
//   · Selección ponderada: los imprescindibles (engine/essentials.js) pesan más según su peso, y más aún los de una época
//     ya cruzada sin ellos (lo que falta atrás va con prioridad, sin cerrar nada).
//   · Rotación: lo ofrecido en las últimas ROTATION propuestas no vuelve mientras haya otro; tras saltar A, nunca A.
//   · Enfriamiento: cada salto reciente (COOL_DAYS) divide su peso; nunca baja de COOL_FLOOR, así que nunca desaparece.
//   · Siempre saltable: «Ahora no» o jugar otra cosa cuentan como salto (con su día).
// progress.deepen = { at, count, recent: [clave], pending: clave|'', skips: { clave: ['AAAA-MM-DD'] } }. Puro.

import { deepStatus, deepKey } from './levels.js';
import { isEssentialDone, eraCrossed } from './essentials.js';
import { gateSteps } from './progress.js';
import { createRng } from './rng.js';
import { daysBetween } from './dates.js';

export const DEEPEN_EVERY = 3;      // pintores nuevos del camino entre propuesta y propuesta
export const ROTATION = 4;          // propuestas distintas antes de que una pueda repetirse
export const COOL_DAYS = 21;        // los saltos más antiguos ya no enfrían
export const COOL_FROM = 2;         // el primer salto no enfría: a partir del segundo, cada uno divide el peso
export const COOL_FLOOR = 0.15;     // lo más que se enfría (fracción del peso): nunca llega a cero
const ESSENTIAL_STEP = 2;           // peso de un imprescindible: 1 + 2 × su peso (3, 5 o 7; los demás, 1)
const BEHIND_BOOST = 2;             // imprescindible de una época ya cruzada sin él
const KEEP_SKIPS = 8;               // saltos guardados por nivel

export function deepenState(progress) {
  const d = progress.deepen && typeof progress.deepen === 'object' ? progress.deepen : {};
  return {
    at: Number(d.at) || 0,
    count: Number(d.count) || 0,
    recent: Array.isArray(d.recent) ? d.recent.filter((k) => typeof k === 'string') : [],
    pending: typeof d.pending === 'string' ? d.pending : '',
    skips: d.skips && typeof d.skips === 'object' ? d.skips : {},
  };
}

// Pintores del camino ya jugados: mide el avance.
export function pathPlayed(progress, index) {
  return gateSteps(progress, index.steps).filter((s) => s.type === 'artist' && (progress.artists?.[s.id]?.plays || 0) > 0).length;
}

// Niveles que se pueden proponer: abiertos o empezados y sin dominar, de pintores con el nivel 1 dominado.
export function deepenCandidates(progress, index) {
  const out = [];
  for (const [id, rec] of Object.entries(progress.artists || {})) {
    if (!rec?.mastered || !index.artist(id)) continue;
    for (const l of index.deepLevels(id)) {
      const st = deepStatus(progress, index, id, l.id);
      if (st === 'available' || st === 'started') out.push({ artistId: id, level: l.id, key: deepKey(id, l.id) });
    }
  }
  return out;
}

// Saltos de un nivel dentro de COOL_DAYS.
export function recentSkips(state, key, today) {
  const list = Array.isArray(state.skips[key]) ? state.skips[key] : [];
  return list.filter((d) => typeof d === 'string' && daysBetween(d, today) < COOL_DAYS).length;
}

// Peso de un candidato: base (imprescindible o no) × prioridad de lo que falta atrás × enfriamiento.
export function offerWeight(progress, index, c, today, state = deepenState(progress)) {
  const e = index.essential?.(c.artistId, c.level);
  let w = e ? 1 + ESSENTIAL_STEP * e.weight : 1;
  if (e && !isEssentialDone(progress, e) && crossedAfter(progress, index, e.movementId)) w *= BEHIND_BOOST;
  const n = Math.max(0, recentSkips(state, c.key, today) - (COOL_FROM - 1));
  return w * Math.max(COOL_FLOOR, 1 / (1 + n));
}

// ¿Ya entró en la época que sigue a esta?
function crossedAfter(progress, index, movementId) {
  const order = index.visibleMovements.map((m) => m.id);
  const next = order[order.indexOf(movementId) + 1];
  return Boolean(next) && eraCrossed(progress, index, next);
}

// Elige con rotación y peso. Determinista para un mismo estado y día.
export function pickOffer(progress, index, today, state = deepenState(progress)) {
  const all = deepenCandidates(progress, index);
  if (!all.length) return null;
  const last = state.recent[0];
  let pool = all.filter((c) => !state.recent.includes(c.key));
  if (!pool.length) pool = all.length > 1 ? all.filter((c) => c.key !== last) : all;
  const weights = pool.map((c) => offerWeight(progress, index, c, today, state));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = createRng(`deepen:${state.count}:${today}`).next() * total;
  for (let i = 0; i < pool.length; i += 1) {
    r -= weights[i];
    if (r < 0) return pool[i];
  }
  return pool[pool.length - 1];
}

// La propuesta que toca ahora: la que ya está a la vista (si sigue valiendo) o, tras DEEPEN_EVERY pintores nuevos, otra.
export function currentOffer(progress, index, today) {
  const state = deepenState(progress);
  const all = deepenCandidates(progress, index);
  const shown = state.pending && all.find((c) => c.key === state.pending);
  if (shown) return shown;
  if (pathPlayed(progress, index) - state.at < DEEPEN_EVERY) return null;
  return pickOffer(progress, index, today, state);
}

// La propuesta se ha enseñado: queda a la vista y cuenta para la rotación. Idempotente.
export function noteOffer(progress, index, key) {
  const state = deepenState(progress);
  if (state.pending === key) return progress;
  const recent = [key, ...state.recent.filter((k) => k !== key)].slice(0, ROTATION);
  return { ...progress, deepen: { ...state, pending: key, recent, at: pathPlayed(progress, index), count: state.count + 1 } };
}

// «Ahora no» (o jugar otra cosa): salto con su día; deja de estar a la vista.
export function skipOffer(progress, today) {
  const state = deepenState(progress);
  if (!state.pending) return progress;
  const key = state.pending;
  const list = Array.isArray(state.skips[key]) ? state.skips[key] : [];
  return { ...progress, deepen: { ...state, pending: '', skips: { ...state.skips, [key]: [...list, today].slice(-KEEP_SKIPS) } } };
}

// Al terminar una ronda: si era la propuesta, aceptada; si era otra cosa, la propuesta se ha saltado.
export function settleOffer(progress, result, today) {
  const state = deepenState(progress);
  if (!state.pending) return progress;
  const level = Number.isInteger(result?.level) ? result.level : 1;
  if (result?.kind === 'stage' && result.artistId && deepKey(result.artistId, level) === state.pending) {
    return { ...progress, deepen: { ...state, pending: '' } };
  }
  return skipOffer(progress, today);
}
