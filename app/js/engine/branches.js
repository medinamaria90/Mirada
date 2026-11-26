// Ramas opcionales (por época, por escuela, gótico y estampa japonesa). Puro.
// Cada rama es una lista cronológica de pintores que se abre por tramos. Regla de apertura (ronda 2 del mapa):
// un tramo de rama se abre al DOMINAR EL PRIMER TRAMO de su época en el camino común (sus paradas hasta el
// primer cambio de `section`; si la época no tiene tramos, su primera parada). Nunca el primer día, nunca un
// pintor de una época aún no vista. Dentro de la rama se avanza de pintor en pintor (el anterior, con la mitad
// de aciertos); los que ya tienen etapa en el camino común siguen su estado de allí.
// Una sola regla de «se puede jugar» para el camino y las ramas: playStatus (la usan la ruta, la ficha y el mapa).

import { stepStatus, stepPassed, gateSteps } from './progress.js';

// ¿Ha llegado la jugadora a esa época? Su primera parada del camino está abierta.
export function movementReached(progress, index, movementId) {
  const first = index.stepsOf(movementId)[0];
  return Boolean(first) && stepStatus(progress, index, first) !== 'locked';
}

// Primer tramo de una época en el camino común.
export function firstTramo(index, movementId) {
  const steps = index.stepsOf(movementId);
  const section = steps[0]?.type === 'artist' ? index.artist(steps[0].id)?.section : null;
  if (!section) return steps.slice(0, 1);
  const end = steps.findIndex((s) => s.type !== 'artist' || index.artist(s.id)?.section !== section);
  return end < 0 ? steps : steps.slice(0, end);
}

// Paradas del primer tramo de la época aún sin dominar (lo que falta para abrir sus tramos de rama). Las paradas
// extra (pintores añadidos en un tramo ya superado) no cuentan.
export function tramoPending(progress, index, movementId) {
  return gateSteps(progress, firstTramo(index, movementId)).filter((s) => stepStatus(progress, index, s) !== 'mastered');
}

export function tramoOpen(progress, index, movementId) {
  return gateSteps(progress, firstTramo(index, movementId)).length > 0 && !tramoPending(progress, index, movementId).length;
}

function artistState(progress, id) {
  const rec = progress.artists?.[id];
  if (rec?.mastered) return 'mastered';
  return rec?.plays ? 'started' : 'idle';
}

const passed = (progress, index, id) => (index.pathIndex(id) >= 0
  ? stepPassed(progress, { type: 'artist', id })
  : Boolean(progress.artists?.[id] && (progress.artists[id].mastered || ((progress.artists[id].plays || 0) > 0 && (Number(progress.artists[id].best) || 0) >= 0.5))));

// Estado de cada pintor de la rama, en orden: 'locked' | 'available' | 'started' | 'mastered'.
// El de camino común (onPath) refleja su parada; en los demás, su tramo ha de estar abierto y todos los
// propios anteriores de esta rama, superados (no se salta a nadie aunque se haya jugado desde otra rama).
export function branchStatus(progress, index, branchId) {
  const branch = index.branch(branchId);
  if (!branch) return [];
  const tramoOf = new Map(branch.tramos.flatMap((t) => t.artists.map((id) => [id, t.opensAt])));
  let clear = true;
  return branch.artists.map((id) => {
    const opensAt = tramoOf.get(id) || branch.opensAt;
    const reached = tramoOpen(progress, index, opensAt);
    const onPath = index.pathIndex(id) >= 0;
    let status;
    if (onPath) status = stepStatus(progress, index, { type: 'artist', id });
    else {
      // Extra (añadido detrás de pintores ya superados): se juega en cuanto su tramo está abierto y no frena a nadie.
      const extra = progress.roster?.extra?.includes?.(id);
      const s = artistState(progress, id);
      status = s === 'idle' ? (reached && (clear || extra) ? 'available' : 'locked') : s;
      if (!extra) clear = clear && passed(progress, index, id);
    }
    return { artistId: id, status, opensAt, reached, onPath };
  });
}

// Avance de una rama: sus pintores propios (los del camino común cuentan allí), dominados y si está abierta.
export function branchProgress(progress, index, branchId) {
  const branch = index.branch(branchId);
  const own = branchStatus(progress, index, branchId).filter((s) => !s.onPath);
  return {
    total: own.length,
    mastered: own.filter((s) => s.status === 'mastered').length,
    open: Boolean(branch) && tramoOpen(progress, index, branch.opensAt),
  };
}

