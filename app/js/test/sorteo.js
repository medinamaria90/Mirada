// Test de cultura pictórica: el SORTEO de cada partida sobre la bolsa (bolsa.js). Puro: sin DOM.
//
// Cada partida sortea PER_TIER preguntas por tramo con una semilla nueva:
//   · mezcla por tramo: al menos MIN_PER_KIND de cada mecánica, MIN_ERAS movimientos distintos y
//     MIN_SPANISH pregunta de pintor español (si el tramo tiene); dentro del tramo, sin repetir
//     pintor mientras se pueda;
//   · cada bloque de 4 lleva, si se puede, las tres mecánicas;
//   · ninguna obra sale dos veces en pantalla en la partida (contando las miniaturas de «¿Cuál?»);
//   · se evitan las obras vistas en las RECENT_GAMES últimas partidas: primero las nunca vistas y,
//     si el tramo no da para más, las vistas hace más tiempo (se recuerdan HISTORY_KEEP partidas).
// La regla adaptativa, la puntuación y el percentil no cambian: el motor recibe un banco de
// 5 tramos × 8 como el fijo.

import { TIERS, KINDS, PER_TIER, BLOCK } from './motor.js';

export const MIN_PER_KIND = 2;
export const MIN_ERAS = 5;
export const MIN_SPANISH = 1;
export const RECENT_GAMES = 2; // sus preguntas solo vuelven si el tramo no da para más
export const HISTORY_KEEP = 6; // partidas recordadas: entre las vistas, vuelven antes las más antiguas
const TRIES = 40; // sorteos voraces por tramo; se queda el que menos reglas incumple
const RECENT_PENALTY = 0.01; // desempate: una repetida reciente pesa menos que una regla de mezcla

// Antigüedad en el historial (lista de partidas, la más antigua primero; cada una, ids de preguntas
// vistas) de cada obra y de cada pregunta: 1 = vista en la última partida; sin entrada = no vista.
function seenAges(bolsa, history) {
  const work = new Map();
  const id = new Map();
  const games = (Array.isArray(history) ? history : []).slice(-HISTORY_KEEP);
  games.forEach((ids, i) => {
    const ago = games.length - i;
    for (const qid of Array.isArray(ids) ? ids : []) {
      const c = bolsa.byId.get(qid);
      if (!c) continue;
      work.set(c.artwork, Math.min(work.get(c.artwork) ?? Infinity, ago));
      id.set(qid, Math.min(id.get(qid) ?? Infinity, ago));
    }
  });
  return { work: (c) => work.get(c.artwork) ?? Infinity, id: (c) => id.get(c.id) ?? Infinity };
}

// Orden de preferencia: obras nunca vistas, después las vistas hace más partidas; a igualdad, la
// pregunta no vista antes que la repetida (otra mecánica de la misma obra); al azar dentro.
function preferenceOrder(pool, ages, rng) {
  const groups = new Map();
  for (const c of pool) {
    const key = `${ages.work(c)}|${ages.id(c)}`;
    if (!groups.has(key)) groups.set(key, { w: ages.work(c), q: ages.id(c), list: [] });
    groups.get(key).list.push(c);
  }
  return [...groups.values()].sort((x, y) => y.w - x.w || y.q - x.q).flatMap((g) => rng.shuffle(g.list));
}

// Elige PER_TIER del orden dado cumpliendo la mezcla (voraz: primero un español; después, lo que
// falte de mecánicas y épocas manda; sin repetir pintor en el tramo mientras se pueda).
function greedyTier(order, used, wantSpanish) {
  const chosen = [];
  const works = new Set(used);
  const kinds = Object.fromEntries(KINDS.map((k) => [k, 0]));
  const eras = new Set();
  const artists = new Set();
  const take = (c) => {
    chosen.push(c);
    for (const w of c.works) works.add(w);
    kinds[c.kind]++;
    eras.add(c.movementId);
    artists.add(c.artistId);
  };
  // La primera del orden que cabe (sin obras ya en pantalla) y cumple la condición, ya resuelta.
  const first = (ok) => {
    for (const c of order) {
      if (chosen.some((x) => x.id === c.id) || !ok(c)) continue;
      const r = resolve(c, works);
      if (r) return r;
    }
    return null;
  };
  if (wantSpanish) {
    const c = first((x) => x.spanish);
    if (c) take(c);
  }
  while (chosen.length < PER_TIER) {
    const left = PER_TIER - chosen.length;
    const kindDeficit = KINDS.reduce((n, k) => n + Math.max(0, MIN_PER_KIND - kinds[k]), 0);
    const eraDeficit = Math.max(0, MIN_ERAS - eras.size);
    const helps = (c) => (left > kindDeficit || kinds[c.kind] < MIN_PER_KIND) && (left > eraDeficit || !eras.has(c.movementId));
    // Con el español ya puesto, los demás huecos para otros mientras se pueda: hay pocas obras
    // españolas por tramo y gastarlas de dos en dos obligaría a repetirlas en la partida siguiente.
    const c = first((x) => helps(x) && !artists.has(x.artistId) && !x.spanish)
      || first((x) => helps(x) && !artists.has(x.artistId))
      || first(helps)
      || first(() => true);
    if (!c) break;
    take(c);
  }
  return chosen;
}

