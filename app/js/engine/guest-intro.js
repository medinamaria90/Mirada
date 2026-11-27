// Invitados presentados antes de preguntarlos (como Duolingo con las palabras nuevas). Una pregunta por autor («¿Quién lo
// pintó?», «¿Cuál es de X?») solo tiene de respuesta a un pintor conocido (historia vista o nivel jugado), al de la ronda
// (`q.host`) o a un invitado ya presentado. Si la respuesta es un invitado sin presentar, antes sale su tarjeta (cuadro,
// nombre, quién era y su relación con el pintor de la ronda); no es pregunta ni puntúa. Como mucho uno por ronda. Puro.

import { noAuthorQuestion } from './catalog.js';
import { makeQuestion } from './questions.js';

export const GUEST_INTRO_MAX = 1; // invitados nuevos por ronda: más romperían el ritmo
export const GUEST_TEXT_MAX = 180;
// Diferencia de nacimiento (años) para cada forma de decir la distancia en el tiempo.
export const SAME_GENERATION = 18;
export const ONE_GENERATION = 45;
export const TWO_GENERATIONS = 75;

const AUTHOR_TYPES = new Set(['who', 'which']);

// Gentilicio por país del catálogo (masculino; las invitadas del camino, si llegan, con `female`).
const DEMONYMS = {
  Italia: ['italiano', 'italiana'], 'España': ['español', 'española'], 'Países Bajos': ['holandés', 'holandesa'],
  Flandes: ['flamenco', 'flamenca'], Alemania: ['alemán', 'alemana'], Francia: ['francés', 'francesa'],
  'Reino Unido': ['británico', 'británica'], Suiza: ['suizo', 'suiza'], Rusia: ['ruso', 'rusa'],
  'Estados Unidos': ['estadounidense', 'estadounidense'], Dinamarca: ['danés', 'danesa'], Suecia: ['sueco', 'sueca'],
  'Japón': ['japonés', 'japonesa'], Austria: ['austriaco', 'austriaca'], Noruega: ['noruego', 'noruega'],
};

export const isGuestArtist = (a) => Boolean(a && (a.guest || a.category === 'invitado'));

// Pintores por los que ya se puede preguntar: los conocidos (`met`) y los invitados presentados (`progress.guests`).
export function askableIds(met, progress) {
  return new Set([...(met || []), ...Object.keys(progress?.guests || {})]);
}

// Invitado que hay que presentar antes de esta pregunta, o null.
export function introNeeded(index, q, askable) {
  if (!q || !AUTHOR_TYPES.has(q.type)) return null;
  const id = q.artistId;
  if (!id || id === q.host || askable.has(id)) return null;
  return isGuestArtist(index.artist(id)) ? id : null;
}

// Preguntas de una ronda (cualquiera: etapa, rama, prueba de época, repaso, reto) con la regla aplicada. Cada pregunta por
// autor cuya respuesta no sea conocida ni el pintor de la ronda: si es el primer invitado sin presentar, se queda (sale su
// tarjeta antes, GUEST_INTRO_MAX); si no, se cambia por una igual sobre un cuadro de un pintor conocido (mejor de su mismo
// movimiento) y, sin ninguno, sale de la ronda (null). Misma longitud que `questions`: null = fuera.
export function knownOnly(index, questions, askable, rng, difficulty = SUBSTITUTE_DIFFICULTY) {
  const used = new Set(roundWorkIds(questions.map((q) => ({ q }))));
  const introduced = new Set();
  return questions.map((q) => {
    if (!q || !AUTHOR_TYPES.has(q.type) || !q.artistId || q.artistId === q.host || askable.has(q.artistId)) return q;
    const guest = introNeeded(index, q, askable);
    if (guest && (introduced.has(guest) || introduced.size < GUEST_INTRO_MAX)) {
      introduced.add(guest);
      return q;
    }
    return substitute(index, q, askable, used, rng, difficulty);
  });
}

export const SUBSTITUTE_DIFFICULTY = 0.5;

