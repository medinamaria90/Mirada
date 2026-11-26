// Pintores conocidos del camino y las ramas (progress.roster). Puro y sin dependencias (va en el arranque).
// Cuando una actualización añade pintores, la app lo dice con gracia en vez de pillar por sorpresa:
//   known  — pintores del camino y ramas que esta partida ya tiene asumidos (lista de ids).
//   extra  — añadidos en un tramo que ya tenía superado: paradas extra que no frenan nada (engine/progress.js).
//   fresh  — llevan la etiqueta «Nuevo» hasta que se juegan o se abre su ficha.
//   told   — ya anunciados en el aviso del mapa (no se repite).
//   seed   — 'new' (partida nueva: todo conocido), 'legacy' (venía de antes: ver ADDED_2026_11) o 'done'.

// Llegaron (o subieron a maestros con parada) en la actualización del catálogo de noviembre de 2026. Las partidas que ya
// existían los ven como nuevos; no hay forma de saber su catálogo anterior y lo demás se da por conocido.
export const ADDED_2026_11 = [
  'masaccio', 'uccello', 'filippo-lippi', 'memling', 'bermejo', 'perugino', 'pontormo', 'parmigianino', 'bronzino',
  'arcimboldo', 'sanchez-cotan', 'hogarth', 'matisse', 'piero', 'van-der-weyden', 'holbein', 'gericault',
];

const PASS_MIN = 0.5;   // como UNLOCK_MIN del camino: superado con la mitad de aciertos

export const emptyRoster = (seed = 'new') => ({ seed, known: [], extra: [], fresh: [], told: [] });

// Pintores del camino (en orden) y de las ramas, sin repetir.
export function rosterIds(index) {
  const ids = [...index.path.map((a) => a.id), ...(index.branches || []).flatMap((b) => b.artists)];
  return [...new Set(ids)].filter((id) => index.artist(id));
}

const list = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);
const played = (rec) => Boolean(rec && (rec.mastered || (rec.plays || 0) > 0));
const passed = (rec) => Boolean(rec && (rec.mastered || ((rec.plays || 0) > 0 && (Number(rec.best) || 0) >= PASS_MIN)));

// Tramo de un pintor del camino: los de su época con su mismo `section` (o toda la época si no tiene).
function tramoOf(index, id) {
  const a = index.artist(id);
  return index.path.filter((x) => x.movementId === a.movementId && (x.section || '') === (a.section || '')).map((x) => x.id);
}

// ¿Llega detrás de lo ya superado? Del camino: todos los conocidos de su tramo dominados. Solo de rama: algún conocido
// propio de una de sus ramas, posterior a él, ya superado.
function arrivesBehind(progress, index, id, known) {
  const rec = (x) => progress.artists?.[x];
  if (index.pathIndex(id) >= 0) {
    const mates = tramoOf(index, id).filter((x) => known.has(x));
    return mates.length > 0 && mates.every((x) => rec(x)?.mastered);
  }
  return index.branchesOf(id).some((b) => b.artists.slice(b.artists.indexOf(id) + 1)
    .some((x) => known.has(x) && index.pathIndex(x) < 0 && passed(rec(x))));
}

// Pone al día la lista con el catálogo cargado. Devuelve el mismo progreso si no cambia nada.
export function reconcileRoster(progress, index) {
  const r = { ...emptyRoster(), ...(progress.roster || {}) };
  const all = rosterIds(index);
  let known = new Set(list(r.known));
  let changed = r.seed !== 'done';
  if (r.seed !== 'done') {
    const added = new Set(r.seed === 'legacy' ? ADDED_2026_11 : []);
    known = new Set(all.filter((id) => !added.has(id)));
  }
  const unknown = all.filter((id) => !known.has(id));
  const extra = list(r.extra);
  const fresh = list(r.fresh);
  if (unknown.length) {
    changed = true;
    const started = Object.values(progress.artists || {}).some(played);
    for (const id of unknown) {
      if (started) fresh.push(id);
      if (arrivesBehind(progress, index, id, known)) extra.push(id);
    }
    for (const id of unknown) known.add(id);
  }
  if (!changed) return progress;
  return { ...progress, roster: { ...r, seed: 'done', known: [...known], extra, fresh, told: list(r.told) } };
}

// Lleva la etiqueta «Nuevo»: añadido después de empezar y aún sin jugar ni abrir su ficha.
export function isFresh(progress, id) {
  return list(progress.roster?.fresh).includes(id) && !played(progress.artists?.[id]);
}

// Abrir su ficha (o jugarlo) le quita la etiqueta.
export function markRosterSeen(progress, id) {
  const fresh = list(progress.roster?.fresh);
  if (!fresh.includes(id)) return progress;
  return { ...progress, roster: { ...progress.roster, fresh: fresh.filter((x) => x !== id) } };
}

export function markRosterTold(progress, ids) {
  const told = list(progress.roster?.told);
  const add = ids.filter((id) => !told.includes(id));
  if (!add.length) return progress;
  return { ...progress, roster: { ...progress.roster, told: [...told, ...add] } };
}
