// La sesión «Repasar a Vermeer» / «Repasar el Barroco» (ui/screens/recall.js): sus partes. Puro.
// Pintor: su historia (la de nivel 1 o la del nivel donde se concentran sus fallos, y una sugerencia de otra), «cómo
// reconocerlo» (rasgos y cuadros), el contraste con quien suele confundirlo y la ronda. Época: sus tarjetas clave, el
// contraste y la ronda.

import { createRng } from './rng.js';
import { makeQuestion, noAuthorQuestion } from './questions.js';
import { recallStats, recallKey, ARTIST, MOVEMENT } from './recall.js';
import { MAX_TEXT } from './stories.js';

export const RECALL_ROUND = 5;
export const RECALL_TRAITS = 3;
export const RECALL_WORKS = 3;
// De la ronda, como mucho estas preguntas sobre el otro (el que confunde).
export const RECALL_RIVAL_QUESTIONS = 1;
export const RECALL_DIFFICULTY = 0.5;
// Tarjetas de época que mejor la enseñan a reconocer, en este orden (contenido/epocas/README.md).
export const ERA_KEY_KICKERS = ['Cuándo y dónde', 'Qué cambia', 'Fíjate en'];
// Una historia «a fondo» se sugiere primero si concentra al menos esta parte de las obras falladas (y dos o más).
export const STAGE_FOCUS_SHARE = 0.5;
const STAGE_FOCUS_MIN = 2;

const byFame = (a, b) => (b.fame || 0) - (a.fame || 0) || (a.yearSort || 0) - (b.yearSort || 0);
const capital = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : '');
export const shortName = (artist) => artist?.short || artist?.name || '';

// Rasgos de estilo del pintor para «cómo reconocerlo»: sus rasgos cortos o, sin ellos, su pista «Fíjate en…».
export function recognizeTraits(artist) {
  const traits = (Array.isArray(artist?.traits) ? artist.traits : []).filter((t) => typeof t === 'string' && t.trim());
  if (traits.length) return traits.slice(0, RECALL_TRAITS).map((t) => capital(t.trim()));
  return artist?.hint ? [artist.hint] : [];
}

// Sus cuadros más característicos: los más famosos de los que ha visto (si no llegan, de los que enseña «Conoce a»).
export function signatureWorks(index, artistId, seen, avoid = []) {
  const skip = new Set(avoid);
  const pool = (seen.length ? seen : index.learnWorks(artistId)).filter((w) => !skip.has(w.id));
  return pool.slice().sort(byFame).slice(0, RECALL_WORKS);
}

// Etiquetas de cada rasgo (traitTags va alineado con [pista, ...rasgos]).
const tagsOfTrait = (artist, i) => new Set(Array.isArray(artist?.traitTags?.[i + 1]) ? artist.traitTags[i + 1] : []);

// El primer rasgo de A que no comparte etiquetas con ninguno de B ('' si no tiene rasgos).
function distinctTrait(a, b, traitsA, traitsB) {
  const other = new Set(traitsB.flatMap((_, i) => [...tagsOfTrait(b, i)]));
  const otherText = new Set(traitsB.map((t) => t.toLowerCase()));
  const i = traitsA.findIndex((t, k) => !otherText.has(t.toLowerCase()) && ![...tagsOfTrait(a, k)].some((tag) => other.has(tag)));
  return traitsA[Math.max(0, i)] || '';
}

const movementName = (m) => `${/^estampa/i.test(m.name) ? 'la' : 'el'} ${m.name}`;

// Frase de contraste a partir de los rasgos de los dos («En Vermeer, luz de ventana a la izquierda. En Pieter de Hooch, …»).
// '' si alguno no tiene rasgos o no cabe en MAX_TEXT.
export function contrastLine(type, a, b) {
  const list = (x) => (Array.isArray(x?.traits) ? x.traits : []).filter((t) => typeof t === 'string' && t.trim());
  const ta = list(a);
  const tb = list(b);
  if (!ta.length || !tb.length) return '';
  const name = (x) => (type === ARTIST ? shortName(x) : movementName(x));
  const text = `En ${name(a)}, ${distinctTrait(a, b, ta, tb)}. En ${name(b)}, ${distinctTrait(b, a, tb, ta)}.`;
  return text.length <= MAX_TEXT ? text : '';
}

// Las tarjetas clave de una época ({ kicker, text, artwork }), en el orden de ERA_KEY_KICKERS.
export function eraKeyCards(cards) {
  const list = Array.isArray(cards) ? cards : [];
  return ERA_KEY_KICKERS.map((k) => list.find((c) => c && c.kicker === k && typeof c.text === 'string' && c.artwork)).filter(Boolean);
}

const deepLevelsOf = (levels) => [...new Set(levels)].filter((l) => Number.isInteger(l) && l >= 2).sort((a, b) => a - b);

// La etapa «a fondo» donde se concentran los fallos (STAGE_FOCUS_MIN obras o más y al menos STAGE_FOCUS_SHARE de las
// falladas), o null. levels: niveles con historia; failedLevels: nivel de cada obra fallada.
export function focusedLevel(levels, failedLevels = []) {
  const deep = deepLevelsOf(levels);
  const counts = new Map();
  for (const l of failedLevels) if (deep.includes(l)) counts.set(l, (counts.get(l) || 0) + 1);
  const [best] = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  return best && best[1] >= STAGE_FOCUS_MIN && best[1] >= failedLevels.length * STAGE_FOCUS_SHARE ? best[0] : null;
}

