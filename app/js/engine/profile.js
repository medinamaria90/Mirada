// Datos del perfil que no necesitan DOM: avance al siguiente rango, cuadro de la tarjeta y avatar, metal
// de los logros, inicial del avatar y último resultado del test. Puro.

import { artKey } from './srs.js';
import { STREAK_MEDALS } from './progress.js';
import { TEST_LEVELS } from '../test/resultado.js';
import { rankConditions, fmtXp } from './rank-goals.js';

// Metal de cada logro (oro, plata o bronce) según lo difícil que es.
export const TIERS = ['gold', 'silver', 'bronze'];
export const TIER_NAMES = { gold: 'Oro', silver: 'Plata', bronze: 'Bronce' };

export function medalTier(id) {
  const [kind, ...rest] = String(id).split('-');
  const ref = rest.join('-');
  if (kind === 'eye') return 'gold';
  if (kind === 'streak') {
    const i = STREAK_MEDALS.indexOf(Number(ref));
    return i < 0 ? 'bronze' : TIERS[Math.max(0, 2 - i)];
  }
  if (kind === 'movement' || id === 'daily-perfect') return 'silver';
  return 'bronze';
}

// Los logros de cada clase («artist», «eye», «streak»…) se reparten por turnos para que la muestra no
// sean ocho «Ojo de…» seguidos. `ids` ya viene ordenado por importancia dentro de cada clase.
export function interleaveByKind(ids) {
  const groups = new Map();
  for (const id of ids) {
    const kind = String(id).split('-')[0];
    if (!groups.has(kind)) groups.set(kind, []);
    groups.get(kind).push(id);
  }
  const lists = [...groups.values()];
  const out = [];
  for (let i = 0; out.length < ids.length; i++) for (const l of lists) if (i < l.length) out.push(l[i]);
  return out;
}

// Cifra para los números grandes: exacta hasta 9 999, y «31,2 mil» / «9,9 M» a partir de ahí (nunca se parte).
export function compactNumber(n) {
  const v = Math.max(0, Math.round(Number(n) || 0));
  // Siempre hacia abajo: 9 999 999 es «9,9 M», no «10 M» (un hito que aún no se ha alcanzado).
  const one = (x) => (Math.floor(x * 10) / 10).toFixed(1).replace('.', ',').replace(/,0$/, '');
  if (v < 10000) return String(v);
  if (v < 1000000) return `${one(v / 1000)} mil`;
  return `${one(v / 1000000)} M`;
}

// Lo que pide el siguiente rango: todas sus condiciones, cumplidas y pendientes (`conds`, para pintar una
// fila por condición: el rango no sube hasta cumplirlas todas, así que una barra única engañaba) y, de las
// pendientes, lo que falta en una frase (`parts`). Rango máximo: sin siguiente ni nada pendiente.
export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const NEED_TEXT = {
  xp: (n) => `Ganar ${fmtXp(n)} XP más`,
  deep: (n) => `Dominar ${plural(n, 'nivel «a fondo»', 'niveles «a fondo»')} más`,
  eras: (n) => `«A fondo» en ${plural(n, 'época', 'épocas')} más`,
  complete: (n) => `Completar ${plural(n, 'gran maestro', 'grandes maestros')} más`,
  grand: (n, grand) => `${plural(n, 'gran maestro', 'grandes maestros')} más hasta el nivel ${grand.upTo}`,
};

export function rankProgress(rank) {
  const next = rank.next;
  if (!next) return { next: null, conds: [], parts: [] };
  return {
    next: next.name,
    conds: rankConditions(next, rank.stats),
    parts: rank.missing.map((m) => NEED_TEXT[m.key](m.need - m.have, next.grand)),
  };
}

// Cuadros de la colección (los mismos que cuentan Colección y el inicio).
export function collectionIds(progress, index) {
  return Object.keys(progress.collection || {}).filter((id) => index.artwork(id));
}

