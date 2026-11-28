// Feedback que enseña (puro): qué mirar en ESE cuadro (`look`) y el rasgo del pintor.
// Para no repetir el mismo texto, el rasgo rota entre la pista y los rasgos del pintor.
// Tras un fallo se devuelve también lo elegido (`chosen`, se marca en su opción), y la pista nunca es un rasgo
// que el cuadro elegido también cumpla: se apoya en las etiquetas visuales del catálogo (`tags` de
// obra, `traitTags` de pintor, `tagLabels` y `negableTags`), que llegan con data/catalog-text.json.

import { BEFORE_TYPE, beforeFeedback } from './question-before.js';
import { SCOPE_STYLE, SCOPE_TAGS } from './catalog.js';

// --- Elección de la pista ---------------------------------------------------------------
// Tipos de cuadro: el típico enseña el rasgo del autor; el atípico se reconoce por otra cosa
// («no parece un X»); el de memoria «hay que sabérselo». En los dos últimos no se enseñan los
// rasgos genéricos del pintor, solo sus pistas propias.
export const WORK_KINDS = ['tipico', 'atipico', 'memoria'];
export const MAX_LOOKS = 2;

// Pistas de una obra en orden: `looks` (con fuente) o, si solo hay `look`, esa. Cada una
// { text, source, verified }: solo está verificada la que trae fuente.
export function looksOf(work) {
  if (!work) return [];
  const list = Array.isArray(work.looks) ? work.looks : [];
  const out = [];
  for (const item of list) {
    const text = typeof item === 'string' ? item : item && typeof item.text === 'string' ? item.text : '';
    const source = item && typeof item.source === 'string' ? item.source.trim() : '';
    if (text.trim()) out.push({ text: text.trim(), source, verified: Boolean(source) });
    if (out.length >= MAX_LOOKS) break;
  }
  if (!out.length && typeof work.look === 'string' && work.look.trim()) out.push({ text: work.look.trim(), source: '', verified: false });
  return out;
}

export function kindOf(work) {
  return work && WORK_KINDS.includes(work.kind) ? work.kind : WORK_KINDS[0];
}

// Etiquetas visuales de una obra (vacío = obra sin revisar: no se afirma nada sobre ella).
export function tagsOf(work) {
  return new Set(Array.isArray(work?.tags) ? work.tags.filter((t) => typeof t === 'string') : []);
}

// Etiquetas de cada frase del pintor, alineadas con `artistLines` ([pista, ...rasgos]).
// null = frase sin etiquetar (no se sabe dónde se ve).
export function traitTagsOf(artist, count) {
  const raw = Array.isArray(artist?.traitTags) ? artist.traitTags : [];
  return Array.from({ length: count }, (_, i) => (Array.isArray(raw[i]) ? raw[i].filter((t) => typeof t === 'string') : null));
}

const disjoint = (tags, set) => tags.every((t) => !set.has(t));
const subset = (tags, set) => tags.every((t) => set.has(t));

// ¿La frase `i` del pintor ([pista, ...rasgos]) está excluida para esta obra? (contenido/fijate.json:
// obras de juventud, copias, retratos… donde ese rasgo no se ve). `skipTraits`: true (todos) o posiciones.
export function skipsTrait(work, i) {
  const skip = work?.skipTraits;
  return skip === true || (Array.isArray(skip) && skip.includes(i));
}

// ¿La frase `i` del pintor puede verse en `work` según su alcance (`traitScope`, contenido/rasgos.json)? «estilo»: en
// cualquier obra suya; lista de géneros: solo en obras de ese género; «etiquetas»: solo si las etiquetas lo confirman
// (`verified`). Sin alcance declarado no hay certeza: no. Un pintor sin `traitScope` (datos antiguos) no se filtra.
export function scopeFits(artist, work, i, verified = false) {
  if (!Array.isArray(artist?.traitScope)) return true;
  return fits(artist.traitScope[i], work, verified);
}

function fits(scope, work, verified) {
  if (scope === SCOPE_STYLE) return true;
  if (scope === SCOPE_TAGS) return verified;
  return Array.isArray(scope) && Boolean(work?.genre) && scope.includes(work.genre);
}

// Versión general de la frase `i` (sin su detalle concreto) si encaja en `work`; '' si no hay o no encaja.
export function generalLine(artist, work, i) {
  const g = Array.isArray(artist?.traitGeneral) ? artist.traitGeneral[i] : null;
  return g && fits(g.scope, work, false) ? sentence(g.text) : '';
}

