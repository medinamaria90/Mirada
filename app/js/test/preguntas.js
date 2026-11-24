// Test de cultura pictórica: el banco (app/test/preguntas.json) sobre el catálogo real. Puro.
// Comprueba que cada pregunta es jugable y la convierte en lo que pinta la interfaz (textos de las
// opciones con su periodo, obras a mostrar, respuesta correcta en claro).

import { isSpoiler, noAuthorQuestion } from '../engine/catalog.js';
import { revealedTitle } from '../engine/title-reveal.js';
import { KINDS, TIERS, PER_TIER, OPTIONS_PER_QUESTION } from './motor.js';

export { OPTIONS_PER_QUESTION };

// Lista de problemas del banco (vacía si todo está bien). Lo usan la prueba y el arranque.
export function validateBank(bank, index) {
  const out = [];
  const list = Array.isArray(bank && bank.questions) ? bank.questions : null;
  if (!list) return ['el banco no tiene lista de preguntas'];
  const seenWorks = new Map();
  const ids = new Set();
  for (const q of list) {
    const at = `pregunta ${q.id || '?'}`;
    if (ids.has(q.id)) out.push(`${at}: id repetido`);
    ids.add(q.id);
    if (!TIERS.some((t) => t.id === q.tier)) out.push(`${at}: tramo ${q.tier} desconocido`);
    if (!KINDS.includes(q.kind)) out.push(`${at}: mecánica ${q.kind} desconocida`);
    if (!Array.isArray(q.options) || q.options.length !== OPTIONS_PER_QUESTION || new Set(q.options).size !== OPTIONS_PER_QUESTION) out.push(`${at}: hacen falta ${OPTIONS_PER_QUESTION} opciones distintas`);
    else if (!q.options.includes(q.answer)) out.push(`${at}: la respuesta no está entre las opciones`);
    if (typeof q.hint !== 'string' || !q.hint.trim() || /\b(ayer|mañana)\b/i.test(q.hint)) out.push(`${at}: pista vacía o con «ayer»/«mañana»`);
    const work = index.artwork(q.artwork);
    if (!work) { out.push(`${at}: la obra ${q.artwork} no está en el catálogo`); continue; }
    if (isSpoiler(work)) out.push(`${at}: la obra ${q.artwork} lleva la firma visible (spoiler)`);
    if (q.kind !== 'movement' && noAuthorQuestion(work)) out.push(`${at}: la obra ${q.artwork} no sirve para preguntar por el autor`);
    const shown = q.kind === 'which' ? q.options : [q.artwork];
    for (const id of shown) {
      if (seenWorks.has(id) && seenWorks.get(id) !== q.id) out.push(`${at}: la obra ${id} ya sale en ${seenWorks.get(id)}`);
      seenWorks.set(id, q.id);
    }
    if (q.kind === 'who') {
      if (q.answer !== work.artistId) out.push(`${at}: la respuesta no es el autor de la obra`);
      for (const id of q.options || []) if (!index.artist(id)) out.push(`${at}: pintor ${id} desconocido`);
    } else if (q.kind === 'movement') {
      const artist = index.artist(work.artistId);
      if (!artist || q.answer !== artist.movementId) out.push(`${at}: la respuesta no es el movimiento de la obra`);
      for (const id of q.options || []) if (!index.movement(id)) out.push(`${at}: movimiento ${id} desconocido`);
    } else if (q.kind === 'which') {
      if (q.answer !== q.artwork) out.push(`${at}: en «¿Cuál es de X?» la respuesta es la propia obra`);
      const artists = new Set();
      for (const id of q.options || []) {
        const w = index.artwork(id);
        if (!w) { out.push(`${at}: obra ${id} desconocida`); continue; }
        if (noAuthorQuestion(w)) out.push(`${at}: la miniatura ${id} delata o duda del autor`);
        artists.add(w.artistId);
      }
      if (artists.size !== (q.options || []).length) out.push(`${at}: dos miniaturas del mismo pintor`);
    }
  }
  for (const t of TIERS) {
    const n = list.filter((q) => q.tier === t.id).length;
    if (n !== PER_TIER) out.push(`tramo ${t.name}: ${n} preguntas (deben ser ${PER_TIER})`);
  }
  return out;
}

// Movimiento como opción: «Renacimiento · s. XV–XVI» (nombre y periodo separados para el CSS).
export function movementLabel(m) {
  return { label: m.name, detail: m.period || '' };
}

// Lo que pinta la interfaz para una pregunta del banco.
export function viewOf(index, q) {
  const work = index.artwork(q.artwork);
  const artist = index.artist(work.artistId);
  const movementOf = (w) => index.movement(index.artist(w.artistId).movementId);
  if (q.kind === 'who') {
    return {
      kind: q.kind, prompt: '¿Quién lo pintó?', artwork: work, title: revealedTitle(index, work, q.kind), hint: q.hint, answer: q.answer,
      options: q.options.map((id) => ({ id, ...nameOf(index.artist(id)) })),
      answerText: artist.name,
      caption: `${work.title} · ${artist.name}${work.year ? ` · ${work.year}` : ''}`,
    };
  }
  if (q.kind === 'movement') {
    const m = movementOf(work);
    return {
      kind: q.kind, prompt: '¿De qué movimiento es?', artwork: work, title: revealedTitle(index, work, q.kind), hint: q.hint, answer: q.answer,
      options: q.options.map((id) => ({ id, ...movementLabel(index.movement(id)) })),
      answerText: `${m.name} · ${m.period}`,
      caption: `${work.title} · ${artist.name}${work.year ? ` · ${work.year}` : ''}`,
    };
  }
  return {
    kind: q.kind, prompt: `¿Cuál es de ${artist.short || artist.name}?`, artwork: null, hint: q.hint, answer: q.answer,
    options: q.options.map((id) => ({ id, artwork: index.artwork(id), label: '', detail: '' })),
    answerText: work.title,
    caption: `${work.title}${work.year ? ` · ${work.year}` : ''}`,
    // Nombre del pintor de cada miniatura (para etiquetar la elegida por error).
    artistOf: (id) => index.artist(index.artwork(id).artistId).name,
  };
}

function nameOf(artist) {
  return { label: artist.name, detail: '' };
}

// Las rutas del catálogo son relativas a app/; la página vive en app/test/.
export function prefixImages(index, prefix) {
  for (const w of index.artworks) {
    if (w.img && !w.img.startsWith(prefix)) w.img = prefix + w.img;
    if (w.thumb && w.thumb.src && !w.thumb.src.startsWith(prefix)) w.thumb = { ...w.thumb, src: prefix + w.thumb.src };
  }
  return index;
}
