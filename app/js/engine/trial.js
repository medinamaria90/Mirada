// Modo prueba: una copia del progreso con todo abierto (épocas, ramas, paradas, salas y niveles a fondo).
// Puro: devuelve progreso nuevo y no toca el original.

const TRIAL_DAY = '2000-01-01';
const doneRecord = () => ({ plays: 1, best: 1, mastered: true, last: TRIAL_DAY });

export function unlockAll(progress, index) {
  const artists = { ...progress.artists };
  const salas = { ...progress.salas };
  const deep = { ...progress.deep };
  for (const a of index.artists) {
    artists[a.id] = { ...artists[a.id], ...doneRecord() };
    for (const l of index.deepLevels(a.id)) deep[`${a.id}:${l.id}`] = { ...deep[`${a.id}:${l.id}`], ...doneRecord() };
  }
  for (const s of index.steps) if (s.type === 'sala') salas[s.id] = { ...salas[s.id], ...doneRecord() };
  return { ...progress, artists, salas, deep };
}

/** Estado de prueba a partir del real. */
export const trialState = (state, index) => ({ ...state, progress: unlockAll(state.progress, index) });