// Por qué historia empieza «Repasar a X»: la del nivel donde se concentran los fallos o, si no, la de nivel 1.
export const firstStoryLevel = (levels, failedLevels = []) => focusedLevel(levels, failedLevels) ?? 1;

// Qué otra historia del pintor se sugiere al final de la de nivel 1 (una sola, o null): la de la etapa donde se concentran
// los fallos y, si no, la primera «a fondo» aún no vista (o la primera, si ya las vio todas). seen(level): ¿ya la vio?
export function suggestedStory(levels, failedLevels = [], seen = () => false) {
  const deep = deepLevelsOf(levels);
  if (!deep.length) return null;
  return focusedLevel(levels, failedLevels) ?? deep.find((l) => !seen(l)) ?? deep[0];
}

// Obras de una época que ya conoce: las vistas de sus pintores y las enseñadas de sus pintores ya jugados.
function knownMovementWorks(progress, index, movementId) {
  const owned = progress.collection || {};
  return index.worksOfMovement(movementId).filter((w) => !noAuthorQuestion(w) && (owned[w.id] || (progress.artists?.[w.artistId]?.plays && w.role === 'learn')));
}

// Partes de la sesión. subject: { type, id, confused? } (engine/recall.js forgottenSubject, o el de la ficha). seen: obras
// vistas del pintor (engine/painters.js seenOf). Devuelve { type, id, rival, failedWorks } y, según el tipo, lo que enseña.
export function recallParts(progress, index, subject, today, { seen = [] } = {}) {
  const stat = recallStats(progress.slips, today).get(recallKey(subject.type, subject.id));
  const rival = subject.confused ?? null;
  const failedWorks = stat ? stat.works : [];
  if (subject.type === MOVEMENT) {
    const m = index.movement(subject.id);
    const other = rival ? index.movement(rival) : null;
    const pick = (id) => knownMovementWorks(progress, index, id).sort(byFame)[0] || index.worksOfMovement(id).filter((w) => w.role === 'learn').sort(byFame)[0] || null;
    const text = other ? contrastLine(MOVEMENT, m, other) : '';
    const pair = other ? [pick(m.id), pick(other.id)] : [];
    return { type: MOVEMENT, id: subject.id, rival: text && pair.every(Boolean) ? rival : null, failedWorks, contrast: text && pair.every(Boolean) ? { text, works: pair } : null };
  }
  const artist = index.artist(subject.id);
  const other = rival ? index.artist(rival) : null;
  const works = signatureWorks(index, subject.id, seen);
  const text = other ? contrastLine(ARTIST, artist, other) : '';
  const rivalWork = other ? (index.learnWorks(other.id).filter((w) => !noAuthorQuestion(w)).sort(byFame)[0] || null) : null;
  const mine = works.find((w) => !noAuthorQuestion(w)) || works[0] || null;
  const contrast = text && rivalWork && mine ? { text, works: [mine, rivalWork] } : null;
  return {
    type: ARTIST,
    id: subject.id,
    rival: contrast ? rival : null,
    failedWorks,
    traits: recognizeTraits(artist),
    works,
    contrast,
  };
}

// Mini-ronda para fijarlo: RECALL_ROUND preguntas sobre sus cuadros (primero los fallados), frente a otros y, si lo confunde
// con alguien, con ese otro entre las opciones y una pregunta sobre un cuadro suyo.
export function planRecall(progress, index, parts, seed, { seen = [] } = {}) {
  const rng = createRng(`recordar:${parts.type}:${parts.id}:${seed}`);
  const failed = new Set(parts.failedWorks);
  const order = (list) => list.slice().sort((a, b) => Number(failed.has(b.id)) - Number(failed.has(a.id)) || byFame(a, b));
  const rival = parts.rival;
  let own;
  let rivalPool;
  if (parts.type === MOVEMENT) {
    own = order(knownMovementWorks(progress, index, parts.id));
    rivalPool = rival ? knownMovementWorks(progress, index, rival) : [];
  } else {
    const fill = index.learnWorks(parts.id).filter((w) => !seen.some((s) => s.id === w.id));
    own = [...order(seen), ...fill.sort(byFame)].filter((w) => !noAuthorQuestion(w));
    rivalPool = rival ? index.learnWorks(rival).filter((w) => !noAuthorQuestion(w)) : [];
  }
  const rivalPicks = rng.shuffle(rivalPool).slice(0, RECALL_RIVAL_QUESTIONS);
  const ownPicks = own.slice(0, RECALL_ROUND - rivalPicks.length);
  const works = [...ownPicks, ...rivalPicks];
  const avoid = new Set(works.map((w) => w.id));
  const questions = [];
  works.forEach((w, i) => {
    const isRival = rivalPicks.includes(w);
    let q;
    if (parts.type === MOVEMENT) q = makeQuestion('movement', index, w, RECALL_DIFFICULTY, rng, { includeMovements: [isRival ? parts.id : rival].filter(Boolean) });
    else {
      const include = [isRival ? parts.id : rival].filter(Boolean);
      q = makeQuestion(i % 2 ? 'which' : 'who', index, w, RECALL_DIFFICULTY, rng, { include, avoid: [...avoid] });
    }
    if (!q) return;
    if (q.type === 'which') q.options.forEach((o) => avoid.add(o.artworkId));
    questions.push({ ...q, phase: 'recall', ...(parts.type === ARTIST ? { host: parts.id } : {}) });
  });
  const base = parts.type === MOVEMENT ? { movementId: parts.id } : { artistId: parts.id };
  return { kind: 'recall', seed, ...base, recallType: parts.type, questions: rng.shuffle(questions) };
}
