// Cronología sin años (docs/eval/ux-cronologia.md): antes, después o a la vez entre dos pintores, a partir de
// `born`/`died` del catálogo, y siempre respecto a los pintores que el usuario ya conoce. Puro: no toca el DOM.
//
// Regla: A va ANTES que B si murió antes de que B cumpliera YOUNG_AGE años o si nació GENERATION años antes o más;
// si no, vivieron A LA VEZ. Preguntar «¿quién fue antes?» solo vale con mucha distancia (del orden de un siglo sí, de
// diez años no): con pintores próximos no enseña nada (decisión de María).

import { painterState } from './painters.js';

export const YOUNG_AGE = 25;
export const GENERATION = 20;
export const ASK_GAP = 80; // años entre nacimientos, como poco, para que merezca una pregunta
export const TIME_MAX = 4; // pintores en «Su tiempo», contando el de la ficha
const CENTURY = 100;
// La cinta reparte los puntos en proporción a cuándo nacieron, sin pegarse ni salirse de los bordes (en %).
export const RIBBON_EDGE = 10;
export const RIBBON_MIN_GAP = 20;

export const REL = Object.freeze({ BEFORE: 'before', AFTER: 'after', TOGETHER: 'together' });

const hasDates = (a) => Number.isFinite(a?.born) && Number.isFinite(a?.died);
const nameOf = (a) => a?.short || a?.name || '';

// Relación de A respecto a B: 'before' | 'after' | 'together' (null sin fechas).
export function relation(a, b) {
  if (!hasDates(a) || !hasDates(b)) return null;
  const precedes = (x, y) => x.died < y.born + YOUNG_AGE || y.born - x.born >= GENERATION;
  if (precedes(a, b)) return REL.BEFORE;
  if (precedes(b, a)) return REL.AFTER;
  return REL.TOGETHER;
}

// ¿Merece la pena preguntar quién fue antes? Solo con ASK_GAP años o más entre nacimientos; nunca entre contemporáneos.
export function isAskable(a, b) {
  const rel = relation(a, b);
  if (!rel || rel === REL.TOGETHER) return false;
  return Math.abs(a.born - b.born) >= ASK_GAP;
}

// Pintores conocidos: los que el usuario ya ha visto (alguna obra vista o dominados), en el orden del catálogo. `met`
// (ids de engine/painters.js metArtistIds: historia vista o nivel jugado) los restringe aún más, como en las preguntas por
// autor (planner.metOnly).
export function knownArtists(progress, index, exclude = '', met = null) {
  const ids = met ? new Set(met) : null;
  return index.artists.filter((a) => a.id !== exclude && hasDates(a) && (!ids || ids.has(a.id))
    && painterState(progress, index, a.id) !== 'new');
}

// Por qué A va antes que B, en una frase sacada de las fechas (A y B en ese orden).
function beforeWhy(a, b) {
  const A = nameOf(a);
  const B = nameOf(b);
  const gap = b.born - a.born;
  if (gap >= 2 * CENTURY) return `Entre ${A} y ${B} hay más de dos siglos.`;
  if (gap >= CENTURY) return `Entre ${A} y ${B} hay más de un siglo.`;
  if (a.died < b.born) return `Cuando nació ${B}, ${A} ya había muerto.`;
  const age = a.died - b.born;
  if (age < YOUNG_AGE) return age === 0 ? `${B} nació el año en que murió ${A}.` : `Cuando murió ${A}, ${B} tenía ${age} ${age === 1 ? 'año' : 'años'}.`;
  return `${A} le llevaba ${gap} años a ${B}.`;
}

// Frase que explica la relación de A respecto a B («Cuando murió Masaccio, Piero tenía 13 años.»).
export function relationPhrase(a, b) {
  const rel = relation(a, b);
  if (rel === REL.BEFORE) return beforeWhy(a, b);
  if (rel === REL.AFTER) return beforeWhy(b, a);
  if (rel === REL.TOGETHER) return `${nameOf(a)} y ${nameOf(b)} vivieron a la vez.`;
  return '';
}

// Los `max - 1` conocidos más cercanos en el tiempo a `artist` (por nacimiento), y él, ordenados por nacimiento.
function nearest(artist, known, max) {
  const others = known.filter((k) => k.id !== artist.id)
    .sort((x, y) => Math.abs(x.born - artist.born) - Math.abs(y.born - artist.born) || x.born - y.born)
    .slice(0, max - 1);
  return [...others, artist].sort((x, y) => x.born - y.born || (x.id === artist.id ? 1 : -1));
}

