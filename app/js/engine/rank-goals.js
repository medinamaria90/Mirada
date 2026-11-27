// Lo que pide el siguiente rango, condición por condición (cumplidas y pendientes), y los pintores con los
// que se puede cumplir una condición de niveles «a fondo» ahora mismo. Puro.

import { deepStatus, deepRecord, pendingWorks } from './levels.js';
import { RANKS } from './ranks.js';

// Cifras de XP con punto de miles también en las de cuatro cifras («1.932», no «1932», que parecía un año).
export const fmtXp = (n) => n.toLocaleString('es-ES', { useGrouping: 'always' });
const ORDER = ['xp', 'deep', 'eras', 'grand', 'complete'];

// Nombre corto de cada condición, en forma de meta («Un nivel «a fondo»»), para la fila del perfil. Un «gran maestro» va con
// su explicación al lado (los pintores más grandes del camino).
export const GRAND_TEXT = 'un gran maestro (los más grandes, como Rafael)';
const LABEL = {
  xp: (n) => `${fmtXp(n)} XP`,
  deep: (n) => (n === 1 ? 'Un nivel «a fondo»' : `${n} niveles «a fondo»`),
  eras: (n) => `«A fondo» en ${n === 1 ? 'una época' : `${n} épocas`}`,
  grand: (n, upTo) => (n === 1 ? `El nivel ${upTo} de ${GRAND_TEXT}` : `El nivel ${upTo} de ${n} grandes maestros`),
  complete: (n) => (n === 1 ? `Todos los niveles de ${GRAND_TEXT}` : `Todos los niveles de ${n} grandes maestros`),
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

// ¿Superar este nivel abierto cumple de verdad un paso más de la condición `key`? «deep»: cualquiera. «eras»: si su
// época aún no tiene ningún «a fondo». «grand»: el nivel que lleva a un gran maestro justo a `upTo`. «complete»: el último
// de un gran maestro.
function counts(index, key, rank, a, level, deepEras) {
  if (key === 'eras') return !deepEras.has(a.movementId);
  if (key === 'grand') return a.category === 'gran-maestro' && level === rank.grand.upTo;
  if (key === 'complete') return a.category === 'gran-maestro' && level === index.deepLevels(a.id).at(-1)?.id;
  return key === 'deep';
}

// Niveles «a fondo» que, si se aprueban, suman a la condición `key` del rango `rank`: [{ artistId, level, pending, best }],
// del más cerca al más lejos (primero los ya empezados con mejor nota, después los que piden ver menos cuadros). Vacío si
// ninguno cuenta ahora (whyNoChoice lo explica).
export function deepChoices(progress, index, key, rank) {
  const deepEras = new Set(index.artists.filter((a) => index.deepLevels(a.id).some((l) => deepStatus(progress, index, a.id, l.id) === 'mastered')).map((a) => a.movementId));
  const out = [];
  for (const a of index.artists) {
    const level = openLevel(progress, index, a.id);
    if (!level || !counts(index, key, rank, a, level, deepEras)) continue;
    const rec = deepRecord(progress, a.id, level);
    out.push({ artistId: a.id, level, pending: pendingWorks(progress, index, a.id, level).length, best: Number(rec?.best) || 0, played: (rec?.plays || 0) > 0 });
  }
  const pathAt = (id) => { const i = index.pathIndex(id); return i < 0 ? Infinity : i; };
  return out.sort((x, y) => (y.played - x.played) || (y.best - x.best) || (x.pending - y.pending) || (pathAt(x.artistId) - pathAt(y.artistId)))
    .map(({ played, ...rest }) => rest);
}

// Por qué ninguna elección cuenta todavía, en una línea humana (para no poner un botón que no cumple).
export function whyNoChoice(key, rank) {
  if (key === 'grand') return rank.grand.upTo > 2 ? `Antes, llega al nivel ${rank.grand.upTo - 1} de un gran maestro` : 'Termina la parada de un gran maestro y se abre su nivel 2';
  if (key === 'complete') return 'Antes, llega al último nivel de un gran maestro';
  if (key === 'eras') return 'Termina la parada de un pintor de otra época y se abre su nivel 2';
  return 'Termina una parada del camino y se abre su nivel 2';
}

// La acción recomendada para el siguiente rango: un nivel concreto que cuenta para el mayor número de condiciones
// pendientes (y, a igualdad, el de la condición a la que menos le falta y el más cerca). Las condiciones de XP llegan
// solas jugando, así que solo se recomienda «Jugar» cuando no queda otra. `conds`: rankConditions(rank.next, stats).
// { key, choice: { artistId, level } | null, keys: [condiciones a las que suma] } o null (sin nada pendiente).
export function rankFocus(progress, index, rank, conds) {
  const pending = conds.filter((c) => !c.done);
  if (!pending.length) return null;
  const left = Object.fromEntries(pending.map((c) => [c.key, c.need - c.have]));
  const byChoice = new Map();
  pending.filter((c) => c.key !== 'xp').forEach((c) => deepChoices(progress, index, c.key, rank).forEach((ch, i) => {
    const id = `${ch.artistId}:${ch.level}`;
    const row = byChoice.get(id) || { choice: { artistId: ch.artistId, level: ch.level }, keys: [], rank: i };
    row.keys.push(c.key);
    row.rank = Math.min(row.rank, i);
    byChoice.set(id, row);
  }));
  const best = [...byChoice.values()].sort((a, b) => (b.keys.length - a.keys.length)
    || (Math.min(...a.keys.map((k) => left[k])) - Math.min(...b.keys.map((k) => left[k]))) || (a.rank - b.rank))[0];
  if (best) return { key: ORDER.find((k) => best.keys.includes(k)), choice: best.choice, keys: best.keys };
  const xp = pending.find((c) => c.key === 'xp');
  return { key: xp ? 'xp' : pending[0].key, choice: null, keys: [xp ? 'xp' : pending[0].key] };
}