// Frases del pintor que sirven para enseñar `work`, en orden de preferencia: primero las que
// se ven seguro en ese cuadro; con `avoidWork` (el cuadro elegido por error) solo las que no
// comparte ese cuadro, y de esas, las verificadas en el correcto. Nunca las que no encajan con la obra
// (alcance, exclusiones de contenido/fijate.json) ni, si el cuadro está etiquetado, las que piden algo que no
// tiene. Puede devolver [].
export function teachingLines(lines, artist, work, avoidWork = null) {
  const tags = traitTagsOf(artist, lines.length);
  const seen = tagsOf(work);
  const avoid = avoidWork ? tagsOf(avoidWork) : null;
  const verified = (t) => Boolean(t && t.length && seen.size && subset(t, seen));
  const all = lines.map((line, i) => ({ line, i, tags: tags[i], ok: verified(tags[i]) })).filter((r) => !skipsTrait(work, r.i));
  const ranked = all.filter((r) => scopeFits(artist, work, r.i, r.ok));
  // Sin verificar: la frase sin etiquetas o el cuadro sin revisar (no se sabe; vale). Desmentida: no.
  const unknown = (r) => !r.ok && !(seen.size && r.tags && r.tags.length);
  if (!avoid) {
    // La frase cuyo detalle no se ve aquí cede su sitio a su versión general (si la tiene y encaja).
    const kept = new Set([...ranked.filter((r) => r.ok), ...ranked.filter(unknown)]);
    const general = all.filter((r) => !kept.has(r)).map((r) => generalLine(artist, work, r.i)).filter(Boolean);
    return [...new Set([...[...kept].map((r) => r.line), ...general])];
  }
  const safe = ranked.filter((r) => r.tags && r.tags.length && disjoint(r.tags, avoid));
  // Sin etiquetas en el cuadro correcto no hay forma de verificar: vale con que no sea del otro.
  return safe.filter((r) => r.ok || !seen.size).map((r) => r.line);
}

// ¿El refuerzo de estilo `i` está excluido para esta obra? (contenido/fijate.json «sinPistas»).
export function skipsHint(work, i) {
  const skip = work?.skipHints;
  return skip === true || (Array.isArray(skip) && skip.includes(i));
}

// Refuerzos de estilo del pintor (contenido/pistas.json) que encajan en `work`: su alcance (estilo, géneros o
// etiquetas), no excluidos para esa obra y, si el cuadro está etiquetado, sin pedir algo que no tiene. Con
// `avoidWork` (el elegido por error), solo los etiquetados que ese cuadro no cumple, como las frases del pintor.
export function styleLines(artist, work, avoidWork = null) {
  const hints = Array.isArray(artist?.styleHints) ? artist.styleHints : [];
  const seen = tagsOf(work);
  const avoid = avoidWork ? tagsOf(avoidWork) : null;
  return hints
    .map((h, i) => ({ ...h, i, ok: Boolean(h.tags.length && seen.size && subset(h.tags, seen)) }))
    .filter((h) => !skipsHint(work, h.i) && fits(h.scope, work, h.ok))
    .filter((h) => h.ok || !(seen.size && h.tags.length))
    .filter((h) => !avoid || (h.tags.length && disjoint(h.tags, avoid)))
    .map((h) => sentence(h.text));
}

// --- Títulos y montaje ------------------------------------------------------------------
const PRAISE = ['¡Bien visto!', 'Exacto', 'Eso es', 'Buen ojo', '¡Lo tienes!'];
const PRAISE_NEW = ['¡Y sin haberlo visto antes!', 'Reconocido a la primera', 'Eso es aprender a mirar'];
// Al acertar la repetición de una pregunta fallada: nada de «a la primera».
const PRAISE_RETRY = ['Ahora sí', 'Ya lo tienes', 'Esta vez sí'];

function capital(text) {
  const t = String(text || '').trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : '';
}

function sentence(text) {
  const t = capital(text);
  return t && !/[.!?…]$/.test(t) ? `${t}.` : t;
}

// Textos del pintor que pueden rotar: la pista y cada rasgo.
export function artistLines(artist) {
  const traits = Array.isArray(artist?.traits) ? artist.traits.filter((t) => typeof t === 'string' && t.trim()) : [];
  return [artist?.hint, ...traits].filter((t) => typeof t === 'string' && t.trim()).map(sentence);
}

// Rasgo principal (para «Fíjate en…» y la tarjeta de cierre).
export function mainTrait(artist) {
  return artistLines(artist)[0] || '';
}

const shortName = (artist) => (artist ? artist.short || artist.name : '');

// Qué eligió quien ha fallado: en «¿Cuál es de X?» un cuadro (y su pintor); en «¿Quién lo
// pintó?» un pintor. null si no se sabe o no aplica (movimiento).
function chosenOf(index, q, chosenId) {
  if (!chosenId || chosenId === q.answerId) return null;
  if (q.type === 'which') {
    const option = (q.options || []).find((o) => o.id === chosenId);
    const work = option ? index.artwork(option.artworkId || option.id) : null;
    const artist = work ? index.artist(work.artistId) : null;
    return artist ? { artist, work } : null;
  }
  if (q.type === 'who') {
    const artist = index.artist(chosenId);
    return artist ? { artist, work: null } : null;
  }
  return null;
}

