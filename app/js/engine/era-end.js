// Cierre de época (y de rama): el momento de «capítulo terminado». Puro.
// Una época del camino se cierra al ganar su medalla de movimiento (todas sus paradas dominadas; la Prueba de época también
// la da, pero solo se abre después); una rama, al dominar todos sus pintores propios (engine/branches.js branchProgress).
// Cada cierre se enseña una sola vez: progress.closures = { seeded, seen: { clave: 'AAAA-MM-DD' } }, clave = id de la época o
// «rama-<id>». Quien ya traía épocas cerradas de antes no los ve de golpe (seedClosures): como mucho, el de la última, y solo si
// aún no ha entrado en la época siguiente.

import { needsIntro, stepStatus } from './progress.js';
import { branchProgress } from './branches.js';

export const BRANCH_KEY = 'rama-';
export const ERA = 'era';
export const BRANCH = 'branch';
export const SEED_MARK = 'antes';

export const closureKey = (type, id) => (type === BRANCH ? `${BRANCH_KEY}${id}` : id);
export const closureRoute = (key) => `cierre-${key}`;

// Clave → { type, id } (o null si no es de nada que exista).
export function parseClosureKey(index, key) {
  const k = String(key || '');
  if (k.startsWith(BRANCH_KEY) && index.branch(k.slice(BRANCH_KEY.length))) return { type: BRANCH, id: k.slice(BRANCH_KEY.length), key: k };
  if (index.visibleMovements.some((m) => m.id === k)) return { type: ERA, id: k, key: k };
  return null;
}

// Épocas del camino cerradas, en orden del camino.
export function closedEras(progress, index) {
  return index.visibleMovements.filter((m) => progress.medals?.[`movement-${m.id}`]).map((m) => m.id);
}

// Ramas terminadas: todos sus pintores propios dominados.
export function closedBranches(progress, index) {
  return (index.branches || []).filter((b) => {
    const bp = branchProgress(progress, index, b.id);
    return bp.total > 0 && bp.mastered === bp.total;
  }).map((b) => b.id);
}

export function isClosed(progress, index, closure) {
  return closure.type === BRANCH ? closedBranches(progress, index).includes(closure.id) : closedEras(progress, index).includes(closure.id);
}

// Época siguiente del camino (null tras la última).
export function eraAfter(index, movementId) {
  const list = index.visibleMovements;
  const at = list.findIndex((m) => m.id === movementId);
  return at >= 0 && at < list.length - 1 ? list[at + 1].id : null;
}

// Primera vez con cierres: los de antes cuentan como vistos, salvo el de la última época cerrada si aún no ha cruzado a la
// siguiente (o era la última del camino). Devuelve el mismo objeto si ya estaba sembrado.
export function seedClosures(progress, index) {
  if (progress.closures?.seeded) return progress;
  const seen = { ...(progress.closures?.seen || {}) };
  const eras = closedEras(progress, index);
  const last = eras[eras.length - 1];
  const after = last ? eraAfter(index, last) : null;
  const keepLast = Boolean(last) && (!after || needsIntro(progress, index, after));
  for (const id of eras) if (!(keepLast && id === last) && !seen[id]) seen[id] = SEED_MARK;
  for (const id of closedBranches(progress, index)) seen[closureKey(BRANCH, id)] ||= SEED_MARK;
  return { ...progress, closures: { seeded: true, seen } };
}

// El cierre que toca enseñar: la última época cerrada sin ver y, si no hay, la primera rama terminada sin ver. null si nada.
export function pendingClosure(progress, index) {
  const p = seedClosures(progress, index);
  const seen = p.closures.seen;
  const eras = closedEras(p, index).filter((id) => !seen[id]);
  if (eras.length) { const id = eras[eras.length - 1]; return { type: ERA, id, key: closureKey(ERA, id) }; }
  const id = closedBranches(p, index).find((b) => !seen[closureKey(BRANCH, b)]);
  return id ? { type: BRANCH, id, key: closureKey(BRANCH, id) } : null;
}

// Marca un cierre como visto (y siembra antes si hacía falta).
export function markClosureSeen(progress, index, key, today) {
  const p = seedClosures(progress, index);
  if (p.closures.seen[key]) return p;
  return { ...p, closures: { ...p.closures, seen: { ...p.closures.seen, [key]: today } } };
}

// Nombre corto de una época para un botón («Manierismo y Renacimiento del Norte» → «Manierismo»).
export const eraShort = (movement) => String(movement?.name || '').split(' y ')[0];

// Título de la pantalla: «Has terminado el Renacimiento» / «Has terminado la rama «Escuela rusa»».
export function closureTitle(index, closure) {
  if (closure.type === BRANCH) return `Has terminado la rama «${index.branch(closure.id)?.name || ''}»`;
  return `Has terminado el ${index.movement(closure.id)?.name || ''}`;
}

// Botón de la guía (resultado y mapa) que lleva al cierre.
export function closureLabel(index, closure) {
  return closure.type === BRANCH ? 'Cerrar la rama' : `Cerrar el ${eraShort(index.movement(closure.id))}`;
}

// Pintores del capítulo: los de la época en el camino o los de la rama.
export function closurePainters(index, closure) {
  const ids = closure.type === BRANCH ? index.branch(closure.id)?.artists || [] : index.stageArtists(closure.id).map((a) => a.id);
  return ids.map((id) => index.artist(id)).filter(Boolean);
}

// A dónde lleva «Cruzar a <época>»: su medallón y presentación si aún no ha entrado; si ya entró, su parada abierta. null si
// esa época aún no se ha alcanzado (en una rama puede pasar).
export function crossRoute(progress, index, movementId, stepRoute) {
  const steps = index.stepsOf(movementId);
  if (!steps.length) return null;
  if (stepStatus(progress, index, steps[0]) === 'locked') return null;
  const open = steps.find((s) => ['available', 'started'].includes(stepStatus(progress, index, s)));
  if (needsIntro(progress, index, movementId)) return `movimiento-${movementId}`;
  return open ? stepRoute(open) : 'inicio';
}
