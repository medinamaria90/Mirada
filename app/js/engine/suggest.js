// Sugerencias del buscador de Colección: por el principio de cualquier palabra, sin tildes ni mayúsculas
// y tolerante a una errata («velazques» → Velázquez). Pintores primero, después títulos; solo lo que ya
// está desbloqueado y, aparte, los pintores por conocer (el llamador pasa esos conjuntos). Puro y sin dependencias.

export const SUGGEST_MAX = 6;
const TYPO_MIN = 4; // desde esta longitud de palabra se admite una errata

const fold1 = (c) => (c.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()[0] || c);
// Misma longitud que el original, carácter a carácter: los índices de las marcas valen para el texto mostrado.
export const foldText = (text) => [...String(text ?? '')].map(fold1).join('');

const WORD = /[\p{L}\p{N}]+/gu;
export function wordsOf(folded) {
  return [...folded.matchAll(WORD)].map((m) => ({ start: m.index, text: m[0] }));
}

// ¿Distan a y b como mucho una edición (cambio, alta, baja o letras intercambiadas)?
export function withinOne(a, b) {
  if (a === b) return true;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0;
  while (i < la && i < lb && a[i] === b[i]) i++;
  if (la === lb) {
    if (a.slice(i + 1) === b.slice(i + 1)) return true;
    return a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2);
  }
  return la > lb ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
}

// Cuántos caracteres de la palabra casan con el token (principio de palabra); 0 si no casa.
// exact: casa tal cual; si no, con una errata.
export function matchToken(token, word) {
  if (word.startsWith(token)) return { len: token.length, exact: true };
  if (token.length < TYPO_MIN) return { len: 0, exact: false };
  for (const len of [token.length, token.length + 1, token.length - 1]) {
    if (len > 0 && len <= word.length && withinOne(token, word.slice(0, len))) return { len, exact: false };
  }
  return { len: 0, exact: false };
}

// Todos los tokens de la consulta han de casar con alguna palabra. { marks: [[ini, fin]], exact, rank } o null.
export function matchLabel(tokens, label) {
  const folded = foldText(label);
  const words = wordsOf(folded);
  const marks = [];
  let exact = true;
  let rank = 0;
  for (const token of tokens) {
    let best = null;
    words.forEach((w, i) => {
      const m = matchToken(token, w.text);
      if (!m.len) return;
      const score = (m.exact ? 0 : 100) + i;
      if (!best || score < best.score) best = { score, start: w.start, len: m.len, exact: m.exact };
    });
    if (!best) return null;
    marks.push([best.start, best.start + best.len]);
    exact = exact && best.exact;
    rank += best.score;
  }
  return { marks: marks.sort((a, b) => a[0] - b[0]), exact, rank };
}

// pool: { artists: [{ id, name, thumbId }], works: [{ id, title, artistId }], locked?: [{ id, name }] }
// → [{ kind: 'artist' | 'locked' | 'work', id, label, marks, thumbId }], como mucho `max`. Los pintores aún por conocer
// (`locked`) van tras los conocidos y sin miniatura: no se enseña ninguna obra suya.
export function suggest(pool, query, max = SUGGEST_MAX) {
  const tokens = wordsOf(foldText(query)).map((w) => w.text);
  if (!tokens.length) return [];
  const collect = (items, labelOf, make) => items
    .map((item) => ({ item, m: matchLabel(tokens, labelOf(item)) }))
    .filter((x) => x.m)
    .sort((a, b) => (b.m.exact - a.m.exact) || (a.m.rank - b.m.rank) || (labelOf(a.item).length - labelOf(b.item).length) || labelOf(a.item).localeCompare(labelOf(b.item), 'es'))
    .map((x) => make(x.item, x.m));
  const artists = collect(pool.artists, (a) => a.name, (a, m) => ({ kind: 'artist', id: a.id, label: a.name, marks: m.marks, thumbId: a.thumbId }));
  const locked = collect(pool.locked || [], (a) => a.name, (a, m) => ({ kind: 'locked', id: a.id, label: a.name, marks: m.marks, thumbId: null }));
  const works = collect(pool.works, (w) => w.title, (w, m) => ({ kind: 'work', id: w.id, label: w.title, marks: m.marks, thumbId: w.id }));
  return [...artists, ...locked, ...works].slice(0, max);
}

// Trozos de la etiqueta para pintar en negrita lo que casa: [{ text, hit }].
export function splitByMarks(label, marks) {
  const chars = [...label];
  const hit = new Array(chars.length).fill(false);
  for (const [a, b] of marks) for (let i = a; i < b && i < chars.length; i++) hit[i] = true;
  const out = [];
  chars.forEach((c, i) => {
    const last = out[out.length - 1];
    if (last && last.hit === hit[i]) last.text += c;
    else out.push({ text: c, hit: hit[i] });
  });
  return out;
}