// Toda la colección, el último de cada fecha primero; a igual fecha, el añadido más tarde (orden de inserción).
export function collectionWorks(progress, index) {
  const rev = collectionIds(progress, index).map((id, i) => ({ id, date: String(progress.collection[id]), i }));
  rev.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.i - a.i));
  return rev.map((e) => index.artwork(e.id));
}

// Cuadro de muestra (tarjeta que se comparte) para quien aún no tiene cuadros: el más famoso, apaisado y con foco revisado.
export function sampleCover(index) {
  const score = (w) => (w.fame || 0) * 10 + (w.w > w.h ? 4 : 0) + (w.focus ? 2 : 0);
  return index.artworks.slice().sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id))[0] || null;
}

// Cuadro que representa la colección: el elegido si está en ella; si no, la obra de la colección con más fama (a igualdad, del
// pintor con más cuadros, apaisada y de repaso más avanzado). null si no hay colección.
export function coverWork(progress, index, chosen = '') {
  const owned = collectionIds(progress, index).map((id) => index.artwork(id));
  if (!owned.length) return null;
  if (chosen && progress.collection[chosen] && index.artwork(chosen)) return index.artwork(chosen);
  const count = new Map();
  for (const w of owned) count.set(w.artistId, (count.get(w.artistId) || 0) + 1);
  const box = (w) => progress.srs?.[artKey(w.id)]?.box || 0;
  return owned.slice().sort((a, b) => (b.fame || 0) - (a.fame || 0)
    || count.get(b.artistId) - count.get(a.artistId) || (b.w > b.h) - (a.w > a.h) || box(b) - box(a) || a.id.localeCompare(b.id))[0];
}

// Cuadro de la tarjeta que se comparte: el del avatar, si hay; si no, el automático de la colección.
export const shareCover = (progress, index, chosen = '') => coverWork(progress, index, chosen) || sampleCover(index);

// Avatar elegido (cuadro de la colección) o null: entonces va el logo o la inicial.
export function avatarWork(progress, index, chosen = '') {
  return chosen && progress.collection?.[chosen] && index.artwork(chosen) ? index.artwork(chosen) : null;
}

// Punto de interés de una obra (fracciones 0..1 de ancho y alto) como object-position en %.
export function focusPosition(work, fallbackY = 30) {
  const f = work?.focus;
  if (Array.isArray(f) && f.length === 2 && f.every((v) => Number.isFinite(v))) {
    const pct = (v) => Math.round(Math.min(1, Math.max(0, v)) * 100);
    return `${pct(f[0])}% ${pct(f[1])}%`;
  }
  return `50% ${fallbackY}%`;
}

// Inicial del avatar (primera letra del nombre, en mayúscula); '' sin nombre.
export function initialOf(name) {
  const letter = /\p{L}/u.exec(String(name || ''));
  return letter ? letter[0].toLocaleUpperCase('es-ES') : '';
}

// Último resultado del test de cultura (localStorage['mirada.test.last']): null si no hay o no vale. El
// nombre del nivel solo se da por bueno si es uno de los del test (resultados antiguos usaban los de los rangos).
export function parseLastTest(raw) {
  let v = null;
  try { v = JSON.parse(raw); } catch { return null; }
  if (!v || !Number.isInteger(v.correct) || !Number.isInteger(v.asked) || v.asked <= 0 || v.correct < 0 || v.correct > v.asked || typeof v.level !== 'string') return null;
  const pct = Number.isFinite(v.percentile) && v.percentile >= 1 && v.percentile <= 99 ? Math.round(v.percentile) : null;
  const date = typeof v.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.date) ? v.date : '';
  const grid = typeof v.grid === 'string' && /^[🟩🟨⬜]{1,8}$/u.test(v.grid) ? v.grid : '';
  return { correct: v.correct, asked: v.asked, level: TEST_LEVELS.includes(v.level) ? v.level : '', percentile: pct, date, grid };
}