function substitute(index, q, askable, used, rng, difficulty) {
  const movementId = index.artist(q.artistId)?.movementId;
  const free = (a) => index.worksOf(a.id).filter((w) => !noAuthorQuestion(w) && !used.has(w.id));
  const known = [...askable].map((id) => index.artist(id)).filter((a) => a && free(a).length);
  const near = known.filter((a) => a.movementId === movementId);
  for (const pool of [near, known.filter((a) => a.movementId !== movementId)]) {
    for (const a of rng.shuffle(pool)) {
      const work = rng.pick(free(a));
      const sub = makeQuestion(q.type, index, work, difficulty, rng, { avoid: [...used] });
      if (!sub || (AUTHOR_TYPES.has(sub.type) && !askable.has(sub.artistId))) continue;
      roundWorkIds([{ q: sub }]).forEach((id) => used.add(id));
      return { ...sub, phase: q.phase, ...(q.host ? { host: q.host } : {}) };
    }
  }
  return null;
}

// Pintor de la ronda con el que se relaciona el invitado: el de la etapa o, sin él (repasos), el conocido nacido más cerca.
export function relationHost(index, guest, hostId, met = []) {
  const host = hostId && hostId !== guest.id ? index.artist(hostId) : null;
  if (host) return host;
  const known = met.map((id) => index.artist(id)).filter((a) => a && !isGuestArtist(a) && a.born);
  if (!guest.born || !known.length) return null;
  return known.reduce((best, a) => (Math.abs(a.born - guest.born) < Math.abs(best.born - guest.born) ? a : best));
}

const shortName = (a) => a.short || a.name;
const demonym = (a) => (DEMONYMS[a.country] || [])[a.female ? 1 : 0] || '';

// «Una generación más joven que Van Eyck, pero italiano.» Sin fechas o sin país, lo que se pueda; '' si nada.
export function relationLine(guest, host) {
  if (!host || !guest.born || !host.born) return '';
  const d = guest.born - host.born;
  const gap = Math.abs(d);
  const h = shortName(host);
  let when;
  if (gap <= SAME_GENERATION) when = `De la generación de ${h}`;
  else {
    const span = gap <= ONE_GENERATION ? 'Una generación' : gap <= TWO_GENERATIONS ? 'Dos generaciones' : 'Casi un siglo';
    when = `${span} ${d > 0 ? 'más joven' : 'mayor'} que ${h}`;
  }
  const g = demonym(guest);
  if (!g) return `${when}.`;
  return `${when}, ${guest.country === host.country ? 'también' : 'pero'} ${g}.`;
}

// Cuadro de la tarjeta: el más famoso del invitado que no sale en la ronda (mejor uno de «Conoce a», que nunca se
// pregunta); sin otro, el de la propia pregunta (la presentación vale igual).
export function introWork(index, guestId, avoid = []) {
  const skip = new Set(avoid);
  const works = index.worksOf(guestId).filter((w) => !w.attributed);
  const rank = (w) => (w.role === 'learn' ? 1 : 0) * 1000 + (w.fame || 0);
  const pool = works.filter((w) => !skip.has(w.id)).sort((a, b) => rank(b) - rank(a));
  return pool[0] || works[0] || null;
}

// Tarjeta del invitado: { artistId, name, text, work }. `text` (≤ GUEST_TEXT_MAX): quién era y su relación con el pintor
// de la ronda («Mantegna, el pintor de Mantua… Una generación más joven que Van Eyck, pero italiano.»).
export function guestIntro(index, guestId, { hostId = '', met = [], avoid = [] } = {}) {
  const guest = index.artist(guestId);
  if (!guest) return null;
  const relation = relationLine(guest, relationHost(index, guest, hostId, met));
  const who = guest.who?.text ? `${shortName(guest)}, ${guest.who.text}.` : '';
  const full = [who, relation].filter(Boolean).join(' ');
  const text = full.length <= GUEST_TEXT_MAX ? full : who || relation;
  return { artistId: guest.id, name: guest.name, text, work: introWork(index, guestId, avoid) };
}

// Obras de las preguntas de la ronda (la tarjeta no enseña ninguna: sería regalar la respuesta).
export function roundWorkIds(items) {
  return items.flatMap(({ q }) => [q.artworkId, q.targetArtworkId, ...(q.options || []).map((o) => o.artworkId)]).filter(Boolean);
}

// Obras de un invitado que sirven para preguntarle por autor (para el planificador de etapas).
export const guestAskableWorks = (index, guestId) => index.worksOf(guestId).filter((w) => w.role === 'new' && !noAuthorQuestion(w));
