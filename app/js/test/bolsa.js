// Test de cultura pictórica: la BOLSA de preguntas por tramos, generada del catálogo. Puro: sin DOM.
//
// Cada obra del catálogo da hasta tres candidatas («¿Quién lo pintó?», «¿De qué movimiento es?» y
// «¿Cuál es de X?», con la obra como respuesta). Se excluyen las obras con la firma visible
// (spoiler), las de atribución dudosa (attributed) y las que pida app/test/tramos.json. Los
// distractores salen del motor de la app (engine/questions.js) con una semilla fija por candidata:
// la bolsa es la misma en cada carga y se puede revisar.
//
// Tramo (1 fácil … 5 friki) según una puntuación de dificultad, suma de cuatro partes:
//   · fama de la obra: icónica (fame 3) 0 · conocida (2) 2 · poco conocida (1) 3,25;
//   · pintor: con etapa en la app y alguna obra icónica 0 · con etapa sin icónicas 0,75 · invitado
//     con icónica 0,5 · invitado sin icónicas 1,5;
//     en «¿Movimiento?», fama ×0,6 y pintor ×0,5: la época se adivina por el estilo sin conocerlos;
//     pintor de fama local (LOCAL_FAME: famosísimos en su país, desconocidos para el público español,
//     como los rusos) +3,25 en «¿Quién?» y «¿Cuál?»: de difícil para arriba;
//   · mecánica: «¿Quién?» 0,25 · «¿Cuál?» 0,5 (hay que reconocer la mano entre cuatro) ·
//     «¿Movimiento?» 0,75 (hay que saber qué es cada movimiento);
//   · distractores: en «¿Quién?» y «¿Cuál?», el parecido medio de los pintores de relleno con el
//     bueno (0 lejanos · 1 movimiento contiguo · 2 mismo movimiento · 3 confundibles, similarTo),
//     ×0,75 si la obra es icónica (se reconoce igual) y ×1 si no; en «¿Movimiento?», 1,2 × (4 −
//     distancia media entre la época buena y las de relleno): épocas contiguas suman, lejanas no.
// Las tres primeras partes deciden también cuánto se parecen los distractores que se piden al motor
// (con un margen al azar de semilla fija): una obra difícil suele llevar distractores cercanos, y la
// puntuación cuenta el parecido conseguido. Cortes (TIER_CUTS): < 1,75 fácil · < 3,5 media ·
// < 4,25 difícil · < 5 experto · el resto, friki.
//
// Ajustes: las 40 preguntas de app/test/preguntas.json entran tal cual en su tramo (con su pista
// escrita a mano) y sus obras quedan en ese tramo también en las otras mecánicas: así la calibración
// del percentil, hecha con ese banco, sigue valiendo. tramos.json fuerza ids a un tramo o los
// excluye («a12», toda la obra; «a12:who», solo esa mecánica).

import { isSpoiler, isAttributed } from '../engine/catalog.js';
import { makeWhoQuestion, makeMovementQuestion, makeWhichQuestion, questionSimilarity, OPTION_COUNT } from '../engine/questions.js';
import { createRng } from '../engine/rng.js';
import { TIERS, KINDS } from './motor.js';

export const FAME_POINTS = { 3: 0, 2: 2, 1: 3.25 };
export const ARTIST_POINTS = { stageIcon: 0, stage: 0.75, guestIcon: 0.5, guest: 1.5 };
export const MOVEMENT_FAME_WEIGHT = 0.6;
export const MOVEMENT_ARTIST_WEIGHT = 0.5;
export const KIND_POINTS = { who: 0.25, which: 0.5, movement: 0.75 };
export const LOCAL_FAME_COUNTRIES = ['Rusia'];
export const LOCAL_FAME_POINTS = 3.25;
export const SIMILARITY_WEIGHT = { 3: 0.75, 2: 1, 1: 1 }; // por fama de la obra
export const MOVEMENT_CLOSE_WEIGHT = 1.2;
export const MOVEMENT_FAR_GAP = 4;
// Parecido pedido al motor (difficulty 0-1): base + paso × parte propia ± margen al azar.
export const DIFFICULTY_BASE = 0.15;
export const DIFFICULTY_STEP = 0.15;
export const DIFFICULTY_JITTER = 0.3;
export const TIER_CUTS = [1.75, 3.5, 4.25, 5];
export const SPANISH = 'España';
const ICONIC = 3;

