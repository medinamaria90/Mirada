// Pared de la portada de un cartel (ui/sign-cards.js): tres cuadros del grupo del cartel, como la de la presentación de
// una época. Puro, sin DOM. Se prefieren los que sus tarjetas no enseñan, uno por pintor y de los que se aprenden; si no
// llegan, se completa con el resto del grupo. El más conocido va en el centro.

export const WALL_SIZE = 3;
const SEP = '/';

// Pintores del grupo de un cartel: la rama entera, el tramo de una escuela («rama/época») o un tramo del camino común.
export function signGroup(index, kind, id) {
  if (kind === 'rama') return index.branch(id)?.artists || [];
  const [branchId, eraId] = String(id).split(SEP);
  if (eraId) return index.branch(branchId)?.tramos.find((t) => t.opensAt === eraId)?.artists || [];
  return index.path.filter((a) => a.section === id).map((a) => a.id);
}

const byFame = (a, b) => (b.fame || 0) - (a.fame || 0) || (a.id < b.id ? -1 : 1);

// Hasta WALL_SIZE obras, en el orden de la pared (izquierda, centro, derecha).
export function signWall(index, kind, id, sign) {
  const used = new Set((sign?.cards || []).map((c) => c && c.artwork));
  const works = signGroup(index, kind, id).flatMap((a) => index.worksOf(a)).filter((w) => w && w.img);
  const tiers = [
    works.filter((w) => !used.has(w.id) && w.role === 'learn'),
    works.filter((w) => !used.has(w.id) && w.role !== 'learn'),
    works.filter((w) => used.has(w.id)),
  ].map((t) => t.sort(byFame));
  const picks = [];
  const take = (w) => { if (picks.length < WALL_SIZE && !picks.includes(w)) picks.push(w); };
  // Antes que nada, cuadros que las tarjetas no enseñan: primero uno por pintor, después lo que falte. Solo si no
  // llegan, los de las tarjetas.
  const fresh = [...tiers[0], ...tiers[1]];
  for (const group of [fresh, tiers[2]]) {
    group.forEach((w) => { if (!picks.some((p) => p.artistId === w.artistId)) take(w); });
    group.forEach(take);
  }
  return picks.length === WALL_SIZE ? [picks[1], picks[0], picks[2]] : picks;
}