// La candidata con sus obras en pantalla libres; en «¿Cuál?», con la primera miniatura libre de
// cada hueco (slots). null si no cabe.
function resolve(c, works) {
  if (!c.slots) return c.works.every((w) => !works.has(w)) ? c : null;
  const options = [];
  for (const slot of c.slots) {
    const id = slot.find((w) => !works.has(w));
    if (!id) return null;
    options.push(id);
  }
  return { ...c, options, works: options };
}

// Cuántas reglas de mezcla incumple una selección (0 = todas bien).
function mixFaults(list, pool) {
  let faults = Math.max(0, PER_TIER - list.length) * 10;
  for (const k of KINDS) if (list.filter((q) => q.kind === k).length < MIN_PER_KIND) faults++;
  if (new Set(list.map((q) => q.movementId)).size < MIN_ERAS) faults++;
  if (pool.some((c) => c.spanish) && list.filter((q) => q.spanish).length < MIN_SPANISH) faults++;
  return faults;
}

// Una partida: PER_TIER preguntas por tramo, en orden de tramo, sin repetir obra en pantalla y
// evitando las del historial reciente. rng = createRng(semilla) del motor.
export function drawGame(bolsa, rng, history = []) {
  const ages = seenAges(bolsa, history);
  const recent = (c) => (ages.work(c) <= RECENT_GAMES ? RECENT_PENALTY : 0) + (ages.id(c) <= RECENT_GAMES ? RECENT_PENALTY : 0);
  const used = new Set();
  const game = [];
  for (const t of TIERS) {
    const pool = bolsa.byTier[t.id] || [];
    const wantSpanish = pool.some((c) => c.spanish);
    let best = null;
    let bestFaults = Infinity;
    for (let i = 0; i < TRIES && bestFaults > 0; i++) {
      const pick = greedyTier(preferenceOrder(pool, ages, rng), used, wantSpanish);
      const faults = mixFaults(pick, pool) + pick.reduce((n, c) => n + recent(c), 0);
      if (faults < bestFaults) { best = pick; bestFaults = faults; }
    }
    for (const c of best || []) for (const w of c.works) used.add(w);
    game.push(...arrangeBlocks(best || [], rng));
  }
  return game.map(toPlayable);
}

// Orden dentro del tramo: se juega por bloques de BLOCK y cada bloque lleva, si se puede, una de
// cada mecánica (así las cuatro primeras preguntas ya enseñan las tres).
function arrangeBlocks(list, rng) {
  const rest = rng.shuffle(list);
  const blocks = [];
  while (rest.length) {
    const block = [];
    for (const k of KINDS) {
      const i = rest.findIndex((c) => c.kind === k);
      if (i !== -1 && block.length < BLOCK) block.push(...rest.splice(i, 1));
    }
    // Los huecos que quedan, con mecánicas que sobren: las justas se guardan para los bloques siguientes.
    const later = Math.ceil(Math.max(0, rest.length - (BLOCK - block.length)) / BLOCK);
    while (block.length < BLOCK && rest.length) {
      const i = rest.findIndex((c) => rest.filter((x) => x.kind === c.kind).length > later);
      block.push(...rest.splice(Math.max(0, i), 1));
    }
    blocks.push(...rng.shuffle(block));
  }
  return blocks;
}

// Lo que necesita el motor y la interfaz (sin los datos de clasificación).
function toPlayable(c) {
  return { id: c.id, tier: c.tier, kind: c.kind, artwork: c.artwork, answer: c.answer, options: c.options.slice(), hint: c.hint };
}

// Historial tras empezar una partida: se añade una vacía y se recorta.
export function startHistory(history) {
  const list = Array.isArray(history) ? history.filter(Array.isArray) : [];
  return [...list, []].slice(-HISTORY_KEEP);
}

// Historial con una pregunta vista más en la partida en curso (la última).
export function markSeen(history, id) {
  const games = Array.isArray(history) ? history.filter(Array.isArray) : [];
  const list = games.length ? games.map((g) => g.slice()) : [[]];
  const last = list[list.length - 1];
  if (!last.includes(id)) last.push(id);
  return list;
}