const BANNED_WORDS = /\b(ayer|mañana)\b/i;
const FALLBACK_HINT = 'Mira la pincelada y la luz: delatan la época y la mano';
const SEED_PREFIX = 'bolsa:';

export const tierForScore = (score) => {
  const i = TIER_CUTS.findIndex((cut) => score < cut);
  return TIERS[i === -1 ? TIERS.length - 1 : i].id;
};

// Pista del feedback: el «look» de la obra (catalog-text.json) o, si no hay, la del pintor.
export function hintFor(index, work) {
  const artist = index.artist(work.artistId);
  for (const text of [work.look, artist && artist.hint]) {
    if (typeof text === 'string' && text.trim() && !BANNED_WORDS.test(text)) return text.trim();
  }
  return FALLBACK_HINT;
}

const isStage = (index, artist) => index.pathIndex(artist.id) >= 0;
const hasIcon = (index, artist) => index.worksOf(artist.id).some((w) => w.fame === ICONIC);

// Parte de la dificultad que no depende de los distractores: fama, pintor y mecánica.
export function intrinsicScore(index, work, kind) {
  const artist = index.artist(work.artistId);
  const movement = kind === 'movement';
  const fame = (FAME_POINTS[work.fame] ?? FAME_POINTS[1]) * (movement ? MOVEMENT_FAME_WEIGHT : 1);
  const key = `${isStage(index, artist) ? 'stage' : 'guest'}${hasIcon(index, artist) ? 'Icon' : ''}`;
  const who = ARTIST_POINTS[key] * (movement ? MOVEMENT_ARTIST_WEIGHT : 1);
  const local = !movement && LOCAL_FAME_COUNTRIES.includes(artist.country) ? LOCAL_FAME_POINTS : 0;
  return fame + who + local + KIND_POINTS[kind];
}

// Parte que ponen los distractores de la pregunta ya hecha (formato del motor).
export function distractorScore(index, q, work) {
  if (q.type === 'movement') {
    const list = index.movements.filter((m) => !m.branch);
    const pos = list.findIndex((m) => m.id === q.answerId);
    const gaps = q.options.filter((o) => o.id !== q.answerId).map((o) => Math.abs(list.findIndex((m) => m.id === o.id) - pos));
    const mean = gaps.reduce((n, g) => n + g, 0) / gaps.length;
    return MOVEMENT_CLOSE_WEIGHT * Math.max(0, MOVEMENT_FAR_GAP - mean);
  }
  return (questionSimilarity(index, q) || 0) * (SIMILARITY_WEIGHT[work.fame] ?? 1);
}

export const difficultyFor = (intrinsic, r = 0.5) => Math.min(1, Math.max(0, DIFFICULTY_BASE + DIFFICULTY_STEP * intrinsic + DIFFICULTY_JITTER * (2 * r - 1)));

// Pregunta del motor para una obra y mecánica, con semilla fija. Si la respuesta es un pintor con
// etapa, los de relleno también (un nombre desconocido entre famosos se descarta solo).
function engineQuestion(index, work, kind, intrinsic, id) {
  const rng = createRng(SEED_PREFIX + id);
  const difficulty = difficultyFor(intrinsic, rng.next());
  const artist = index.artist(work.artistId);
  const exclude = isStage(index, artist) ? index.artists.filter((a) => !isStage(index, a)).map((a) => a.id) : [];
  if (kind === 'who') return makeWhoQuestion(index, work, difficulty, rng, { exclude });
  if (kind === 'movement') return makeMovementQuestion(index, work, difficulty, rng);
  return makeWhichQuestion(index, work, difficulty, rng, [], { exclude });
}

// Del formato del motor al del banco del test (el que juega motor.js y pinta preguntas.js).
// En «¿Cuál?», cada miniatura de relleno lleva de reserva las demás obras de su pintor (slots): el
// sorteo usa la primera libre, así una miniatura ya vista en la partida no inutiliza la pregunta
// (lo que cuenta para el tramo es el pintor, no la obra concreta).
function toBankQuestion(index, q, work) {
  const options = q.options.map((o) => o.id);
  if (q.type !== 'which') return { kind: q.type, artwork: work.id, answer: q.answerId, options };
  const spare = (id) => index.worksOf(index.artwork(id).artistId).filter((w) => w.id !== id && !isSpoiler(w) && !isAttributed(w)).map((w) => w.id);
  const slots = options.map((id) => (id === work.id ? [id] : [id, ...spare(id)]));
  return { kind: 'which', artwork: work.id, answer: work.id, options, slots };
}

