// Aprobar abre el siguiente nivel (decisión de María, 28/11; engine/levels.js). Antes, un nivel solo quedaba superado
// (`mastered`) si además se habían visto todas sus obras; el estado no guardaba el aprobado a secas, pero sí la mejor nota
// (`best`). Criterio: un nivel jugado con la mejor nota ≥ LEVELS_MASTERY (el 75 % que pide la ronda) se da por superado,
// con la medalla del pintor (fecha: su último día). Los cuadros sin ver siguen pendientes y salen primero después. Puro.
//
// Como state/level-order.js: se aplica al cargar (schema.migrate), sin subir la versión del estado. La marca
// progress.passRule dice que el estado ya usa la regla nueva.

import { LEVELS_MASTERY } from '../engine/levels.js';

export const PASS_RULE = 1;

const isPlain = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);
const passed = (rec) => isPlain(rec) && !rec.mastered && (Number(rec.plays) || 0) > 0 && (Number(rec.best) || 0) >= LEVELS_MASTERY;

export function migratePassRule(state) {
  if (!isPlain(state) || !isPlain(state.progress)) return state;
  const progress = state.progress;
  if ((Number(progress.passRule) || 0) >= PASS_RULE) return state;
  const artists = isPlain(progress.artists) ? { ...progress.artists } : progress.artists;
  const deep = isPlain(progress.deep) ? { ...progress.deep } : progress.deep;
  const medals = isPlain(progress.medals) ? { ...progress.medals } : progress.medals;
  if (isPlain(artists)) {
    for (const [id, rec] of Object.entries(artists)) {
      if (!passed(rec)) continue;
      artists[id] = { ...rec, mastered: true };
      if (isPlain(medals) && !medals[`artist-${id}`] && typeof rec.last === 'string') medals[`artist-${id}`] = rec.last;
    }
  }
  if (isPlain(deep)) for (const [key, rec] of Object.entries(deep)) if (passed(rec)) deep[key] = { ...rec, mastered: true };
  return { ...state, progress: { ...progress, artists, deep, medals, passRule: PASS_RULE } };
}
