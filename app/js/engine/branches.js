// Ramas opcionales (por época, por escuela, gótico y estampa japonesa). Puro.
// Cada rama es una lista cronológica de pintores que se abre por tramos: un tramo se abre al llegar a su
// época en el camino común (nunca sale un pintor de una época que aún no se ha visto). Dentro de la rama
// se avanza de pintor en pintor; los que ya tienen etapa en el camino común siguen su estado de allí.

import { stepStatus, stepPassed } from './progress.js';

// ¿Ha llegado la jugadora a esa época? Su primera parada del camino está abierta.
export function movementReached(progress, index, movementId) {
  const first = index.stepsOf(movementId)[0];
  return Boolean(first) && stepStatus(progress, index, first) !== 'locked';
}

function artistState(progress, index, id) {
  if (index.pathIndex(id) >= 0) return stepStatus(progress, index, { type: 'artist', id });
  const rec = progress.artists?.[id];
  if (rec?.mastered) return 'mastered';
  return rec?.plays ? 'started' : 'idle';
}

const passed = (progress, index, id) => (index.pathIndex(id) >= 0
  ? stepPassed(progress, { type: 'artist', id })
  : Boolean(progress.artists?.[id] && (progress.artists[id].mastered || ((progress.artists[id].plays || 0) > 0 && (Number(progress.artists[id].best) || 0) >= 0.5))));

// Estado de cada pintor de la rama, en orden: 'locked' | 'available' | 'started' | 'mastered'.
// El de camino común refleja su parada; en los demás, el anterior (que no sea del camino) ha de estar superado.
export function branchStatus(progress, index, branchId) {
  const branch = index.branch(branchId);
  if (!branch) return [];
  const tramoOf = new Map(branch.tramos.flatMap((t) => t.artists.map((id) => [id, t.opensAt])));
  let previous = null;
  return branch.artists.map((id) => {
    const reached = movementReached(progress, index, tramoOf.get(id) || branch.opensAt);
    const onPath = index.pathIndex(id) >= 0;
    let status;
    if (onPath) status = stepStatus(progress, index, { type: 'artist', id });
    else {
      const s = artistState(progress, index, id);
      status = s === 'idle' ? (reached && (!previous || passed(progress, index, previous)) ? 'available' : 'locked') : s;
      previous = id;
    }
    return { artistId: id, status, opensAt: tramoOf.get(id) || branch.opensAt, reached };
  });
}

// Avance de una rama: pintores dominados y total.
export function branchProgress(progress, index, branchId) {
  const list = branchStatus(progress, index, branchId);
  return { total: list.length, mastered: list.filter((s) => s.status === 'mastered').length, open: list.some((s) => s.reached) };
}