// Una sola frase que enseña: el `look` de ESE cuadro o, si no hay, una frase o un refuerzo de estilo del
// pintor (que rota sin repetir el último). En las de movimiento, al fallar, la línea del movimiento.
// memo: Map `look:<obra>` → pistas propias ya dichas de esa obra en la ronda (la segunda vez sale la segunda).
// opts.recent: Map `last:<artistId>` → último refuerzo mostrado (para no repetirlo; por defecto, el propio memo).
// opts.retry: la pregunta es la repetición de una fallada en esta ronda (el elogio de «cuadro nuevo»
// solo vale la primera vez que se ve). opts.chosenId: la opción elegida (para marcar de quién era).
// Devuelve { title, who, lines[], kind, source, chosen } con una línea como mucho (texto plano; la
// UI escapa). chosen: { artistId, name, artworkId, title } tras un fallo de autor; si no, null.
export function feedbackFor(index, q, correct, memo = new Map(), rng = null, { retry = false, chosenId = null, recent = memo } = {}) {
  if (q.type === BEFORE_TYPE) {
    const fb = beforeFeedback(index, q, correct, rng ? rng.pick(PRAISE) : PRAISE[0]);
    return { ...fb, who: '', artistId: null, kind: kindOf(null), source: '', chosen: null };
  }
  const artist = index.artist(q.artistId);
  const movement = artist ? index.movement(artist.movementId) : null;
  const subject = index.artwork(q.type === 'which' ? q.targetArtworkId : q.artworkId);
  const chosen = correct ? null : chosenOf(index, q, chosenId);
  const pick = (list) => (rng ? rng.pick(list) : list[0]);
  let source = '';
  // Las pistas propias de la obra se dicen una vez cada una por ronda; después, un rasgo del pintor.
  const nextLook = () => {
    const looks = looksOf(subject);
    const key = subject ? `look:${subject.id}` : '';
    const n = key ? memo.get(key) || 0 : 0;
    if (!key || n >= looks.length) return '';
    memo.set(key, n + 1);
    source = looks[n].source;
    return sentence(looks[n].text);
  };
  // Frases del pintor y refuerzos de estilo que encajan; rota sin repetir el último que se vio de ese pintor
  // (`recent`, que puede durar más que la ronda): con `rng`, al azar entre los demás; sin él, el siguiente.
  const nextTrait = (avoidWork) => {
    const pool = [...new Set([...teachingLines(artistLines(artist), artist, subject, avoidWork), ...styleLines(artist, subject, avoidWork)])];
    if (!pool.length) return '';
    const lastKey = `last:${q.artistId}`;
    const last = recent.get(lastKey);
    const fresh = pool.length > 1 ? pool.filter((l) => l !== last) : pool;
    const line = rng ? rng.pick(fresh) : pool[(pool.indexOf(last) + 1) % pool.length];
    recent.set(lastKey, line);
    return line;
  };
  // avoidWork: el cuadro elegido por error (no se enseña un rasgo que ese cuadro también tenga).
  // En cuadros atípicos o «de memoria» los rasgos genéricos del pintor no se ven: no se dicen.
  const teach = (avoidWork = null) => nextLook() || (kindOf(subject) === 'tipico' ? nextTrait(avoidWork) : '');
  let title;
  let who = artist ? artist.name : '';
  let line;

  if (correct) {
    title = pick(retry ? PRAISE_RETRY : q.isNew ? PRAISE_NEW : PRAISE);
    if (q.type === 'movement' && movement) who = `${artist.name} · ${movement.name}`;
    line = teach();
  } else if (q.type === 'movement' && movement) {
    title = `Es ${movement.name}${movement.period ? ` · ${movement.period}` : ''}`;
    line = movement.blurb ? sentence(movement.blurb) : teach();
  } else if (q.type === 'which') {
    title = 'Era este';
    line = teach(chosen ? chosen.work : null);
  } else {
    title = `Es de ${artist ? artist.name : ''}`;
    who = '';
    line = teach();
  }
  return { title, who, artistId: artist ? artist.id : null, lines: line ? [line] : [], kind: kindOf(subject), source, chosen: chosen ? chosenInfo(chosen) : null };
}

// Lo elegido por error, para marcarlo en su propia opción (sin línea aparte en la hoja): en «¿Cuál?»,
// el cuadro y su pintor; en «¿Quién?», el pintor.
function chosenInfo(chosen) {
  return {
    artistId: chosen.artist.id,
    name: shortName(chosen.artist),
    artworkId: chosen.work ? chosen.work.id : null,
    title: chosen.work ? chosen.work.title : '',
  };
}