// Estado de un pintor dentro de una rama concreta (si la rama no lo tiene, null). Desde una rama, la ruta, la
// ficha y el resultado usan este y no el mejor de todas sus ramas.
export function statusInBranch(progress, index, artistId, branchId) {
  const row = index.branch(branchId) ? branchStatus(progress, index, branchId).find((r) => r.artistId === artistId) : null;
  return row ? row.status : null;
}

// Qué falta para abrir a un pintor cerrado dentro de una rama: las paradas del primer tramo de su época sin
// dominar o el propio de la rama, anterior a él, aún sin superar. { pending: [steps], before: artistId | null }
export function branchLockReason(progress, index, artistId, branchId) {
  const rows = branchStatus(progress, index, branchId);
  const row = rows.find((r) => r.artistId === artistId);
  if (!row || row.status !== 'locked') return null;
  if (!row.reached) return { pending: tramoPending(progress, index, row.opensAt), before: null };
  const before = rows.slice(0, rows.indexOf(row)).filter((r) => !r.onPath && !progress.roster?.extra?.includes?.(r.artistId)).find((r) => !passed(progress, index, r.artistId));
  return { pending: [], before: before ? before.artistId : null };
}

// Estado jugable entrando desde una rama (si se indica y lo contiene) o, si no, el de playStatus.
export function playStatusFrom(progress, index, artistId, branchId = '') {
  const inBranch = branchId ? statusInBranch(progress, index, artistId, branchId) : null;
  return inBranch || playStatus(progress, index, artistId);
}

const PLAY_ORDER = ['mastered', 'started', 'available'];

// Estado jugable de un pintor: su parada del camino o, si no tiene, el mejor de sus ramas.
// null: no se juega en ningún sitio. 'locked': aún cerrado. Lo demás se puede jugar.
export function playStatus(progress, index, artistId) {
  if (index.pathIndex(artistId) >= 0) return stepStatus(progress, index, { type: 'artist', id: artistId });
  const rows = index.branchesOf(artistId)
    .map((b) => branchStatus(progress, index, b.id).find((r) => r.artistId === artistId))
    .filter(Boolean);
  if (!rows.length) return null;
  return PLAY_ORDER.find((s) => rows.some((r) => r.status === s)) || 'locked';
}

export function canPlay(progress, index, artistId) {
  const s = playStatus(progress, index, artistId);
  return Boolean(s) && s !== 'locked';
}

// Rama desde la que se juega a un pintor: la indicada (si lo contiene) o, si no, la más concreta que lo tenga
// (medieval/estampa, luego escuela y por último «Descubre…», que reúne a casi todos los compartidos).
const SPECIFIC = { rama: 0, escuela: 1, epoca: 2 };
export function branchOfRound(index, artistId, branchId = '') {
  const own = index.branchesOf(artistId);
  return own.find((b) => b.id === branchId) || own.slice().sort((a, b) => (SPECIFIC[a.kind] ?? 3) - (SPECIFIC[b.kind] ?? 3))[0] || null;
}

// Tras una ronda de un pintor de rama: su rama (la de origen), el avance (pintores propios dominados) y el
// siguiente pintor propio ya abierto, si lo hay. null si el pintor está en el camino común o no es de ninguna rama.
export function branchAfterRound(progress, index, artistId, branchId = '') {
  const onPath = index.pathIndex(artistId) >= 0;
  // Uno del camino común solo es «de rama» si se entra desde una rama que lo tiene.
  if (onPath && !(branchId && index.branch(branchId)?.artists.includes(artistId))) return null;
  const branch = branchOfRound(index, artistId, branchId);
  if (!branch) return null;
  const all = branchStatus(progress, index, branch.id);
  const at = all.findIndex((r) => r.artistId === artistId);
  const rows = all.filter((r) => !r.onPath);
  const next = all.slice(at + 1).find((r) => !r.onPath && (r.status === 'available' || r.status === 'started')) || null;
  return { branch, mastered: rows.filter((r) => r.status === 'mastered').length, total: rows.length, next: next ? next.artistId : null };
}