// Obras en pantalla de una pregunta del banco (en «¿Cuál?», las cuatro miniaturas).
export const shownWorks = (q) => (q.kind === 'which' ? q.options.slice() : [q.artwork]);

function decorate(index, q, extra) {
  const work = index.artwork(q.artwork);
  const artist = index.artist(work.artistId);
  return { ...q, works: shownWorks(q), artistId: artist.id, movementId: artist.movementId, spanish: artist.country === SPANISH, ...extra };
}

// Puntuación de una pregunta ya escrita (las fijas): la misma regla con sus opciones.
function scoreOfBankQuestion(index, q, work) {
  const shape = { type: q.kind, answerId: q.answer, artistId: work.artistId, options: q.options.map((id) => ({ id, artworkId: id })) };
  return Math.round((intrinsicScore(index, work, q.kind) + distractorScore(index, shape, work)) * 100) / 100;
}

// Ajustes de tramos.json: { forzar: { id: tramo }, excluir: [id] }, id = «obra» u «obra:mecánica».
function readAdjustments(raw) {
  const force = new Map();
  const exclude = new Set();
  const validTier = (t) => TIERS.some((x) => x.id === t);
  if (raw && typeof raw.forzar === 'object') {
    for (const [id, tier] of Object.entries(raw.forzar)) if (validTier(tier)) force.set(id, tier);
  }
  if (raw && Array.isArray(raw.excluir)) for (const id of raw.excluir) if (typeof id === 'string') exclude.add(id);
  return { force, exclude };
}

const pickAdjust = (map, work, kind) => (map.has(`${work}:${kind}`) ? map.get(`${work}:${kind}`) : map.get(work));

// La bolsa: { candidates, byTier: { 1: [...], … }, byId }. fixed = preguntas de preguntas.json.
export function buildBolsa(index, { fixed = [], adjustments = null } = {}) {
  const { force, exclude } = readAdjustments(adjustments);
  const fixedTier = new Map();
  const candidates = [];
  for (const q of fixed) {
    const work = index.artwork(q.artwork);
    if (!work || !TIERS.some((t) => t.id === q.tier) || exclude.has(work.id) || exclude.has(`${work.id}:${q.kind}`)) continue;
    fixedTier.set(work.id, q.tier);
    const score = scoreOfBankQuestion(index, q, work);
    candidates.push(decorate(index, { ...q }, { source: 'fija', score, ruleTier: tierForScore(score) }));
  }
  const fixedKeys = new Set(candidates.map((c) => `${c.artwork}:${c.kind}`));
  for (const work of index.artworks) {
    if (isSpoiler(work) || isAttributed(work)) continue;
    for (const kind of KINDS) {
      if (fixedKeys.has(`${work.id}:${kind}`)) continue;
      if (exclude.has(work.id) || exclude.has(`${work.id}:${kind}`)) continue;
      // Sin pista de la obra (look) ni de su pintor (hint) no hay nada honesto que decir al fallar: la obra entra
      // en la bolsa cuando alguien escriba una (catálogo grande: los textos de las obras nuevas están por escribir).
      if (hintFor(index, work) === FALLBACK_HINT) continue;
      const id = `${kind}-${work.id}`;
      const intrinsic = intrinsicScore(index, work, kind);
      const q = engineQuestion(index, work, kind, intrinsic, id);
      if (!q || q.options.length !== OPTION_COUNT) continue;
      const score = Math.round((intrinsic + distractorScore(index, q, work)) * 100) / 100;
      const ruleTier = tierForScore(score);
      const forced = pickAdjust(force, work.id, kind);
      const tier = forced || fixedTier.get(work.id) || ruleTier;
      const source = forced ? 'forzada' : fixedTier.has(work.id) ? 'fija' : 'regla';
      candidates.push(decorate(index, { id, tier, ...toBankQuestion(index, q, work), hint: hintFor(index, work) }, { source, score, ruleTier }));
    }
  }
  const byTier = Object.fromEntries(TIERS.map((t) => [t.id, candidates.filter((c) => c.tier === t.id)]));
  return { candidates, byTier, byId: new Map(candidates.map((c) => [c.id, c])) };
}