// Posiciones de la cinta (en %): proporcionales a los nacimientos, dentro de [RIBBON_EDGE, 100 − RIBBON_EDGE] y separadas
// RIBBON_MIN_GAP como poco (si no caben, a partes iguales).
export function ribbonPositions(years) {
  const n = years.length;
  if (!n) return [];
  const lo = RIBBON_EDGE;
  const hi = 100 - RIBBON_EDGE;
  if (n === 1) return [50];
  const gap = Math.min(RIBBON_MIN_GAP, (hi - lo) / (n - 1));
  const min = Math.min(...years);
  const span = Math.max(...years) - min || 1;
  const at = years.map((y) => lo + ((y - min) / span) * (hi - lo));
  for (let i = 1; i < n; i++) at[i] = Math.max(at[i], at[i - 1] + gap);
  // Si el empuje se ha pasado del borde derecho, se recoloca desde la derecha.
  at[n - 1] = Math.min(at[n - 1], hi);
  for (let i = n - 2; i >= 0; i--) at[i] = Math.min(at[i], at[i + 1] - gap);
  return at.map((x) => Math.round(Math.max(lo, x) * 10) / 10);
}

// Una lista de nombres en español: «A», «A y B», «A, B y C».
const listOf = (names) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} y ${names.at(-1)}`);

// Frase de «Su tiempo» respecto a los vecinos: «Llegó después de Masaccio y coincidió con Botticelli.»
// En la ficha, «coincidió» también con quien es de otra generación pero pintó a la vez que él: los dos vivos y el más
// joven ya adulto (YOUNG_AGE) durante un tiempo.
const overlapped = (a, b) => Math.min(a.died, b.died) - Math.max(a.born, b.born) >= YOUNG_AGE;
function timePhrase(artist, others) {
  const by = (rel) => others.filter((o) => (overlapped(artist, o) ? REL.TOGETHER : relation(artist, o)) === rel);
  const closest = (list) => list.sort((x, y) => Math.abs(x.born - artist.born) - Math.abs(y.born - artist.born))[0];
  const after = closest(by(REL.AFTER));
  const together = by(REL.TOGETHER).slice(0, 2).map(nameOf);
  const before = closest(by(REL.BEFORE));
  const parts = [];
  if (after) parts.push(`llegó después de ${nameOf(after)}`);
  if (together.length) parts.push(`coincidió con ${listOf(together)}`);
  if (before) parts.push(`vino antes que ${nameOf(before)}`);
  if (!parts.length) return '';
  const text = listOf(parts);
  return `${text[0].toUpperCase()}${text.slice(1)}.`;
}

// Siglo en números romanos (1401 → «XV»).
const ROMAN = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
export function centuryOf(year) {
  let n = Math.floor((year - 1) / CENTURY) + 1;
  let out = '';
  for (const [v, s] of ROMAN) while (n >= v) { out += s; n -= v; }
  return out;
}

// «Su tiempo» en la ficha del pintor: sus vecinos conocidos más cercanos (como mucho TIME_MAX con él) para pintar barras de
// vida alineadas, y una frase que se genera sola. Si no conoce a nadie más, neighbours = [él] y phrase = ''.
// { neighbours: [{ id, name, born, died, current, relation, from, to }], phrase, axis: [{ label, at }] }
// from/to: dónde empieza y acaba su barra (en % del eje); relation: la suya respecto al de la ficha (null en él);
// axis: los siglos del eje, cada uno donde empieza (el primero, en 0).
export function timeOf(index, progress, artistId) {
  const artist = index.artist(artistId);
  if (!hasDates(artist)) return { neighbours: [], phrase: '', axis: [] };
  const known = knownArtists(progress, index, artistId);
  const row = nearest(artist, known, TIME_MAX);
  const lo = Math.min(...row.map((a) => a.born));
  const hi = Math.max(...row.map((a) => a.died));
  const span = hi - lo || 1;
  const pct = (y) => Math.round(((y - lo) / span) * 1000) / 10;
  const neighbours = row.map((a) => ({
    id: a.id, name: nameOf(a), born: a.born, died: a.died, current: a.id === artist.id,
    relation: a.id === artist.id ? null : relation(a, artist), from: pct(a.born), to: pct(a.died),
  }));
  const axis = [{ label: centuryOf(lo), at: 0 }];
  for (let y = Math.ceil((lo - 1) / CENTURY) * CENTURY + 1; y < hi; y += CENTURY) if (y > lo) axis.push({ label: centuryOf(y), at: pct(y) });
  return { neighbours, phrase: timePhrase(artist, row.filter((a) => a.id !== artist.id)), axis };
}

// Pareja para «¿Quién fue antes?» en un repaso: dos conocidos de otra época (isAskable), al azar con `rng`; null si no hay.
// { earlier, later } (artistas del catálogo).
export function beforePair(known, rng) {
  const pairs = [];
  for (let i = 0; i < known.length; i++) {
    for (let j = i + 1; j < known.length; j++) {
      const [a, b] = [known[i], known[j]];
      if (isAskable(a, b)) pairs.push(relation(a, b) === REL.BEFORE ? { earlier: a, later: b } : { earlier: b, later: a });
    }
  }
  return pairs.length ? rng.pick(pairs) : null;
}
