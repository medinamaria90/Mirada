// La sesión «Repasar a Vermeer» / «Repasar el Barroco» (ui/screens/recall.js): sus partes. Puro.
// Pintor (sin historia: ya la conoce): «cómo reconocerlo» (sus «Fíjate en…», cuadros, con quién no confundirlo y, si lo
// confunde con alguien, la frase de contraste) y la ronda. Época: sus tarjetas clave, el contraste y la ronda.

import { createRng } from './rng.js';
import { makeQuestion, noAuthorQuestion } from './questions.js';
import { recallStats, recallKey, ARTIST, MOVEMENT } from './recall.js';
import { MAX_TEXT } from './stories.js';
import { similar, traitTagsOf } from './feedback.js';
import { lookAlikes } from './ficha.js';

export const RECALL_ROUND = 5;
export const RECALL_TRAITS = 3;
export const RECALL_WORKS = 3;
// «No lo confundas con»: como mucho estos pintores.
export const RECALL_TWINS = 3;
// De la ronda, como mucho estas preguntas sobre el otro (el que confunde).
export const RECALL_RIVAL_QUESTIONS = 1;
export const RECALL_DIFFICULTY = 0.5;
// Tarjetas de época que mejor la enseñan a reconocer, en este orden (contenido/epocas/README.md).
export const ERA_KEY_KICKERS = ['Cuándo y dónde', 'Qué cambia', 'Fíjate en'];

const byFame = (a, b) => (b.fame || 0) - (a.fame || 0) || (a.yearSort || 0) - (b.yearSort || 0);
const capital = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : '');
export const shortName = (artist) => artist?.short || artist?.name || '';

// ¿Dos «Fíjate en…» hablan de lo mismo? Comparten la raíz (sus primeras STEM letras) de alguna palabra con contenido: en una
// sola tarjeta, «colores ácidos» dos veces o el «aire entre las figuras» repetido ya sobran.
const STEM = 5;
const MIN_WORD = 4;
const GENERIC = new Set(['fíjat', 'figur', 'cuadr', 'color', 'pinta', 'pintu', 'como', 'cada', 'todo', 'toda', 'entre', 'sobre', 'parec', 'hecho', 'hecha', 'donde', 'desde', 'hasta', 'mucho', 'mucha', 'casi', 'poco', 'tiene', 'están']);
const stems = (t) => new Set((String(t).toLowerCase().match(/[a-záéíóúüñ]+/g) || []).filter((w) => w.length >= MIN_WORD).map((w) => w.slice(0, STEM)).filter((w) => !GENERIC.has(w)));
function sameIdea(a, b) {
  const sb = stems(b);
  return similar(a, b) || [...stems(a)].some((w) => sb.has(w));
}

// «Fíjate en…» para «cómo reconocerlo»: su pista, sus refuerzos de estilo (contenido/pistas.json; primero los de estilo, que se
// ven en cualquier cuadro) y, si faltan, sus rasgos cortos. RECALL_TRAITS como mucho, distintos entre sí (ni las mismas
// etiquetas ni casi las mismas palabras) y sin nombrar al pintor.
export function recallHints(artist) {
  if (!artist) return [];
  const lines = [];
  const tags = traitTagsOf(artist, 1)[0] || [];
  if (typeof artist.hint === 'string' && artist.hint.trim()) lines.push({ text: artist.hint.trim(), tags });
  const hints = (Array.isArray(artist.styleHints) ? artist.styleHints : []).slice().sort((a, b) => Number(b.scope === 'estilo') - Number(a.scope === 'estilo'));
  for (const h of hints) lines.push({ text: h.text, tags: h.tags || [] });
  const traits = (Array.isArray(artist.traits) ? artist.traits : []).filter((t) => typeof t === 'string' && t.trim());
  traits.forEach((t, i) => lines.push({ text: capital(t.trim()), tags: traitTagsOf(artist, traits.length + 1)[i + 1] || [] }));
  const names = [artist.name, artist.short].filter(Boolean).map((n) => n.toLowerCase());
  const out = [];
  for (const l of lines) {
    if (out.length >= RECALL_TRAITS) break;
    if (names.some((n) => l.text.toLowerCase().includes(n))) continue;
    if (out.some((o) => sameIdea(o.text, l.text) || (o.tags.length && l.tags.some((t) => o.tags.includes(t))))) continue;
    out.push(l);
  }
  return out.map((l) => l.text);
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
    traits: recallHints(artist),
    works,
    // «No lo confundas con»: con quien lo confunde (si hay frase de contraste) y sus parecidos ya conocidos.
    twins: [...new Set([contrast ? rival : null, ...lookAlikes(progress, index, artist)])].filter(Boolean).slice(0, RECALL_TWINS),
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
