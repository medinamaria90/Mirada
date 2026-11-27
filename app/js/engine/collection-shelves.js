// Colección como estanterías: «Lo último» (las obras vistas más recientes) y una fila por época con todos sus pintores,
// primero los conocidos y después los que esperan (bloqueados: nombre y sello, sin ninguna obra suya). Puro.

import { movementsChrono } from './movements.js';
import { unlockedMap } from './collection.js';
import { seenOf, painterState, coverWork } from './painters.js';

export const RECENT_MAX = 12;

// Obras vistas, las más recientes primero (las vistas en una ronda sin día van detrás, las últimas del catálogo antes).
export function seenWorksByRecent(progress, index) {
  const owned = unlockedMap(progress, index);
  const order = new Map(index.artworks.map((w, i) => [w.id, i]));
  return Object.keys(owned)
    .map((id) => index.artwork(id))
    .sort((a, b) => (owned[a.id] < owned[b.id] ? 1 : owned[a.id] > owned[b.id] ? -1 : order.get(b.id) - order.get(a.id)));
}

export const recentWorks = (progress, index, max = RECENT_MAX) => seenWorksByRecent(progress, index).slice(0, max);

// Dónde se conoce a un pintor que aún no has visto: en el camino o en una rama (la primera que lo tenga).
// { kind: 'path' } | { kind: 'branch', id, name }
export function whereToMeet(index, artist) {
  if (!artist.onPath && artist.branches?.length) {
    const branch = index.branch(artist.branches[0]);
    if (branch) return { kind: 'branch', id: branch.id, name: branch.name };
  }
  return { kind: 'path' };
}

// Una fila por época (orden cronológico) con sus pintores: [{ movement, known, total, painters: [{ artist, state:
// 'mastered' | 'started' | 'locked', seen, total, cover }] }]. Primero los conocidos (por nacimiento) y después los
// bloqueados en el orden en que llegan en el camino (los de ramas, al final). Épocas sin pintores con obras, fuera.
export function eraShelves(progress, index) {
  const shelves = [];
  for (const movement of movementsChrono(index)) {
    const rows = index.artistsOf(movement.id).filter((a) => index.worksOf(a.id).length > 0).map((artist) => {
      const state = painterState(progress, index, artist.id);
      const seen = state === 'new' ? [] : seenOf(progress, index, artist.id);
      return { artist, state: state === 'new' ? 'locked' : state, seen: seen.length, total: index.worksOf(artist.id).length, cover: coverWork(seen) };
    });
    if (!rows.length) continue;
    const byBorn = (a, b) => (a.artist.born || 0) - (b.artist.born || 0) || a.artist.order - b.artist.order;
    const pathPos = (r) => { const i = index.pathIndex(r.artist.id); return i < 0 ? Infinity : i; };
    const known = rows.filter((r) => r.state !== 'locked').sort(byBorn);
    const locked = rows.filter((r) => r.state === 'locked').sort((a, b) => pathPos(a) - pathPos(b) || byBorn(a, b));
    shelves.push({ movement, known: known.length, total: rows.length, painters: [...known, ...locked] });
  }
  return shelves;
}

// Lo que busca el buscador: pintores conocidos y sus obras vistas, y los pintores aún por conocer (sin obras).
// { artists: [{ id, name, thumbId }], works: [{ id, title, artistId }], locked: [{ id, name }] }
export function searchPool(progress, index) {
  const owned = unlockedMap(progress, index);
  const artists = [];
  const works = [];
  const locked = [];
  const recent = seenWorksByRecent(progress, index);
  for (const a of index.artists) {
    if (!index.worksOf(a.id).length) continue;
    const mine = recent.filter((w) => w.artistId === a.id);
    if (!mine.length && painterState(progress, index, a.id) === 'new') { locked.push({ id: a.id, name: a.name }); continue; }
    artists.push({ id: a.id, name: a.name, thumbId: mine[0]?.id || null });
    for (const w of mine) if (w.id in owned) works.push({ id: w.id, title: w.title, artistId: a.id });
  }
  return { artists, works, locked };
}
