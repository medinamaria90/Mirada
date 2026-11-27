// Lo que pide el siguiente rango, condición por condición (cumplidas y pendientes), y los pintores con los
// que se puede cumplir una condición de niveles «a fondo» ahora mismo. Puro.

import { deepStatus } from './levels.js';
import { RANKS } from './ranks.js';

const fmt = (n) => n.toLocaleString('es-ES');
const ORDER = ['xp', 'deep', 'eras', 'grand', 'complete'];

// Nombre corto de cada condición, en forma de meta («Un nivel «a fondo»»), para la fila del perfil.
const LABEL = {
  xp: (n) => `${fmt(n)} XP`,
  deep: (n) => (n === 1 ? 'Un nivel «a fondo»' : `${n} niveles «a fondo»`),
  eras: (n) => `«A fondo» en ${n === 1 ? 'una época' : `${n} épocas`}`,
  grand: (n, upTo) => `${n === 1 ? 'Un gran maestro' : `${n} grandes maestros`} hasta el nivel ${upTo}`,
  complete: (n) => (n === 1 ? 'Un gran maestro completo' : `${n} grandes maestros completos`),
};

const wantOf = (rank) => ({ xp: rank.xp, deep: rank.deep, eras: rank.eras, grand: rank.grand?.count, complete: rank.complete });
const haveOf = (rank, stats) => ({
  xp: stats.xp, deep: stats.deep, eras: stats.eras, complete: stats.complete,
  grand: rank.grand ? stats.grand.filter((v) => v >= rank.grand.upTo).length : 0,
});

// Condiciones de un rango (las que pide, en orden fijo): { key, label, have, need, done }. Sin `stats`,
// solo las etiquetas (para la lista de rangos).
export function rankConditions(rank, stats = null) {
  const want = wantOf(rank);
  const have = stats ? haveOf(rank, stats) : {};
  return ORDER.filter((k) => want[k] && (k !== 'xp' || want.xp > 0)).map((key) => {
    const need = want[key];
    const h = stats ? Math.max(0, have[key] || 0) : 0;
    return { key, label: LABEL[key](need, rank.grand?.upTo), have: h, need, done: Boolean(stats) && h >= need };
  });
}

// Los ocho rangos con lo que pide cada uno (la primera, sin condiciones).
export function rankLadder() {
  return RANKS.map((r, i) => ({ index: i, name: r.name, conds: rankConditions(r) }));
}

// Primer nivel «a fondo» abierto (disponible o empezado) de un pintor, o null.
function openLevel(progress, index, artistId) {
  for (const l of index.deepLevels(artistId)) {
    const s = deepStatus(progress, index, artistId, l.id);
    if (s === 'mastered') continue;
    return s === 'locked' ? null : l.id;
  }
  return null;
}

// Pintores con un nivel «a fondo» que ahora mismo acerca la condición `key` del rango `rank`:
// [{ artistId, level }], primero los del camino y en su orden. Vacío si no hay ninguno (falta dominar pintores).
export function deepChoices(progress, index, key, rank) {
  const deepEras = new Set(index.artists.filter((a) => index.deepLevels(a.id).some((l) => deepStatus(progress, index, a.id, l.id) === 'mastered')).map((a) => a.movementId));
  const fits = (a, level) => {
    if (key === 'eras') return !deepEras.has(a.movementId);
    if (key === 'grand') return a.category === 'gran-maestro' && level <= rank.grand.upTo;
    if (key === 'complete') return a.category === 'gran-maestro';
    return true;
  };
  const ordered = [...index.path, ...index.artists.filter((a) => index.pathIndex(a.id) < 0)];
  const out = [];
  for (const a of ordered) {
    const level = openLevel(progress, index, a.id);
    if (level && fits(a, level)) out.push({ artistId: a.id, level });
  }
  // «Épocas»: si todas las épocas a mano ya tienen su «a fondo», cualquier nivel abierto sigue sumando XP y niveles.
  return out.length || key !== 'eras' ? out : deepChoices(progress, index, 'deep', rank);
}
