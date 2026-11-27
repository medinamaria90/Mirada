// Lo desbloqueado de la Colección: qué obras se han visto y las de los invitados de un movimiento. Puro.

// Obras desbloqueadas = las que se han visto: reconocidas (colección) o enseñadas en alguna ronda. Es la misma
// definición que la ficha del pintor (engine/painters.js `seenOf`). { id: día | '' }
export function unlockedMap(progress, index) {
  const out = {};
  for (const [id, day] of Object.entries(progress.collection || {})) if (index.artwork(id)) out[id] = day || '';
  for (const rec of Object.values(progress.artists || {})) for (const id of rec?.works || []) if (index.artwork(id) && !(id in out)) out[id] = '';
  return out;
}

// Una sola regla para «invitado» en toda la Colección.
export const isGuest = (artist) => artist.category === 'invitado';

// Invitados de un movimiento juntos (`#obras-invitados-<movimiento>`): sus obras vistas en orden cronológico y cuántas
// tienen entre todos. { works, total }
export function guestWorks(progress, index, movementId) {
  const owned = unlockedMap(progress, index);
  const guests = index.artistsOf(movementId).filter(isGuest);
  const all = guests.flatMap((a) => index.worksOf(a.id));
  return { works: all.filter((w) => w.id in owned).sort((a, b) => (a.yearSort || 0) - (b.yearSort || 0)), total: all.length };
}
